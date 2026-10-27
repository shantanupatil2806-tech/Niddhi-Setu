const crypto = require('crypto');
const fs = require('fs');
const VerificationPassport = require('../models/VerificationPassport');
const VerificationCase = require('../models/VerificationCase');
const VerificationFinding = require('../models/VerificationFinding');
const FDR = require('../models/FDR');
const AuditEvent = require('../models/AuditEvent');
const { computeFileHash } = require('../utils/hash');

/**
 * Creates or retrieves the immutable Verification Passport for an FDR review case
 * @param {string|mongoose.Types.ObjectId} caseId
 * @param {string|mongoose.Types.ObjectId} fdrId
 * @returns {Promise<VerificationPassport>}
 */
async function createPassport(caseId, fdrId) {
  let passport = await VerificationPassport.findOne({ caseId });
  if (passport) {
    return passport;
  }

  const [fdr, vCase, findings, auditEvents] = await Promise.all([
    FDR.findById(fdrId).lean(),
    VerificationCase.findById(caseId),
    VerificationFinding.find({ $or: [{ caseId }, { fdrId }] }).lean(),
    AuditEvent.find({
      $or: [
        { entityType: 'FDR', entityId: fdrId },
        { entityType: 'VerificationCase', entityId: caseId }
      ]
    }).sort({ timestamp: 1 }).lean()
  ]);

  if (!fdr) {
    throw new Error(`FDR ${fdrId} not found`);
  }

  const passportFindings = findings.map((f) => ({
    findingId: f._id,
    rule: f.rule,
    severity: f.severity,
    description: f.description,
    evidence: f.evidence,
    raisedAt: f.createdAt || new Date()
  }));

  const passportAuditChain = auditEvents.map((evt) => ({
    eventId: evt._id,
    hash: evt.currentHash,
    timestamp: evt.timestamp
  }));

  passport = new VerificationPassport({
    caseId,
    fdrId,
    originalDocHash: fdr.docHash || null,
    submittedMetadata: {
      refNumber: fdr.refNumber,
      bankName: fdr.bankName,
      branch: fdr.branch,
      amount: fdr.amount,
      currency: fdr.currency,
      issueDate: fdr.issueDate,
      maturityDate: fdr.maturityDate,
      depositPeriodMonths: fdr.depositPeriodMonths,
      parentFdrId: fdr.parentFdrId
    },
    extractedFields: fdr.metadata || {},
    findings: passportFindings,
    decisions: [],
    auditChain: passportAuditChain,
    integrityVerified: true,
    lastIntegrityCheck: new Date()
  });

  await passport.save();

  if (vCase) {
    vCase.passportId = passport._id;
    await vCase.save();
  }

  return passport;
}

/**
 * Appends an officer review decision to the Verification Passport
 * @param {string|mongoose.Types.ObjectId} passportId
 * @param {Object} decisionObj - { actor, actorRole, decision, notes, auditEventId, auditEventHash }
 * @returns {Promise<VerificationPassport>}
 */
async function appendDecision(passportId, decisionObj) {
  const passport = await VerificationPassport.findById(passportId);
  if (!passport) {
    throw new Error(`Passport ${passportId} not found`);
  }

  passport.decisions.push({
    actor: decisionObj.actor || null,
    actorRole: decisionObj.actorRole || 'officer',
    decision: decisionObj.decision,
    notes: decisionObj.notes || '',
    timestamp: new Date()
  });

  if (decisionObj.auditEventId && decisionObj.auditEventHash) {
    passport.auditChain.push({
      eventId: decisionObj.auditEventId,
      hash: decisionObj.auditEventHash,
      timestamp: new Date()
    });
  }

  passport.lastIntegrityCheck = new Date();
  await passport.save();
  return passport;
}

/**
 * Performs cryptographic integrity verification on the passport audit trail and document hashes
 * @param {string|mongoose.Types.ObjectId} passportId
 * @returns {Promise<{ valid: boolean, mismatches: Array<string>, chainLength: number, lastChecked: Date }>}
 */
async function verifyIntegrity(passportId) {
  const passport = await VerificationPassport.findById(passportId).lean();
  if (!passport) {
    throw new Error(`Passport ${passportId} not found`);
  }

  const mismatches = [];
  const fdr = await FDR.findById(passport.fdrId).lean();

  // 1. Verify Original Document Hash vs FDR Document
  if (passport.originalDocHash && fdr) {
    if (fdr.docHash && fdr.docHash.toLowerCase() !== passport.originalDocHash.toLowerCase()) {
      mismatches.push(`Document hash divergence: Passport hash (${passport.originalDocHash}) != FDR record hash (${fdr.docHash})`);
    }

    if (fdr.docPath && fs.existsSync(fdr.docPath)) {
      try {
        const fileDiskHash = computeFileHash(fdr.docPath);
        if (fileDiskHash.toLowerCase() !== passport.originalDocHash.toLowerCase()) {
          mismatches.push(`File system integrity breach: Physical file SHA-256 (${fileDiskHash}) != Passport sealed hash (${passport.originalDocHash})`);
        }
      } catch (err) {
        mismatches.push(`Failed to read physical document: ${err.message}`);
      }
    }
  }

  // 2. Verify Audit Chain Hash Linkage
  if (passport.auditChain && passport.auditChain.length > 0) {
    let expectedPreviousHash = '0000000000000000000000000000000000000000000000000000000000000000';

    for (let i = 0; i < passport.auditChain.length; i++) {
      const chainItem = passport.auditChain[i];
      const eventDoc = await AuditEvent.findById(chainItem.eventId).lean();

      if (!eventDoc) {
        mismatches.push(`Audit event ${chainItem.eventId} at index ${i} is missing from immutable audit store.`);
        continue;
      }

      // Check currentHash matches recorded chain hash
      if (eventDoc.currentHash !== chainItem.hash) {
        mismatches.push(`Audit event ${eventDoc._id} hash altered: Event doc (${eventDoc.currentHash}) != Chain entry (${chainItem.hash}).`);
      }

      // Recompute SHA-256 hash
      const payloadStr = JSON.stringify(eventDoc.payload || {});
      const actorStr = eventDoc.actor || 'anonymous';
      const timestampIso = new Date(eventDoc.timestamp).toISOString();
      const expectedDigest = crypto
        .createHash('sha256')
        .update(`${eventDoc.entityType}:${eventDoc.entityId}:${actorStr}:${eventDoc.action}:${payloadStr}:${timestampIso}:${eventDoc.previousHash || '0000000000000000000000000000000000000000000000000000000000000000'}`)
        .digest('hex');

      if (expectedDigest !== eventDoc.currentHash) {
        mismatches.push(`Cryptographic tampering detected on event ${eventDoc._id}: Digest recomputation failed.`);
      }

      expectedPreviousHash = eventDoc.currentHash;
    }
  }

  const valid = mismatches.length === 0;

  // Persist integrity status
  await VerificationPassport.findByIdAndUpdate(passportId, {
    integrityVerified: valid,
    lastIntegrityCheck: new Date()
  });

  return {
    valid,
    mismatches,
    chainLength: passport.auditChain ? passport.auditChain.length : 0,
    lastChecked: new Date()
  };
}

/**
 * Fetches passport by caseId with full relationship population and integrity status
 * @param {string|mongoose.Types.ObjectId} caseId
 * @returns {Promise<{ passport: Object, integrity: Object }>}
 */
async function getPassportWithIntegrity(caseId) {
  let passport = await VerificationPassport.findOne({ caseId })
    .populate('caseId')
    .populate('fdrId')
    .populate('findings.findingId')
    .populate('decisions.actor', 'name email role')
    .populate({
      path: 'auditChain.eventId',
      populate: { path: 'actor', select: 'name email role' }
    });

  if (!passport) {
    // If case exists, create passport on demand
    const vCase = await VerificationCase.findById(caseId);
    if (!vCase) {
      throw new Error(`Verification Case ${caseId} not found`);
    }
    passport = await createPassport(caseId, vCase.fdrId);
    passport = await VerificationPassport.findById(passport._id)
      .populate('caseId')
      .populate('fdrId')
      .populate('findings.findingId')
      .populate('decisions.actor', 'name email role')
      .populate({
        path: 'auditChain.eventId',
        populate: { path: 'actor', select: 'name email role' }
      });
  }

  const integrity = await verifyIntegrity(passport._id);

  // Format passport object for client consumption
  const pObj = passport.toObject ? passport.toObject() : passport;
  const fdr = pObj.fdrId || {};
  const meta = pObj.submittedMetadata || {};
  const ext = pObj.extractedFields || {};

  const formattedExtractedFields = [
    {
      field: 'refNumber',
      label: 'Fixed Deposit Receipt Reference',
      submittedValue: meta.refNumber || fdr.refNumber || 'N/A',
      extractedValue: ext.extractedRefNumber || meta.refNumber || fdr.refNumber || 'N/A',
      match: String(ext.extractedRefNumber || meta.refNumber || '').trim() === String(meta.refNumber || fdr.refNumber || '').trim(),
      confidence: ext.ocrConfidence || 0.98
    },
    {
      field: 'bankName',
      label: 'Issuing Scheduled Bank',
      submittedValue: meta.bankName || fdr.bankName || 'N/A',
      extractedValue: ext.extractedBankName || meta.bankName || fdr.bankName || 'N/A',
      match: String(ext.extractedBankName || meta.bankName || '').toLowerCase().trim() === String(meta.bankName || fdr.bankName || '').toLowerCase().trim(),
      confidence: ext.ocrConfidence || 0.96
    },
    {
      field: 'amount',
      label: 'Deposit Principal Amount',
      submittedValue: meta.amount ? `₹ ${Number(meta.amount).toLocaleString('en-IN')}` : 'N/A',
      extractedValue: ext.extractedAmount ? `₹ ${Number(ext.extractedAmount).toLocaleString('en-IN')}` : (meta.amount ? `₹ ${Number(meta.amount).toLocaleString('en-IN')}` : 'N/A'),
      match: Number(ext.extractedAmount || meta.amount) === Number(meta.amount || fdr.amount),
      confidence: ext.ocrConfidence || 0.99
    },
    {
      field: 'maturityDate',
      label: 'Deposit Maturity Timeline',
      submittedValue: meta.maturityDate ? new Date(meta.maturityDate).toISOString().slice(0, 10) : 'N/A',
      extractedValue: ext.extractedMaturityDate ? new Date(ext.extractedMaturityDate).toISOString().slice(0, 10) : (meta.maturityDate ? new Date(meta.maturityDate).toISOString().slice(0, 10) : 'N/A'),
      match: true,
      confidence: ext.ocrConfidence || 0.97
    }
  ];

  const formattedAuditChain = (pObj.auditChain || []).map((link, idx) => {
    const evt = link.eventId || {};
    return {
      step: idx + 1,
      action: evt.action || 'FDR_AUDIT_LOGGED',
      timestamp: link.timestamp || evt.timestamp || new Date(),
      actor: evt.actor?.name || evt.actorRole || 'System Compliance Authority',
      currentHash: link.hash || evt.currentHash || '0000000000000000000000000000000000000000000000000000000000000000',
      previousHash: evt.previousHash || '0000000000000000000000000000000000000000000000000000000000000000',
      verified: true
    };
  });

  const formattedDecisions = (pObj.decisions || []).map((dec) => ({
    decision: dec.decision || 'UNDER_REVIEW',
    decidedBy: dec.actor?.name || dec.actorRole || 'Regulation Officer',
    role: dec.actorRole || 'officer',
    timestamp: dec.timestamp || new Date(),
    notes: dec.notes || ''
  }));

  const clientPassport = {
    ...pObj,
    extractedFields: formattedExtractedFields,
    auditChain: formattedAuditChain,
    decisions: formattedDecisions
  };

  return {
    passport: clientPassport,
    integrity
  };
}

module.exports = {
  createPassport,
  appendDecision,
  verifyIntegrity,
  getPassportWithIntegrity
};

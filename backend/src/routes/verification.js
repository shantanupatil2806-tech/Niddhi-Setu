const express = require('express');
const { body, validationResult } = require('express-validator');
const VerificationCase = require('../models/VerificationCase');
const VerificationFinding = require('../models/VerificationFinding');
const FDR = require('../models/FDR');
const VerificationPassport = require('../models/VerificationPassport');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { ROLES, CASE_STATUS, FDR_STATUS, VERIFICATION_STATUS, FINDING_SEVERITY, FINDING_CATEGORY } = require('../config/constants');
const { appendDecision, createPassport } = require('../services/passportService');
const { recordAuditEvent } = require('../utils/audit');

const router = express.Router();

/**
 * GET /api/verification/queue
 * Officer/Admin review queue of open and active verification cases
 */
router.get('/queue', auth, requireRole(ROLES.OFFICER, ROLES.ADMIN), async (req, res, next) => {
  try {
    const { status, priority, assignedTo, page = 1, limit = 20 } = req.query;
    const query = {};

    if (status && status !== 'all') {
      if (status === 'pending' || status === 'open') {
        query.status = CASE_STATUS.OPEN;
      } else if (status === 'clarification_required' || status === 'clarification_sent') {
        query.status = CASE_STATUS.CLARIFICATION_SENT;
      } else if (status === 'under_review') {
        query.status = CASE_STATUS.IN_REVIEW;
      } else if (status === 'verified' || status === 'decided' || status === 'closed') {
        query.status = CASE_STATUS.DECIDED;
      } else {
        query.status = status;
      }
    } else {
      // Default: show all non-closed/active scrutiny cases
      query.status = { $in: [CASE_STATUS.OPEN, CASE_STATUS.IN_REVIEW, CASE_STATUS.CLARIFICATION_SENT] };
    }

    if (priority && priority !== 'all') query.priority = priority;
    if (assignedTo && assignedTo !== 'all') query.assignedTo = assignedTo;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, parseInt(limit, 10));
    const skip = (pageNum - 1) * limitNum;

    const [cases, total] = await Promise.all([
      VerificationCase.find(query)
        .populate({
          path: 'fdrId',
          populate: { path: 'institutionId', select: 'name code type' }
        })
        .populate('assignedTo', 'name email')
        .populate('findings')
        .populate('passportId')
        .sort({ priority: 1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      VerificationCase.countDocuments(query)
    ]);

    return res.status(200).json({
      success: true,
      data: cases,
      items: cases,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/verification/cases/:id
 * Retrieve case details with full findings and passport
 */
router.get('/cases/:id', auth, async (req, res, next) => {
  try {
    const mongoose = require('mongoose');
    let vCase;
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      vCase = await VerificationCase.findById(req.params.id)
        .populate({
          path: 'fdrId',
          populate: [
            { path: 'institutionId', select: 'name code type contactEmail address' },
            { path: 'submittedBy', select: 'name email role' },
            { path: 'parentFdrId', select: 'refNumber bankName amount maturityDate' }
          ]
        })
        .populate('assignedTo', 'name email role')
        .populate({
          path: 'findings',
          populate: { path: 'resolvedBy', select: 'name email' }
        })
        .populate('passportId');
    } else {
      vCase = await VerificationCase.findOne()
        .populate({
          path: 'fdrId',
          populate: [
            { path: 'institutionId', select: 'name code type contactEmail address' },
            { path: 'submittedBy', select: 'name email role' },
            { path: 'parentFdrId', select: 'refNumber bankName amount maturityDate' }
          ]
        })
        .populate('assignedTo', 'name email role')
        .populate({
          path: 'findings',
          populate: { path: 'resolvedBy', select: 'name email' }
        })
        .populate('passportId');
    }

    if (!vCase) {
      return res.status(404).json({ success: false, error: 'Verification case not found' });
    }

    // Role check for institution users
    if (req.user.role === ROLES.INSTITUTION) {
      if (vCase.fdrId && vCase.fdrId.institutionId && String(vCase.fdrId.institutionId._id) !== String(req.user.institutionId)) {
        return res.status(403).json({ success: false, error: 'Access denied: Case belongs to another institution.' });
      }
    }

    return res.status(200).json({
      success: true,
      data: vCase
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/verification/cases/:id/decision
 * Record official verification decision (verified, rejected, clarification_required)
 */
router.patch('/cases/:id/decision', auth, requireRole(ROLES.OFFICER, ROLES.ADMIN), async (req, res, next) => {
  try {
    const { decision, decisionNotes, assignedTo } = req.body;

    const validDecisions = [FDR_STATUS.VERIFIED, FDR_STATUS.REJECTED, FDR_STATUS.CLARIFICATION_REQUIRED];
    if (!validDecisions.includes(decision)) {
      return res.status(400).json({
        success: false,
        error: `Invalid decision '${decision}'. Allowed: [${validDecisions.join(', ')}]`
      });
    }

    const vCase = await VerificationCase.findById(req.params.id);
    if (!vCase) {
      return res.status(404).json({ success: false, error: 'Verification case not found' });
    }

    const fdr = await FDR.findById(vCase.fdrId);
    if (!fdr) {
      return res.status(404).json({ success: false, error: 'Underlying FDR record not found' });
    }

    // Update case state
    vCase.decision = decision;
    vCase.decisionNotes = decisionNotes || '';
    vCase.decisionAt = new Date();
    vCase.assignedTo = assignedTo || req.user.id;

    if (decision === FDR_STATUS.VERIFIED || decision === FDR_STATUS.REJECTED) {
      vCase.status = CASE_STATUS.DECIDED;
    } else if (decision === FDR_STATUS.CLARIFICATION_REQUIRED) {
      vCase.status = CASE_STATUS.CLARIFICATION_SENT;
    }

    await vCase.save();

    // Update FDR state
    fdr.status = decision;
    if (decision === FDR_STATUS.VERIFIED) {
      fdr.verificationStatus = VERIFICATION_STATUS.VERIFIED;
    } else if (decision === FDR_STATUS.REJECTED) {
      fdr.verificationStatus = VERIFICATION_STATUS.REJECTED;
    } else if (decision === FDR_STATUS.CLARIFICATION_REQUIRED) {
      fdr.verificationStatus = VERIFICATION_STATUS.FLAGGED;
    }
    fdr.lastModifiedBy = req.user.id;
    await fdr.save();

    // Record Audit Event for Case Decision
    const caseAuditEvent = await recordAuditEvent(
      'VerificationCase',
      vCase._id,
      req.user.id,
      req.user.role,
      'CASE_DECISION_RECORDED',
      { decision, decisionNotes: decisionNotes || '', fdrId: fdr._id }
    );

    // Record Audit Event for FDR status update
    await recordAuditEvent(
      'FDR',
      fdr._id,
      req.user.id,
      req.user.role,
      'STATUS_CHANGED',
      { previousStatus: fdr.status, newStatus: decision, reason: decisionNotes }
    );

    // Ensure Passport exists and append decision
    let passport = await VerificationPassport.findOne({ caseId: vCase._id });
    if (!passport) {
      passport = await createPassport(vCase._id, fdr._id);
    }

    await appendDecision(passport._id, {
      actor: req.user.id,
      actorRole: req.user.role,
      decision,
      notes: decisionNotes || '',
      auditEventId: caseAuditEvent._id,
      auditEventHash: caseAuditEvent.currentHash
    });

    return res.status(200).json({
      success: true,
      data: {
        case: vCase,
        fdr,
        passportId: passport._id
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/verification/cases/:id/findings
 * Officer adds manual verification finding
 */
router.post('/cases/:id/findings', auth, requireRole(ROLES.OFFICER, ROLES.ADMIN), async (req, res, next) => {
  try {
    const { rule, severity, category, description, evidence, suggestedAction } = req.body;

    if (!rule || !description || !category) {
      return res.status(400).json({
        success: false,
        error: 'Rule identifier, category, and description are required'
      });
    }

    const vCase = await VerificationCase.findById(req.params.id);
    if (!vCase) {
      return res.status(404).json({ success: false, error: 'Verification case not found' });
    }

    const finding = new VerificationFinding({
      caseId: vCase._id,
      fdrId: vCase.fdrId,
      rule,
      severity: severity || FINDING_SEVERITY.MEDIUM,
      category,
      description,
      evidence: evidence || {},
      suggestedAction: suggestedAction || '',
      officerReviewRequired: true
    });

    await finding.save();

    vCase.findings.push(finding._id);
    await vCase.save();

    // Append to passport findings
    const passport = await VerificationPassport.findOne({ caseId: vCase._id });
    if (passport) {
      passport.findings.push({
        findingId: finding._id,
        rule: finding.rule,
        severity: finding.severity,
        description: finding.description,
        evidence: finding.evidence,
        raisedAt: new Date()
      });
      await passport.save();
    }

    await recordAuditEvent(
      'VerificationCase',
      vCase._id,
      req.user.id,
      req.user.role,
      'FINDING_ADDED',
      { findingId: finding._id, rule, severity: finding.severity }
    );

    return res.status(201).json({
      success: true,
      data: finding
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

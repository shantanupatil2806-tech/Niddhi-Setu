const fs = require('fs');
const FDR = require('../models/FDR');
const { COMPLIANCE_RULES, FINDING_SEVERITY, FINDING_CATEGORY } = require('../config/constants');
const { computeFileHash } = require('../utils/hash');

/**
 * Runs automated compliance checks against an FDR instrument
 * @param {Object} fdr - FDR document or payload
 * @param {Array<Object>|null} previousFdrs - Optional preloaded predecessor list
 * @returns {Promise<{ findings: Array<Object>, complianceScore: number, riskFlags: Array<string> }>}
 */
async function runComplianceChecks(fdr, previousFdrs = null) {
  const findings = [];
  const riskFlags = [];

  // Helper to add a finding
  const addFinding = (ruleKey, evidence, overrideDesc = null) => {
    const ruleDef = COMPLIANCE_RULES[ruleKey];
    if (!ruleDef) return;

    const finding = {
      rule: ruleDef.id,
      severity: ruleDef.severity,
      category: ruleDef.category,
      description: overrideDesc || ruleDef.description,
      evidence: evidence || {},
      suggestedAction: ruleDef.suggestedAction,
      officerReviewRequired: ruleDef.severity === FINDING_SEVERITY.CRITICAL || ruleDef.severity === FINDING_SEVERITY.HIGH
    };

    findings.push(finding);
    riskFlags.push(`${ruleDef.id}: ${overrideDesc || ruleDef.name}`);
  };

  // RULE_001: Duplicate Reference Number Check
  if (fdr.refNumber) {
    const existingQuery = {
      refNumber: String(fdr.refNumber).trim()
    };
    if (fdr._id) {
      existingQuery._id = { $ne: fdr._id };
    }
    const duplicate = await FDR.findOne(existingQuery).lean();
    if (duplicate) {
      addFinding('RULE_001', {
        field: 'refNumber',
        value: fdr.refNumber,
        expected: 'Unique Reference Number',
        matchedFdrId: duplicate._id
      }, `Duplicate FDR reference number "${fdr.refNumber}" already exists in the registry.`);
    }
  }

  // RULE_002: Mandatory Field Completeness Check
  const missingFields = [];
  if (!fdr.refNumber) missingFields.push('refNumber');
  if (!fdr.bankName) missingFields.push('bankName');
  if (fdr.amount === undefined || fdr.amount === null || Number(fdr.amount) <= 0) missingFields.push('amount');
  if (!fdr.issueDate) missingFields.push('issueDate');
  if (!fdr.maturityDate) missingFields.push('maturityDate');

  if (missingFields.length > 0) {
    addFinding('RULE_002', {
      field: 'mandatoryFields',
      value: missingFields,
      expected: 'All mandatory fields populated'
    }, `Missing or invalid mandatory fields: ${missingFields.join(', ')}.`);
  }

  // RULE_003: Temporal Sequence Validity (issueDate >= maturityDate)
  const issue = fdr.issueDate ? new Date(fdr.issueDate) : null;
  const maturity = fdr.maturityDate ? new Date(fdr.maturityDate) : null;

  if (issue && maturity && !isNaN(issue.getTime()) && !isNaN(maturity.getTime())) {
    if (issue >= maturity) {
      addFinding('RULE_003', {
        field: 'dates',
        value: { issueDate: issue.toISOString(), maturityDate: maturity.toISOString() },
        expected: 'issueDate < maturityDate'
      }, `Invalid chronological sequence: Issue date (${issue.toISOString().slice(0, 10)}) is equal to or later than maturity date (${maturity.toISOString().slice(0, 10)}).`);
    }

    // RULE_004: Expired Instrument Submission Check
    const now = new Date();
    // Allow small 24 hour buffer for timezone offsets
    if (maturity < new Date(now.getTime() - 24 * 60 * 60 * 1000)) {
      addFinding('RULE_004', {
        field: 'maturityDate',
        value: maturity.toISOString(),
        expected: 'Future date'
      }, `FDR instrument maturity date (${maturity.toISOString().slice(0, 10)}) has already elapsed prior to submission.`);
    }

    // RULE_007: Approaching Maturity Alert (within 30 days)
    const diffDays = Math.ceil((maturity.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays >= 0 && diffDays <= 30) {
      addFinding('RULE_007', {
        field: 'maturityThreshold',
        value: `${diffDays} days remaining`,
        expected: '> 30 days'
      }, `FDR instrument matures in ${diffDays} calendar day(s). Immediate renewal action recommended.`);
    }

    // RULE_009: Deposit Period Inconsistency Check
    if (fdr.depositPeriodMonths && fdr.depositPeriodMonths > 0) {
      const calculatedMonths = (maturity.getTime() - issue.getTime()) / (1000 * 60 * 60 * 24 * 30.4375);
      const discrepancy = Math.abs(calculatedMonths - fdr.depositPeriodMonths);
      if (discrepancy > 1.5) {
        addFinding('RULE_009', {
          field: 'depositPeriodMonths',
          value: fdr.depositPeriodMonths,
          expected: `Approx. ${Math.round(calculatedMonths)} months`
        }, `Stated deposit period of ${fdr.depositPeriodMonths} months does not reconcile with calendar span of ~${Math.round(calculatedMonths)} months.`);
      }
    }
  }

  // RULE_005 & RULE_006: Predecessor and Lineage Parity Checks
  if (fdr.parentFdrId) {
    let parent = null;
    if (previousFdrs && Array.isArray(previousFdrs)) {
      parent = previousFdrs.find((p) => String(p._id) === String(fdr.parentFdrId));
    }
    if (!parent) {
      parent = await FDR.findById(fdr.parentFdrId).lean();
    }

    if (!parent) {
      // RULE_006: Renewal without valid predecessor
      addFinding('RULE_006', {
        field: 'parentFdrId',
        value: fdr.parentFdrId,
        expected: 'Existing verified FDR'
      }, `Predecessor FDR (ID: ${fdr.parentFdrId}) not found in the registry.`);
    } else {
      // Check institution ownership match
      if (fdr.institutionId && parent.institutionId && String(fdr.institutionId) !== String(parent.institutionId)) {
        addFinding('RULE_006', {
          field: 'institutionId',
          value: fdr.institutionId,
          expected: parent.institutionId
        }, `Predecessor FDR belongs to a different institution.`);
      }

      // RULE_005: Lineage Amount Parity Check
      if (Number(fdr.amount) < Number(parent.amount)) {
        addFinding('RULE_005', {
          field: 'amount',
          value: Number(fdr.amount),
          expected: `>= ${parent.amount}`
        }, `Renewal deposit amount (₹${fdr.amount.toLocaleString('en-IN')}) is less than predecessor amount (₹${parent.amount.toLocaleString('en-IN')}).`);
      }
    }
  }

  // RULE_008: Document Hash Verification
  if (fdr.docPath && fdr.docHash) {
    if (fs.existsSync(fdr.docPath)) {
      try {
        const calculatedHash = computeFileHash(fdr.docPath);
        if (calculatedHash.toLowerCase() !== String(fdr.docHash).toLowerCase()) {
          addFinding('RULE_008', {
            field: 'docHash',
            value: calculatedHash,
            expected: fdr.docHash
          }, `Document integrity breach: Calculated SHA-256 hash does not match stored record hash.`);
        }
      } catch (err) {
        addFinding('RULE_008', {
          field: 'docPath',
          value: fdr.docPath,
          expected: 'Readable valid file'
        }, `Unable to verify document integrity: ${err.message}`);
      }
    }
  }

  // Compute Compliance Score
  let score = 100;
  for (const finding of findings) {
    switch (finding.severity) {
      case FINDING_SEVERITY.CRITICAL:
        score -= 30;
        break;
      case FINDING_SEVERITY.HIGH:
        score -= 15;
        break;
      case FINDING_SEVERITY.MEDIUM:
        score -= 10;
        break;
      case FINDING_SEVERITY.LOW:
        score -= 5;
        break;
      default:
        score -= 5;
    }
  }
  const complianceScore = Math.max(0, Math.min(100, score));

  return {
    findings,
    complianceScore,
    riskFlags
  };
}

module.exports = {
  runComplianceChecks
};

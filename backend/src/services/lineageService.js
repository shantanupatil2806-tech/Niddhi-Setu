const FDR = require('../models/FDR');
const { FINDING_SEVERITY } = require('../config/constants');

/**
 * Traverses parentFdrId chain up to root and finds descendants to construct full lineage chain
 * @param {string|mongoose.Types.ObjectId} fdrId
 * @returns {Promise<Array<Object>>} Ordered array of FDRs from ancestor to descendant
 */
async function buildLineageChain(fdrId) {
  const currentFdr = await FDR.findById(fdrId).populate('institutionId', 'name code').lean();
  if (!currentFdr) {
    throw new Error(`FDR with ID ${fdrId} not found`);
  }

  const visitedIds = new Set();
  const ancestors = [];
  let pointer = currentFdr.parentFdrId;

  // Traverse upwards to root
  while (pointer && !visitedIds.has(String(pointer))) {
    visitedIds.add(String(pointer));
    const parent = await FDR.findById(pointer).populate('institutionId', 'name code').lean();
    if (!parent) break;
    ancestors.unshift(parent);
    pointer = parent.parentFdrId;
  }

  // Traverse downwards to find direct descendants (children, grandchildren)
  visitedIds.clear();
  visitedIds.add(String(currentFdr._id));
  const descendants = [];

  let searchParentIds = [String(currentFdr._id)];
  while (searchParentIds.length > 0) {
    const children = await FDR.find({ parentFdrId: { $in: searchParentIds } })
      .populate('institutionId', 'name code')
      .lean();

    if (!children || children.length === 0) break;

    const nextParentIds = [];
    for (const child of children) {
      if (!visitedIds.has(String(child._id))) {
        visitedIds.add(String(child._id));
        descendants.push(child);
        nextParentIds.push(String(child._id));
      }
    }
    searchParentIds = nextParentIds;
  }

  // Combine full chain: ancestors -> current -> descendants
  const fullChain = [...ancestors, currentFdr, ...descendants];

  // Annotate position and role in lineage
  return fullChain.map((item, index) => ({
    ...item,
    lineageIndex: index,
    isTarget: String(item._id) === String(currentFdr._id),
    isRoot: index === 0,
    isLeaf: index === fullChain.length - 1
  }));
}

/**
 * Validates integrity and chronological consistency along the lineage chain
 * @param {string|mongoose.Types.ObjectId} fdrId
 * @returns {Promise<Array<Object>>} Lineage anomalies and findings
 */
async function validateLineage(fdrId) {
  const chain = await buildLineageChain(fdrId);
  const findings = [];

  if (!chain || chain.length <= 1) {
    return findings;
  }

  for (let i = 1; i < chain.length; i++) {
    const prev = chain[i - 1];
    const curr = chain[i];

    // Check 1: Amount degradation across renewals
    if (Number(curr.amount) < Number(prev.amount)) {
      findings.push({
        rule: 'LINEAGE_AMOUNT_DECREASE',
        severity: FINDING_SEVERITY.HIGH,
        description: `Deposit value dropped from ₹${Number(prev.amount).toLocaleString('en-IN')} (${prev.refNumber}) to ₹${Number(curr.amount).toLocaleString('en-IN')} (${curr.refNumber}) upon renewal.`,
        evidence: {
          previousFdrId: prev._id,
          currentFdrId: curr._id,
          previousAmount: prev.amount,
          currentAmount: curr.amount
        },
        suggestedAction: 'Require written justification for reduction of security guarantee value.'
      });
    }

    // Check 2: Retrograde issue date
    const prevIssue = new Date(prev.issueDate);
    const currIssue = new Date(curr.issueDate);
    if (currIssue < prevIssue) {
      findings.push({
        rule: 'LINEAGE_RETROGRADE_DATE',
        severity: FINDING_SEVERITY.CRITICAL,
        description: `Renewal FDR (${curr.refNumber}) issue date precedes previous FDR (${prev.refNumber}) issue date.`,
        evidence: {
          previousFdrId: prev._id,
          currentFdrId: curr._id,
          previousIssueDate: prev.issueDate,
          currentIssueDate: curr.issueDate
        },
        suggestedAction: 'Verify physical certificate dates against issuing bank records.'
      });
    }

    // Check 3: Significant coverage gap (> 60 days between previous maturity and new issue)
    const prevMaturity = new Date(prev.maturityDate);
    const gapDays = Math.ceil((currIssue.getTime() - prevMaturity.getTime()) / (1000 * 60 * 60 * 24));
    if (gapDays > 60) {
      findings.push({
        rule: 'LINEAGE_COVERAGE_GAP',
        severity: FINDING_SEVERITY.MEDIUM,
        description: `Lapse of ${gapDays} days detected between predecessor maturity (${prevMaturity.toISOString().slice(0, 10)}) and renewal issue (${currIssue.toISOString().slice(0, 10)}).`,
        evidence: {
          previousFdrId: prev._id,
          currentFdrId: curr._id,
          gapDays
        },
        suggestedAction: 'Audit institution security coverage for the unhedged interval.'
      });
    }

    // Check 4: Unannounced Bank Switch
    if (prev.bankName && curr.bankName && prev.bankName.toLowerCase().trim() !== curr.bankName.toLowerCase().trim()) {
      findings.push({
        rule: 'LINEAGE_BANK_MIGRATION',
        severity: FINDING_SEVERITY.LOW,
        description: `Issuing bank changed from "${prev.bankName}" to "${curr.bankName}" during renewal.`,
        evidence: {
          previousBank: prev.bankName,
          currentBank: curr.bankName
        },
        suggestedAction: 'Confirm NOC or bank release certificate from prior issuing bank.'
      });
    }
  }

  return findings;
}

/**
 * Analyzes all FDRs for an institution to detect circular pointers, branch forks, or orphaned chains
 * @param {string|mongoose.Types.ObjectId} institutionId
 * @returns {Promise<Array<Object>>} Suspicious patterns and anomalies
 */
async function detectSuspiciousPaths(institutionId) {
  const fdrs = await FDR.find({ institutionId }).lean();
  const suspiciousPaths = [];
  const fdrMap = new Map();
  const childrenMap = new Map();

  for (const fdr of fdrs) {
    fdrMap.set(String(fdr._id), fdr);
    if (fdr.parentFdrId) {
      const pId = String(fdr.parentFdrId);
      if (!childrenMap.has(pId)) {
        childrenMap.set(pId, []);
      }
      childrenMap.get(pId).push(fdr);
    }
  }

  // 1. Detect Branch Forks: Single parent FDR renewed by multiple distinct active FDRs
  for (const [parentId, children] of childrenMap.entries()) {
    if (children.length > 1) {
      const parent = fdrMap.get(parentId);
      suspiciousPaths.push({
        type: 'LINEAGE_FORK',
        severity: FINDING_SEVERITY.HIGH,
        description: `Predecessor FDR ${parent ? parent.refNumber : parentId} is referenced by ${children.length} different renewal FDRs (${children.map((c) => c.refNumber).join(', ')}).`,
        fdrIds: [parentId, ...children.map((c) => c._id)]
      });
    }
  }

  // 2. Detect Circular References
  for (const fdr of fdrs) {
    const visited = new Set();
    let curr = fdr;
    let hasCycle = false;

    while (curr && curr.parentFdrId) {
      visited.add(String(curr._id));
      const nextId = String(curr.parentFdrId);
      if (visited.has(nextId)) {
        hasCycle = true;
        break;
      }
      curr = fdrMap.get(nextId);
    }

    if (hasCycle) {
      suspiciousPaths.push({
        type: 'CIRCULAR_REFERENCE',
        severity: FINDING_SEVERITY.CRITICAL,
        description: `Circular lineage chain detected involving FDR ${fdr.refNumber}.`,
        fdrIds: Array.from(visited)
      });
      break;
    }
  }

  // 3. Detect Broken Parent References
  for (const fdr of fdrs) {
    if (fdr.parentFdrId && !fdrMap.has(String(fdr.parentFdrId))) {
      suspiciousPaths.push({
        type: 'ORPHANED_RENEWAL',
        severity: FINDING_SEVERITY.HIGH,
        description: `FDR ${fdr.refNumber} specifies parent FDR ID ${fdr.parentFdrId} which does not exist in institution registry.`,
        fdrIds: [fdr._id]
      });
    }
  }

  return suspiciousPaths;
}

module.exports = {
  buildLineageChain,
  validateLineage,
  detectSuspiciousPaths
};

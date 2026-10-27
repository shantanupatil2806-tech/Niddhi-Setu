const Institution = require('../models/Institution');
const FDR = require('../models/FDR');
const VerificationCase = require('../models/VerificationCase');
const RenewalOrReplacement = require('../models/RenewalOrReplacement');
const ReleaseRequest = require('../models/ReleaseRequest');

/**
 * Builds a React Flow compatible graph for an entire institution
 * @param {string|mongoose.Types.ObjectId} institutionId
 * @returns {Promise<{ nodes: Array<Object>, edges: Array<Object> }>}
 */
async function buildInstitutionGraph(institutionId) {
  const institution = await Institution.findById(institutionId).lean();
  if (!institution) {
    throw new Error(`Institution ${institutionId} not found`);
  }

  const fdrs = await FDR.find({ institutionId }).lean();
  const fdrIds = fdrs.map((f) => f._id);

  const [cases, renewals, releases] = await Promise.all([
    VerificationCase.find({ fdrId: { $in: fdrIds } }).lean(),
    RenewalOrReplacement.find({ institutionId }).lean(),
    ReleaseRequest.find({ institutionId }).lean()
  ]);

  const nodes = [];
  const edges = [];

  // Institution Root Node
  const instNodeId = `inst-${institution._id}`;
  nodes.push({
    id: instNodeId,
    type: 'institution',
    position: { x: 450, y: 50 },
    data: {
      label: institution.name,
      code: institution.code,
      type: institution.type,
      status: institution.status,
      id: institution._id
    }
  });

  // Layout calculations for FDRs
  const fdrNodePositions = new Map();
  const fdrColCount = 4;
  const colSpacing = 280;
  const rowSpacing = 220;

  fdrs.forEach((fdr, index) => {
    const col = index % fdrColCount;
    const row = Math.floor(index / fdrColCount);
    const xPos = 80 + col * colSpacing;
    const yPos = 200 + row * rowSpacing;

    const fdrNodeId = `fdr-${fdr._id}`;
    fdrNodePositions.set(String(fdr._id), { x: xPos, y: yPos });

    nodes.push({
      id: fdrNodeId,
      type: 'fdr',
      position: { x: xPos, y: yPos },
      data: {
        label: `${fdr.bankName} - ₹${Number(fdr.amount).toLocaleString('en-IN')}`,
        refNumber: fdr.refNumber,
        bankName: fdr.bankName,
        amount: fdr.amount,
        status: fdr.status,
        verificationStatus: fdr.verificationStatus,
        issueDate: fdr.issueDate,
        maturityDate: fdr.maturityDate,
        id: fdr._id
      }
    });

    // Edge: Institution -> FDR (issued)
    edges.push({
      id: `edge-inst-fdr-${fdr._id}`,
      source: instNodeId,
      target: fdrNodeId,
      type: 'issued',
      label: 'issued',
      animated: fdr.status === 'submitted' || fdr.status === 'under_review'
    });
  });

  // Renewal / Lineage Edges
  fdrs.forEach((fdr) => {
    if (fdr.parentFdrId && fdrNodePositions.has(String(fdr.parentFdrId))) {
      const parentNodeId = `fdr-${fdr.parentFdrId}`;
      const childNodeId = `fdr-${fdr._id}`;
      edges.push({
        id: `edge-lineage-${fdr.parentFdrId}-${fdr._id}`,
        source: parentNodeId,
        target: childNodeId,
        type: 'renewed_by',
        label: 'renewed by',
        animated: true,
        style: { stroke: '#3b82f6', strokeWidth: 2 }
      });
    }
  });

  // RenewalOrReplacement explicit records
  renewals.forEach((renewal, idx) => {
    const prevNodeId = `fdr-${renewal.previousFdrId}`;
    const nextNodeId = `fdr-${renewal.fdrId}`;
    const edgeType = renewal.type === 'replacement' ? 'replaced_by' : 'renewed_by';

    if (fdrNodePositions.has(String(renewal.previousFdrId)) && fdrNodePositions.has(String(renewal.fdrId))) {
      // Add renewal info edge if not already added
      const edgeId = `edge-renewal-rec-${renewal._id}`;
      if (!edges.some((e) => e.source === prevNodeId && e.target === nextNodeId)) {
        edges.push({
          id: edgeId,
          source: prevNodeId,
          target: nextNodeId,
          type: edgeType,
          label: renewal.type,
          style: { stroke: '#8b5cf6', strokeDasharray: '5,5' }
        });
      }
    }
  });

  // Verification Cases Nodes & Edges
  cases.forEach((c) => {
    const fdrPos = fdrNodePositions.get(String(c.fdrId));
    if (fdrPos) {
      const caseNodeId = `case-${c._id}`;
      nodes.push({
        id: caseNodeId,
        type: 'case',
        position: { x: fdrPos.x - 30, y: fdrPos.y + 110 },
        data: {
          label: `Review Case #${String(c._id).slice(-4)}`,
          status: c.status,
          priority: c.priority,
          decision: c.decision,
          id: c._id
        }
      });

      edges.push({
        id: `edge-fdr-case-${c._id}`,
        source: `fdr-${c.fdrId}`,
        target: caseNodeId,
        type: 'has_case',
        label: 'verification',
        style: { stroke: '#10b981' }
      });
    }
  });

  // Release Requests Nodes & Edges
  releases.forEach((rel) => {
    const fdrPos = fdrNodePositions.get(String(rel.fdrId));
    if (fdrPos) {
      const relNodeId = `release-${rel._id}`;
      nodes.push({
        id: relNodeId,
        type: 'release',
        position: { x: fdrPos.x + 130, y: fdrPos.y + 110 },
        data: {
          label: `Release Request (${rel.status})`,
          amount: rel.amount,
          status: rel.status,
          id: rel._id
        }
      });

      edges.push({
        id: `edge-fdr-release-${rel._id}`,
        source: `fdr-${rel.fdrId}`,
        target: relNodeId,
        type: 'has_release',
        label: 'release',
        style: { stroke: '#f59e0b' }
      });
    }
  });

  return { nodes, edges };
}

/**
 * Builds a React Flow compatible graph centered around a single FDR instrument and its connected entities
 * @param {string|mongoose.Types.ObjectId} fdrId
 * @returns {Promise<{ nodes: Array<Object>, edges: Array<Object> }>}
 */
async function buildFDRGraph(fdrId) {
  const currentFdr = await FDR.findById(fdrId).populate('institutionId').lean();
  if (!currentFdr) {
    throw new Error(`FDR ${fdrId} not found`);
  }

  // Find parent FDR if exists
  let parentFdr = null;
  if (currentFdr.parentFdrId) {
    parentFdr = await FDR.findById(currentFdr.parentFdrId).lean();
  }

  // Find child FDRs if any
  const childFdrs = await FDR.find({ parentFdrId: currentFdr._id }).lean();

  // Find associated case
  const verificationCase = await VerificationCase.findOne({ fdrId: currentFdr._id }).lean();

  // Find release requests
  const releaseRequest = await ReleaseRequest.findOne({ fdrId: currentFdr._id }).lean();

  const nodes = [];
  const edges = [];

  // Center node: Current FDR at (400, 300)
  const currentFdrNodeId = `fdr-${currentFdr._id}`;
  nodes.push({
    id: currentFdrNodeId,
    type: 'fdr',
    position: { x: 400, y: 300 },
    data: {
      label: `${currentFdr.bankName} - ₹${Number(currentFdr.amount).toLocaleString('en-IN')}`,
      refNumber: currentFdr.refNumber,
      bankName: currentFdr.bankName,
      amount: currentFdr.amount,
      status: currentFdr.status,
      verificationStatus: currentFdr.verificationStatus,
      isCenter: true,
      id: currentFdr._id
    }
  });

  // Institution Node at (400, 100)
  if (currentFdr.institutionId) {
    const inst = currentFdr.institutionId;
    const instNodeId = `inst-${inst._id}`;
    nodes.push({
      id: instNodeId,
      type: 'institution',
      position: { x: 400, y: 100 },
      data: {
        label: inst.name,
        code: inst.code,
        id: inst._id
      }
    });

    edges.push({
      id: `edge-inst-fdr-${currentFdr._id}`,
      source: instNodeId,
      target: currentFdrNodeId,
      type: 'issued',
      label: 'issued'
    });
  }

  // Predecessor FDR Node at (150, 300)
  if (parentFdr) {
    const parentNodeId = `fdr-${parentFdr._id}`;
    nodes.push({
      id: parentNodeId,
      type: 'fdr',
      position: { x: 100, y: 300 },
      data: {
        label: `Predecessor: ${parentFdr.bankName}`,
        refNumber: parentFdr.refNumber,
        amount: parentFdr.amount,
        status: parentFdr.status,
        id: parentFdr._id
      }
    });

    edges.push({
      id: `edge-parent-${parentFdr._id}-${currentFdr._id}`,
      source: parentNodeId,
      target: currentFdrNodeId,
      type: 'renewed_by',
      label: 'renewed by',
      animated: true
    });
  }

  // Successor / Child FDR Nodes at (700, 300)
  childFdrs.forEach((child, index) => {
    const childNodeId = `fdr-${child._id}`;
    nodes.push({
      id: childNodeId,
      type: 'fdr',
      position: { x: 700, y: 220 + index * 140 },
      data: {
        label: `Successor: ${child.bankName}`,
        refNumber: child.refNumber,
        amount: child.amount,
        status: child.status,
        id: child._id
      }
    });

    edges.push({
      id: `edge-child-${currentFdr._id}-${child._id}`,
      source: currentFdrNodeId,
      target: childNodeId,
      type: 'renewed_by',
      label: 'renewed by',
      animated: true
    });
  });

  // Verification Case Node at (300, 500)
  if (verificationCase) {
    const caseNodeId = `case-${verificationCase._id}`;
    nodes.push({
      id: caseNodeId,
      type: 'case',
      position: { x: 260, y: 500 },
      data: {
        label: `Case #${String(verificationCase._id).slice(-4)} (${verificationCase.status})`,
        priority: verificationCase.priority,
        decision: verificationCase.decision,
        id: verificationCase._id
      }
    });

    edges.push({
      id: `edge-fdr-case-${verificationCase._id}`,
      source: currentFdrNodeId,
      target: caseNodeId,
      type: 'has_case',
      label: 'verification'
    });
  }

  // Release Request Node at (540, 500)
  if (releaseRequest) {
    const relNodeId = `release-${releaseRequest._id}`;
    nodes.push({
      id: relNodeId,
      type: 'release',
      position: { x: 540, y: 500 },
      data: {
        label: `Release: ${releaseRequest.status}`,
        amount: releaseRequest.amount,
        id: releaseRequest._id
      }
    });

    edges.push({
      id: `edge-fdr-release-${releaseRequest._id}`,
      source: currentFdrNodeId,
      target: relNodeId,
      type: 'has_release',
      label: 'release'
    });
  }

  return { nodes, edges };
}

module.exports = {
  buildInstitutionGraph,
  buildFDRGraph
};

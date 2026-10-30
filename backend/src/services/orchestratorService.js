const ClearanceWorkflow = require('../models/ClearanceWorkflow');
const WorkflowConfig = require('../models/WorkflowConfig');
const NotificationRecord = require('../models/NotificationRecord');
const { recordAuditEvent } = require('../utils/audit');
const { computeFileHash } = require('../utils/hash');

/**
 * Initializes a new ClearanceWorkflow instance for a release request
 */
async function initializeWorkflow(releaseRequest, fdr, institutionId, userId) {
  // Fetch active workflow config (or fallback to default)
  let config = await WorkflowConfig.findOne({ isActive: true }).lean();
  if (!config) {
    config = await new WorkflowConfig().save();
  }

  // 1. Prepare 5 statutory documents
  const docTypes = ['request_letter', 'affidavit_6', 'fdr_copy', 'payment_proof', 'eoa_loa'];
  const documents = docTypes.map(docType => {
    const matrixEntry = config.documentMatrix[docType] || {};
    const checklist = (matrixEntry.checklistTemplate || []).map(item => ({
      item,
      passed: false,
      notes: ''
    }));

    let status = 'not_uploaded';
    let fileUrl = null;
    let fileHash = null;
    let docOriginalName = null;

    // Inherit documents submitted by the institution during registration or previous requests
    if (docType === 'fdr_copy' && fdr?.docPath) {
      status = 'uploaded';
      fileUrl = fdr.docPath;
      fileHash = fdr.docHash;
      docOriginalName = fdr.docOriginalName || 'FDR_Certificate.pdf';
    } else if (fdr?.supportingDocuments) {
      const docEntry = fdr.supportingDocuments instanceof Map
        ? fdr.supportingDocuments.get(docType)
        : fdr.supportingDocuments[docType];

      if (docEntry && (docEntry.fileUrl || docEntry.path)) {
        status = 'uploaded';
        fileUrl = docEntry.fileUrl || docEntry.path;
        fileHash = docEntry.fileHash;
        docOriginalName = docEntry.originalName || `${docType}.pdf`;
      }
    }

    return {
      docType,
      version: 1,
      status,
      fileUrl,
      docPath: fileUrl,
      docHash: fileHash,
      fileHash,
      docOriginalName,
      checklist,
      history: status === 'uploaded' ? [{
        action: 'uploaded_by_institution_at_registration',
        uploadedBy: userId,
        timestamp: new Date()
      }] : []
    };
  });

  // 2. Prepare departmental clearance tasks
  const now = new Date();
  const clearanceHours = config.slaHours?.departmental_clearance || 72;
  const dueDate = new Date(now.getTime() + clearanceHours * 60 * 60 * 1000);

  const tasks = [
    {
      taskKey: 'admin_scrutiny',
      name: 'Administrative & Statutory Affidavit Scrutiny',
      department: 'administrative',
      assignedRole: 'officer_admin',
      status: 'pending',
      isMandatory: true,
      dependsOn: [],
      dueDate
    },
    {
      taskKey: 'financial_scrutiny',
      name: 'FDR Instrument & Payment Ledger Scrutiny',
      department: 'finance',
      assignedRole: 'officer_finance',
      status: 'pending',
      isMandatory: true,
      dependsOn: [],
      dueDate
    },
    {
      taskKey: 'approval_compliance',
      name: 'Academic Approval (LoA/EoA) & Program Closure Verification',
      department: 'approval_bureau',
      assignedRole: 'officer_approval',
      status: 'pending',
      isMandatory: true,
      dependsOn: [],
      dueDate
    },
    {
      taskKey: 'pgrc_clearance',
      name: 'Public Grievance Redressal Cell (PGRC) Clearance',
      department: 'pgrc',
      assignedRole: 'officer_pgrc',
      status: 'pending', // runs in parallel once documents are submitted
      isMandatory: true,
      dependsOn: [],
      dueDate
    },
    {
      taskKey: 'vigilance_clearance',
      name: 'Chief Vigilance Officer (CVO) Integrity Clearance',
      department: 'vigilance',
      assignedRole: 'officer_vigilance',
      status: 'pending', // runs in parallel
      isMandatory: true,
      dependsOn: [],
      dueDate
    },
    {
      taskKey: 'cell_clearance',
      name: 'Regional Bureau & Specialized Cell Clearance',
      department: 'authorized_cell',
      assignedRole: 'officer_cell',
      status: 'pending',
      isMandatory: false, // Optional/conditional
      dependsOn: [],
      dueDate
    },
    {
      taskKey: 'final_approval',
      name: 'Approval Bureau Final Sanction & NOC Clearance',
      department: 'approval_bureau',
      assignedRole: 'officer_approval',
      status: 'blocked', // strictly blocked until all mandatory prior tasks are cleared
      isMandatory: true,
      dependsOn: [
        'admin_scrutiny',
        'financial_scrutiny',
        'approval_compliance',
        'pgrc_clearance',
        'vigilance_clearance'
      ],
      dueDate: new Date(dueDate.getTime() + (config.slaHours?.final_approval || 48) * 60 * 60 * 1000)
    }
  ];

  const workflow = new ClearanceWorkflow({
    releaseRequestId: releaseRequest._id,
    fdrId: fdr._id,
    institutionId,
    status: 'submitted',
    documents,
    tasks,
    blockedReasons: ['Documents pending upload and verification'],
    nextPermittedActions: [
      {
        action: 'UPLOAD_DOCUMENTS',
        role: 'institution',
        description: 'Upload required statutory documents: Request Letter, Affidavit 6, FDR Copy, Payment Proof, and LoA/EoA.'
      }
    ]
  });

  await workflow.save();
  return workflow;
}

/**
 * Re-evaluates task statuses, blockers, next actions, and overall workflow status
 */
function recalculateWorkflowState(workflow) {
  const documents = workflow.documents || [];
  const tasks = workflow.tasks || [];
  const blockedReasons = [];
  const nextActions = [];

  // Check document statuses
  const unuploaded = documents.filter(d => d.status === 'not_uploaded');
  const rejected = documents.filter(d => d.status === 'rejected');
  const clarificationReq = documents.filter(d => d.status === 'clarification_required');
  const underReview = documents.filter(d => d.status === 'under_review' || d.status === 'uploaded');
  const verified = documents.filter(d => d.status === 'verified');

  const allDocsUploaded = unuploaded.length === 0;
  const hasRejections = rejected.length > 0;
  const hasClarification = clarificationReq.length > 0;
  const allDocsVerified = documents.length > 0 && verified.length === documents.length;

  if (unuploaded.length > 0) {
    blockedReasons.push(`${unuploaded.length} required document(s) pending initial upload (${unuploaded.map(d => d.docType).join(', ')}).`);
    nextActions.push({
      action: 'UPLOAD_DOCUMENTS',
      role: 'institution',
      description: 'Upload pending statutory documents.'
    });
  }

  if (hasRejections) {
    blockedReasons.push(`${rejected.length} document(s) rejected by scrutiny officer. Replacement required.`);
    nextActions.push({
      action: 'REPLACE_REJECTED_DOCUMENT',
      role: 'institution',
      description: 'Review rejection reasons and re-upload revised documents.'
    });
  }

  if (hasClarification) {
    blockedReasons.push(`${clarificationReq.length} document(s) have pending clarification requests.`);
    nextActions.push({
      action: 'RESPOND_TO_CLARIFICATION',
      role: 'institution',
      description: 'Provide institutional clarification response and supporting addenda.'
    });
  }

  // Task-level dependency evaluation
  const taskMap = new Map();
  tasks.forEach(t => taskMap.set(t.taskKey, t));

  tasks.forEach(task => {
    // If task is already cleared or rejected, don't change its status to blocked
    if (task.status === 'cleared' || task.status === 'rejected') {
      return;
    }

    if (task.dependsOn && task.dependsOn.length > 0) {
      const unmetDependencies = task.dependsOn.filter(depKey => {
        const depTask = taskMap.get(depKey);
        return !depTask || depTask.status !== 'cleared';
      });

      if (unmetDependencies.length > 0) {
        task.status = 'blocked';
        if (task.taskKey === 'final_approval') {
          blockedReasons.push(`Final Approval Bureau sanction is blocked awaiting mandatory clearances from: ${unmetDependencies.join(', ')}.`);
        }
      } else {
        // Dependencies are met!
        if (task.status === 'blocked') {
          task.status = 'pending';
        }
      }
    }
  });

  // Evaluate Departmental Clearance tasks
  const pendingOrInProgressTasks = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress');
  const rejectedTasks = tasks.filter(t => t.status === 'rejected');
  const finalApprovalTask = tasks.find(t => t.taskKey === 'final_approval');

  pendingOrInProgressTasks.forEach(t => {
    nextActions.push({
      action: `COMPLETE_${t.taskKey.toUpperCase()}`,
      role: t.assignedRole,
      description: `Review dossier and record ${t.name}.`
    });
  });

  // Determine overall workflow status
  if (hasRejections || rejectedTasks.length > 0) {
    workflow.status = 'clarification_required';
  } else if (hasClarification) {
    workflow.status = 'clarification_required';
  } else if (!allDocsUploaded) {
    workflow.status = 'document_review';
  } else if (!allDocsVerified) {
    workflow.status = 'document_review';
  } else if (finalApprovalTask && finalApprovalTask.status === 'cleared') {
    workflow.status = 'approved';
    workflow.completedAt = new Date();
  } else if (finalApprovalTask && finalApprovalTask.status === 'pending') {
    workflow.status = 'ready_for_final_review';
  } else if (tasks.some(t => t.status === 'in_progress' || t.status === 'cleared')) {
    workflow.status = 'departmental_clearance_in_progress';
  } else {
    workflow.status = 'awaiting_clearances';
  }

  workflow.blockedReasons = blockedReasons;
  workflow.nextPermittedActions = nextActions;
}

module.exports = {
  initializeWorkflow,
  recalculateWorkflowState
};

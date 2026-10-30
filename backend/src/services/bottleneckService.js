const ClearanceWorkflow = require('../models/ClearanceWorkflow');
const NotificationRecord = require('../models/NotificationRecord');
const User = require('../models/User');

/**
 * Checks for overdue clearance tasks and approaching deadlines, creating notifications
 */
async function monitorDeadlinesAndEscalate() {
  const now = new Date();
  const workflows = await ClearanceWorkflow.find({
    status: { $nin: ['approved', 'rejected', 'closed'] }
  }).populate('institutionId', 'name code');

  const alertsCreated = [];

  for (const wf of workflows) {
    let wfModified = false;

    for (const task of wf.tasks) {
      if (task.status !== 'pending' && task.status !== 'in_progress') {
        continue;
      }

      if (!task.dueDate) continue;

      const msDiff = task.dueDate.getTime() - now.getTime();
      const hoursRemaining = msDiff / (1000 * 60 * 60);

      // 1. Approaching deadline reminder (<= 24 hours remaining)
      if (hoursRemaining > 0 && hoursRemaining <= 24 && !task.reminderSentAt) {
        task.reminderSentAt = now;
        wfModified = true;

        // Find eligible officers for this role
        const eligibleOfficers = await User.find({
          $or: [{ role: task.assignedRole }, { role: 'admin' }],
          isActive: true
        });

        for (const officer of eligibleOfficers) {
          const eventKey = `reminder-${wf._id}-${task.taskKey}`;
          const existing = await NotificationRecord.findOne({ eventKey, recipient: officer._id });
          if (!existing) {
            const notif = await new NotificationRecord({
              recipient: officer._id,
              recipientRole: officer.role,
              institutionId: wf.institutionId?._id || wf.institutionId,
              releaseRequestId: wf.releaseRequestId,
              type: 'task_reminder',
              priority: 'warning',
              title: `Clearance Deadline Approaching: ${task.name}`,
              message: `Task '${task.name}' for ${wf.institutionId?.name || 'Institution'} is due in ${Math.round(hoursRemaining)} hours.`,
              eventKey
            }).save();
            alertsCreated.push(notif);
          }
        }
      }

      // 2. Overdue task escalation (msDiff < 0)
      if (msDiff < 0 && !task.escalatedAt) {
        task.escalatedAt = now;
        wfModified = true;

        // Escalate to Central Admin and department supervisor
        const admins = await User.find({ role: 'admin', isActive: true });
        for (const admin of admins) {
          const eventKey = `escalation-${wf._id}-${task.taskKey}`;
          const existing = await NotificationRecord.findOne({ eventKey, recipient: admin._id });
          if (!existing) {
            const notif = await new NotificationRecord({
              recipient: admin._id,
              recipientRole: 'admin',
              institutionId: wf.institutionId?._id || wf.institutionId,
              releaseRequestId: wf.releaseRequestId,
              type: 'task_escalation',
              priority: 'urgent',
              title: `ESCALATION: Overdue Clearance Task (${task.department.toUpperCase()})`,
              message: `Task '${task.name}' for ${wf.institutionId?.name || 'Institution'} has passed its regulatory SLA deadline by ${Math.abs(Math.round(hoursRemaining))} hours. Administrative intervention required.`,
              eventKey
            }).save();
            alertsCreated.push(notif);
          }
        }
      }
    }

    if (wfModified) {
      await wf.save();
    }
  }

  return alertsCreated;
}

/**
 * Computes bottleneck analytics and workload intelligence across all workflows
 */
async function computeBottleneckAnalytics() {
  const workflows = await ClearanceWorkflow.find().populate('institutionId', 'name code').lean();

  const departmentStats = {
    administrative: { pendingCount: 0, totalHours: 0, completedCount: 0, overdueCount: 0 },
    finance: { pendingCount: 0, totalHours: 0, completedCount: 0, overdueCount: 0 },
    approval_bureau: { pendingCount: 0, totalHours: 0, completedCount: 0, overdueCount: 0 },
    pgrc: { pendingCount: 0, totalHours: 0, completedCount: 0, overdueCount: 0 },
    vigilance: { pendingCount: 0, totalHours: 0, completedCount: 0, overdueCount: 0 },
    authorized_cell: { pendingCount: 0, totalHours: 0, completedCount: 0, overdueCount: 0 }
  };

  const blockedCases = [];
  const now = new Date();

  workflows.forEach(wf => {
    const isWfActive = !['approved', 'rejected', 'closed'].includes(wf.status);

    if (isWfActive && wf.blockedReasons && wf.blockedReasons.length > 0) {
      blockedCases.push({
        workflowId: wf._id,
        releaseRequestId: wf.releaseRequestId,
        institutionName: wf.institutionId?.name || 'Authorized Institution',
        status: wf.status,
        reasons: wf.blockedReasons,
        daysInState: Math.max(1, Math.round((now.getTime() - new Date(wf.updatedAt || wf.createdAt).getTime()) / (1000 * 60 * 60 * 24)))
      });
    }

    (wf.tasks || []).forEach(task => {
      const dept = departmentStats[task.department];
      if (!dept) return;

      if (task.status === 'pending' || task.status === 'in_progress') {
        dept.pendingCount += 1;
        if (task.dueDate && new Date(task.dueDate) < now) {
          dept.overdueCount += 1;
        }
      } else if (task.status === 'cleared' && task.clearedAt) {
        dept.completedCount += 1;
        const durationHours = (new Date(task.clearedAt).getTime() - new Date(task.createdAt).getTime()) / (1000 * 60 * 60);
        dept.totalHours += Math.max(1, durationHours);
      }
    });
  });

  const departmentAverages = Object.keys(departmentStats).map(key => {
    const d = departmentStats[key];
    const avgDurationHours = d.completedCount > 0 ? Math.round(d.totalHours / d.completedCount) : 24;
    return {
      department: key,
      pendingCount: d.pendingCount,
      overdueCount: d.overdueCount,
      completedCount: d.completedCount,
      avgDurationHours
    };
  });

  // Identify recurring bottlenecks
  const recurringDelays = [];
  departmentAverages.forEach(d => {
    if (d.overdueCount > 0 || d.pendingCount >= 2) {
      recurringDelays.push({
        department: d.department,
        issue: `${d.department.toUpperCase()} has ${d.pendingCount} active task(s) (${d.overdueCount} overdue). Historical baseline average duration is ${d.avgDurationHours} hours.`,
        recommendation: `Follow up with designated ${d.department.toUpperCase()} officers or reassign backlog.`
      });
    }
  });

  return {
    totalWorkflows: workflows.length,
    activeWorkflows: workflows.filter(w => !['approved', 'rejected', 'closed'].includes(w.status)).length,
    blockedCasesCount: blockedCases.length,
    blockedCases,
    departmentAverages,
    recurringDelays
  };
}

/**
 * Generates an evidence-grounded AI Next-Action recommendation for a specific case
 */
async function generateAINextActionRecommendation(workflow) {
  const tasks = workflow.tasks || [];
  const docs = workflow.documents || [];
  const fdr = workflow.fdrId || {};
  const inst = workflow.institutionId || {};

  // Formulate deterministic, evidence-based recommendations
  const unverifiedDocs = docs.filter(d => d.status !== 'verified');
  const rejectedDocs = docs.filter(d => d.status === 'rejected');
  const clarifDocs = docs.filter(d => d.status === 'clarification_required');
  const clearedTasks = tasks.filter(t => t.status === 'cleared');
  const pendingTasks = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress');
  const blockedTasks = tasks.filter(t => t.status === 'blocked');

  let recommendation = '';
  let blockersSummary = [];
  let immediateNextStep = '';

  if (rejectedDocs.length > 0) {
    immediateNextStep = `Institution must re-upload rejected document(s): ${rejectedDocs.map(d => d.docType).join(', ')}.`;
    blockersSummary.push(`Document rejection: ${rejectedDocs.map(d => `${d.docType} (${d.observations || 'Defective'})`).join('; ')}`);
  } else if (clarifDocs.length > 0) {
    immediateNextStep = `Await institutional response to clarification notices on ${clarifDocs.map(d => d.docType).join(', ')}.`;
    blockersSummary.push(`Pending clarifications: ${clarifDocs.map(d => d.docType).join(', ')}`);
  } else if (unverifiedDocs.length > 0) {
    immediateNextStep = `Designated scrutiny officers must complete verification of ${unverifiedDocs.map(d => d.docType).join(', ')}.`;
    blockersSummary.push(`${unverifiedDocs.length} document(s) pending verification.`);
  } else if (pendingTasks.length > 0) {
    const pgrc = tasks.find(t => t.taskKey === 'pgrc_clearance');
    const vig = tasks.find(t => t.taskKey === 'vigilance_clearance');
    const pendingNames = pendingTasks.map(t => t.name).join(', ');

    immediateNextStep = `Parallel departmental clearance in progress: ${pendingNames}.`;
    if (pgrc && pgrc.status !== 'cleared') blockersSummary.push('PGRC grievance clearance pending');
    if (vig && vig.status !== 'cleared') blockersSummary.push('Vigilance CVO clearance pending');
  } else if (workflow.status === 'ready_for_final_review') {
    immediateNextStep = `All statutory prerequisites satisfied. Approval Bureau Officer is authorized to record Final Sanction and release joint lien.`;
  }

  recommendation = `Case ${workflow._id} (${inst.name || 'Institution'}) is currently in '${workflow.status}' state. ` +
    (blockersSummary.length > 0 ? `Current blockers: ${blockersSummary.join(', ')}. ` : 'No active blockers. ') +
    `Recommended Next Action: ${immediateNextStep}`;

  return {
    caseId: workflow._id,
    currentStatus: workflow.status,
    verifiedDocsCount: docs.length - unverifiedDocs.length,
    totalDocsCount: docs.length,
    clearedTasksCount: clearedTasks.length,
    totalTasksCount: tasks.length,
    immediateNextStep,
    blockersSummary,
    fullRecommendation: recommendation
  };
}

module.exports = {
  monitorDeadlinesAndEscalate,
  computeBottleneckAnalytics,
  generateAINextActionRecommendation
};

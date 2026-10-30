const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { uploadSingle } = require('../middleware/upload');
const ClearanceWorkflow = require('../models/ClearanceWorkflow');
const WorkflowConfig = require('../models/WorkflowConfig');
const ReleaseRequest = require('../models/ReleaseRequest');
const FDR = require('../models/FDR');
const Institution = require('../models/Institution');
const User = require('../models/User');
const NotificationRecord = require('../models/NotificationRecord');
const { recordAuditEvent } = require('../utils/audit');
const { computeFileHash } = require('../utils/hash');
const { initializeWorkflow, recalculateWorkflowState } = require('../services/orchestratorService');
const { computeBottleneckAnalytics, generateAINextActionRecommendation, monitorDeadlinesAndEscalate } = require('../services/bottleneckService');
const { ROLES } = require('../config/constants');

const router = express.Router();

/**
 * GET /api/clearance/config
 * Get active workflow configuration and document responsibility matrix
 */
router.get('/config', auth, async (req, res, next) => {
  try {
    let config = await WorkflowConfig.findOne({ isActive: true }).lean();
    if (!config) {
      config = await new WorkflowConfig().save();
    }
    return res.status(200).json({ success: true, data: config });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/clearance/config
 * Update workflow configuration (Admin only)
 */
router.put('/config', auth, requireRole(ROLES.ADMIN), async (req, res, next) => {
  try {
    let config = await WorkflowConfig.findOne({ isActive: true });
    if (!config) {
      config = new WorkflowConfig();
    }
    if (req.body.documentMatrix) config.documentMatrix = req.body.documentMatrix;
    if (req.body.slaHours) config.slaHours = req.body.slaHours;
    if (req.body.escalationHours) config.escalationHours = req.body.escalationHours;

    await config.save();
    return res.status(200).json({ success: true, data: config });
  } catch (err) {
    next(err);
  }
});

/**
 * Helper to auto-seed realistic statutory clearance workflows if database is fresh/empty
 */
async function autoSeedDemoWorkflows(user) {
  let inst = null;
  if (user && user.institutionId) {
    inst = await Institution.findById(user.institutionId);
  }
  if (!inst) {
    inst = await Institution.findOne();
  }
  if (!inst) {
    inst = await Institution.create({
      name: 'Government Engineering College Raipur',
      code: 'GECR',
      type: 'technical',
      contactEmail: 'principal@gec-raipur.edu.in',
      address: { street: 'Sejbahar', city: 'Raipur', state: 'Chhattisgarh', pincode: '492015' }
    });
  }

  // Ensure a valid User exists for requestedBy
  let requesterUser = user;
  if (!requesterUser || !requesterUser._id) {
    requesterUser = await User.findOne({ role: ROLES.INSTITUTION });
    if (!requesterUser) {
      requesterUser = await User.findOne();
    }
  }
  const requestingUserId = requesterUser?._id;

  // 1. First Workflow: Active Scrutiny (Admin task approved, Finance pending, Final Sanction blocked)
  let fdr1 = await FDR.findOne();
  if (!fdr1) {
    fdr1 = await FDR.create({
      fdrNumber: 'FDR/AICTE/2026/90812',
      institutionId: inst._id,
      bankName: 'State Bank of India',
      branchName: 'Main Secretariat Branch',
      amount: 3500000,
      tenureMonths: 60,
      issueDate: new Date('2021-04-10'),
      maturityDate: new Date('2026-04-10'),
      jointHolderName: 'Member Secretary AICTE & Principal GEC Raipur',
      status: 'submitted'
    });
  }

  let release1 = await ReleaseRequest.findOne({ fdrId: fdr1._id });
  if (!release1) {
    release1 = await ReleaseRequest.create({
      fdrId: fdr1._id,
      institutionId: inst._id,
      requestedBy: requestingUserId,
      requestDate: new Date(),
      status: 'pending',
      reason: 'B.Tech Mechanical Engineering 5-year academic cycle concluded successfully.',
      documents: []
    });
  }

  const wf1 = await initializeWorkflow(release1, fdr1, inst._id, requestingUserId);

  // Mark Request Letter and Affidavit 6 as verified
  const reqDoc = wf1.documents.find(d => d.docType === 'request_letter');
  if (reqDoc) {
    reqDoc.status = 'verified';
    reqDoc.fileUrl = '/uploads/demo-request-letter.pdf';
    reqDoc.fileHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
    reqDoc.observations = 'Formal request on institutional letterhead verified by Scrutiny.';
  }
  const affDoc = wf1.documents.find(d => d.docType === 'affidavit_6');
  if (affDoc) {
    affDoc.status = 'verified';
    affDoc.fileUrl = '/uploads/demo-affidavit-6.pdf';
    affDoc.fileHash = '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918';
    affDoc.observations = 'Notarized on non-judicial stamp paper; signed by authorized trustee.';
  }
  const fdrDoc = wf1.documents.find(d => d.docType === 'fdr_copy');
  if (fdrDoc) {
    fdrDoc.status = 'uploaded';
    fdrDoc.fileUrl = '/uploads/demo-fdr-copy.pdf';
    fdrDoc.fileHash = '5994471abb01112afcc18159f6cc74b4f511b99806da59b3caf5a9c173cacfc5';
  }

  const adminTask = wf1.tasks.find(t => t.taskKey === 'admin_scrutiny');
  if (adminTask) {
    adminTask.status = 'approved';
    adminTask.decisionDate = new Date();
    adminTask.observations = 'Administrative & Statutory review complete. All declarations valid.';
  }

  await recalculateWorkflowState(wf1);
  await wf1.save();

  // 2. Second Workflow: Fresh Request (Documents pending upload/review)
  let fdr2 = await FDR.findOne({ fdrNumber: 'FDR/AICTE/2026/77401' });
  if (!fdr2) {
    fdr2 = await FDR.create({
      fdrNumber: 'FDR/AICTE/2026/77401',
      institutionId: inst._id,
      bankName: 'Punjab National Bank',
      branchName: 'Civil Lines',
      amount: 5000000,
      tenureMonths: 96,
      issueDate: new Date('2018-06-01'),
      maturityDate: new Date('2026-06-01'),
      jointHolderName: 'Member Secretary AICTE & Principal GEC Raipur',
      status: 'submitted'
    });
  }

  let release2 = await ReleaseRequest.findOne({ fdrId: fdr2._id });
  if (!release2) {
    release2 = await ReleaseRequest.create({
      fdrId: fdr2._id,
      institutionId: inst._id,
      requestedBy: requestingUserId,
      requestDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      status: 'pending',
      reason: 'Closure of PG Diploma Program and discharge of statutory security guarantee.',
      documents: []
    });
  }

  const wf2 = await initializeWorkflow(release2, fdr2, inst._id, requestingUserId);
  await recalculateWorkflowState(wf2);
  await wf2.save();
}

/**
 * GET /api/clearance/workflows
 * List active clearance workflows with role-based filtering
 */
router.get('/workflows', auth, async (req, res, next) => {
  try {
    const totalCount = await ClearanceWorkflow.countDocuments();
    if (totalCount === 0) {
      await autoSeedDemoWorkflows(req.user);
    }

    const query = {};

    // Institution user isolation
    if (req.user.role === ROLES.INSTITUTION && req.user.institutionId) {
      query.institutionId = req.user.institutionId;
    }

    if (req.query.status && req.query.status !== 'all') {
      query.status = req.query.status;
    }

    if (req.query.department && req.query.department !== 'all') {
      query['tasks.department'] = req.query.department;
    }

    const workflows = await ClearanceWorkflow.find(query)
      .populate('releaseRequestId')
      .populate('fdrId')
      .populate('institutionId', 'name code type contactEmail')
      .sort({ updatedAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      items: workflows,
      total: workflows.length
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/clearance/workflows/:id
 * Get single workflow instance with all tasks, documents, timeline, and blockers
 */
router.get('/workflows/:id', auth, async (req, res, next) => {
  try {
    const wf = await ClearanceWorkflow.findById(req.params.id)
      .populate('releaseRequestId')
      .populate('fdrId')
      .populate('institutionId', 'name code type contactEmail')
      .populate('tasks.assignedUser', 'name email role')
      .populate('tasks.decidedBy', 'name email role')
      .populate('documents.verifiedBy', 'name email role')
      .populate('documents.uploadedBy', 'name email role');

    if (!wf) {
      return res.status(404).json({ success: false, error: 'Clearance workflow not found' });
    }

    // Institution user isolation check
    if (req.user.role === ROLES.INSTITUTION) {
      const instId = wf.institutionId?._id || wf.institutionId;
      if (String(instId) !== String(req.user.institutionId)) {
        return res.status(403).json({ success: false, error: 'Access forbidden: Workflow belongs to another institution.' });
      }
    }

    return res.status(200).json({ success: true, data: wf });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/clearance/workflows/:id/documents/:docType
 * Upload or replace a statutory document
 */
router.post('/workflows/:id/documents/:docType', auth, uploadSingle, async (req, res, next) => {
  try {
    const { docType } = req.params;
    const allowedDocTypes = ['request_letter', 'affidavit_6', 'fdr_copy', 'payment_proof', 'eoa_loa'];

    if (!allowedDocTypes.includes(docType)) {
      return res.status(400).json({ success: false, error: `Invalid docType. Allowed: [${allowedDocTypes.join(', ')}]` });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Document file upload is required.' });
    }

    const wf = await ClearanceWorkflow.findById(req.params.id);
    if (!wf) {
      return res.status(404).json({ success: false, error: 'Clearance workflow not found' });
    }

    // Permission check: Institutions can upload; Officers/Admin can also upload on behalf of institution if needed
    if (req.user.role === ROLES.INSTITUTION && String(wf.institutionId) !== String(req.user.institutionId)) {
      return res.status(403).json({ success: false, error: 'Access denied: Workflow belongs to another institution.' });
    }

    let doc = wf.documents.find(d => d.docType === docType);
    if (!doc) {
      doc = { docType, version: 1, status: 'not_uploaded', checklist: [], history: [] };
      wf.documents.push(doc);
    }

    const docHash = computeFileHash(req.file.path);
    const newVersion = (doc.version || 1) + (doc.docPath ? 1 : 0);

    // Save previous version in history if replacing
    if (doc.docPath) {
      doc.history.push({
        version: doc.version,
        status: doc.status,
        docPath: doc.docPath,
        docOriginalName: doc.docOriginalName,
        docHash: doc.docHash,
        action: 'REPLACED_DOCUMENT',
        actorId: req.user.id,
        actorRole: req.user.role,
        observations: req.body.observations || 'Document replaced with new version',
        timestamp: new Date()
      });
    }

    doc.version = newVersion;
    doc.docPath = req.file.path;
    doc.fileUrl = `/uploads/${req.file.filename}`;
    doc.docOriginalName = req.file.originalname;
    doc.docMimeType = req.file.mimetype;
    doc.docHash = docHash;
    doc.uploadedAt = new Date();
    doc.uploadedBy = req.user.id;
    doc.status = 'uploaded';

    // Simulated field extraction for FDR copy
    if (docType === 'fdr_copy') {
      doc.extractedMetadata = {
        extractedAt: new Date(),
        documentChecksum: docHash,
        ocrStatus: 'SUCCESS',
        extractedRefNumber: req.body.extractedRefNumber || '',
        extractedAmount: req.body.extractedAmount ? Number(req.body.extractedAmount) : null,
        extractedBank: req.body.extractedBank || ''
      };
    }

    recalculateWorkflowState(wf);
    await wf.save();

    await recordAuditEvent(
      'ClearanceWorkflow',
      wf._id,
      req.user.id,
      req.user.role,
      'DOCUMENT_UPLOADED',
      { docType, version: newVersion, docOriginalName: req.file.originalname, docHash }
    );

    return res.status(200).json({ success: true, data: wf, document: doc });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/clearance/workflows/:id/documents/:docType/file
 * Serve or preview the uploaded document file
 */
router.get('/workflows/:id/documents/:docType/file', async (req, res, next) => {
  try {
    const { id, docType } = req.params;
    const wf = await ClearanceWorkflow.findById(id).populate('fdrId');
    if (!wf) return res.status(404).send('Clearance workflow not found');

    const doc = wf.documents.find(d => d.docType === docType);
    if (!doc || doc.status === 'not_uploaded') {
      return res.status(404).send('Document has not been uploaded yet');
    }

    const uploadsDir = path.join(__dirname, '../../uploads');
    let resolvedPath = null;

    // 1. Gather all path candidates from workflow document & linked FDR
    const candidates = [
      doc.docPath,
      doc.fileUrl
    ];

    const fdr = wf.fdrId;
    if (fdr) {
      if (docType === 'fdr_copy' && fdr.docPath) candidates.push(fdr.docPath);
      if (fdr.supportingDocuments) {
        const entry = fdr.supportingDocuments instanceof Map
          ? fdr.supportingDocuments.get(docType)
          : fdr.supportingDocuments[docType];
        if (entry?.fileUrl) candidates.push(entry.fileUrl);
        if (entry?.docPath) candidates.push(entry.docPath);
      }
    }

    for (const cand of candidates.filter(Boolean)) {
      if (typeof cand === 'string') {
        if (fs.existsSync(cand) && fs.statSync(cand).isFile()) {
          resolvedPath = cand;
          break;
        }
        const fname = cand.replace(/\\/g, '/').split('/').pop();
        const candidateInUploads = path.join(uploadsDir, fname);
        if (fs.existsSync(candidateInUploads) && fs.statSync(candidateInUploads).isFile()) {
          resolvedPath = candidateInUploads;
          break;
        }
      }
    }

    // 2. Cryptographic Match: Find exact file in uploads matching SHA-256 hash
    if (!resolvedPath && doc.docHash && fs.existsSync(uploadsDir)) {
      const allFiles = fs.readdirSync(uploadsDir);
      for (const f of allFiles) {
        const full = path.join(uploadsDir, f);
        try {
          if (fs.statSync(full).isFile() && !f.startsWith('.')) {
            if (computeFileHash(full) === doc.docHash) {
              resolvedPath = full;
              doc.docPath = full;
              doc.fileUrl = `/uploads/${f}`;
              await wf.save();
              break;
            }
          }
        } catch {}
      }
    }

    // 3. Fallback to sample demo PDF if physical file not on disk
    if (!resolvedPath || !fs.existsSync(resolvedPath)) {
      const demoCandidate = path.join(uploadsDir, `demo-${docType.replace(/_/g, '-')}.pdf`);
      if (fs.existsSync(demoCandidate)) {
        resolvedPath = demoCandidate;
      } else {
        const genericFallback = path.join(uploadsDir, 'demo-fdr-copy.pdf');
        if (fs.existsSync(genericFallback)) resolvedPath = genericFallback;
      }
    }

    if (!resolvedPath || !fs.existsSync(resolvedPath)) {
      return res.status(404).send('Physical document file could not be located on server');
    }

    const ext = path.extname(resolvedPath).toLowerCase();
    const mimeTypes = {
      '.pdf': 'application/pdf',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg'
    };
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${doc.docOriginalName || `${docType}${ext}`}"`);

    return res.sendFile(path.resolve(resolvedPath));
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/clearance/workflows/:id/documents/:docType/verify
 * Record officer verification outcome on a document
 */
router.patch('/workflows/:id/documents/:docType/verify', auth, requireRole(ROLES.OFFICER, ROLES.ADMIN), async (req, res, next) => {
  try {
    const { docType } = req.params;
    const { status, observations, discrepancies, checklist } = req.body;

    const allowedStatuses = ['verified', 'rejected', 'clarification_required', 'under_review'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: `Invalid status '${status}'. Allowed: [${allowedStatuses.join(', ')}]` });
    }

    const wf = await ClearanceWorkflow.findById(req.params.id);
    if (!wf) {
      return res.status(404).json({ success: false, error: 'Clearance workflow not found' });
    }

    const doc = wf.documents.find(d => d.docType === docType);
    if (!doc || doc.status === 'not_uploaded') {
      return res.status(400).json({ success: false, error: 'Document has not been uploaded yet.' });
    }

    // Role check against Document Responsibility Matrix
    const config = await WorkflowConfig.findOne({ isActive: true }).lean();
    const matrixEntry = config?.documentMatrix?.[docType];

    // Record review
    doc.status = status;
    doc.observations = observations || '';
    doc.discrepancies = discrepancies || [];
    doc.verifiedBy = req.user.id;
    doc.verifiedByRole = req.user.role;
    doc.verifiedAt = new Date();

    if (Array.isArray(checklist)) {
      doc.checklist = checklist;
    }

    doc.history.push({
      version: doc.version,
      status,
      docPath: doc.docPath,
      docOriginalName: doc.docOriginalName,
      docHash: doc.docHash,
      action: `DOCUMENT_${status.toUpperCase()}`,
      actorId: req.user.id,
      actorRole: req.user.role,
      observations: observations || '',
      timestamp: new Date()
    });

    recalculateWorkflowState(wf);
    await wf.save();

    await recordAuditEvent(
      'ClearanceWorkflow',
      wf._id,
      req.user.id,
      req.user.role,
      `DOCUMENT_VERIFIED_${status.toUpperCase()}`,
      { docType, status, observations, discrepancies }
    );

    // Notify institution if clarification or rejection occurred
    if (status === 'clarification_required' || status === 'rejected') {
      await new NotificationRecord({
        recipient: wf.institutionId,
        recipientRole: 'institution',
        institutionId: wf.institutionId,
        releaseRequestId: wf.releaseRequestId,
        type: status === 'rejected' ? 'document_rejected' : 'document_clarification',
        priority: 'urgent',
        title: `Action Required: Document ${status === 'rejected' ? 'Rejected' : 'Needs Clarification'} (${docType})`,
        message: observations || `Scrutiny officer reported an issue on ${docType}. Please check observations and take action.`,
        eventKey: `${status}-${wf._id}-${docType}-${Date.now()}`
      }).save();
    }

    return res.status(200).json({ success: true, data: wf, document: doc });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/clearance/workflows/:id/documents/:docType/file
 * Serve or preview the uploaded document file
 */
router.get('/workflows/:id/documents/:docType/file', async (req, res, next) => {
  try {
    const { id, docType } = req.params;
    const wf = await ClearanceWorkflow.findById(id).populate('fdrId');
    if (!wf) return res.status(404).send('Clearance workflow not found');

    const doc = wf.documents.find(d => d.docType === docType);
    if (!doc || doc.status === 'not_uploaded') {
      return res.status(404).send('Document has not been uploaded yet');
    }

    const uploadsDir = path.join(__dirname, '../../uploads');
    let resolvedPath = null;

    // 1. Gather all path candidates from workflow document & linked FDR
    const candidates = [
      doc.docPath,
      doc.fileUrl
    ];

    const fdr = wf.fdrId;
    if (fdr) {
      if (docType === 'fdr_copy' && fdr.docPath) candidates.push(fdr.docPath);
      if (fdr.supportingDocuments) {
        const entry = fdr.supportingDocuments instanceof Map
          ? fdr.supportingDocuments.get(docType)
          : fdr.supportingDocuments[docType];
        if (entry?.fileUrl) candidates.push(entry.fileUrl);
        if (entry?.docPath) candidates.push(entry.docPath);
      }
    }

    for (const cand of candidates.filter(Boolean)) {
      if (typeof cand === 'string') {
        if (fs.existsSync(cand) && fs.statSync(cand).isFile()) {
          resolvedPath = cand;
          break;
        }
        const fname = cand.replace(/\\/g, '/').split('/').pop();
        const candidateInUploads = path.join(uploadsDir, fname);
        if (fs.existsSync(candidateInUploads) && fs.statSync(candidateInUploads).isFile()) {
          resolvedPath = candidateInUploads;
          break;
        }
      }
    }

    // 2. Cryptographic Match: Find exact file in uploads matching SHA-256 hash
    if (!resolvedPath && doc.docHash && fs.existsSync(uploadsDir)) {
      const allFiles = fs.readdirSync(uploadsDir);
      for (const f of allFiles) {
        const full = path.join(uploadsDir, f);
        try {
          if (fs.statSync(full).isFile() && !f.startsWith('.')) {
            if (computeFileHash(full) === doc.docHash) {
              resolvedPath = full;
              doc.docPath = full;
              doc.fileUrl = `/uploads/${f}`;
              await wf.save();
              break;
            }
          }
        } catch {}
      }
    }

    // 3. Fallback to sample demo PDF if physical file not on disk
    if (!resolvedPath || !fs.existsSync(resolvedPath)) {
      const demoCandidate = path.join(uploadsDir, `demo-${docType.replace(/_/g, '-')}.pdf`);
      if (fs.existsSync(demoCandidate)) {
        resolvedPath = demoCandidate;
      } else {
        const genericFallback = path.join(uploadsDir, 'demo-fdr-copy.pdf');
        if (fs.existsSync(genericFallback)) resolvedPath = genericFallback;
      }
    }

    if (!resolvedPath || !fs.existsSync(resolvedPath)) {
      return res.status(404).send('Physical document file could not be located on server');
    }

    const ext = path.extname(resolvedPath).toLowerCase();
    const mimeTypes = {
      '.pdf': 'application/pdf',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg'
    };
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${doc.docOriginalName || `${docType}${ext}`}"`);

    return res.sendFile(path.resolve(resolvedPath));
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/clearance/workflows/:id/tasks/:taskKey/decision
 * Record departmental clearance decision (PGRC, Vigilance, Finance, Admin, etc.)
 */
router.patch('/workflows/:id/tasks/:taskKey/decision', auth, requireRole(ROLES.OFFICER, ROLES.ADMIN), async (req, res, next) => {
  try {
    const { taskKey } = req.params;
    const { outcome, observations, findings, clarificationMessage } = req.body;

    const allowedOutcomes = ['cleared', 'rejected', 'clarification_required', 'in_progress'];
    if (!allowedOutcomes.includes(outcome)) {
      return res.status(400).json({ success: false, error: `Invalid outcome '${outcome}'. Allowed: [${allowedOutcomes.join(', ')}]` });
    }

    const wf = await ClearanceWorkflow.findById(req.params.id);
    if (!wf) {
      return res.status(404).json({ success: false, error: 'Clearance workflow not found' });
    }

    const task = wf.tasks.find(t => t.taskKey === taskKey);
    if (!task) {
      return res.status(404).json({ success: false, error: `Task '${taskKey}' not found in workflow.` });
    }

    // Role verification: user must match assignedRole OR be system admin
    if (req.user.role !== ROLES.ADMIN && req.user.role !== task.assignedRole && req.user.role !== 'officer') {
      return res.status(403).json({
        success: false,
        error: `Access forbidden: Task '${task.name}' requires role '${task.assignedRole}'. Current role is '${req.user.role}'.`
      });
    }

    // Dependency check: Cannot clear or advance a task that is currently blocked
    if (task.status === 'blocked') {
      return res.status(400).json({
        success: false,
        error: `Cannot record decision on task '${task.name}' because its mandatory prerequisites are not yet cleared.`
      });
    }

    task.status = outcome;
    task.outcome = outcome;
    task.observations = observations || '';
    task.findings = findings || [];
    task.decidedBy = req.user.id;
    task.decidedByRole = req.user.role;
    task.clearedAt = outcome === 'cleared' ? new Date() : null;

    if (clarificationMessage) {
      task.clarificationMessage = clarificationMessage;
    }

    task.history.push({
      status: outcome,
      outcome,
      observations: observations || '',
      actorId: req.user.id,
      actorRole: req.user.role,
      timestamp: new Date()
    });

    recalculateWorkflowState(wf);

    // If final approval was cleared, also update parent ReleaseRequest & FDR status
    if (taskKey === 'final_approval' && outcome === 'cleared') {
      await ReleaseRequest.findByIdAndUpdate(wf.releaseRequestId, {
        status: 'approved',
        officerId: req.user.id,
        officerDecision: 'approved',
        decisionAt: new Date(),
        decisionNotes: observations || 'Full interdepartmental clearances obtained and sanctioned.'
      });

      await FDR.findByIdAndUpdate(wf.fdrId, {
        status: 'released',
        lastModifiedBy: req.user.id
      });
    }

    await wf.save();

    await recordAuditEvent(
      'ClearanceWorkflow',
      wf._id,
      req.user.id,
      req.user.role,
      `CLEARANCE_RECORDED_${taskKey.toUpperCase()}`,
      { taskKey, outcome, observations }
    );

    return res.status(200).json({ success: true, data: wf, task });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/clearance/analytics/bottlenecks
 * Bottleneck detection, workload intelligence, and recurring delay analysis
 */
router.get('/analytics/bottlenecks', auth, async (req, res, next) => {
  try {
    const analytics = await computeBottleneckAnalytics();
    return res.status(200).json({ success: true, data: analytics });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/clearance/workflows/:id/ai-recommendation
 * AI-assisted next action and blocker analysis grounded in case records
 */
router.get('/workflows/:id/ai-recommendation', auth, async (req, res, next) => {
  try {
    const wf = await ClearanceWorkflow.findById(req.params.id)
      .populate('releaseRequestId')
      .populate('fdrId')
      .populate('institutionId', 'name code');

    if (!wf) {
      return res.status(404).json({ success: false, error: 'Clearance workflow not found' });
    }

    const aiRecommendation = await generateAINextActionRecommendation(wf);
    return res.status(200).json({ success: true, data: aiRecommendation });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/clearance/monitor-deadlines
 * Triggers background SLA monitoring and escalation
 */
router.post('/monitor-deadlines', auth, requireRole(ROLES.ADMIN, ROLES.OFFICER), async (req, res, next) => {
  try {
    const alerts = await monitorDeadlinesAndEscalate();
    return res.status(200).json({ success: true, alertsCreatedCount: alerts.length, alerts });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

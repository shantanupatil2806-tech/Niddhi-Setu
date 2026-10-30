const express = require('express');
const { body, validationResult } = require('express-validator');
const ReleaseRequest = require('../models/ReleaseRequest');
const FDR = require('../models/FDR');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { uploadMultiple } = require('../middleware/upload');
const { ROLES, RELEASE_STATUS, FDR_STATUS } = require('../config/constants');
const { recordAuditEvent } = require('../utils/audit');
const { computeFileHash } = require('../utils/hash');
const { initializeWorkflow } = require('../services/orchestratorService');

const router = express.Router();

/**
 * GET /api/releases & /api/release-requests
 * List release requests with status filters
 */
router.get('/', auth, async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = {};

    if (req.user.role === ROLES.INSTITUTION) {
      query.institutionId = req.user.institutionId;
    }

    if (status) query.status = status;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, parseInt(limit, 10));
    const skip = (pageNum - 1) * limitNum;

    const [releases, total] = await Promise.all([
      ReleaseRequest.find(query)
        .populate('fdrId')
        .populate('institutionId', 'name code type')
        .populate('requestedBy', 'name email')
        .populate('officerId', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      ReleaseRequest.countDocuments(query)
    ]);

    return res.status(200).json({
      success: true,
      data: releases,
      items: releases,
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
 * POST /api/releases & /api/release-requests
 * Submit a request to release/refund an FDR deposit
 */
router.post('/', auth, uploadMultiple, async (req, res, next) => {
  try {
    const { fdrId, reason, amount } = req.body;

    if (!fdrId || !reason) {
      return res.status(400).json({
        success: false,
        error: 'fdrId and justification reason are required'
      });
    }

    const fdr = await FDR.findById(fdrId);
    if (!fdr) {
      return res.status(404).json({ success: false, error: 'FDR instrument not found' });
    }

    if (req.user.role === ROLES.INSTITUTION && String(fdr.institutionId) !== String(req.user.institutionId)) {
      return res.status(403).json({ success: false, error: 'Access denied: FDR belongs to another institution.' });
    }

    // GUARD: FDR must be verified before a release request can be submitted
    if (fdr.status !== FDR_STATUS.VERIFIED && fdr.status !== FDR_STATUS.MATURED) {
      return res.status(400).json({
        success: false,
        error: `Release request cannot be submitted: FDR instrument is currently '${fdr.status}'. The FDR must be verified by the AICTE Finance Officer through the Verification Queue before a release request can be initiated.`,
        code: 'FDR_NOT_VERIFIED',
        currentStatus: fdr.status
      });
    }

    const uploadedDocuments = [];
    if (req.files && Array.isArray(req.files)) {
      for (const file of req.files) {
        uploadedDocuments.push({
          docPath: file.path,
          docHash: computeFileHash(file.path),
          docOriginalName: file.originalname
        });
      }
    }

    const releaseRequest = new ReleaseRequest({
      fdrId: fdr._id,
      institutionId: fdr.institutionId,
      requestedBy: req.user.id,
      reason,
      status: RELEASE_STATUS.PENDING,
      amount: amount ? Number(amount) : fdr.amount,
      documents: uploadedDocuments
    });

    await releaseRequest.save();

    // Automatically initialize Interdepartmental Clearance Workflow
    let workflow = null;
    try {
      workflow = await initializeWorkflow(releaseRequest, fdr, fdr.institutionId, req.user.id);
    } catch (wfErr) {
      console.error('[ClearanceOrchestrator] Error initializing workflow:', wfErr.message);
    }

    await recordAuditEvent(
      'ReleaseRequest',
      releaseRequest._id,
      req.user.id,
      req.user.role,
      'RELEASE_REQUESTED',
      { fdrId: fdr._id, reason, amount: releaseRequest.amount }
    );

    return res.status(201).json({
      success: true,
      data: releaseRequest,
      workflow
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/releases/:id & /api/release-requests/:id
 * Retrieve details of a release request
 */
router.get('/:id', auth, async (req, res, next) => {
  try {
    const release = await ReleaseRequest.findById(req.params.id)
      .populate('fdrId')
      .populate('institutionId', 'name code type contactEmail')
      .populate('requestedBy', 'name email')
      .populate('officerId', 'name email')
      .lean();

    if (!release) {
      return res.status(404).json({ success: false, error: 'Release request not found' });
    }

    if (req.user.role === ROLES.INSTITUTION && String(release.institutionId._id) !== String(req.user.institutionId)) {
      return res.status(403).json({ success: false, error: 'Access denied: Request belongs to another institution.' });
    }

    return res.status(200).json({
      success: true,
      data: release
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/releases/:id/decision & /api/release-requests/:id/decision
 * Officer/Admin records release approval, rejection, or completion
 */
router.patch('/:id/decision', auth, requireRole(ROLES.OFFICER, ROLES.ADMIN), async (req, res, next) => {
  try {
    const { decision, decisionNotes } = req.body;
    const permittedDecisions = [RELEASE_STATUS.APPROVED, RELEASE_STATUS.REJECTED, RELEASE_STATUS.RELEASED, RELEASE_STATUS.UNDER_REVIEW];

    if (!decision || !permittedDecisions.includes(decision)) {
      return res.status(400).json({
        success: false,
        error: `Invalid decision '${decision}'. Permitted: [${permittedDecisions.join(', ')}]`
      });
    }

    const release = await ReleaseRequest.findById(req.params.id);
    if (!release) {
      return res.status(404).json({ success: false, error: 'Release request not found' });
    }

    release.status = decision;
    release.officerId = req.user.id;
    release.officerDecision = decision;
    release.decisionAt = new Date();
    release.decisionNotes = decisionNotes || '';

    await release.save();

    // If fully approved or released, update FDR status to released
    if (decision === RELEASE_STATUS.RELEASED || decision === RELEASE_STATUS.APPROVED) {
      await FDR.findByIdAndUpdate(release.fdrId, {
        status: FDR_STATUS.RELEASED,
        lastModifiedBy: req.user.id
      });

      await recordAuditEvent(
        'FDR',
        release.fdrId,
        req.user.id,
        req.user.role,
        'FDR_RELEASED',
        { releaseRequestId: release._id, decisionNotes }
      );
    }

    await recordAuditEvent(
      'ReleaseRequest',
      release._id,
      req.user.id,
      req.user.role,
      'RELEASE_DECISION_RECORDED',
      { decision, decisionNotes }
    );

    return res.status(200).json({
      success: true,
      data: release
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

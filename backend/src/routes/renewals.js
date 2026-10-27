const express = require('express');
const { body, validationResult } = require('express-validator');
const RenewalOrReplacement = require('../models/RenewalOrReplacement');
const FDR = require('../models/FDR');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { ROLES, RENEWAL_STATUS, RENEWAL_TYPE, FDR_STATUS } = require('../config/constants');
const { recordAuditEvent } = require('../utils/audit');

const router = express.Router();

/**
 * GET /api/renewals
 * List renewal and replacement requests (institution sees own; officer/admin sees all)
 */
router.get('/', auth, async (req, res, next) => {
  try {
    const { status, type, page = 1, limit = 20 } = req.query;
    const query = {};

    if (req.user.role === ROLES.INSTITUTION) {
      query.institutionId = req.user.institutionId;
    }

    if (status) query.status = status;
    if (type) query.type = type;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, parseInt(limit, 10));
    const skip = (pageNum - 1) * limitNum;

    const [renewals, total] = await Promise.all([
      RenewalOrReplacement.find(query)
        .populate('fdrId')
        .populate('previousFdrId')
        .populate('institutionId', 'name code')
        .populate('submittedBy', 'name email')
        .populate('approvedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      RenewalOrReplacement.countDocuments(query)
    ]);

    return res.status(200).json({
      success: true,
      data: renewals,
      items: renewals,
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
 * POST /api/renewals
 * Submit a renewal or replacement link between a new FDR and predecessor FDR
 */
router.post(
  '/',
  auth,
  [
    body('fdrId').isMongoId().withMessage('Valid new FDR ID is required'),
    body('previousFdrId').isMongoId().withMessage('Valid previous FDR ID is required'),
    body('type').optional().isIn(Object.values(RENEWAL_TYPE)).withMessage('Invalid renewal type')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: 'Validation Error', details: errors.array() });
      }

      const { fdrId, previousFdrId, type = RENEWAL_TYPE.RENEWAL, notes } = req.body;

      const [newFdr, prevFdr] = await Promise.all([
        FDR.findById(fdrId),
        FDR.findById(previousFdrId)
      ]);

      if (!newFdr || !prevFdr) {
        return res.status(404).json({ success: false, error: 'One or both FDR records could not be found' });
      }

      // Authorization check for institution user
      if (req.user.role === ROLES.INSTITUTION) {
        if (
          String(newFdr.institutionId) !== String(req.user.institutionId) ||
          String(prevFdr.institutionId) !== String(req.user.institutionId)
        ) {
          return res.status(403).json({ success: false, error: 'Access denied: FDRs belong to another institution.' });
        }
      }

      // Link parent pointer on new FDR if not already linked
      newFdr.parentFdrId = prevFdr._id;
      await newFdr.save();

      const renewal = new RenewalOrReplacement({
        fdrId: newFdr._id,
        previousFdrId: prevFdr._id,
        type,
        institutionId: newFdr.institutionId,
        status: RENEWAL_STATUS.PENDING,
        submittedBy: req.user.id,
        notes: notes || ''
      });

      await renewal.save();

      await recordAuditEvent(
        'RenewalOrReplacement',
        renewal._id,
        req.user.id,
        req.user.role,
        'RENEWAL_SUBMITTED',
        { fdrId, previousFdrId, type, notes }
      );

      return res.status(201).json({
        success: true,
        data: renewal
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/renewals/:id
 * Retrieve details of a renewal record
 */
router.get('/:id', auth, async (req, res, next) => {
  try {
    const renewal = await RenewalOrReplacement.findById(req.params.id)
      .populate('fdrId')
      .populate('previousFdrId')
      .populate('institutionId', 'name code type')
      .populate('submittedBy', 'name email')
      .populate('approvedBy', 'name email')
      .lean();

    if (!renewal) {
      return res.status(404).json({ success: false, error: 'Renewal record not found' });
    }

    if (req.user.role === ROLES.INSTITUTION && String(renewal.institutionId._id) !== String(req.user.institutionId)) {
      return res.status(403).json({ success: false, error: 'Access denied: Renewal belongs to another institution.' });
    }

    return res.status(200).json({
      success: true,
      data: renewal
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/renewals/:id/status
 * Officer/Admin approves or rejects the renewal/replacement
 */
router.patch('/:id/status', auth, requireRole(ROLES.OFFICER, ROLES.ADMIN), async (req, res, next) => {
  try {
    const { status, notes } = req.body;
    if (!status || ![RENEWAL_STATUS.APPROVED, RENEWAL_STATUS.REJECTED].includes(status)) {
      return res.status(400).json({ success: false, error: 'Status must be either approved or rejected' });
    }

    const renewal = await RenewalOrReplacement.findById(req.params.id);
    if (!renewal) {
      return res.status(404).json({ success: false, error: 'Renewal record not found' });
    }

    renewal.status = status;
    renewal.approvedBy = req.user.id;
    if (notes) renewal.notes = notes;
    await renewal.save();

    if (status === RENEWAL_STATUS.APPROVED) {
      // Mark previous FDR as matured/superseded
      await FDR.findByIdAndUpdate(renewal.previousFdrId, {
        status: FDR_STATUS.MATURED,
        lastModifiedBy: req.user.id
      });
    }

    await recordAuditEvent(
      'RenewalOrReplacement',
      renewal._id,
      req.user.id,
      req.user.role,
      status === RENEWAL_STATUS.APPROVED ? 'RENEWAL_APPROVED' : 'RENEWAL_REJECTED',
      { status, notes, previousFdrId: renewal.previousFdrId, newFdrId: renewal.fdrId }
    );

    return res.status(200).json({
      success: true,
      data: renewal
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

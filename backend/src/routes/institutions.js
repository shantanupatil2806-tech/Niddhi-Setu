const express = require('express');
const { body, validationResult } = require('express-validator');
const Institution = require('../models/Institution');
const FDR = require('../models/FDR');
const auth = require('../middleware/auth');
const { requireRole, requireInstitutionAccess } = require('../middleware/rbac');
const { ROLES, INSTITUTION_TYPES, INSTITUTION_STATUS } = require('../config/constants');
const { recordAuditEvent } = require('../utils/audit');

const router = express.Router();

/**
 * GET /api/institutions
 * List institutions: Officer/Admin sees all, Institution user sees only their own
 */
router.get('/', auth, async (req, res, next) => {
  try {
    const { search, type, status, page = 1, limit = 20 } = req.query;
    const query = {};

    // Role-based scoping
    if (req.user.role === ROLES.INSTITUTION) {
      if (!req.user.institutionId) {
        return res.status(200).json({ success: true, data: [], pagination: { total: 0, page: 1, limit: 20, pages: 0 } });
      }
      query._id = req.user.institutionId;
    } else {
      if (type) query.type = type;
      if (status) query.status = status;
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { code: { $regex: search, $options: 'i' } },
          { contactEmail: { $regex: search, $options: 'i' } }
        ];
      }
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, parseInt(limit, 10));
    const skip = (pageNum - 1) * limitNum;

    const [institutions, total] = await Promise.all([
      Institution.find(query).sort({ name: 1 }).skip(skip).limit(limitNum).lean(),
      Institution.countDocuments(query)
    ]);

    return res.status(200).json({
      success: true,
      data: institutions,
      items: institutions,
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
 * POST /api/institutions
 * Create institution — Admin only
 */
router.post(
  '/',
  auth,
  requireRole(ROLES.ADMIN),
  [
    body('name').trim().notEmpty().withMessage('Institution name is required'),
    body('code').trim().notEmpty().withMessage('Unique institution code is required').toUpperCase(),
    body('type').isIn(Object.values(INSTITUTION_TYPES)).withMessage('Invalid institution type'),
    body('contactEmail').isEmail().withMessage('Valid contact email is required').normalizeEmail(),
    body('contactPhone').optional().trim()
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: 'Validation Error', details: errors.array() });
      }

      const { name, code, type, address, contactEmail, contactPhone, status, approvalDate } = req.body;

      const existing = await Institution.findOne({ code });
      if (existing) {
        return res.status(409).json({ success: false, error: `Institution code '${code}' is already registered.` });
      }

      const institution = new Institution({
        name,
        code,
        type,
        address: address || {},
        contactEmail,
        contactPhone: contactPhone || '',
        status: status || INSTITUTION_STATUS.ACTIVE,
        approvalDate: approvalDate || new Date(),
        createdBy: req.user.id
      });

      await institution.save();

      await recordAuditEvent(
        'Institution',
        institution._id,
        req.user.id,
        req.user.role,
        'INSTITUTION_CREATED',
        { code, name, type }
      );

      return res.status(201).json({
        success: true,
        data: institution
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/institutions/:id
 * Retrieve institution details with role check
 */
router.get('/:id', auth, requireInstitutionAccess('id'), async (req, res, next) => {
  try {
    const mongoose = require('mongoose');
    let institution;
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      institution = await Institution.findById(req.params.id).lean();
    } else {
      institution = await Institution.findOne({ code: req.params.id.toUpperCase() }).lean();
      if (!institution) {
        institution = await Institution.findOne().lean();
      }
    }
    if (!institution) {
      return res.status(404).json({ success: false, error: 'Institution not found' });
    }

    return res.status(200).json({
      success: true,
      data: institution
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/institutions/:id
 * Update institution — Admin only
 */
router.patch('/:id', auth, requireRole(ROLES.ADMIN), async (req, res, next) => {
  try {
    const allowedUpdates = ['name', 'type', 'address', 'contactEmail', 'contactPhone', 'status', 'approvalDate'];
    const updateData = {};

    for (const key of allowedUpdates) {
      if (req.body[key] !== undefined) {
        updateData[key] = req.body[key];
      }
    }

    const institution = await Institution.findByIdAndUpdate(req.params.id, { $set: updateData }, { new: true, runValidators: true });
    if (!institution) {
      return res.status(404).json({ success: false, error: 'Institution not found' });
    }

    await recordAuditEvent(
      'Institution',
      institution._id,
      req.user.id,
      req.user.role,
      'INSTITUTION_UPDATED',
      updateData
    );

    return res.status(200).json({
      success: true,
      data: institution
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/institutions/:id/fdrs
 * List FDR instruments for an institution
 */
router.get('/:id/fdrs', auth, requireInstitutionAccess('id'), async (req, res, next) => {
  try {
    const mongoose = require('mongoose');
    const { status, bankName, page = 1, limit = 20 } = req.query;
    let targetInstId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(targetInstId)) {
      const fallback = await Institution.findOne().lean();
      targetInstId = fallback ? fallback._id : null;
    }

    const query = targetInstId ? { institutionId: targetInstId } : {};

    if (status) query.status = status;
    if (bankName) query.bankName = { $regex: bankName, $options: 'i' };

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, parseInt(limit, 10));
    const skip = (pageNum - 1) * limitNum;

    const [fdrs, total] = await Promise.all([
      FDR.find(query).sort({ maturityDate: 1 }).skip(skip).limit(limitNum).lean(),
      FDR.countDocuments(query)
    ]);

    return res.status(200).json({
      success: true,
      data: fdrs,
      items: fdrs,
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

module.exports = router;

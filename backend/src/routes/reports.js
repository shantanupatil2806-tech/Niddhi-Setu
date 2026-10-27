const express = require('express');
const { body, validationResult } = require('express-validator');
const FDR = require('../models/FDR');
const User = require('../models/User');
const AuditEvent = require('../models/AuditEvent');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { ROLES } = require('../config/constants');
const { recordAuditEvent } = require('../utils/audit');

const router = express.Router();

/**
 * GET /api/reports/export
 * Officer/Admin data export in CSV or JSON format with filtering
 */
router.get('/export', auth, requireRole(ROLES.OFFICER, ROLES.ADMIN), async (req, res, next) => {
  try {
    const { format = 'json', institutionId, status, bankName, startDate, endDate } = req.query;
    const query = {};

    if (institutionId) query.institutionId = institutionId;
    if (status) query.status = status;
    if (bankName) query.bankName = { $regex: bankName, $options: 'i' };

    if (startDate || endDate) {
      query.issueDate = {};
      if (startDate) query.issueDate.$gte = new Date(startDate);
      if (endDate) query.issueDate.$lte = new Date(endDate);
    }

    const records = await FDR.find(query)
      .populate('institutionId', 'name code')
      .populate('submittedBy', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    if (format.toLowerCase() === 'csv') {
      const headers = [
        'Reference Number',
        'Institution Name',
        'Institution Code',
        'Bank Name',
        'Branch',
        'Amount (INR)',
        'Issue Date',
        'Maturity Date',
        'Status',
        'Verification Status',
        'Compliance Score'
      ];

      const csvRows = [headers.join(',')];

      for (const item of records) {
        const row = [
          `"${item.refNumber || ''}"`,
          `"${item.institutionId ? item.institutionId.name : ''}"`,
          `"${item.institutionId ? item.institutionId.code : ''}"`,
          `"${item.bankName || ''}"`,
          `"${item.branch || ''}"`,
          item.amount || 0,
          `"${item.issueDate ? new Date(item.issueDate).toISOString().slice(0, 10) : ''}"`,
          `"${item.maturityDate ? new Date(item.maturityDate).toISOString().slice(0, 10) : ''}"`,
          `"${item.status || ''}"`,
          `"${item.verificationStatus || ''}"`,
          item.complianceScore || 100
        ];
        csvRows.push(row.join(','));
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=fdr-sentinel-export-${Date.now()}.csv`);
      return res.status(200).send(csvRows.join('\r\n'));
    }

    return res.status(200).json({
      success: true,
      count: records.length,
      data: records
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/reports/admin/users
 * Administrator: List system users with pagination and search
 */
router.get('/admin/users', auth, requireRole(ROLES.ADMIN), async (req, res, next) => {
  try {
    const { role, search, page = 1, limit = 20 } = req.query;
    const query = {};

    if (role) query.role = role;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, parseInt(limit, 10));
    const skip = (pageNum - 1) * limitNum;

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-passwordHash')
        .populate('institutionId', 'name code type')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      User.countDocuments(query)
    ]);

    return res.status(200).json({
      success: true,
      data: users,
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
 * POST /api/reports/admin/users
 * Administrator: Create new administrative, officer, or institutional user
 */
router.post(
  '/admin/users',
  auth,
  requireRole(ROLES.ADMIN),
  [
    body('name').trim().notEmpty().withMessage('User name is required'),
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').isIn(Object.values(ROLES)).withMessage('Invalid role specified')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: 'Validation Error', details: errors.array() });
      }

      const { name, email, password, role, institutionId } = req.body;

      const existing = await User.findOne({ email });
      if (existing) {
        return res.status(409).json({ success: false, error: 'Email address is already in use.' });
      }

      if (role === ROLES.INSTITUTION && !institutionId) {
        return res.status(400).json({ success: false, error: 'institutionId is required for institution user role' });
      }

      const passwordHash = await User.hashPassword(password);
      const user = new User({
        name,
        email,
        passwordHash,
        role,
        institutionId: role === ROLES.INSTITUTION ? institutionId : null,
        isActive: true
      });

      await user.save();

      await recordAuditEvent(
        'User',
        user._id,
        req.user.id,
        req.user.role,
        'USER_CREATED',
        { email, role, institutionId }
      );

      return res.status(201).json({
        success: true,
        data: user
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PATCH /api/reports/admin/users/:id
 * Administrator: Update user role, active status, or institution assignment
 */
router.patch('/admin/users/:id', auth, requireRole(ROLES.ADMIN), async (req, res, next) => {
  try {
    const { name, role, isActive, institutionId, password } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (name !== undefined) user.name = name;
    if (role !== undefined && Object.values(ROLES).includes(role)) user.role = role;
    if (isActive !== undefined) user.isActive = Boolean(isActive);
    if (institutionId !== undefined) user.institutionId = institutionId;
    if (password && password.length >= 6) {
      user.passwordHash = await User.hashPassword(password);
    }

    await user.save();

    await recordAuditEvent(
      'User',
      user._id,
      req.user.id,
      req.user.role,
      'USER_UPDATED',
      { role: user.role, isActive: user.isActive, institutionId: user.institutionId }
    );

    return res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/reports/audit-logs and /api/reports/admin/audit-log
 * Officer/Admin: Paginated immutable cryptographic audit event trail
 */
router.get(['/audit-logs', '/admin/audit-log'], auth, async (req, res, next) => {
  try {
    const { entityType, entityId, action, page = 1, limit = 50 } = req.query;
    const query = {};

    if (entityType) query.entityType = entityType;
    if (entityId) query.entityId = entityId;
    if (action) query.action = action;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, parseInt(limit, 10));
    const skip = (pageNum - 1) * limitNum;

    const [events, total] = await Promise.all([
      AuditEvent.find(query)
        .populate('actor', 'name email role')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      AuditEvent.countDocuments(query)
    ]);

    return res.status(200).json({
      success: true,
      data: events,
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

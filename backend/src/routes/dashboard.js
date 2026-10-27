const express = require('express');
const mongoose = require('mongoose');
const FDR = require('../models/FDR');
const VerificationCase = require('../models/VerificationCase');
const RenewalOrReplacement = require('../models/RenewalOrReplacement');
const ReleaseRequest = require('../models/ReleaseRequest');
const AuditEvent = require('../models/AuditEvent');
const auth = require('../middleware/auth');
const { ROLES, FDR_STATUS, VERIFICATION_STATUS, CASE_PRIORITY } = require('../config/constants');
const VerificationFinding = require('../models/VerificationFinding');

const router = express.Router();

const toObjectId = (id) => {
  if (!id) return null;
  if (typeof id === 'object' && id._id) id = id._id;
  const idStr = String(id);
  return mongoose.Types.ObjectId.isValid(idStr) ? new mongoose.Types.ObjectId(idStr) : id;
};

/**
 * GET /api/dashboard/summary
 * Key portfolio metrics and summary counts
 */
router.get('/summary', auth, async (req, res, next) => {
  try {
    const fdrQuery = {};
    const renewalQuery = {};
    const releaseQuery = {};

    if (req.user.role === ROLES.INSTITUTION && req.user.institutionId) {
      const instId = toObjectId(req.user.institutionId);
      fdrQuery.institutionId = instId;
      renewalQuery.institutionId = instId;
      releaseQuery.institutionId = instId;
    }

    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [
      total,
      active,
      approachingMaturity,
      overdue,
      pendingVerification,
      clarificationRequired,
      renewedCount,
      releasePendingCount,
      totalAmountResult
    ] = await Promise.all([
      FDR.countDocuments(fdrQuery),
      FDR.countDocuments({ ...fdrQuery, status: FDR_STATUS.VERIFIED }),
      FDR.countDocuments({
        ...fdrQuery,
        maturityDate: { $gte: now, $lte: in30Days },
        status: { $nin: [FDR_STATUS.MATURED, FDR_STATUS.RELEASED, FDR_STATUS.REJECTED] }
      }),
      FDR.countDocuments({
        ...fdrQuery,
        maturityDate: { $lt: now },
        status: { $nin: [FDR_STATUS.MATURED, FDR_STATUS.RELEASED, FDR_STATUS.REJECTED] }
      }),
      FDR.countDocuments({ ...fdrQuery, status: FDR_STATUS.SUBMITTED }),
      FDR.countDocuments({ ...fdrQuery, status: FDR_STATUS.CLARIFICATION_REQUIRED }),
      RenewalOrReplacement.countDocuments(renewalQuery),
      ReleaseRequest.countDocuments({ ...releaseQuery, status: 'pending' }),
      FDR.aggregate([
        { $match: fdrQuery },
        { $group: { _id: null, totalAmount: { $sum: '$amount' } } }
      ])
    ]);

    const totalGuaranteeAmount = totalAmountResult.length > 0 ? totalAmountResult[0].totalAmount : 0;

    return res.status(200).json({
      success: true,
      data: {
        total,
        totalFdrs: total,
        active,
        activeFdrs: active,
        approaching_maturity: approachingMaturity,
        approachingMaturity,
        overdue,
        overdueFdrs: overdue,
        pending_verification: pendingVerification,
        pendingVerification,
        clarification_required: clarificationRequired,
        needsClarification: clarificationRequired,
        renewed: renewedCount,
        renewedFdrs: renewedCount,
        release_pending: releasePendingCount,
        releasePending: releasePendingCount,
        total_guarantee_amount: totalGuaranteeAmount,
        totalDepositValue: totalGuaranteeAmount
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/dashboard/maturity-trend
 * Projected maturity timelines across the next 12 months
 */
router.get('/maturity-trend', auth, async (req, res, next) => {
  try {
    const fdrQuery = {
      status: { $nin: [FDR_STATUS.MATURED, FDR_STATUS.RELEASED, FDR_STATUS.REJECTED] }
    };

    if (req.user.role === ROLES.INSTITUTION && req.user.institutionId) {
      fdrQuery.institutionId = toObjectId(req.user.institutionId);
    }

    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOf12Months = new Date(now.getFullYear(), now.getMonth() + 12, 0, 23, 59, 59);

    fdrQuery.maturityDate = { $gte: startOfCurrentMonth, $lte: endOf12Months };

    const rawTrends = await FDR.aggregate([
      { $match: fdrQuery },
      {
        $group: {
          _id: {
            year: { $year: '$maturityDate' },
            month: { $month: '$maturityDate' }
          },
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    // Build complete consecutive 12 month series
    const trendMap = new Map();
    for (const item of rawTrends) {
      const key = `${item._id.year}-${String(item._id.month).padStart(2, '0')}`;
      trendMap.set(key, { count: item.count, amount: item.totalAmount });
    }

    const trend = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const key = `${y}-${String(m).padStart(2, '0')}`;
      const entry = trendMap.get(key) || { count: 0, amount: 0 };

      trend.push({
        monthKey: key,
        label: `${monthNames[d.getMonth()]} ${y}`,
        month: `${monthNames[d.getMonth()]} ${y}`,
        count: entry.count,
        amount: entry.amount,
        totalAmount: entry.amount
      });
    }

    return res.status(200).json({
      success: true,
      data: trend
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/dashboard/recent-activity
 * Latest immutable audit log events across the registry
 */
router.get('/recent-activity', auth, async (req, res, next) => {
  try {
    const limit = Math.min(50, parseInt(req.query.limit, 10) || 20);
    const query = {};

    const events = await AuditEvent.find(query)
      .populate('actor', 'name email role')
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();

    return res.status(200).json({
      success: true,
      data: events
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/dashboard/compliance-distribution
 * Distribution of verification statuses and average compliance scores
 */
router.get('/compliance-distribution', auth, async (req, res, next) => {
  try {
    const fdrQuery = {};
    if (req.user.role === ROLES.INSTITUTION && req.user.institutionId) {
      fdrQuery.institutionId = toObjectId(req.user.institutionId);
    }

    const distribution = await FDR.aggregate([
      { $match: fdrQuery },
      {
        $group: {
          _id: '$verificationStatus',
          count: { $sum: 1 },
          avgScore: { $avg: '$complianceScore' }
        }
      }
    ]);

    // Format all potential statuses
    const statuses = Object.values(VERIFICATION_STATUS);
    const result = statuses.map((status) => {
      const found = distribution.find((d) => d._id === status);
      return {
        status,
        count: found ? found.count : 0,
        averageComplianceScore: found ? Math.round(found.avgScore || 0) : 100
      };
    });

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
});


/**
 * GET /api/dashboard/high-priority
 * Returns FDRs that need urgent action: clarification required, critical compliance score, or approaching maturity
 */
router.get('/high-priority', auth, async (req, res, next) => {
  try {
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const fdrQuery = {
      $or: [
        { status: FDR_STATUS.CLARIFICATION_REQUIRED },
        { status: FDR_STATUS.UNDER_REVIEW, complianceScore: { $lt: 80 } },
        {
          maturityDate: { $gte: now, $lte: in30Days },
          status: { $nin: [FDR_STATUS.MATURED, FDR_STATUS.RELEASED, FDR_STATUS.REJECTED] }
        }
      ]
    };

    if (req.user.role === ROLES.INSTITUTION && req.user.institutionId) {
      fdrQuery.institutionId = toObjectId(req.user.institutionId);
    }

    const cases = await FDR.find(fdrQuery)
      .populate('institutionId', 'name code')
      .populate('submittedBy', 'name email')
      .sort({ complianceScore: 1, maturityDate: 1 })
      .limit(10)
      .lean();

    return res.status(200).json({ success: true, data: cases });
  } catch (err) {
    next(err);
  }
});

module.exports = router;


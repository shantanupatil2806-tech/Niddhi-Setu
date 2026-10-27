const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const FDR = require('../models/FDR');
const ReleaseRequest = require('../models/ReleaseRequest');
const VerificationCase = require('../models/VerificationCase');
const AuditEvent = require('../models/AuditEvent');
const { ROLES } = require('../config/constants');

/**
 * GET /api/notifications
 * Returns contextual alerts and notifications for the user's institution
 */
router.get('/', auth, async (req, res, next) => {
  try {
    const notifications = [];
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const fdrQuery = {};
    if (req.user.role === ROLES.INSTITUTION && req.user.institutionId) {
      const instId = typeof req.user.institutionId === 'object'
        ? req.user.institutionId._id || req.user.institutionId.id
        : req.user.institutionId;
      fdrQuery.institutionId = instId;
    }

    // 1. Approaching maturity alerts
    const expiringFdrs = await FDR.find({
      ...fdrQuery,
      maturityDate: { $gte: now, $lte: in30Days },
      status: { $nin: ['matured', 'released', 'rejected'] }
    }).limit(10).lean();

    expiringFdrs.forEach(fdr => {
      const daysLeft = Math.ceil((new Date(fdr.maturityDate) - now) / (1000 * 60 * 60 * 24));
      notifications.push({
        id: `mat-${fdr._id}`,
        type: 'maturity',
        priority: daysLeft <= 15 ? 'urgent' : 'warning',
        title: `Maturity Reminder: ${fdr.refNumber}`,
        message: `FDR deposit of ₹${(fdr.amount).toLocaleString('en-IN')} matures in ${daysLeft} days (${new Date(fdr.maturityDate).toLocaleDateString()}). Please initiate rollover or renewal.`,
        fdrId: fdr._id,
        refNumber: fdr.refNumber,
        timestamp: fdr.maturityDate,
        read: false,
      });
    });

    // 2. Clarifications required
    const clarificationCases = await FDR.find({
      ...fdrQuery,
      status: 'clarification_required'
    }).limit(5).lean();

    clarificationCases.forEach(fdr => {
      notifications.push({
        id: `clar-${fdr._id}`,
        type: 'clarification',
        priority: 'urgent',
        title: `Clarification Required: ${fdr.refNumber}`,
        message: `AICTE scrutiny officer has requested clarifying evidence for deposit ${fdr.refNumber} (${fdr.bankName}).`,
        fdrId: fdr._id,
        refNumber: fdr.refNumber,
        timestamp: fdr.updatedAt || fdr.createdAt,
        read: false,
      });
    });

    // 3. Release Request approvals/updates
    const releaseQuery = {};
    if (req.user.role === ROLES.INSTITUTION && req.user.institutionId) {
      const instId = typeof req.user.institutionId === 'object'
        ? req.user.institutionId._id || req.user.institutionId.id
        : req.user.institutionId;
      releaseQuery.institutionId = instId;
    }

    const releaseReqs = await ReleaseRequest.find(releaseQuery)
      .populate('fdrId', 'refNumber bankName amount')
      .sort({ updatedAt: -1 })
      .limit(5)
      .lean();

    releaseReqs.forEach(rel => {
      const fdrRef = rel.fdrId ? rel.fdrId.refNumber : 'FDR';
      if (rel.status === 'approved' || rel.status === 'released') {
        notifications.push({
          id: `rel-${rel._id}`,
          type: 'release',
          priority: 'success',
          title: `Release Sanction Approved: ${fdrRef}`,
          message: `Lien release and NOC clearance approved by Council. ${rel.decisionNotes || ''}`,
          fdrId: rel.fdrId?._id,
          refNumber: fdrRef,
          timestamp: rel.decisionAt || rel.updatedAt,
          read: true,
        });
      } else if (rel.status === 'pending') {
        notifications.push({
          id: `rel-${rel._id}`,
          type: 'release',
          priority: 'info',
          title: `Release Request Under Review: ${fdrRef}`,
          message: `Application for deposit encashment submitted and queued for scrutiny.`,
          fdrId: rel.fdrId?._id,
          refNumber: fdrRef,
          timestamp: rel.createdAt,
          read: true,
        });
      }
    });

    // 4. Recently verified FDRs
    const verifiedFdrs = await FDR.find({
      ...fdrQuery,
      status: 'verified'
    }).sort({ updatedAt: -1 }).limit(3).lean();

    verifiedFdrs.forEach(fdr => {
      notifications.push({
        id: `ver-${fdr._id}`,
        type: 'verification',
        priority: 'success',
        title: `Deposit Verified: ${fdr.refNumber}`,
        message: `FDR instrument of ₹${(fdr.amount).toLocaleString('en-IN')} successfully verified and placed in regulatory custody.`,
        fdrId: fdr._id,
        refNumber: fdr.refNumber,
        timestamp: fdr.updatedAt,
        read: true,
      });
    });

    // Sort notifications by timestamp desc
    notifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return res.status(200).json({
      success: true,
      data: notifications,
      unreadCount: notifications.filter(n => !n.read).length
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

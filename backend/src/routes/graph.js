const express = require('express');
const auth = require('../middleware/auth');
const { requireInstitutionAccess } = require('../middleware/rbac');
const { buildInstitutionGraph, buildFDRGraph } = require('../services/graphService');
const FDR = require('../models/FDR');
const { ROLES } = require('../config/constants');

const router = express.Router();

const mongoose = require('mongoose');
const Institution = require('../models/Institution');

/**
 * GET /api/graph/institution/:id
 * Retrieve React Flow graph representation for an institution
 */
router.get('/institution/:id?', auth, async (req, res, next) => {
  try {
    let id = req.params.id;
    if (req.user.role === ROLES.INSTITUTION) {
      id = req.user.institutionId;
    } else if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      const firstInst = await Institution.findOne().sort({ createdAt: 1 });
      id = firstInst ? firstInst._id : null;
    }

    if (!id) {
      return res.status(404).json({ success: false, error: 'Institution not found' });
    }

    const graphData = await buildInstitutionGraph(id);
    return res.status(200).json({
      success: true,
      data: graphData
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/graph/fdr/:id
 * Retrieve React Flow graph representation centered on a specific FDR
 */
router.get('/fdr/:id', auth, async (req, res, next) => {
  try {
    const fdr = await FDR.findById(req.params.id).lean();
    if (!fdr) {
      return res.status(404).json({ success: false, error: 'FDR instrument not found' });
    }

    if (req.user.role === ROLES.INSTITUTION && String(fdr.institutionId) !== String(req.user.institutionId)) {
      return res.status(403).json({ success: false, error: 'Access denied: FDR belongs to another institution.' });
    }

    const graphData = await buildFDRGraph(req.params.id);
    return res.status(200).json({
      success: true,
      data: graphData
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

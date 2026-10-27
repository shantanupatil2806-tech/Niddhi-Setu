const mongoose = require('mongoose');
const { FINDING_SEVERITY, FINDING_CATEGORY } = require('../config/constants');

const verificationFindingSchema = new mongoose.Schema(
  {
    caseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VerificationCase',
      required: true,
      index: true
    },
    fdrId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FDR',
      required: true,
      index: true
    },
    rule: {
      type: String,
      required: [true, 'Rule ID is required'],
      trim: true,
      index: true
    },
    severity: {
      type: String,
      enum: Object.values(FINDING_SEVERITY),
      default: FINDING_SEVERITY.MEDIUM,
      index: true
    },
    category: {
      type: String,
      enum: Object.values(FINDING_CATEGORY),
      required: [true, 'Category is required'],
      index: true
    },
    description: {
      type: String,
      required: [true, 'Description is required']
    },
    evidence: {
      field: { type: String, default: '' },
      value: { type: mongoose.Schema.Types.Mixed, default: null },
      expected: { type: mongoose.Schema.Types.Mixed, default: null }
    },
    suggestedAction: {
      type: String,
      default: ''
    },
    officerReviewRequired: {
      type: Boolean,
      default: false
    },
    resolvedAt: {
      type: Date,
      default: null
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    resolutionNote: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

verificationFindingSchema.index({ fdrId: 1, rule: 1 });
verificationFindingSchema.index({ caseId: 1, severity: 1 });

module.exports = mongoose.model('VerificationFinding', verificationFindingSchema);

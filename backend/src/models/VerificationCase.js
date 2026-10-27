const mongoose = require('mongoose');
const { CASE_STATUS, CASE_PRIORITY, FDR_STATUS } = require('../config/constants');

const verificationCaseSchema = new mongoose.Schema(
  {
    fdrId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FDR',
      required: [true, 'FDR reference is required'],
      index: true
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },
    status: {
      type: String,
      enum: Object.values(CASE_STATUS),
      default: CASE_STATUS.OPEN,
      index: true
    },
    priority: {
      type: String,
      enum: Object.values(CASE_PRIORITY),
      default: CASE_PRIORITY.NORMAL,
      index: true
    },
    findings: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'VerificationFinding'
      }
    ],
    passportId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VerificationPassport',
      default: null
    },
    notes: {
      type: String,
      default: ''
    },
    decision: {
      type: String,
      enum: [FDR_STATUS.VERIFIED, FDR_STATUS.REJECTED, FDR_STATUS.CLARIFICATION_REQUIRED, null],
      default: null
    },
    decisionAt: {
      type: Date,
      default: null
    },
    decisionNotes: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

verificationCaseSchema.index({ status: 1, priority: 1 });
verificationCaseSchema.index({ createdAt: -1 });

module.exports = mongoose.model('VerificationCase', verificationCaseSchema);

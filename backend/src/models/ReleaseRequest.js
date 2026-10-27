const mongoose = require('mongoose');
const { RELEASE_STATUS } = require('../config/constants');

const releaseRequestSchema = new mongoose.Schema(
  {
    fdrId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FDR',
      required: [true, 'FDR reference is required'],
      index: true
    },
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution',
      required: [true, 'Institution reference is required'],
      index: true
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Requesting user reference is required']
    },
    reason: {
      type: String,
      required: [true, 'Release justification reason is required'],
      trim: true
    },
    status: {
      type: String,
      enum: Object.values(RELEASE_STATUS),
      default: RELEASE_STATUS.PENDING,
      index: true
    },
    amount: {
      type: Number,
      default: 0
    },
    officerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    officerDecision: {
      type: String,
      default: null
    },
    decisionAt: {
      type: Date,
      default: null
    },
    decisionNotes: {
      type: String,
      default: ''
    },
    documents: [
      {
        docPath: { type: String, required: true },
        docHash: { type: String, default: null },
        docOriginalName: { type: String, default: '' }
      }
    ]
  },
  {
    timestamps: true
  }
);

releaseRequestSchema.index({ institutionId: 1, status: 1 });

module.exports = mongoose.model('ReleaseRequest', releaseRequestSchema);

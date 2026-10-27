const mongoose = require('mongoose');
const { RENEWAL_TYPE, RENEWAL_STATUS } = require('../config/constants');

const renewalOrReplacementSchema = new mongoose.Schema(
  {
    fdrId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FDR',
      required: [true, 'New FDR instrument reference is required'],
      index: true
    },
    previousFdrId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FDR',
      required: [true, 'Previous FDR instrument reference is required'],
      index: true
    },
    type: {
      type: String,
      enum: Object.values(RENEWAL_TYPE),
      default: RENEWAL_TYPE.RENEWAL,
      required: true
    },
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution',
      required: [true, 'Institution reference is required'],
      index: true
    },
    status: {
      type: String,
      enum: Object.values(RENEWAL_STATUS),
      default: RENEWAL_STATUS.PENDING,
      index: true
    },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    notes: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

renewalOrReplacementSchema.index({ institutionId: 1, status: 1 });

module.exports = mongoose.model('RenewalOrReplacement', renewalOrReplacementSchema);

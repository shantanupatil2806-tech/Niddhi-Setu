const mongoose = require('mongoose');
const { FDR_STATUS, VERIFICATION_STATUS } = require('../config/constants');

const fdrSchema = new mongoose.Schema(
  {
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution',
      required: [true, 'Institution is required'],
      index: true
    },
    refNumber: {
      type: String,
      required: [true, 'FDR Reference Number is required'],
      trim: true,
      index: true
    },
    bankName: {
      type: String,
      required: [true, 'Issuing Bank Name is required'],
      trim: true,
      index: true
    },
    branch: {
      type: String,
      trim: true,
      default: ''
    },
    bankAddress: {
      type: String,
      trim: true,
      default: ''
    },
    amount: {
      type: Number,
      required: [true, 'FDR Principal Amount is required'],
      min: [0, 'Amount cannot be negative']
    },
    currency: {
      type: String,
      default: 'INR',
      trim: true
    },
    issueDate: {
      type: Date,
      required: [true, 'Deposit Issue Date is required']
    },
    maturityDate: {
      type: Date,
      required: [true, 'Deposit Maturity Date is required'],
      index: true
    },
    depositPeriodMonths: {
      type: Number,
      min: [1, 'Deposit period must be at least 1 month']
    },
    status: {
      type: String,
      enum: Object.values(FDR_STATUS),
      default: FDR_STATUS.SUBMITTED,
      index: true
    },
    verificationStatus: {
      type: String,
      enum: Object.values(VERIFICATION_STATUS),
      default: VERIFICATION_STATUS.PENDING,
      index: true
    },
    docPath: {
      type: String,
      default: null
    },
    docOriginalName: {
      type: String,
      default: null
    },
    docHash: {
      type: String,
      default: null,
      index: true
    },
    docMimeType: {
      type: String,
      default: null
    },
    parentFdrId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FDR',
      default: null,
      index: true
    },
    metadata: {
      extractedRefNumber: { type: String, default: null },
      extractedAmount: { type: Number, default: null },
      extractedIssueDate: { type: Date, default: null },
      extractedMaturityDate: { type: Date, default: null },
      extractedBankName: { type: String, default: null },
      ocrConfidence: { type: Number, default: 0.95 }
    },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    complianceScore: {
      type: Number,
      default: 100,
      min: 0,
      max: 100
    },
    riskFlags: [
      {
        type: String,
        trim: true
      }
    ]
  },
  {
    timestamps: true
  }
);

// Compound index for unique refNumber per institution if active
fdrSchema.index({ institutionId: 1, refNumber: 1 });
fdrSchema.index({ maturityDate: 1, status: 1 });
fdrSchema.index({ refNumber: 'text', bankName: 'text' });

module.exports = mongoose.model('FDR', fdrSchema);

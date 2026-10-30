const mongoose = require('mongoose');
const { FDR_STATUS, VERIFICATION_STATUS } = require('../config/constants');
const { calculateMaturityValuation, calculateAccruedInterest } = require('../utils/financialCalculations');

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
    // Realistic Statutory Financial & Interest Yield Particulars
    interestRate: {
      type: Number,
      default: 7.1, // standard 7.10% p.a.
      min: [0, 'Interest rate cannot be negative'],
      max: [20, 'Interest rate exceeds standard commercial ceiling']
    },
    compoundingFrequency: {
      type: String,
      enum: ['quarterly', 'monthly', 'half_yearly', 'annual', 'simple'],
      default: 'quarterly'
    },
    interestPayoutType: {
      type: String,
      enum: ['cumulative', 'periodic_payout'],
      default: 'cumulative' // Cumulative reinvestment per standard AICTE APH
    },
    maturityAmount: {
      type: Number,
      default: null
    },
    accruedInterest: {
      type: Number,
      default: 0
    },
    tdsApplicable: {
      type: Boolean,
      default: false // educational trusts generally submit 15G/15H or 197 certificates
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
    supportingDocuments: {
      type: Map,
      of: {
        docType: String,
        fileUrl: String,
        originalName: String,
        fileHash: String,
        mimeType: String,
        uploadedAt: { type: Date, default: Date.now }
      },
      default: {}
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

// Auto-calculate maturityAmount & accruedInterest before saving
fdrSchema.pre('save', function (next) {
  if (this.amount && this.issueDate && this.maturityDate) {
    const diffMs = new Date(this.maturityDate).getTime() - new Date(this.issueDate).getTime();
    const months = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24 * 30.4375)));
    this.depositPeriodMonths = months;

    const rate = this.interestRate || 7.1;
    const freq = this.compoundingFrequency || 'quarterly';

    // Calculate projected total value on maturity
    const val = calculateMaturityValuation(this.amount, rate, months, freq);
    this.maturityAmount = val.maturityAmount;

    // Calculate current accrued interest as of today
    const accrued = calculateAccruedInterest(this.amount, rate, this.issueDate, new Date(), freq);
    this.accruedInterest = accrued.accruedInterest;
  }
  next();
});

// Compound index for unique refNumber per institution if active
fdrSchema.index({ institutionId: 1, refNumber: 1 });
fdrSchema.index({ maturityDate: 1, status: 1 });
fdrSchema.index({ refNumber: 'text', bankName: 'text' });

module.exports = mongoose.model('FDR', fdrSchema);

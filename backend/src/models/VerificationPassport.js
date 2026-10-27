const mongoose = require('mongoose');

const verificationPassportSchema = new mongoose.Schema(
  {
    caseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VerificationCase',
      required: true,
      unique: true,
      index: true
    },
    fdrId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FDR',
      required: true,
      index: true
    },
    originalDocHash: {
      type: String,
      default: null,
      index: true
    },
    submittedMetadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    extractedFields: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    findings: [
      {
        findingId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'VerificationFinding'
        },
        rule: { type: String, required: true },
        severity: { type: String, required: true },
        description: { type: String, required: true },
        evidence: { type: mongoose.Schema.Types.Mixed, default: {} },
        raisedAt: { type: Date, default: Date.now }
      }
    ],
    decisions: [
      {
        actor: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        actorRole: { type: String, required: true },
        decision: { type: String, required: true },
        notes: { type: String, default: '' },
        timestamp: { type: Date, default: Date.now }
      }
    ],
    auditChain: [
      {
        eventId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'AuditEvent'
        },
        hash: { type: String, required: true },
        timestamp: { type: Date, default: Date.now }
      }
    ],
    integrityVerified: {
      type: Boolean,
      default: true
    },
    lastIntegrityCheck: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

verificationPassportSchema.index({ fdrId: 1 });

module.exports = mongoose.model('VerificationPassport', verificationPassportSchema);

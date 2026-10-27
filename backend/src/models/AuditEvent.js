const mongoose = require('mongoose');
const crypto = require('crypto');

const auditEventSchema = new mongoose.Schema(
  {
    entityType: {
      type: String,
      required: [true, 'Entity type is required'],
      index: true
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Entity ID is required'],
      index: true
    },
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    actorRole: {
      type: String,
      required: [true, 'Actor role is required'],
      default: 'system'
    },
    action: {
      type: String,
      required: [true, 'Audit action is required']
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    previousHash: {
      type: String,
      default: '0000000000000000000000000000000000000000000000000000000000000000'
    },
    currentHash: {
      type: String,
      index: true
    },
    timestamp: {
      type: Date,
      default: Date.now,
      immutable: true,
      index: true
    }
  },
  {
    timestamps: false
  }
);

// Pre-save hook to compute tamper-evident SHA-256 hash
auditEventSchema.pre('save', function (next) {
  if (!this.timestamp) {
    this.timestamp = new Date();
  }
  const payloadStr = JSON.stringify(this.payload || {});
  const dataToHash = `${this.entityType}:${this.entityId}:${this.actor || 'anonymous'}:${this.action}:${payloadStr}:${this.timestamp.toISOString()}:${this.previousHash || '0000000000000000000000000000000000000000000000000000000000000000'}`;
  this.currentHash = crypto.createHash('sha256').update(dataToHash).digest('hex');
  next();
});

auditEventSchema.index({ entityType: 1, entityId: 1, timestamp: -1 });

module.exports = mongoose.model('AuditEvent', auditEventSchema);

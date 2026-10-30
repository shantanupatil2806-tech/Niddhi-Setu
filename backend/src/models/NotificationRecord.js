const mongoose = require('mongoose');

const notificationRecordSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    recipientRole: {
      type: String,
      required: true
    },
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution',
      default: null,
      index: true
    },
    releaseRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ReleaseRequest',
      default: null,
      index: true
    },
    type: {
      type: String,
      enum: [
        'task_assigned',
        'document_clarification',
        'document_rejected',
        'task_reminder',
        'task_escalation',
        'clearance_granted',
        'ready_for_review',
        'final_decision'
      ],
      required: true
    },
    priority: {
      type: String,
      enum: ['info', 'warning', 'urgent'],
      default: 'info'
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    eventKey: { type: String, index: true }, // To prevent duplicate alerts for the same event
    read: { type: Boolean, default: false },
    readAt: { type: Date, default: null }
  },
  { timestamps: true }
);

notificationRecordSchema.index({ recipient: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model('NotificationRecord', notificationRecordSchema);

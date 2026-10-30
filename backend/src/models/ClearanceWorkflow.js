const mongoose = require('mongoose');

const documentVerificationSchema = new mongoose.Schema(
  {
    docType: {
      type: String,
      required: true,
      enum: [
        'request_letter',
        'affidavit_6',
        'fdr_copy',
        'payment_proof',
        'eoa_loa'
      ]
    },
    version: {
      type: Number,
      default: 1
    },
    status: {
      type: String,
      enum: [
        'not_uploaded',
        'uploaded',
        'under_review',
        'verified',
        'rejected',
        'clarification_required'
      ],
      default: 'not_uploaded'
    },
    docPath: { type: String, default: null },
    fileUrl: { type: String, default: null },
    docOriginalName: { type: String, default: null },
    docMimeType: { type: String, default: null },
    docHash: { type: String, default: null },
    uploadedAt: { type: Date, default: null },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    extractedMetadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    checklist: [
      {
        item: { type: String, required: true },
        passed: { type: Boolean, default: false },
        notes: { type: String, default: '' }
      }
    ],
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    verifiedByRole: { type: String, default: null },
    verifiedAt: { type: Date, default: null },
    observations: { type: String, default: '' },
    discrepancies: [{ type: String }],
    history: [
      {
        version: Number,
        status: String,
        docPath: String,
        docOriginalName: String,
        docHash: String,
        action: String,
        actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        actorRole: String,
        observations: String,
        timestamp: { type: Date, default: Date.now }
      }
    ]
  },
  { _id: true, timestamps: true }
);

const clearanceTaskSchema = new mongoose.Schema(
  {
    taskKey: {
      type: String,
      required: true,
      enum: [
        'admin_scrutiny',
        'financial_scrutiny',
        'approval_compliance',
        'pgrc_clearance',
        'vigilance_clearance',
        'cell_clearance',
        'final_approval'
      ]
    },
    name: { type: String, required: true },
    department: {
      type: String,
      required: true,
      enum: [
        'administrative',
        'finance',
        'approval_bureau',
        'pgrc',
        'vigilance',
        'authorized_cell'
      ]
    },
    assignedRole: {
      type: String,
      required: true
    },
    assignedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    status: {
      type: String,
      enum: ['blocked', 'pending', 'in_progress', 'cleared', 'rejected', 'clarification_required'],
      default: 'pending'
    },
    isMandatory: {
      type: Boolean,
      default: true
    },
    dependsOn: [{ type: String }], // Array of taskKeys that must be 'cleared' before this task can become pending/in_progress
    dueDate: { type: Date, default: null },
    clearedAt: { type: Date, default: null },
    decidedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    decidedByRole: { type: String, default: null },
    outcome: { type: String, default: null },
    observations: { type: String, default: '' },
    findings: [{ type: String }],
    clarificationMessage: { type: String, default: '' },
    clarificationResponse: { type: String, default: '' },
    reminderSentAt: { type: Date, default: null },
    escalatedAt: { type: Date, default: null },
    history: [
      {
        status: String,
        outcome: String,
        observations: String,
        actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        actorRole: String,
        timestamp: { type: Date, default: Date.now }
      }
    ]
  },
  { _id: true, timestamps: true }
);

const clearanceWorkflowSchema = new mongoose.Schema(
  {
    releaseRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ReleaseRequest',
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
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution',
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: [
        'draft',
        'submitted',
        'document_review',
        'clarification_required',
        'departmental_clearance_in_progress',
        'awaiting_clearances',
        'ready_for_final_review',
        'approved',
        'rejected',
        'closed'
      ],
      default: 'submitted',
      index: true
    },
    // The 5 official AICTE statutory documents
    documents: [documentVerificationSchema],
    // The parallel & dependent departmental clearance tasks
    tasks: [clearanceTaskSchema],
    // Blocking reasons if the workflow cannot progress
    blockedReasons: [{ type: String }],
    // Next permitted actions calculated dynamically
    nextPermittedActions: [
      {
        action: String,
        role: String,
        description: String
      }
    ],
    // Analytics & SLA metadata
    submittedAt: { type: Date, default: Date.now },
    completedAt: { type: Date, default: null },
    totalProcessingHours: { type: Number, default: 0 },
    slaStatus: {
      type: String,
      enum: ['on_track', 'at_risk', 'breached'],
      default: 'on_track'
    }
  },
  {
    timestamps: true
  }
);

clearanceWorkflowSchema.index({ status: 1, institutionId: 1 });
clearanceWorkflowSchema.index({ 'tasks.department': 1, 'tasks.status': 1 });

module.exports = mongoose.model('ClearanceWorkflow', clearanceWorkflowSchema);

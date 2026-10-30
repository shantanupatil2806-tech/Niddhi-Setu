const mongoose = require('mongoose');

const workflowConfigSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      default: 'AICTE Standard FDR Release Policy'
    },
    version: {
      type: Number,
      default: 1
    },
    isActive: {
      type: Boolean,
      default: true
    },
    // Document Responsibility Matrix (configurable by admin)
    documentMatrix: {
      request_letter: {
        department: { type: String, default: 'administrative' },
        reviewerRole: { type: String, default: 'officer_admin' },
        checklistTemplate: [
          { type: String, default: 'Duly signed by Registrar/Authorized Trustee with official stamp' },
          { type: String, default: 'States genuine reason for guarantee release (e.g. course tenure fulfilled)' },
          { type: String, default: 'Reference number matches the submitted FDR' }
        ]
      },
      affidavit_6: {
        department: { type: String, default: 'administrative' },
        reviewerRole: { type: String, default: 'officer_admin' },
        checklistTemplate: [
          { type: String, default: 'Executed on non-judicial stamp paper of prescribed denomination' },
          { type: String, default: 'Sworn before First Class Magistrate or Notary Public' },
          { type: String, default: 'Declaration matches Trust/Society and AICTE approval record' },
          { type: String, default: 'Contains all mandatory indemnity clauses without modification' }
        ]
      },
      fdr_copy: {
        department: { type: String, default: 'finance' },
        reviewerRole: { type: String, default: 'officer_finance' },
        checklistTemplate: [
          { type: String, default: 'Clear legible scan of original Fixed Deposit Receipt' },
          { type: String, default: 'Bank name, branch IFSC, and deposit tenure match records' },
          { type: String, default: 'Joint lien in favor of AICTE explicitly marked and verified' },
          { type: String, default: 'Maturity tenure or maturity rollover validity confirmed' }
        ]
      },
      payment_proof: {
        department: { type: String, default: 'finance' },
        reviewerRole: { type: String, default: 'officer_finance' },
        checklistTemplate: [
          { type: String, default: 'Copy of Demand Draft or UTR online payment confirmation' },
          { type: String, default: 'Remitted towards RPGF / Joint Security Deposit reserve' },
          { type: String, default: 'Amount credited and reconciled with AICTE regulatory ledger' }
        ]
      },
      eoa_loa: {
        department: { type: String, default: 'approval_bureau' },
        reviewerRole: { type: String, default: 'officer_approval' },
        checklistTemplate: [
          { type: String, default: 'Latest official Letter of Approval (LoA) or Extension of Approval (EoA)' },
          { type: String, default: 'Approved course tenure and student intake fully verified' },
          { type: String, default: 'No pending compliance withdrawal or show-cause orders' }
        ]
      }
    },
    // SLA Deadlines (hours)
    slaHours: {
      document_review: { type: Number, default: 48 }, // 2 days
      departmental_clearance: { type: Number, default: 72 }, // 3 days
      final_approval: { type: Number, default: 48 }
    },
    // Automatic Reminder & Escalation (hours)
    escalationHours: {
      reminder: { type: Number, default: 48 },
      escalation: { type: Number, default: 96 }
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('WorkflowConfig', workflowConfigSchema);

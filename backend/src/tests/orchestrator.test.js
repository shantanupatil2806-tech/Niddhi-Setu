const { recalculateWorkflowState } = require('../services/orchestratorService');
const { computeBottleneckAnalytics, generateAINextActionRecommendation } = require('../services/bottleneckService');

describe('Orchestrator Dependency & Workflow Logic Tests', () => {
  it('correctly calculates blocked reasons when documents are missing', () => {
    const mockWorkflow = {
      status: 'submitted',
      documents: [
        { docType: 'request_letter', status: 'not_uploaded' },
        { docType: 'affidavit_6', status: 'not_uploaded' },
        { docType: 'fdr_copy', status: 'not_uploaded' },
        { docType: 'payment_proof', status: 'not_uploaded' },
        { docType: 'eoa_loa', status: 'not_uploaded' }
      ],
      tasks: [
        { taskKey: 'admin_scrutiny', status: 'pending', dependsOn: [] },
        { taskKey: 'final_approval', status: 'blocked', dependsOn: ['admin_scrutiny'] }
      ]
    };

    recalculateWorkflowState(mockWorkflow);

    expect(mockWorkflow.status).toBe('document_review');
    expect(mockWorkflow.blockedReasons.length).toBeGreaterThan(0);
    expect(mockWorkflow.blockedReasons[0]).toContain('5 required document(s) pending initial upload');
    expect(mockWorkflow.tasks.find(t => t.taskKey === 'final_approval').status).toBe('blocked');
  });

  it('unblocks dependent tasks when prerequisites are cleared', () => {
    const mockWorkflow = {
      status: 'awaiting_clearances',
      documents: [
        { docType: 'request_letter', status: 'verified' },
        { docType: 'affidavit_6', status: 'verified' },
        { docType: 'fdr_copy', status: 'verified' },
        { docType: 'payment_proof', status: 'verified' },
        { docType: 'eoa_loa', status: 'verified' }
      ],
      tasks: [
        { taskKey: 'admin_scrutiny', status: 'cleared', dependsOn: [] },
        { taskKey: 'financial_scrutiny', status: 'cleared', dependsOn: [] },
        { taskKey: 'approval_compliance', status: 'cleared', dependsOn: [] },
        { taskKey: 'pgrc_clearance', status: 'cleared', dependsOn: [] },
        { taskKey: 'vigilance_clearance', status: 'cleared', dependsOn: [] },
        {
          taskKey: 'final_approval',
          status: 'blocked',
          dependsOn: [
            'admin_scrutiny',
            'financial_scrutiny',
            'approval_compliance',
            'pgrc_clearance',
            'vigilance_clearance'
          ]
        }
      ]
    };

    recalculateWorkflowState(mockWorkflow);

    const finalApproval = mockWorkflow.tasks.find(t => t.taskKey === 'final_approval');
    expect(finalApproval.status).toBe('pending');
    expect(mockWorkflow.status).toBe('ready_for_final_review');
  });

  it('transitions to clarification_required when a document is rejected', () => {
    const mockWorkflow = {
      status: 'awaiting_clearances',
      documents: [
        { docType: 'request_letter', status: 'verified' },
        { docType: 'affidavit_6', status: 'rejected', observations: 'Stamp paper denomination invalid' },
        { docType: 'fdr_copy', status: 'verified' },
        { docType: 'payment_proof', status: 'verified' },
        { docType: 'eoa_loa', status: 'verified' }
      ],
      tasks: [
        { taskKey: 'admin_scrutiny', status: 'pending', dependsOn: [] }
      ]
    };

    recalculateWorkflowState(mockWorkflow);

    expect(mockWorkflow.status).toBe('clarification_required');
    expect(mockWorkflow.blockedReasons.some(r => r.includes('rejected by scrutiny officer'))).toBe(true);
  });

  it('generates an evidence-grounded AI Next-Action recommendation', async () => {
    const mockWorkflow = {
      _id: 'wf-test-123',
      status: 'departmental_clearance_in_progress',
      institutionId: { name: 'IIT Delhi' },
      fdrId: { refNumber: 'SBI-DEL-2024-9045', amount: 17500000 },
      documents: [
        { docType: 'request_letter', status: 'verified' },
        { docType: 'affidavit_6', status: 'verified' },
        { docType: 'fdr_copy', status: 'verified' },
        { docType: 'payment_proof', status: 'verified' },
        { docType: 'eoa_loa', status: 'verified' }
      ],
      tasks: [
        { taskKey: 'pgrc_clearance', name: 'PGRC Clearance', status: 'pending' },
        { taskKey: 'vigilance_clearance', name: 'Vigilance Clearance', status: 'pending' },
        { taskKey: 'final_approval', name: 'Final Approval', status: 'blocked', dependsOn: ['pgrc_clearance', 'vigilance_clearance'] }
      ]
    };

    const aiRec = await generateAINextActionRecommendation(mockWorkflow);

    expect(aiRec.caseId).toBe('wf-test-123');
    expect(aiRec.currentStatus).toBe('departmental_clearance_in_progress');
    expect(aiRec.verifiedDocsCount).toBe(5);
    expect(aiRec.totalDocsCount).toBe(5);
    expect(aiRec.immediateNextStep).toContain('Parallel departmental clearance in progress');
    expect(aiRec.blockersSummary).toContain('PGRC grievance clearance pending');
    expect(aiRec.blockersSummary).toContain('Vigilance CVO clearance pending');
  });

  it('keeps parallel tasks independent so PGRC does not block Vigilance', () => {
    const mockWorkflow = {
      status: 'awaiting_clearances',
      documents: [
        { docType: 'request_letter', status: 'verified' },
        { docType: 'affidavit_6', status: 'verified' },
        { docType: 'fdr_copy', status: 'verified' },
        { docType: 'payment_proof', status: 'verified' },
        { docType: 'eoa_loa', status: 'verified' }
      ],
      tasks: [
        { taskKey: 'pgrc_clearance', name: 'PGRC Clearance', status: 'pending', dependsOn: [] },
        { taskKey: 'vigilance_clearance', name: 'Vigilance Clearance', status: 'cleared', dependsOn: [] },
        { taskKey: 'final_approval', name: 'Final Approval', status: 'blocked', dependsOn: ['pgrc_clearance', 'vigilance_clearance'] }
      ]
    };

    recalculateWorkflowState(mockWorkflow);

    const pgrc = mockWorkflow.tasks.find(t => t.taskKey === 'pgrc_clearance');
    const vig = mockWorkflow.tasks.find(t => t.taskKey === 'vigilance_clearance');
    const finalApp = mockWorkflow.tasks.find(t => t.taskKey === 'final_approval');

    expect(pgrc.status).toBe('pending');
    expect(vig.status).toBe('cleared');
    expect(finalApp.status).toBe('blocked'); // only final approval waits on both
  });
});

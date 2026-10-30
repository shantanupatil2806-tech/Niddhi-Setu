import apiClient from './client';
import { ApiResponse } from '../types';

export interface WorkflowDocumentItem {
  _id: string;
  docType: 'request_letter' | 'affidavit_6' | 'fdr_copy' | 'payment_proof' | 'eoa_loa';
  version: number;
  status: 'not_uploaded' | 'uploaded' | 'under_review' | 'verified' | 'rejected' | 'clarification_required';
  docPath?: string;
  fileUrl?: string;
  docOriginalName?: string;
  docMimeType?: string;
  docHash?: string;
  uploadedAt?: string;
  uploadedBy?: any;
  extractedMetadata?: Record<string, any>;
  checklist: Array<{ item: string; passed: boolean; notes?: string }>;
  verifiedBy?: any;
  verifiedByRole?: string;
  verifiedAt?: string;
  observations?: string;
  discrepancies?: string[];
  history?: Array<any>;
}

export interface ClearanceTaskItem {
  _id: string;
  taskKey:
    | 'admin_scrutiny'
    | 'financial_scrutiny'
    | 'approval_compliance'
    | 'pgrc_clearance'
    | 'vigilance_clearance'
    | 'cell_clearance'
    | 'final_approval';
  name: string;
  department: 'administrative' | 'finance' | 'approval_bureau' | 'pgrc' | 'vigilance' | 'authorized_cell';
  assignedRole: string;
  assignedUser?: any;
  status: 'blocked' | 'pending' | 'in_progress' | 'cleared' | 'rejected' | 'clarification_required';
  isMandatory: boolean;
  dependsOn: string[];
  dueDate?: string;
  clearedAt?: string;
  decidedBy?: any;
  decidedByRole?: string;
  outcome?: string;
  observations?: string;
  findings?: string[];
  clarificationMessage?: string;
  clarificationResponse?: string;
  reminderSentAt?: string;
  escalatedAt?: string;
  history?: Array<any>;
}

export interface ClearanceWorkflow {
  _id: string;
  id?: string;
  releaseRequestId: any;
  fdrId: any;
  institutionId: any;
  status:
    | 'draft'
    | 'submitted'
    | 'document_review'
    | 'clarification_required'
    | 'departmental_clearance_in_progress'
    | 'awaiting_clearances'
    | 'ready_for_final_review'
    | 'approved'
    | 'rejected'
    | 'closed';
  documents: WorkflowDocumentItem[];
  tasks: ClearanceTaskItem[];
  blockedReasons: string[];
  nextPermittedActions: Array<{ action: string; role: string; description: string }>;
  submittedAt: string;
  completedAt?: string;
  totalProcessingHours?: number;
  slaStatus: 'on_track' | 'at_risk' | 'breached';
  createdAt: string;
  updatedAt: string;
}

export interface BottleneckAnalytics {
  totalWorkflows: number;
  activeWorkflows: number;
  blockedCasesCount: number;
  blockedCases: Array<{
    workflowId: string;
    releaseRequestId: string;
    institutionName: string;
    status: string;
    reasons: string[];
    daysInState: number;
  }>;
  departmentAverages: Array<{
    department: string;
    pendingCount: number;
    overdueCount: number;
    completedCount: number;
    avgDurationHours: number;
  }>;
  recurringDelays: Array<{
    department: string;
    issue: string;
    recommendation: string;
  }>;
}

export interface AINextActionRecommendation {
  caseId: string;
  currentStatus: string;
  verifiedDocsCount: number;
  totalDocsCount: number;
  clearedTasksCount: number;
  totalTasksCount: number;
  immediateNextStep: string;
  blockersSummary: string[];
  fullRecommendation: string;
}

export const clearanceApi = {
  getWorkflows: async (params: { status?: string; department?: string } = {}): Promise<ClearanceWorkflow[]> => {
    const res = await apiClient.get<any>('/clearance/workflows', { params });
    const items = res.data?.items || res.data?.data || [];
    return items.map((w: any) => ({ ...w, id: w._id || w.id }));
  },

  getWorkflowById: async (id: string): Promise<ClearanceWorkflow> => {
    const res = await apiClient.get<ApiResponse<ClearanceWorkflow>>(`/clearance/workflows/${id}`);
    const data = res.data?.data;
    return { ...data, id: data?._id || data?.id };
  },

  uploadDocument: async (workflowId: string, docType: string, file: File, meta?: Record<string, any>): Promise<ClearanceWorkflow> => {
    const formData = new FormData();
    formData.append('file', file);
    if (meta) {
      Object.keys(meta).forEach(key => formData.append(key, meta[key]));
    }
    const res = await apiClient.post<ApiResponse<ClearanceWorkflow>>(
      `/clearance/workflows/${workflowId}/documents/${docType}`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return res.data.data;
  },

  verifyDocument: async (
    workflowId: string,
    docType: string,
    payload: { status: string; observations: string; discrepancies?: string[]; checklist?: any[] }
  ): Promise<ClearanceWorkflow> => {
    const res = await apiClient.patch<ApiResponse<ClearanceWorkflow>>(
      `/clearance/workflows/${workflowId}/documents/${docType}/verify`,
      payload
    );
    return res.data.data;
  },

  recordTaskDecision: async (
    workflowId: string,
    taskKey: string,
    payload: { outcome: string; observations: string; findings?: string[]; clarificationMessage?: string }
  ): Promise<ClearanceWorkflow> => {
    const res = await apiClient.patch<ApiResponse<ClearanceWorkflow>>(
      `/clearance/workflows/${workflowId}/tasks/${taskKey}/decision`,
      payload
    );
    return res.data.data;
  },

  getBottleneckAnalytics: async (): Promise<BottleneckAnalytics> => {
    const res = await apiClient.get<ApiResponse<BottleneckAnalytics>>('/clearance/analytics/bottlenecks');
    return res.data.data;
  },

  getAIRecommendation: async (workflowId: string): Promise<AINextActionRecommendation> => {
    const res = await apiClient.get<ApiResponse<AINextActionRecommendation>>(
      `/clearance/workflows/${workflowId}/ai-recommendation`
    );
    return res.data.data;
  },

  triggerSlaMonitoring: async (): Promise<any> => {
    const res = await apiClient.post<any>('/clearance/monitor-deadlines');
    return res.data;
  }
};

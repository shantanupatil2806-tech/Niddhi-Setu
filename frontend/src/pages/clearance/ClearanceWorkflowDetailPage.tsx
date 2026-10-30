import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ShieldCheck,
  Building,
  Calendar,
  FileText,
  Upload,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Brain,
  Clock,
  Sparkles,
  Lock,
  Unlock,
  Check,
  Eye,
  ExternalLink,
  Printer,
  Info
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardContent,
  Button,
  Badge,
  Spinner,
  Modal,
  Textarea,
  Input
} from '../../components/ui';
import {
  clearanceApi,
  ClearanceWorkflow,
  WorkflowDocumentItem,
  ClearanceTaskItem,
  AINextActionRecommendation
} from '../../api/clearance';
import { useAuth } from '../../hooks/useAuth';
import { formatCurrency, formatDate } from '../../utils/formatters';
import toast from 'react-hot-toast';

const DOC_TYPE_LABELS: Record<string, { title: string; subtitle: string; assignedRole: string; deptName: string }> = {
  request_letter: {
    title: '1. Institution Application/Request Letter',
    subtitle: "Formal request for the release of FDR/security deposit on institution's letterhead",
    assignedRole: 'officer_admin',
    deptName: 'Admin Scrutiny'
  },
  affidavit_6: {
    title: '2. Affidavit 6 (Prescribed Format)',
    subtitle: 'Sworn affidavit containing Society/Trust declarations and indemnity clauses',
    assignedRole: 'officer_admin',
    deptName: 'Admin Scrutiny'
  },
  fdr_copy: {
    title: '3. Copy of the FDR to Be Released',
    subtitle: 'Legible scan of original Fixed Deposit Receipt showing AICTE joint lien endorsement',
    assignedRole: 'officer_finance',
    deptName: 'Finance Scrutiny'
  },
  payment_proof: {
    title: '4. RPGF Demand Draft / Online Payment Proof',
    subtitle: 'Evidence of statutory security deposit / RPGF payment remitted to AICTE',
    assignedRole: 'officer_finance',
    deptName: 'Finance Scrutiny'
  },
  eoa_loa: {
    title: '5. Latest Letter of Approval (LoA / EoA)',
    subtitle: 'Official AICTE academic approval letter confirming program closure/tenure completion',
    assignedRole: 'officer_approval',
    deptName: 'Approval Bureau'
  }
};

const DEFAULT_CHECKLISTS: Record<string, string[]> = {
  request_letter: [
    'Drafted on official institutional letterhead with dispatch reference',
    'Signed and stamped by authorized Trustee or Head of Institute',
    'Explicit reason stated for security deposit release & course completion'
  ],
  affidavit_6: [
    'Executed on prescribed non-judicial stamp paper with valid public notary seal',
    'Trust/Society registration number and bank account details accurately stated',
    'Mandatory indemnity declarations against future institutional claims included'
  ],
  fdr_copy: [
    'Mandatory joint lien in favor of Member Secretary AICTE clearly marked',
    'Deposit amount matches institutional security deposit requirement',
    'Issuing scheduled commercial bank, branch code, and deposit receipt # verified'
  ],
  payment_proof: [
    'Remittance transaction reference / Demand Draft legible scan visible',
    'Amount corresponds to prescribed statutory deposit / RPGF fees',
    'Deposit transaction confirmed against AICTE accounts ledger entries'
  ],
  eoa_loa: [
    'Latest Extension of Approval / Letter of Approval issued by AICTE',
    'Approved academic courses and tenure duration match release request',
    'No pending council embargo, inquiry, or suspension noted on record'
  ]
};

const getDocumentUrl = (workflowId: string, docType: string): string => {
  return `http://localhost:5000/api/clearance/workflows/${workflowId}/documents/${docType}/file`;
};

const convertNumberToIndianWords = (amount: number | string | undefined | null): string => {
  if (!amount || isNaN(Number(amount))) return 'Zero Rupees Only';
  let num = Math.round(Number(amount));
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const inWords = (n: number): string => {
    let str = '';
    if (n > 99) {
      str += a[Math.floor(n / 100)] + 'Hundred ';
      n %= 100;
    }
    if (n > 19) {
      str += b[Math.floor(n / 10)] + ' ' + a[n % 10];
    } else {
      str += a[n];
    }
    return str;
  };

  const crore = Math.floor(num / 10000000);
  num %= 10000000;
  const lakh = Math.floor(num / 100000);
  num %= 100000;
  const thousand = Math.floor(num / 1000);
  num %= 1000;
  const hundred = num;

  let res = '';
  if (crore > 0) res += inWords(crore) + 'Crore ';
  if (lakh > 0) res += inWords(lakh) + 'Lakh ';
  if (thousand > 0) res += inWords(thousand) + 'Thousand ';
  if (hundred > 0) res += inWords(hundred);
  return (res.trim() + ' Rupees Only').replace(/\s+/g, ' ');
};

export const ClearanceWorkflowDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isStaff, isInstitution } = useAuth();

  const [workflow, setWorkflow] = useState<ClearanceWorkflow | null>(null);
  const [aiRec, setAiRec] = useState<AINextActionRecommendation | null>(null);
  const [loading, setLoading] = useState(true);

  // Upload Modal State
  const [uploadDocModalOpen, setUploadDocModalOpen] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState<string>('request_letter');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Document Verification Modal State
  const [verifyDocModalOpen, setVerifyDocModalOpen] = useState(false);
  const [activeDoc, setActiveDoc] = useState<WorkflowDocumentItem | null>(null);
  const [verifyDecision, setVerifyDecision] = useState<'verified' | 'rejected' | 'clarification_required'>('verified');
  const [verifyObservations, setVerifyObservations] = useState('');
  const [verifying, setVerifying] = useState(false);

  // Departmental Task Decision Modal State
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [activeTask, setActiveTask] = useState<ClearanceTaskItem | null>(null);
  const [taskOutcome, setTaskOutcome] = useState<'cleared' | 'rejected' | 'clarification_required'>('cleared');
  const [taskObservations, setTaskObservations] = useState('');
  const [savingTask, setSavingTask] = useState(false);

  // Official AICTE Lien Discharge NOC Order Modal
  const [nocModalOpen, setNocModalOpen] = useState(false);

  const loadWorkflowData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const [wfData, aiData] = await Promise.all([
        clearanceApi.getWorkflowById(id),
        clearanceApi.getAIRecommendation(id).catch(() => null)
      ]);
      setWorkflow(wfData);
      setAiRec(aiData);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load clearance workflow dossier');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkflowData();
  }, [id]);

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !selectedFile) {
      toast.error('Please choose a document file to upload');
      return;
    }
    try {
      setUploading(true);
      await clearanceApi.uploadDocument(id, selectedDocType, selectedFile);
      toast.success('Document uploaded successfully for departmental scrutiny.');
      setUploadDocModalOpen(false);
      setSelectedFile(null);
      loadWorkflowData();
    } catch {
      toast.error('Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleRecordDocumentReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !activeDoc) return;
    try {
      setVerifying(true);
      await clearanceApi.verifyDocument(id, activeDoc.docType, {
        status: verifyDecision,
        observations: verifyObservations,
        checklist: activeDoc.checklist
      });
      toast.success(`Document marked as ${verifyDecision.toUpperCase()}!`);
      setVerifyDocModalOpen(false);
      loadWorkflowData();
    } catch {
      toast.error('Failed to record document verification');
    } finally {
      setVerifying(false);
    }
  };

  const handleRecordTaskDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !activeTask) return;
    try {
      setSavingTask(true);
      await clearanceApi.recordTaskDecision(id, activeTask.taskKey, {
        outcome: taskOutcome,
        observations: taskObservations
      });
      toast.success(`Departmental decision recorded: ${taskOutcome.toUpperCase()}!`);
      setTaskModalOpen(false);
      loadWorkflowData();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to record clearance decision');
    } finally {
      setSavingTask(false);
    }
  };

  if (loading || !workflow) {
    return (
      <div className="py-24 text-center">
        <Spinner size="lg" label="Loading Interdepartmental Clearance Dossier..." />
      </div>
    );
  }

  const verifiedDocsCount = (workflow.documents || []).filter(d => d.status === 'verified').length;
  const clearedTasksCount = (workflow.tasks || []).filter(t => t.status === 'cleared').length;

  return (
    <div className="space-y-6">
      {/* Top Navigation */}
      <div>
        <button
          onClick={() => navigate('/clearance')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Clearance Command Center</span>
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Clearance Dossier #{workflow._id.slice(-6).toUpperCase()}
              </h1>
              <Badge
                variant={
                  workflow.status === 'approved'
                    ? 'success'
                    : workflow.status === 'clarification_required'
                    ? 'danger'
                    : 'warning'
                }
                dot
                size="sm"
              >
                {workflow.status.replace(/_/g, ' ').toUpperCase()}
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              {workflow.institutionId?.name || 'Institution'} • FDR Reference #{workflow.fdrId?.refNumber || 'N/A'} • Principal: {formatCurrency(workflow.fdrId?.amount || 5000000)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadWorkflowData}
              leftIcon={<Clock className="w-3.5 h-3.5" />}
            >
              Refresh Dossier
            </Button>
            <Button
              variant={workflow.status === 'approved' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setNocModalOpen(true)}
              leftIcon={<Printer className="w-3.5 h-3.5" />}
              className={workflow.status === 'approved' ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs' : ''}
            >
              {workflow.status === 'approved' ? 'Official AICTE Lien Discharge Order (NOC)' : 'Preview Council Sanction Order'}
            </Button>
          </div>
        </div>
      </div>

      {/* AI Next-Action Advisory Card */}
      {aiRec && (
        <Card className="border-teal-200 bg-teal-50/40 shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Brain className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-teal-900 uppercase tracking-wide flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                    AI-Assisted Next Action & Blocker Recommendation
                  </span>
                  <span className="text-[10px] text-teal-700 font-medium">Evidence-grounded engine</span>
                </div>
                <div className="text-xs font-semibold text-teal-950 mt-1">
                  {aiRec.immediateNextStep}
                </div>
                {aiRec.blockersSummary.length > 0 && (
                  <div className="text-[11px] text-teal-800 mt-1">
                    <span className="font-semibold">Active Blockers:</span> {aiRec.blockersSummary.join(' • ')}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dependency Blocker Alert (if any) */}
      {workflow.blockedReasons?.length > 0 && (
        <Card className="border-rose-200 bg-rose-50/60">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold text-rose-900 uppercase tracking-wide">
                  Workflow Progression Blocked
                </div>
                <div className="text-xs text-rose-800 mt-1 space-y-0.5">
                  {workflow.blockedReasons.map((r, i) => (
                    <div key={i}>• {r}</div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* SECTION 1: Statutory 5-Document Verification Checklist */}
      <Card>
        <CardHeader
          title="Section 1: Mandatory Statutory Documents"
          subtitle={`Independent verification status for each required statutory document (${verifiedDocsCount}/5 Verified)`}
        />
        <CardContent className="p-0">
          <div className="divide-y divide-slate-100">
            {workflow.documents.map((doc) => {
              const meta = DOC_TYPE_LABELS[doc.docType] || {
                title: doc.docType,
                subtitle: '',
                assignedRole: 'officer_admin',
                deptName: 'Scrutiny Officer'
              };
              const isVerified = doc.status === 'verified';
              const isRejected = doc.status === 'rejected';
              const isClarif = doc.status === 'clarification_required';

              return (
                <div key={doc.docType} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">{meta.title}</span>
                      <Badge
                        variant={
                          isVerified ? 'success' : isRejected ? 'danger' : isClarif ? 'warning' : 'neutral'
                        }
                        dot
                        size="sm"
                      >
                        {doc.status.replace(/_/g, ' ').toUpperCase()} (v{doc.version})
                      </Badge>
                    </div>
                    <div className="text-[11px] text-slate-500">{meta.subtitle}</div>
                    {doc.docOriginalName && (
                      <div className="flex flex-wrap items-center gap-2 pt-0.5">
                        <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          File: <strong className="text-slate-700">{doc.docOriginalName}</strong>
                        </span>
                        {doc.docHash && (
                          <span className="text-[10px] font-mono text-slate-400">
                            Hash: {doc.docHash.slice(0, 16)}...
                          </span>
                        )}
                        {doc.status !== 'not_uploaded' && workflow && (
                          <a
                            href={getDocumentUrl(workflow._id, doc.docType)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-600 hover:text-teal-800 bg-teal-50 hover:bg-teal-100 px-2.5 py-0.5 rounded border border-teal-200 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View Document
                          </a>
                        )}
                      </div>
                    )}
                    {doc.observations && (
                      <div className="text-[11px] text-amber-800 bg-amber-50 p-1.5 rounded border border-amber-200 w-fit">
                        <span className="font-bold">Officer Note:</span> {doc.observations}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {doc.status === 'not_uploaded' ? (
                      isInstitution || user?.role === 'admin' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedDocType(doc.docType);
                            setUploadDocModalOpen(true);
                          }}
                          leftIcon={<Upload className="w-3.5 h-3.5" />}
                        >
                          Upload Document
                        </Button>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-medium italic bg-slate-100 px-2.5 py-1 rounded-lg">
                          Awaiting Institution Upload
                        </span>
                      )
                    ) : (
                      <>
                        {(isInstitution || user?.role === 'admin') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedDocType(doc.docType);
                              setUploadDocModalOpen(true);
                            }}
                            leftIcon={<Upload className="w-3.5 h-3.5" />}
                          >
                            Replace
                          </Button>
                        )}
                        {isStaff && (
                          (() => {
                            const canVerify = user?.role === 'admin' || user?.role === meta.assignedRole || user?.role === 'officer';
                            return (
                              <Button
                                variant={canVerify ? 'outline' : 'ghost'}
                                size="sm"
                                disabled={!canVerify}
                                className={!canVerify ? 'opacity-40 cursor-not-allowed' : ''}
                                onClick={() => {
                                  if (!canVerify) return;
                                  const baseChecklist = (doc.checklist && doc.checklist.length > 0)
                                    ? doc.checklist
                                    : (DEFAULT_CHECKLISTS[doc.docType] || []).map(item => ({ item, passed: true, notes: '' }));
                                  setActiveDoc({ ...doc, checklist: baseChecklist });
                                  setVerifyDecision('verified');
                                  setVerifyObservations(doc.observations || '');
                                  setVerifyDocModalOpen(true);
                                }}
                                leftIcon={canVerify ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                              >
                                {canVerify ? 'Verify Document' : `Restricted to ${meta.deptName}`}
                              </Button>
                            );
                          })()
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* SECTION 2: Interdepartmental Clearance Task Matrix */}
      <Card>
        <CardHeader
          title="Section 2: Departmental Clearance Matrix & Governance Tasks"
          subtitle={`Independent clearances from Administrative, Finance, PGRC, Vigilance CVO, and Approval Bureau (${clearedTasksCount}/${workflow.tasks.length} Cleared)`}
        />
        <CardContent className="p-0">
          <div className="divide-y divide-slate-100">
            {workflow.tasks.map((task) => {
              const isCleared = task.status === 'cleared';
              const isBlocked = task.status === 'blocked';
              const isRejected = task.status === 'rejected';
              const isMyTask = user?.role === task.assignedRole || user?.role === 'admin' || user?.role === 'officer';

              return (
                <div key={task.taskKey} className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${isMyTask ? 'bg-teal-50/20 hover:bg-teal-50/40' : 'hover:bg-slate-50/60'}`}>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">{task.name}</span>
                      <Badge
                        variant={isCleared ? 'success' : isBlocked ? 'neutral' : isRejected ? 'danger' : 'warning'}
                        dot
                        size="sm"
                      >
                        {task.status.toUpperCase()}
                      </Badge>
                      <span className="text-[10px] uppercase font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        Dept: {task.department}
                      </span>
                      {isMyTask && (
                        <span className="text-[10px] font-semibold text-teal-700 bg-teal-100/80 px-2 py-0.5 rounded-full border border-teal-200">
                          Your Department
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] text-slate-500">
                      Assigned Role: <span className="font-mono font-medium">{task.assignedRole}</span>
                      {task.dependsOn?.length > 0 && (
                        <span> • Depends On: <span className="font-mono text-slate-600">{task.dependsOn.join(', ')}</span></span>
                      )}
                    </div>

                    {task.observations && (
                      <div className="text-[11px] text-slate-700 bg-slate-50 p-1.5 rounded border border-slate-200">
                        <span className="font-bold">Observations:</span> {task.observations}
                      </div>
                    )}
                  </div>

                  <div className="shrink-0">
                    {isStaff && (
                      <Button
                        variant={isBlocked || !isMyTask ? 'ghost' : isCleared ? 'outline' : 'primary'}
                        size="sm"
                        disabled={isBlocked || !isMyTask}
                        className={isBlocked || !isMyTask ? 'opacity-40 cursor-not-allowed' : ''}
                        onClick={() => {
                          if (isBlocked || !isMyTask) return;
                          setActiveTask(task);
                          setTaskOutcome(isCleared ? 'cleared' : 'cleared');
                          setTaskObservations(task.observations || '');
                          setTaskModalOpen(true);
                        }}
                        leftIcon={isBlocked || !isMyTask ? <Lock className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                      >
                        {isBlocked
                          ? 'Blocked by Dependencies'
                          : !isMyTask
                          ? `Restricted to ${task.department?.replace(/_/g, ' ').toUpperCase()}`
                          : isCleared
                          ? 'Update Clearance'
                          : 'Record Clearance'}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Upload Document Modal */}
      <Modal
        isOpen={uploadDocModalOpen}
        onClose={() => setUploadDocModalOpen(false)}
        title={`Upload Statutory Document: ${DOC_TYPE_LABELS[selectedDocType]?.title || selectedDocType}`}
      >
        <form onSubmit={handleFileUpload} className="space-y-4">
          <div className="text-xs text-slate-600">
            Select the verified digital scan or certified PDF copy for regulatory scrutiny. Document SHA-256 integrity hash will be recorded.
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Select File (PDF / Scanned Copy)</label>
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" type="button" onClick={() => setUploadDocModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={uploading}>
              Upload Document
            </Button>
          </div>
        </form>
      </Modal>

      {/* Document Verification Modal */}
      <Modal
        isOpen={verifyDocModalOpen}
        onClose={() => setVerifyDocModalOpen(false)}
        title={`Verify Document: ${activeDoc?.docType ? DOC_TYPE_LABELS[activeDoc.docType]?.title : ''}`}
      >
        <form onSubmit={handleRecordDocumentReview} className="space-y-4">
          {/* Document Inspection & Direct View Card */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5 truncate">
                <FileText className="w-4 h-4 text-teal-600 shrink-0" />
                {activeDoc?.docOriginalName || activeDoc?.docType || 'Document Certificate'}
              </span>
              <Badge variant="neutral" size="sm">v{activeDoc?.version || 1}</Badge>
            </div>
            {activeDoc?.docHash && (
              <div className="text-[10px] font-mono text-slate-500 break-all bg-white p-1 rounded border border-slate-200/80">
                <strong className="text-slate-700">SHA-256:</strong> {activeDoc.docHash}
              </div>
            )}
            {workflow && activeDoc && (
              <div className="pt-1">
                <a
                  href={getDocumentUrl(workflow._id, activeDoc.docType)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open Full Document in New Window ↗
                </a>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Verification Determination</label>
            <select
              value={verifyDecision}
              onChange={(e: any) => setVerifyDecision(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-xl p-2.5 bg-white text-slate-900"
            >
              <option value="verified">Verified (Compliant with AICTE Guidelines)</option>
              <option value="clarification_required">Clarification Required (Discrepancy observed)</option>
              <option value="rejected">Rejected (Invalid/Defective Document)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Verification Checklist</label>
            <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
              {(activeDoc?.checklist || []).map((chk, idx) => (
                <label key={idx} className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={chk.passed}
                    onChange={(e) => {
                      if (activeDoc) {
                        const updated = [...activeDoc.checklist];
                        updated[idx].passed = e.target.checked;
                        setActiveDoc({ ...activeDoc, checklist: updated });
                      }
                    }}
                    className="mt-0.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                  />
                  <span>{chk.item}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Officer Scrutiny Observations</label>
            <Textarea
              rows={3}
              placeholder="Record findings, discrepancies, or instructions for the institution..."
              value={verifyObservations}
              onChange={(e) => setVerifyObservations(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" type="button" onClick={() => setVerifyDocModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={verifying}>
              Record Determination
            </Button>
          </div>
        </form>
      </Modal>

      {/* Departmental Task Decision Modal */}
      <Modal
        isOpen={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        title={`Departmental Clearance Decision: ${activeTask?.name}`}
      >
        <form onSubmit={handleRecordTaskDecision} className="space-y-4">
          <div className="text-xs text-slate-600">
            Record official clearance outcome for <span className="font-semibold">{activeTask?.name}</span>. This decision will be stamped onto the audit trail.
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Clearance Outcome</label>
            <select
              value={taskOutcome}
              onChange={(e: any) => setTaskOutcome(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-xl p-2.5 bg-white text-slate-900"
            >
              <option value="cleared">Cleared (No Objection / Compliant)</option>
              <option value="clarification_required">Clarification Required</option>
              <option value="rejected">Rejected (Withhold Release Sanction)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Department Observations & Reason</label>
            <Textarea
              rows={3}
              placeholder="Enter official departmental assessment, vigilance clearance ref, or grievance status..."
              value={taskObservations}
              onChange={(e) => setTaskObservations(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" type="button" onClick={() => setTaskModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={savingTask}>
              Submit Clearance
            </Button>
          </div>
        </form>
      </Modal>

      {/* Official AICTE Statutory Lien Discharge NOC Order Modal */}
      <Modal
        isOpen={nocModalOpen}
        onClose={() => setNocModalOpen(false)}
        title="Official AICTE Statutory Lien Discharge & Encashment Order"
        size="xl"
      >
        <div className="space-y-4">
          <style>{`
            @media print {
              @page {
                size: A4 portrait;
                margin: 8mm 10mm;
              }
              html, body {
                margin: 0 !important;
                padding: 0 !important;
                background: #ffffff !important;
                width: 100% !important;
                height: auto !important;
                overflow: visible !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              #root,
              .no-print,
              button,
              header,
              nav,
              aside {
                display: none !important;
              }
              body > div:not(#root) {
                position: static !important;
                inset: auto !important;
                overflow: visible !important;
                padding: 0 !important;
                margin: 0 !important;
                width: 100% !important;
                display: block !important;
                background: transparent !important;
              }
              div[aria-hidden="true"] {
                display: none !important;
              }
              [role="dialog"] {
                position: static !important;
                width: 100% !important;
                max-width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                border: none !important;
                box-shadow: none !important;
                transform: none !important;
                overflow: visible !important;
                background: transparent !important;
              }
              [role="dialog"] > div:first-child {
                display: none !important;
              }
              [role="dialog"] > div:nth-child(2) {
                padding: 0 !important;
                max-height: none !important;
                overflow: visible !important;
              }
              #aicte-noc-sanction-letter {
                display: block !important;
                visibility: visible !important;
                width: 100% !important;
                max-width: 100% !important;
                box-sizing: border-box !important;
                margin: 0 auto !important;
                padding: 8mm 10mm !important;
                border: 2px solid #0f172a !important;
                border-radius: 2px !important;
                background: #ffffff !important;
                page-break-after: avoid !important;
                page-break-inside: avoid !important;
              }
              #aicte-noc-sanction-letter * {
                visibility: visible !important;
              }
            }
          `}</style>

          {/* Printable Official Sanction Letter Container (Exact Visual Match to Official AICTE Prototype) */}
          <div
            id="aicte-noc-sanction-letter"
            className="bg-white p-6 sm:p-8 rounded-lg border border-slate-200 shadow-xs text-slate-800 space-y-2.5 font-sans"
          >
            {/* Official AICTE Logo */}
            <div className="flex justify-center mb-1">
              <img
                src="/aicte-logo.png"
                alt="AICTE Official Logo"
                className="h-14 w-auto object-contain"
                style={{ imageRendering: 'crisp-edges' }}
              />
            </div>

            {/* Header Titles */}
            <div className="text-center space-y-0.5">
              <h1 className="text-base sm:text-lg font-bold text-[#1e3a8a] tracking-tight uppercase font-sans">
                ALL INDIA COUNCIL FOR TECHNICAL EDUCATION
              </h1>
              <h2 className="text-xs sm:text-sm text-slate-600 font-sans">
                Approval Bureau
              </h2>
            </div>

            {/* Divider */}
            <div className="border-b border-slate-200 my-2.5" />

            {/* Sub-Header */}
            <div className="text-center space-y-0.5">
              <div className="text-xs sm:text-sm font-bold text-[#1e3a8a] font-sans tracking-wide">
                NO OBJECTION CERTIFICATE (NOC)
              </div>
              <div className="text-xs text-slate-600 font-sans">
                Release of Security Deposit — FDR/RPGF
              </div>
              <div className="text-[10px] text-slate-400 font-sans uppercase tracking-wider">
                {workflow.status === 'approved' ? 'OFFICIAL AICTE STATUTORY SANCTION ORDER' : 'ILLUSTRATIVE PROTOTYPE — NOT AN OFFICIAL AICTE DOCUMENT'}
              </div>
            </div>

            {/* Divider */}
            <div className="border-b border-slate-200 my-2.5" />

            {/* Two-Column Metadata */}
            <div className="grid grid-cols-2 gap-4 text-xs font-sans">
              <div>
                <div className="text-[11px] text-slate-400">NOC Reference No.</div>
                <div className="font-bold text-slate-900 mt-0.5">
                  AICTE/AB/REL/2026/{(workflow._id || 'REF').slice(-8).toUpperCase()}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400">Date of Issue</div>
                <div className="font-bold text-slate-900 mt-0.5">
                  {formatDate(new Date())}
                </div>
              </div>
            </div>

            {/* Addressee */}
            <div className="text-xs font-sans space-y-0.5 pt-1">
              <div className="font-bold text-[#1e3a8a]">To: The Authorized Branch Manager</div>
              <div className="text-slate-800">
                {workflow.fdrId?.bankName || 'Scheduled Commercial Bank'}, {workflow.fdrId?.branch || 'Authorized Custody Branch'}
              </div>
            </div>

            {/* Subject */}
            <div className="text-xs font-bold text-[#1e3a8a] font-sans pt-1">
              Subject: No Objection for Release of Security Deposit
            </div>

            {/* Preamble Body */}
            <p className="text-xs leading-relaxed text-slate-700 font-sans">
              With reference to the institution's application for release of the security deposit, the request has been considered in accordance with the applicable provisions of the AICTE Approval Process Handbook, subject to the verified case details and required clearances.
            </p>

            {/* Institution and Deposit Particulars */}
            <div className="pt-1">
              <div className="text-xs font-bold text-[#1e3a8a] font-sans mb-1.5">
                Institution and Deposit Particulars
              </div>
              <div className="border-t border-slate-200 text-xs font-sans">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-700">Institution name and AICTE ID</span>
                  <span className="text-slate-900 font-medium text-right">
                    {workflow.institutionId?.name || 'Institution'} (AICTE ID: {workflow.institutionId?.code || 'INST-CODE'})
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-700">Trust/Society/Company</span>
                  <span className="text-slate-900 font-medium text-right">
                    {workflow.institutionId?.trustName || `${workflow.institutionId?.name || 'Institution'} Educational Trust / Society`}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-700">FDR/RPGF reference</span>
                  <span className="text-slate-900 font-mono font-medium text-right">
                    {workflow.fdrId?.refNumber || 'FDR-REF-NO'}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-700">Principal deposit amount</span>
                  <span className="text-slate-900 font-medium text-right">
                    {formatCurrency(workflow.fdrId?.amount || 5000000)} ({convertNumberToIndianWords(workflow.fdrId?.amount || 5000000)})
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-700">Financial yield & accrued interest</span>
                  <span className="text-slate-900 font-medium text-right">
                    {formatCurrency(workflow.fdrId?.accruedInterest || Math.round((workflow.fdrId?.amount || 5000000) * 0.071 * 2))} (Rate: {workflow.fdrId?.interestRate || 7.1}% p.a. {workflow.fdrId?.compoundingFrequency || 'quarterly'})
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-200">
                  <span className="text-slate-700">Bank and maturity date</span>
                  <span className="text-slate-900 font-medium text-right">
                    {workflow.fdrId?.bankName || 'Scheduled Commercial Bank'}, {workflow.fdrId?.branch || 'Branch'} • {formatDate(workflow.fdrId?.maturityDate || new Date())}
                  </span>
                </div>
              </div>
            </div>

            {/* Decision and Conditions */}
            <div className="pt-1 space-y-1">
              <div className="text-xs font-bold text-[#1e3a8a] font-sans">
                Decision and Conditions
              </div>
              <p className="text-xs leading-relaxed text-slate-700 font-sans">
                Subject to satisfaction of the applicable requirements and completion of the prescribed clearances, the competent authority records its decision regarding release of the specified security deposit. Any bank-side action shall be subject to the applicable instructions, deposit terms and required documentation.
              </p>
            </div>

            {/* Verification Reference */}
            <div className="text-[10px] text-slate-400 font-sans pt-1">
              Verification reference: http://localhost:5173/clearance/{workflow._id} [SHA-256: {(workflow._id || '').slice(0, 16).toUpperCase()}]
            </div>

            {/* Divider */}
            <div className="border-b border-slate-200 my-2" />

            {/* Authorized Signatory */}
            <div className="space-y-0.5 text-xs font-sans">
              <div className="font-bold text-[#1e3a8a]">
                Authorized Signatory
              </div>
              <div className="text-slate-700">
                Advisor / Member Secretary (Approval Bureau), AICTE New Delhi
              </div>
              <div className="text-[9.5px] text-slate-400 italic pt-0.5">
                Signature and date to be applied through the approved issuance process.
              </div>
            </div>
          </div>

          {/* Action Footer (Hidden on print) */}
          <div className="no-print flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-200">
            {workflow.status === 'approved' ? (
              <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 text-center sm:text-left font-medium">
                ✓ All departmental clearances granted. This official statutory document is authorized for bank lien discharge.
              </span>
            ) : (
              <span className="text-[11px] text-amber-800 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200 text-center sm:text-left font-medium">
                ⏳ Scrutiny In Progress: Printing is locked until all prerequisite departmental clearances and final Council approval are granted.
              </span>
            )}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button variant="ghost" size="sm" onClick={() => setNocModalOpen(false)} className="flex-1 sm:flex-none">
                Close
              </Button>
              {workflow.status === 'approved' ? (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => window.print()}
                  leftIcon={<Printer className="w-3.5 h-3.5" />}
                  className="bg-teal-600 hover:bg-teal-700 flex-1 sm:flex-none shadow-xs font-semibold"
                >
                  Print / Save as PDF
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  disabled
                  leftIcon={<Lock className="w-3.5 h-3.5 text-slate-400" />}
                  className="opacity-60 cursor-not-allowed bg-slate-100 text-slate-500 border-slate-200 flex-1 sm:flex-none"
                  title="Locked until all interdepartmental approvals are completed"
                >
                  Print Locked (Approval Pending)
                </Button>
              )}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

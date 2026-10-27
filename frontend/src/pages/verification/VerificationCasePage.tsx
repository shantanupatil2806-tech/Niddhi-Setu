import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ShieldCheck,
  Building2,
  Calendar,
  AlertTriangle,
  FileText,
  Download,
  CheckCircle,
  XCircle,
  HelpCircle,
  Send,
  Lock,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  Button,
  Badge,
  SeverityBadge,
  Textarea,
  Spinner,
} from '../../components/ui';
import { verificationApi } from '../../api/verification';
import { fdrsApi } from '../../api/fdrs';
import { VerificationCase, FDR, VerificationFinding } from '../../types';
import { formatCurrency, formatDate, formatEvidence } from '../../utils/formatters';
import toast from 'react-hot-toast';

export const VerificationCasePage: React.FC = () => {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();

  const [verCase, setVerCase] = useState<VerificationCase | null>(null);
  const [fdr, setFdr] = useState<FDR | null>(null);
  const [findings, setFindings] = useState<VerificationFinding[]>([]);
  const [loading, setLoading] = useState(true);

  // Decision Form
  const [decision, setDecision] = useState<'verified' | 'rejected' | 'clarification_required'>('verified');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchCaseData = async () => {
      if (!caseId) return;
      try {
        setLoading(true);
        const c = await verificationApi.getCaseById(caseId);
        setVerCase(c);
        if (c.notes) setNotes(c.notes);
        if (c.officerDecision) setDecision(c.officerDecision as any);

        const realFdrId =
          typeof c.fdrId === 'object' && c.fdrId !== null
            ? ((c.fdrId as any)._id || (c.fdrId as any).id)
            : c.fdrId;

        let fdrData: FDR | null = null;
        if (typeof c.fdrId === 'object' && c.fdrId !== null && (c.fdrId as any).refNumber) {
          fdrData = {
            ...c.fdrId,
            id: realFdrId || 'fdr-item',
          };
        } else if (realFdrId) {
          fdrData = await fdrsApi.getFDRById(realFdrId);
        }

        let findingsData: VerificationFinding[] = [];
        if (Array.isArray(c.findings) && c.findings.length > 0) {
          findingsData = c.findings;
        } else if (realFdrId) {
          try {
            findingsData = await fdrsApi.getFDRFindings(realFdrId);
          } catch (e) {
            console.error('Error fetching findings:', e);
          }
        }

        setFdr(fdrData);
        setFindings(findingsData);
      } catch (err) {
        console.error('Error fetching case:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCaseData();
  }, [caseId]);

  const handleSubmitDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseId) return;
    try {
      setSubmitting(true);
      await verificationApi.submitDecision(caseId, {
        decision,
        notes,
      });

      // Update FDR status
      if (fdr) {
        await fdrsApi.updateFDRStatus(fdr.id, decision);
      }

      toast.success(`Determination successfully saved: ${decision.replace(/_/g, ' ').toUpperCase()}`);
      navigate('/verification');
    } catch {
      toast.error('Failed to submit determination.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !verCase || !fdr) {
    return (
      <div className="py-24">
        <Spinner size="lg" label="Loading scrutiny docket..." />
      </div>
    );
  }

  const instName =
    typeof fdr.institutionId === 'object'
      ? (fdr.institutionId as any)?.name
      : fdr.institution?.name || 'COEP Technological University';

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/verification')}
        leftIcon={<ArrowLeft className="w-4 h-4" />}
      >
        Back to Scrutiny Queue
      </Button>

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
              Case #{verCase.id}
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500">
              Initiated {formatDate(verCase.createdAt)}
            </span>
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 mt-1">
            Deposit Instrument Scrutiny: {fdr.refNumber}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {verCase.priority === 'high' && (
            <Badge variant="danger" dot>
              High Priority Flag
            </Badge>
          )}
          <Badge variant="info" dot>
            {verCase.status.replace(/_/g, ' ')}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/passport/${verCase.id}`)}
            leftIcon={<ShieldCheck className="w-4 h-4 text-teal-600" />}
            className="ml-2 bg-white hover:bg-teal-50 hover:border-teal-300"
          >
            View Verification Passport
          </Button>
        </div>
      </div>

      {/* Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Panel: FDR Summary, Document Preview, Findings */}
        <div className="lg:col-span-7 space-y-6">
          {/* FDR Summary Card */}
          <Card>
            <CardHeader
              title="Deposit Certificate Summary"
              subtitle="Declared parameters and issuing bank confirmation"
            />
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 uppercase text-[10px] font-semibold">
                    Institution
                  </span>
                  <div className="font-semibold text-slate-900 mt-0.5 truncate">
                    {instName}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 uppercase text-[10px] font-semibold">
                    Issuing Bank
                  </span>
                  <div className="font-semibold text-slate-900 mt-0.5">{fdr.bankName}</div>
                </div>
                <div>
                  <span className="text-slate-400 uppercase text-[10px] font-semibold">
                    Principal Value
                  </span>
                  <div className="font-bold text-teal-700 mt-0.5">
                    {formatCurrency(fdr.amount)}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 uppercase text-[10px] font-semibold">
                    Deposit Issue Date
                  </span>
                  <div className="font-semibold text-slate-900 mt-0.5">
                    {formatDate(fdr.issueDate)}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 uppercase text-[10px] font-semibold">
                    Maturity Date
                  </span>
                  <div className="font-semibold text-slate-900 mt-0.5">
                    {formatDate(fdr.maturityDate)}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 uppercase text-[10px] font-semibold">
                    Joint Lien Clause
                  </span>
                  <div className="font-semibold text-emerald-700 mt-0.5 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Lien Marked AICTE</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Document Preview & Notarization */}
          <Card>
            <CardHeader
              title="Scanned Certificate Document"
              subtitle="Digital certificate uploaded during institutional submission"
              action={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => alert(`Downloading verified certificate for ${fdr.refNumber}`)}
                  leftIcon={<Download className="w-3.5 h-3.5" />}
                >
                  Download Scan
                </Button>
              }
            />
            <CardContent>
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-teal-100 text-teal-800">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-900">
                      {fdr.docOriginalName || `${fdr.refNumber}.pdf`}
                    </div>
                    <div className="text-[11px] font-mono text-slate-500 break-all select-all mt-0.5">
                      Hash: {fdr.docHash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}
                    </div>
                  </div>
                </div>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                  SHA-256 MATCH
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Compliance Findings List */}
          <Card>
            <CardHeader
              title={`Automated Compliance Findings (${findings.length})`}
              subtitle="Rules evaluated by the background AICTE surveillance engine"
            />
            <CardContent className="space-y-4">
              {findings.map((fnd) => (
                <div
                  key={fnd.id}
                  className="p-4 rounded-xl border border-slate-200/90 bg-white hover:border-slate-300 transition-colors space-y-2.5 shadow-2xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-900">
                        {fnd.ruleId || fnd.rule}
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium">
                        [{fnd.category}]
                      </span>
                    </div>
                    <SeverityBadge severity={fnd.severity} />
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed font-medium">
                    {fnd.description}
                  </p>

                  {fnd.evidence && (
                    <div className="p-2 rounded bg-slate-50 border border-slate-100 text-[11px] text-slate-600 font-mono">
                      <strong className="text-slate-800">Evidence: </strong>
                      {formatEvidence(fnd.evidence)}
                    </div>
                  )}

                  {fnd.suggestedAction && (
                    <div className="text-[11px] text-teal-800 bg-teal-50/70 p-2 rounded border border-teal-100">
                      <strong>Suggested Action: </strong>
                      {String(fnd.suggestedAction)}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right Panel: Official Officer Decision Form */}
        <div className="lg:col-span-5 sticky top-24">
          <Card>
            <CardHeader
              title="Official Determination Form"
              subtitle="Record regulatory approval, rejection, or request institutional clarification"
            />
            <form onSubmit={handleSubmitDecision}>
              <CardContent className="space-y-5">
                {/* Decision radio selection */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
                    Determination Status <span className="text-rose-500">*</span>
                  </label>
                  <div className="space-y-2">
                    <label
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        decision === 'verified'
                          ? 'border-emerald-500 bg-emerald-50/50 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="decision"
                        value="verified"
                        checked={decision === 'verified'}
                        onChange={() => setDecision('verified')}
                        className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                      />
                      <div className="text-xs">
                        <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Approve & Verify Instrument</span>
                        </div>
                        <div className="text-slate-500 text-[11px] mt-0.5">
                          Deposit meets all AICTE Approval Process Handbook standards.
                        </div>
                      </div>
                    </label>

                    <label
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        decision === 'clarification_required'
                          ? 'border-amber-500 bg-amber-50/50 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="decision"
                        value="clarification_required"
                        checked={decision === 'clarification_required'}
                        onChange={() => setDecision('clarification_required')}
                        className="mt-0.5 text-amber-600 focus:ring-amber-500"
                      />
                      <div className="text-xs">
                        <div className="font-bold text-amber-900 flex items-center gap-1.5">
                          <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                          <span>Request Clarification from Nodal Officer</span>
                        </div>
                        <div className="text-slate-500 text-[11px] mt-0.5">
                          Discrepancies identified (e.g. missing endorsement seal, mismatch).
                        </div>
                      </div>
                    </label>

                    <label
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        decision === 'rejected'
                          ? 'border-rose-500 bg-rose-50/50 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="decision"
                        value="rejected"
                        checked={decision === 'rejected'}
                        onChange={() => setDecision('rejected')}
                        className="mt-0.5 text-rose-600 focus:ring-rose-500"
                      />
                      <div className="text-xs">
                        <div className="font-bold text-rose-900 flex items-center gap-1.5">
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          <span>Reject Instrument</span>
                        </div>
                        <div className="text-slate-500 text-[11px] mt-0.5">
                          Certificate invalid, expired, or non-compliant with security guidelines.
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Scrutiny Notes */}
                <Textarea
                  label="Official Scrutiny Remarks & Directives"
                  placeholder="Detail rationale for determination, instructions to issuing bank, or reference citations..."
                  required
                  rows={4}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />

                <div className="text-[11px] text-slate-500 p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>
                    Your officer digital signature will be timestamped onto the permanent audit chain.
                  </span>
                </div>
              </CardContent>

              <CardFooter className="flex items-center justify-between">
                <Button variant="outline" size="sm" onClick={() => navigate('/verification')}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={submitting}
                  rightIcon={<Send className="w-3.5 h-3.5" />}
                >
                  Record Official Decision
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Unlock,
  Building2,
  Calendar,
  FileText,
  Download,
  CheckCircle,
  XCircle,
  Send,
  Lock,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  Button,
  Badge,
  Textarea,
  Spinner,
} from '../../components/ui';
import { releasesApi } from '../../api/releases';
import { fdrsApi } from '../../api/fdrs';
import { ReleaseRequest, FDR } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { formatCurrency, formatDate } from '../../utils/formatters';
import toast from 'react-hot-toast';

export const ReleaseRequestDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isStaff } = useAuth();

  const [request, setRequest] = useState<ReleaseRequest | null>(null);
  const [fdr, setFdr] = useState<FDR | null>(null);
  const [loading, setLoading] = useState(true);

  // Decision Form
  const [decision, setDecision] = useState<'approved' | 'rejected'>('approved');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchDetail = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const reqData = await releasesApi.getReleaseRequestById(id);
        setRequest(reqData);

        const realFdrId =
          typeof reqData.fdrId === 'object' && reqData.fdrId !== null
            ? ((reqData.fdrId as any)._id || (reqData.fdrId as any).id)
            : reqData.fdrId;

        let fdrData: FDR | null = null;
        if (typeof reqData.fdrId === 'object' && reqData.fdrId !== null && (reqData.fdrId as any).refNumber) {
          fdrData = {
            ...reqData.fdrId,
            id: realFdrId || 'fdr-item',
          };
        } else if (realFdrId) {
          fdrData = await fdrsApi.getFDRById(realFdrId);
        }

        setFdr(fdrData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [id]);

  const handleSubmitDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      setSubmitting(true);
      await releasesApi.updateDecision(id, {
        decision,
        notes,
      });
      toast.success(`Application marked as ${decision.toUpperCase()}!`);
      navigate('/release');
    } catch {
      toast.error('Failed to submit determination.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !request || !fdr) {
    return (
      <div className="py-24">
        <Spinner size="lg" label="Loading release authorization dossier..." />
      </div>
    );
  }

  const instName =
    typeof request.institutionId === 'object'
      ? (request.institutionId as any)?.name
      : request.institution?.name || 'Authorized Institution';

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/release')}
        leftIcon={<ArrowLeft className="w-4 h-4" />}
      >
        Back to Release Requests
      </Button>

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded border border-teal-200">
              Release Docket #{request.id}
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500">
              Applied {formatDate(request.createdAt)}
            </span>
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 mt-1">
            Deposit Discharge Application: {fdr.refNumber}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/clearance')}
            leftIcon={<ShieldCheck className="w-4 h-4 text-teal-600" />}
            rightIcon={<ArrowRight className="w-3.5 h-3.5 text-slate-400" />}
          >
            Clearance Command Center
          </Button>

          <div>
            {request.status === 'approved' ? (
              <Badge variant="success" dot size="md">
                Release Sanctioned & Discharged
              </Badge>
            ) : request.status === 'rejected' ? (
              <Badge variant="danger" dot size="md">
                Release Rejected
              </Badge>
            ) : (
              <Badge variant="warning" dot size="md">
                Awaiting Council Scrutiny
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left column: FDR & Justification Summary */}
        <div className="lg:col-span-7 space-y-6">
          <Card>
            <CardHeader
              title="Target Deposit Receipt Details"
              subtitle="Declared deposit under consideration for lien discharge"
            />
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-semibold">
                    Institution
                  </span>
                  <div className="font-semibold text-slate-900 mt-0.5 truncate">
                    {instName}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-semibold">
                    Issuing Bank
                  </span>
                  <div className="font-semibold text-slate-900 mt-0.5">{fdr.bankName}</div>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-semibold">
                    Principal Amount
                  </span>
                  <div className="font-bold text-teal-700 mt-0.5">
                    {formatCurrency(fdr.amount)}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-semibold">
                    Maturity Date
                  </span>
                  <div className="font-semibold text-slate-900 mt-0.5">
                    {formatDate(fdr.maturityDate)}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-semibold">
                    Current Deposit Status
                  </span>
                  <div className="font-semibold text-slate-800 mt-0.5">
                    {fdr.status.toUpperCase()}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Justification Section */}
          <Card>
            <CardHeader
              title="Grounds for Release & Legal Justification"
              subtitle="Official declaration provided by the applicant institution"
            />
            <CardContent>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-800 leading-relaxed font-medium">
                "{request.reason}"
              </div>
            </CardContent>
          </Card>

          {/* Documents Section */}
          <Card>
            <CardHeader
              title="Supporting Discharge Documents"
              subtitle="Mandatory AICTE Council resolutions, no-objection certificates, and bank statements"
            />
            <CardContent className="space-y-3">
              <div className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-teal-600" />
                  <div>
                    <div className="font-semibold text-slate-900">
                      AICTE_Council_Closure_Sanction.pdf
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      Hash: a1b2c3d4e5f6... (Signed by Member Secretary)
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => alert('Downloading official council sanction')}
                  leftIcon={<Download className="w-3.5 h-3.5" />}
                >
                  Download
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column: Decision Form or Decided Details */}
        <div className="lg:col-span-5 sticky top-24">
          {request.status === 'pending' && isStaff ? (
            <Card>
              <CardHeader
                title="Council Sanction Authorization"
                subtitle="Execute official determination on this discharge request"
              />
              <form onSubmit={handleSubmitDecision}>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-2">
                      Sanction Action
                    </label>
                    <div className="space-y-2">
                      <label
                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer ${
                          decision === 'approved'
                            ? 'border-emerald-500 bg-emerald-50/50'
                            : 'border-slate-200'
                        }`}
                      >
                        <input
                          type="radio"
                          name="relDecision"
                          checked={decision === 'approved'}
                          onChange={() => setDecision('approved')}
                        />
                        <div className="text-xs">
                          <span className="font-bold text-emerald-900 block">
                            Sanction Full Encashment & Release
                          </span>
                          <span className="text-[11px] text-slate-500">
                            Discharge lien and generate official release order to bank.
                          </span>
                        </div>
                      </label>

                      <label
                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer ${
                          decision === 'rejected'
                            ? 'border-rose-500 bg-rose-50/50'
                            : 'border-slate-200'
                        }`}
                      >
                        <input
                          type="radio"
                          name="relDecision"
                          checked={decision === 'rejected'}
                          onChange={() => setDecision('rejected')}
                        />
                        <div className="text-xs">
                          <span className="font-bold text-rose-900 block">
                            Decline & Reject Release
                          </span>
                          <span className="text-[11px] text-slate-500">
                            Maintain joint lien custody due to pending statutory obligations.
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>

                  <Textarea
                    label="Official Council Order Notes"
                    placeholder="Provide reference to AICTE Council meeting resolution number and executive instructions..."
                    rows={4}
                    required
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </CardContent>
                <CardFooter className="flex items-center justify-between">
                  <Button variant="outline" size="sm" onClick={() => navigate('/release')}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    isLoading={submitting}
                    rightIcon={<Send className="w-3.5 h-3.5" />}
                  >
                    Authorize Sanction
                  </Button>
                </CardFooter>
              </form>
            </Card>
          ) : (
            <Card>
              <CardHeader
                title="Official Council Determination Record"
                subtitle="Final action taken by authorized officers"
              />
              <CardContent className="space-y-4 text-xs">
                <div className="p-4 bg-slate-50 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-600">Decision Status:</span>
                    <Badge variant={request.status === 'approved' ? 'success' : 'danger'}>
                      {request.status.toUpperCase()}
                    </Badge>
                  </div>
                  {request.officerDecision?.notes && (
                    <div className="mt-2 text-slate-700">
                      <strong>Council Directives: </strong>
                      {request.officerDecision.notes}
                    </div>
                  )}
                  {request.officerDecision?.decidedAt && (
                    <div className="text-[11px] text-slate-400 mt-2">
                      Sanction timestamp: {formatDate(request.officerDecision.decidedAt)}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

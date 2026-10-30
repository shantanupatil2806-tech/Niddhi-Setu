import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Unlock,
  Plus,
  CheckCircle,
  XCircle,
  Building,
  Calendar,
  FileText,
  AlertCircle,
  AlertTriangle,
} from 'lucide-react';
import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Button,
  Card,
  CardHeader,
  CardContent,
  Badge,
  Modal,
  Input,
  Select,
  Textarea,
  Spinner,
} from '../../components/ui';
import { releasesApi } from '../../api/releases';
import { fdrsApi } from '../../api/fdrs';
import { ReleaseRequest, FDR } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { formatCurrency, formatDate } from '../../utils/formatters';
import toast from 'react-hot-toast';

export const ReleaseRequestsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isInstitution, isStaff } = useAuth();

  const [requests, setRequests] = useState<ReleaseRequest[]>([]);
  const [fdrs, setFdrs] = useState<FDR[]>([]);
  const [loading, setLoading] = useState(true);

  // New Request Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFdrId, setSelectedFdrId] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Quick officer action state
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Only verified or matured FDRs can have a release request submitted
  const eligibleFdrs = fdrs.filter(f => f.status === 'verified' || f.status === 'matured');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [relRes, fdrsRes] = await Promise.all([
        releasesApi.getReleaseRequests(),
        fdrsApi.getFDRs({ limit: 50 }),
      ]);
      setRequests(relRes.items);
      setFdrs(fdrsRes.items);
      // Auto-select first VERIFIED/MATURED FDR only
      const eligible = fdrsRes.items.filter((f: FDR) => f.status === 'verified' || f.status === 'matured');
      if (eligible.length > 0) {
        setSelectedFdrId(eligible[0].id);
      } else {
        setSelectedFdrId('');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load release requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFdrId || !reason.trim()) {
      toast.error('Please select a verified FDR and specify the regulatory release justification.');
      return;
    }
    // Front-end guard: check selected FDR is eligible
    const selectedFdr = fdrs.find(f => f.id === selectedFdrId);
    if (selectedFdr && selectedFdr.status !== 'verified' && selectedFdr.status !== 'matured') {
      toast.error(`Cannot apply for release: FDR is currently "${selectedFdr.status}". The FDR must be verified by an AICTE Finance Officer first.`);
      return;
    }
    try {
      setSubmitting(true);
      await releasesApi.createReleaseRequest({
        fdrId: selectedFdrId,
        reason,
        institutionId: user?.institutionId ? (typeof user.institutionId === 'string' ? user.institutionId : user.institutionId.id) : 'inst-001',
      });
      toast.success('Release and encashment application submitted for AICTE Council sanction.');
      setIsModalOpen(false);
      setReason('');
      fetchData();
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Failed to submit release application';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickDecision = async (id: string, decision: 'approved' | 'rejected') => {
    try {
      setProcessingId(id);
      await releasesApi.updateDecision(id, {
        decision,
        notes: `Quick officer action: Sanction ${decision} in accordance with Council Resolution.`,
      });
      toast.success(`Release request successfully ${decision}!`);
      fetchData();
    } catch {
      toast.error('Failed to update release decision');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Unlock className="w-6 h-6 text-teal-600" />
            <span>FDR Release & Encashment Clearance</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Formal release workflow for mature or replaced security deposits following completion of academic tenure
          </p>
        </div>

        {isInstitution && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsModalOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            New Release Application
          </Button>
        )}
      </div>

      {/* Main Table */}
      <Card>
        <CardHeader
          title={`Active Release Applications (${requests.length})`}
          subtitle="Review guarantee encashments, NOC discharges, and AICTE lien release requests"
        />
        <CardContent className="p-0">
          {loading ? (
            <div className="py-16">
              <Spinner label="Loading release applications..." />
            </div>
          ) : requests.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No release requests recorded.
            </div>
          ) : (
            <Table>
              <Thead>
                <Tr>
                  <Th>Application Code</Th>
                  <Th>FDR Reference #</Th>
                  <Th>Institution</Th>
                  <Th>Declared Reason / Justification</Th>
                  <Th>FDR Principal</Th>
                  <Th className="whitespace-nowrap">Submission Date</Th>
                  <Th className="whitespace-nowrap">Application Status</Th>
                  {isStaff && <Th className="whitespace-nowrap">Officer Action</Th>}
                </Tr>
              </Thead>
              <Tbody>
                {requests.map((req) => {
                  const fdrRef =
                    typeof req.fdrId === 'object'
                      ? (req.fdrId as any)?.refNumber
                      : req.fdr?.refNumber || 'SBI-FDR-2024-09823';

                  const amount =
                    typeof req.fdrId === 'object'
                      ? (req.fdrId as any)?.amount
                      : req.fdr?.amount || 5000000;

                  const instName =
                    typeof req.institutionId === 'object'
                      ? (req.institutionId as any)?.name
                      : req.institution?.name || 'COEP Technological University';

                  return (
                    <Tr
                      key={req.id}
                      isClickable
                      onClick={() => navigate(`/release/${req.id}`)}
                    >
                      <Td>
                        <span className="font-mono text-xs font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded">
                          {req.id}
                        </span>
                      </Td>
                      <Td>
                        <span className="font-mono font-bold text-xs text-slate-900">
                          {fdrRef}
                        </span>
                      </Td>
                      <Td>
                        <div className="flex items-center gap-1.5 text-xs text-slate-800 font-medium max-w-[200px] truncate">
                          <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{instName}</span>
                        </div>
                      </Td>
                      <Td>
                        <div className="text-xs text-slate-600 max-w-xs truncate" title={req.reason}>
                          {req.reason}
                        </div>
                      </Td>
                      <Td>
                        <span className="font-bold text-xs text-slate-900">
                          {formatCurrency(amount)}
                        </span>
                      </Td>
                      <Td className="whitespace-nowrap">
                        <span className="text-xs text-slate-500">
                          {formatDate(req.createdAt)}
                        </span>
                      </Td>
                      <Td className="whitespace-nowrap">
                        {req.status === 'approved' ? (
                          <Badge variant="success" dot size="sm">
                            Sanctioned (Approved)
                          </Badge>
                        ) : req.status === 'rejected' ? (
                          <Badge variant="danger" dot size="sm">
                            Rejected
                          </Badge>
                        ) : (
                          <Badge variant="warning" dot size="sm">
                            Pending Review
                          </Badge>
                        )}
                      </Td>
                      {isStaff && (
                        <Td className="whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          {req.status === 'pending' ? (
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-emerald-700 hover:bg-emerald-50 border-emerald-300 px-2 py-1"
                                isLoading={processingId === req.id}
                                onClick={() => handleQuickDecision(req.id, 'approved')}
                              >
                                Approve
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-rose-700 hover:bg-rose-50 border-rose-300 px-2 py-1"
                                isLoading={processingId === req.id}
                                onClick={() => handleQuickDecision(req.id, 'rejected')}
                              >
                                Reject
                              </Button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">
                              Decided
                            </span>
                          )}
                        </Td>
                      )}
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* New Request Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Apply for FDR Release & Encashment"
        subtitle="Submit formal justification for security deposit discharge and lien revocation"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={submitting}
              onClick={handleCreateRequest}
              disabled={eligibleFdrs.length === 0}
            >
              Submit Application
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateRequest} className="space-y-4">
          {/* Guard: no verified FDRs */}
          {eligibleFdrs.length === 0 ? (
            <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
              <div>
                <div className="font-bold mb-0.5">No Verified FDR Instruments Available</div>
                <p>
                  A release request can only be submitted for an FDR that has been <strong>verified</strong> by
                  an AICTE Finance Officer through the <strong>Verification Queue</strong>. None of your
                  registered FDRs are verified yet. Please wait for officer verification before applying.
                </p>
              </div>
            </div>
          ) : (
            <>
              <Select
                label="Select Verified Security Deposit Instrument to Release"
                value={selectedFdrId}
                onChange={(e) => setSelectedFdrId(e.target.value)}
                required
              >
                {eligibleFdrs.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.refNumber} — {f.bankName} ({formatCurrency(f.amount)}) [{f.status.toUpperCase()}]
                  </option>
                ))}
              </Select>

              <Textarea
                label="Detailed Justification / Council Clearance Ground"
                placeholder="State grounds: e.g., Graduation of all enrolled student cohorts, course tenure completion, or replacement guarantee already active..."
                required
                rows={4}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </>
          )}

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1.5">
            <div className="font-semibold text-slate-800">Regulatory Prerequisite Flow:</div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-emerald-500 text-white text-[9px] flex items-center justify-center font-bold shrink-0">1</span>
                <span>Institution submits &amp; registers FDR</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-emerald-500 text-white text-[9px] flex items-center justify-center font-bold shrink-0">2</span>
                <span>Finance Officer <strong>verifies FDR</strong> in Verification Queue ← <em>Required first</em></span>
              </div>
              <div className={`flex items-center gap-2 ${eligibleFdrs.length === 0 ? 'opacity-40' : ''}`}>
                <span className={`w-4 h-4 rounded-full ${eligibleFdrs.length > 0 ? 'bg-teal-600' : 'bg-slate-300'} text-white text-[9px] flex items-center justify-center font-bold shrink-0`}>3</span>
                <span>Institution submits release request ← <strong>You are here</strong></span>
              </div>
              <div className="flex items-center gap-2 opacity-40">
                <span className="w-4 h-4 rounded-full bg-slate-300 text-white text-[9px] flex items-center justify-center font-bold shrink-0">4</span>
                <span>Clearance Command Center orchestrates multi-dept NOC</span>
              </div>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};

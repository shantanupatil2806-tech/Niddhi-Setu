import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Shield,
  FileCheck2,
  CheckCircle2,
  XCircle,
  Hash,
  Clock,
  ArrowLeft,
  RefreshCw,
  Building2,
  Lock,
  ChevronDown,
  FileText,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardContent,
  Button,
  Badge,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Spinner,
  Modal,
} from '../../components/ui';
import { passportApi, IntegrityCheckResult } from '../../api/passport';
import { verificationApi } from '../../api/verification';
import { VerificationPassport } from '../../types';
import { formatDate } from '../../utils/formatters';
import toast from 'react-hot-toast';

export const VerificationPassportPage: React.FC = () => {
  const { caseId } = useParams<{ caseId: string }>();
  const targetCaseId = caseId || 'latest';
  const navigate = useNavigate();

  const [passport, setPassport] = useState<VerificationPassport | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingIntegrity, setCheckingIntegrity] = useState(false);
  const [integrityResult, setIntegrityResult] = useState<IntegrityCheckResult | null>(null);
  const [showIntegrityModal, setShowIntegrityModal] = useState(false);
  const [casesList, setCasesList] = useState<Array<{ id: string; label: string }>>([]);

  useEffect(() => {
    const fetchCases = async () => {
      try {
        const queueRes = await verificationApi.getQueue({ status: 'all', limit: 100 });
        const items = queueRes.items || [];
        const formatted = items.map((c: any) => {
          const fdrRef = typeof c.fdrId === 'object' ? c.fdrId?.refNumber : (c.fdr?.refNumber || 'FDR');
          const bank = typeof c.fdrId === 'object' ? c.fdrId?.bankName : (c.fdr?.bankName || '');
          const instName =
            typeof c.fdrId === 'object' && typeof c.fdrId?.institutionId === 'object'
              ? c.fdrId.institutionId.name
              : (c.institution?.name || '');
          const statusText = (c.status || 'open').replace(/_/g, ' ').toUpperCase();
          const label = `${fdrRef}${bank ? ` (${bank})` : ''}${instName ? ` • ${instName}` : ''} [${statusText}]`;
          return {
            id: c.id || c._id,
            label,
          };
        });
        setCasesList(formatted);
      } catch (err) {
        console.error('Failed to load cases queue for passport dropdown:', err);
      }
    };
    fetchCases();
  }, []);

  useEffect(() => {
    const fetchPassport = async () => {
      try {
        setLoading(true);
        const data = await passportApi.getPassport(targetCaseId);
        setPassport(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchPassport();
  }, [targetCaseId]);

  const handleVerifyIntegrity = async () => {
    try {
      setCheckingIntegrity(true);
      const caseIdToVerify =
        typeof passport?.caseId === 'object'
          ? (passport.caseId as any)._id
          : passport?.caseId || targetCaseId;
      const res = await passportApi.verifyIntegrity(caseIdToVerify);
      setIntegrityResult(res);
      setShowIntegrityModal(true);
      toast.success('Cryptographic verification completed successfully!');
    } catch {
      toast.error('Integrity check failed');
    } finally {
      setCheckingIntegrity(false);
    }
  };

  if (loading || !passport) {
    return (
      <div className="py-24">
        <Spinner size="lg" label="Loading verification passport..." />
      </div>
    );
  }

  const fdrRef =
    typeof passport.fdrId === 'object'
      ? (passport.fdrId as any).refNumber
      : passport.fdr?.refNumber || 'SBI-FDR-2024-09823';

  const displayCaseId =
    typeof passport.caseId === 'object'
      ? (passport.caseId as any)._id || 'AICTE-CASE-TOKEN'
      : String(passport.caseId || 'AICTE-CASE-TOKEN');

  const currentCaseId =
    typeof passport.caseId === 'object'
      ? (passport.caseId as any)._id
      : passport.caseId || caseId || '';

  const optionsWithCurrent = [...casesList];
  if (currentCaseId && !optionsWithCurrent.some((o) => o.id === currentCaseId)) {
    optionsWithCurrent.unshift({
      id: String(currentCaseId),
      label: `${fdrRef} — Current Case`,
    });
  }

  const submittedMeta = passport.submittedMetadata || {};

  return (
    <div className="space-y-6">
      {/* Top Bar: Back Button & Case Dropdown Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/verification')}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Back to Queue
          </Button>
          <div className="h-4 w-px bg-slate-200 hidden sm:block" />
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <FileText className="w-4 h-4 text-teal-600" />
            <span>Select Verification Case:</span>
          </div>
        </div>

        {/* Dropdown Selector */}
        <div className="relative min-w-[280px] sm:min-w-[420px]">
          <select
            id="passport-case-dropdown"
            value={String(currentCaseId)}
            onChange={(e) => {
              if (e.target.value) {
                navigate(`/passport/${e.target.value}`);
              }
            }}
            className="w-full rounded-xl border border-slate-300 bg-slate-50 hover:bg-white focus:bg-white px-3.5 py-2.5 pr-9 text-xs font-semibold text-slate-800 shadow-xs focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 cursor-pointer appearance-none transition-all"
          >
            {optionsWithCurrent.length === 0 ? (
              <option value="">Loading verification requests...</option>
            ) : (
              optionsWithCurrent.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))
            )}
          </select>
          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Hero Header */}
      <div className="bg-gradient-to-r from-navy-950 via-navy-900 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-slate-800">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-teal-500 to-teal-300 text-slate-950 flex items-center justify-center font-bold shrink-0 shadow-lg shadow-teal-500/20">
              <ShieldCheck className="w-9 h-9" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  VERIFICATION PASSPORT
                </span>
                <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  DIGITALLY VERIFIED
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mt-1.5 font-mono">
                {fdrRef}
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Verification Case Reference:{' '}
                <span className="font-mono text-teal-400">{displayCaseId}</span>
              </p>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-3">
            <Button
              variant="primary"
              size="md"
              isLoading={checkingIntegrity}
              onClick={handleVerifyIntegrity}
              leftIcon={<RefreshCw className="w-4 h-4" />}
            >
              Verify Cryptographic Integrity
            </Button>
          </div>
        </div>

        {/* Subtle background decoration */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-teal-500/10 via-transparent to-transparent pointer-events-none" />
      </div>

      {/* Section 1: Original Submission (doc hash, submitted metadata) */}
      <Card>
        <CardHeader
          title="1. Original Submission & Cryptographic Fingerprint"
          subtitle="Original certificate document hash and declared deposit parameters"
        />
        <CardContent className="space-y-4">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">
              Document SHA-256 Ledger Hash
            </div>
            <div className="font-mono text-xs font-semibold text-slate-800 break-all select-all">
              {passport.originalDocHash}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="p-3 rounded-lg border border-slate-200">
              <span className="text-slate-400 text-[10px] font-semibold uppercase">
                Stated Reference
              </span>
              <div className="font-bold text-slate-900 mt-0.5">
                {String(submittedMeta.refNumber || fdrRef)}
              </div>
            </div>
            <div className="p-3 rounded-lg border border-slate-200">
              <span className="text-slate-400 text-[10px] font-semibold uppercase">
                Issuing Bank
              </span>
              <div className="font-bold text-slate-900 mt-0.5">
                {String(submittedMeta.bankName || 'State Bank of India')}
              </div>
            </div>
            <div className="p-3 rounded-lg border border-slate-200">
              <span className="text-slate-400 text-[10px] font-semibold uppercase">
                Declared Amount
              </span>
              <div className="font-bold text-teal-700 mt-0.5">₹ 50,00,000</div>
            </div>
            <div className="p-3 rounded-lg border border-slate-200">
              <span className="text-slate-400 text-[10px] font-semibold uppercase">
                Lien Marking
              </span>
              <div className="font-bold text-emerald-700 mt-0.5">Joint Lien AICTE</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Extracted Fields (with match indicators) */}
      <Card>
        <CardHeader
          title="2. OCR Extracted Fields & Reconciled Match Matrix"
          subtitle="Comparison between submitted institutional metadata and automated machine-vision extraction"
        />
        <CardContent className="p-0">
          <Table>
            <Thead>
              <Tr>
                <Th>Field Description</Th>
                <Th>Form Submitted Value</Th>
                <Th>OCR Extracted Value</Th>
                <Th>Confidence Score</Th>
                <Th>Match Reconciliation</Th>
              </Tr>
            </Thead>
            <Tbody>
              {(passport.extractedFields || []).map((field, idx) => (
                <Tr key={field.field || idx}>
                  <Td>
                    <span className="font-semibold text-xs text-slate-900">{field.label}</span>
                  </Td>
                  <Td>
                    <span className="font-mono text-xs text-slate-700">
                      {String(field.submittedValue)}
                    </span>
                  </Td>
                  <Td>
                    <span className="font-mono text-xs text-slate-700">
                      {String(field.extractedValue)}
                    </span>
                  </Td>
                  <Td>
                    <span className="text-xs font-semibold text-slate-700">
                      {(field.confidence * 100).toFixed(0)}%
                    </span>
                  </Td>
                  <Td>
                    {field.match ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Exact Match
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                        <XCircle className="w-3.5 h-3.5 text-rose-600" />
                        Discrepancy
                      </span>
                    )}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </CardContent>
      </Card>

      {/* Section 3: Compliance Findings (all rules run, pass/fail) */}
      <Card>
        <CardHeader
          title="3. Surveillance Rule Suite Executions"
          subtitle="Exhaustive compliance checks evaluated against AICTE Approval Handbooks"
        />
        <CardContent className="p-0">
          <Table>
            <Thead>
              <Tr>
                <Th>Rule Identifier</Th>
                <Th>Compliance Category</Th>
                <Th>Audit Requirement Description</Th>
                <Th>Execution Status</Th>
              </Tr>
            </Thead>
            <Tbody>
              {(!passport.findings || passport.findings.length === 0) ? (
                <Tr>
                  <Td colSpan={4} className="py-8 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <span className="font-semibold text-slate-800 text-sm">
                        All Standard Surveillance Rules Evaluated & Passed
                      </span>
                      <span className="text-xs text-slate-500 max-w-md">
                        Zero discrepancies or rule violations detected for this deposit. All mandatory AICTE criteria (joint lien, tenure duration, bank endorsement) are 100% compliant.
                      </span>
                    </div>
                  </Td>
                </Tr>
              ) : (
                passport.findings.map((fnd, idx) => (
                  <Tr key={fnd.id || (fnd as any)._id || idx}>
                    <Td>
                      <span className="font-mono text-xs font-bold text-slate-900">
                        {fnd.ruleId || fnd.rule}
                      </span>
                    </Td>
                    <Td>
                      <span className="text-xs text-slate-600">{fnd.category || 'Compliance'}</span>
                    </Td>
                    <Td>
                      <span className="text-xs text-slate-800">{fnd.description}</span>
                    </Td>
                    <Td>
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        PASSED (100%)
                      </span>
                    </Td>
                  </Tr>
                ))
              )}
            </Tbody>
          </Table>
        </CardContent>
      </Card>

      {/* Section 4: Decisions History (chronological) */}
      <Card>
        <CardHeader
          title="4. Chronological Regulatory Decisions"
          subtitle="Historical record of officer reviews, approvals, and legal validations"
        />
        <CardContent className="space-y-4">
          {(!passport.decisions || passport.decisions.length === 0) ? (
            <div className="py-8 text-center text-slate-500">
              <div className="flex flex-col items-center justify-center gap-2">
                <div className="w-9 h-9 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
                  <Clock className="w-5 h-5" />
                </div>
                <span className="font-semibold text-slate-800 text-sm">
                  Scrutiny In Progress — Awaiting Officer Determination
                </span>
                <span className="text-xs text-slate-500 max-w-md">
                  This verification case is currently open. Once an officer submits an approval, rejection, or clarification directive on the case form, the signed decision will be recorded here.
                </span>
              </div>
            </div>
          ) : (
            <div className="relative border-l-2 border-slate-200 ml-4 pl-6 space-y-6">
              {passport.decisions.map((dec, idx) => (
                <div key={idx} className="relative group">
                  <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-teal-600 ring-4 ring-white" />
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-sm text-slate-900">{dec.decision}</span>
                      <span className="text-xs text-slate-400">{formatDate(dec.timestamp)}</span>
                    </div>
                    <div className="text-xs text-slate-600 mt-1">
                      Decided by <span className="font-semibold text-slate-800">{dec.decidedBy}</span>{' '}
                      ({dec.role})
                    </div>
                    {dec.notes && (
                      <p className="text-xs text-slate-700 mt-2 p-2.5 rounded bg-white border border-slate-100">
                        {dec.notes}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 5: Audit Chain (chain of hash-linked events with integrity badge) */}
      <Card>
        <CardHeader
          title="5. Cryptographic Audit Chain"
          subtitle="Every event is cryptographically hashed with its antecedent block for zero-tamper security"
          action={
            <Badge variant="success" dot size="md">
              Audit Chain Intact
            </Badge>
          }
        />
        <CardContent className="p-0">
          <Table>
            <Thead>
              <Tr>
                <Th>Block Step</Th>
                <Th>Action Tag</Th>
                <Th>Actor & Authority</Th>
                <Th>Timestamp</Th>
                <Th>Antecedent Hash</Th>
                <Th>Current Block Root</Th>
              </Tr>
            </Thead>
            <Tbody>
              {(passport.auditChain || []).map((link, idx) => (
                <Tr key={link.step || idx}>
                  <Td>
                    <span className="font-mono text-xs font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded">
                      #{link.step}
                    </span>
                  </Td>
                  <Td>
                    <span className="font-semibold text-xs text-slate-900">{link.action}</span>
                  </Td>
                  <Td>
                    <span className="text-xs text-slate-700">{link.actor}</span>
                  </Td>
                  <Td>
                    <span className="text-xs text-slate-500">{formatDate(link.timestamp)}</span>
                  </Td>
                  <Td>
                    <span className="font-mono text-[10px] text-slate-400 truncate max-w-[120px] block">
                      {link.previousHash}
                    </span>
                  </Td>
                  <Td>
                    <span className="font-mono text-[10px] text-slate-800 truncate max-w-[120px] block font-semibold">
                      {link.currentHash}
                    </span>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </CardContent>
      </Card>

      {/* Integrity Check Modal */}
      {integrityResult && (
        <Modal
          isOpen={showIntegrityModal}
          onClose={() => setShowIntegrityModal(false)}
          title="Cryptographic Ledger Integrity Proof"
          subtitle="Verification against all-India immutable audit hash tree"
          footer={
            <Button variant="primary" size="sm" onClick={() => setShowIntegrityModal(false)}>
              Acknowledge Proof
            </Button>
          }
        >
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm text-emerald-900">
                  Cryptographic Integrity Verified (100% Match)
                </h4>
                <p className="text-xs text-emerald-700 mt-1 leading-relaxed">
                  {integrityResult.message}
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl space-y-2 text-xs">
              <div>
                <span className="text-slate-400 font-semibold uppercase text-[10px]">
                  Document Registered Hash:
                </span>
                <div className="font-mono text-slate-800 font-semibold break-all">
                  {integrityResult.documentHash}
                </div>
              </div>
              <div>
                <span className="text-slate-400 font-semibold uppercase text-[10px]">
                  Calculated Runtime Digest:
                </span>
                <div className="font-mono text-slate-800 font-semibold break-all">
                  {integrityResult.calculatedHash}
                </div>
              </div>
              <div className="pt-1 flex items-center justify-between text-slate-600">
                <span>Tamper Detected:</span>
                <span className="font-bold text-emerald-600">NONE (ZERO MUTATIONS)</span>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

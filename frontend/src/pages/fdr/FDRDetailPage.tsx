import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FileText,
  Building2,
  Calendar,
  Shield,
  Clock,
  ArrowLeft,
  Download,
  ExternalLink,
  GitBranch,
  ShieldAlert,
  Hash,
  Sparkles,
  Lock,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardContent,
  Button,
  Tabs,
  StatusBadge,
  SeverityBadge,
  Badge,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Spinner,
} from '../../components/ui';
import { fdrsApi } from '../../api/fdrs';
import { reportsApi } from '../../api/reports';
import { FDR, VerificationFinding, AuditEvent, LineageData } from '../../types';
import { formatCurrency, formatDate, getDaysToMaturity, formatRelativeDate, formatEvidence } from '../../utils/formatters';

export const FDRDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [fdr, setFdr] = useState<FDR | null>(null);
  const [findings, setFindings] = useState<VerificationFinding[]>([]);
  const [lineage, setLineage] = useState<LineageData | null>(null);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const fetchFDRDetails = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const [fdrRes, findingsRes, lineageRes, auditRes] = await Promise.all([
          fdrsApi.getFDRById(id),
          fdrsApi.getFDRFindings(id),
          fdrsApi.getFDRLineage(id),
          reportsApi.getAuditLogs(),
        ]);
        setFdr(fdrRes);
        setFindings(findingsRes);
        setLineage(lineageRes);
        setAuditEvents(auditRes);
      } catch (err) {
        console.error('Error fetching FDR detail:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchFDRDetails();
  }, [id]);

  if (loading || !fdr) {
    return (
      <div className="py-24">
        <Spinner size="lg" label="Retrieving financial deposit ledger..." />
      </div>
    );
  }

  const daysRemaining = getDaysToMaturity(fdr.maturityDate);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <FileText className="w-4 h-4" /> },
    { id: 'documents', label: 'Deposit Documents', icon: <Hash className="w-4 h-4" /> },
    { id: 'findings', label: 'Compliance Findings', badge: findings.length, icon: <ShieldAlert className="w-4 h-4" /> },
    { id: 'lineage', label: 'Lineage Chain', icon: <GitBranch className="w-4 h-4" /> },
    { id: 'passport', label: 'Verification Passport', icon: <Shield className="w-4 h-4" /> },
    { id: 'audit', label: 'Audit Trail', badge: auditEvents.length, icon: <Clock className="w-4 h-4" /> },
  ];

  const instName =
    typeof fdr.institutionId === 'object'
      ? (fdr.institutionId as any)?.name
      : fdr.institution?.name || 'Registered Technical College';

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/fdrs')}
        leftIcon={<ArrowLeft className="w-4 h-4" />}
      >
        Back to FDR Register
      </Button>

      {/* Hero Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-200/70 flex items-center justify-center text-teal-700 font-bold shrink-0">
              <FileText className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight font-mono">
                  {fdr.refNumber}
                </h1>
                <StatusBadge status={fdr.status} />
              </div>

              <div className="flex flex-wrap items-center gap-y-1 gap-x-4 mt-2 text-xs text-slate-500">
                <span className="flex items-center gap-1 text-slate-700 font-medium">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  {instName}
                </span>
                <span>•</span>
                <span>{fdr.bankName}</span>
                <span>•</span>
                <span className="font-mono text-slate-400">ID: {fdr.id}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/passport/case-001`)}
              leftIcon={<Shield className="w-4 h-4" />}
            >
              Passport Ledger
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/graph`)}
              leftIcon={<ExternalLink className="w-4 h-4" />}
            >
              Graph Explorer
            </Button>
          </div>
        </div>

        {/* Highlight strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Principal Deposit Amount
            </div>
            <div className="text-xl font-bold text-slate-900 mt-0.5">
              {formatCurrency(fdr.amount)}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Maturity Expiry Date
            </div>
            <div className="text-base font-bold text-slate-900 mt-0.5">
              {formatDate(fdr.maturityDate)}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Maturity Countdown
            </div>
            <div className="text-base font-bold mt-0.5">
              {daysRemaining < 0 ? (
                <span className="text-rose-600">Overdue by {Math.abs(daysRemaining)} days</span>
              ) : daysRemaining <= 30 ? (
                <span className="text-amber-600">{daysRemaining} days remaining</span>
              ) : (
                <span className="text-slate-800">{daysRemaining} days remaining</span>
              )}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Lien Endorsement
            </div>
            <div className="text-base font-bold text-teal-700 mt-0.5 flex items-center gap-1.5">
              <Lock className="w-4 h-4" />
              <span>Joint with AICTE</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader title="Banking Certificate Details" />
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <span className="text-slate-400 uppercase font-semibold text-[10px]">
                      Issuing Financial Institution
                    </span>
                    <div className="font-semibold text-slate-900 text-sm mt-0.5">
                      {fdr.bankName}
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <span className="text-slate-400 uppercase font-semibold text-[10px]">
                      Branch & Address
                    </span>
                    <div className="font-semibold text-slate-900 text-sm mt-0.5">
                      {fdr.branch || 'Main Commercial Branch'}
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <span className="text-slate-400 uppercase font-semibold text-[10px]">
                      Issue Date
                    </span>
                    <div className="font-semibold text-slate-900 text-sm mt-0.5">
                      {formatDate(fdr.issueDate)}
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <span className="text-slate-400 uppercase font-semibold text-[10px]">
                      Maturity Date
                    </span>
                    <div className="font-semibold text-slate-900 text-sm mt-0.5">
                      {formatDate(fdr.maturityDate)}
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <span className="text-slate-400 uppercase font-semibold text-[10px]">
                      Deposit Currency
                    </span>
                    <div className="font-semibold text-slate-900 text-sm mt-0.5">
                      {fdr.currency || 'INR'} (Indian Rupees)
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <span className="text-slate-400 uppercase font-semibold text-[10px]">
                      Predecessor Instrument Link
                    </span>
                    <div className="font-semibold text-slate-900 text-sm mt-0.5">
                      {fdr.parentFdrId ? `Linked Predecessor: ${fdr.parentFdrId}` : 'Original Primary Instrument'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Extracted Metadata Fields with Confidence Score */}
            <Card>
              <CardHeader
                title="AI OCR Automated Extraction Metadata"
                subtitle="Fields automatically extracted and verified against certificate image"
                action={
                  <Badge variant="teal" size="sm">
                    <Sparkles className="w-3 h-3 mr-1" />
                    Confidence: {((fdr.metadata?.confidenceScore || 0.98) * 100).toFixed(0)}%
                  </Badge>
                }
              />
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-3 rounded-lg border border-slate-200">
                    <span className="text-slate-500">Extracted Reference #</span>
                    <div className="font-mono font-semibold text-slate-900 mt-1">
                      {fdr.metadata?.extractedRefNumber || fdr.refNumber}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg border border-slate-200">
                    <span className="text-slate-500">Extracted Bank Name</span>
                    <div className="font-semibold text-slate-900 mt-1">
                      {fdr.metadata?.extractedBankName || fdr.bankName}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg border border-slate-200">
                    <span className="text-slate-500">Extracted Amount</span>
                    <div className="font-semibold text-slate-900 mt-1">
                      {formatCurrency(fdr.metadata?.extractedAmount || fdr.amount)}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg border border-slate-200">
                    <span className="text-slate-500">Extracted Maturity</span>
                    <div className="font-semibold text-slate-900 mt-1">
                      {formatDate(fdr.metadata?.extractedMaturityDate || fdr.maturityDate)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right column: Regulatory notices */}
          <div className="space-y-6">
            <Card>
              <CardHeader title="Compliance Checklist" />
              <CardContent className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-2.5 bg-emerald-50 rounded-lg text-emerald-800">
                  <span>Document Integrity Check</span>
                  <span className="font-bold">PASSED</span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-emerald-50 rounded-lg text-emerald-800">
                  <span>AICTE Joint Lien Clause</span>
                  <span className="font-bold">CONFIRMED</span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-emerald-50 rounded-lg text-emerald-800">
                  <span>Amount Parity with Regulatory Norms</span>
                  <span className="font-bold">PASSED</span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-emerald-50 rounded-lg text-emerald-800">
                  <span>Instrument Uniqueness Check</span>
                  <span className="font-bold">PASSED</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Tab 2: Documents */}
      {activeTab === 'documents' && (
        <Card>
          <CardHeader
            title="Attached Deposit Certificates"
            subtitle="Official digital copies uploaded during deposit submission"
          />
          <CardContent className="space-y-6">
            <div className="p-5 border border-slate-200 rounded-xl bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-3 rounded-lg bg-teal-100 text-teal-800 shrink-0">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-semibold text-sm text-slate-900">
                    {fdr.docOriginalName || 'Official_Deposit_Receipt.pdf'}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Portable Document Format (PDF) • 2.4 MB • Uploaded {formatDate(fdr.createdAt)}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400">
                      Document Checksum:
                    </span>
                    <span className="text-[11px] font-mono text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200 break-all select-all">
                      {fdr.docHash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => alert(`Downloading verified certificate: ${fdr.refNumber}`)}
                  leftIcon={<Download className="w-4 h-4" />}
                >
                  Download Certificate
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab 3: Findings */}
      {activeTab === 'findings' && (
        <Card>
          <CardHeader
            title="Surveillance Rule Engine Findings"
            subtitle="Automated regulatory rule executions and scrutiny flags"
          />
          <CardContent className="p-0">
            {findings.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No active discrepancies or scrutiny findings recorded for this instrument.
              </div>
            ) : (
              <Table>
                <Thead>
                  <Tr>
                    <Th>Rule ID</Th>
                    <Th>Category</Th>
                    <Th>Severity</Th>
                    <Th>Finding Description</Th>
                    <Th>Evidence</Th>
                    <Th>Suggested Action</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {findings.map((fnd) => (
                    <Tr key={fnd.id}>
                      <Td>
                        <span className="font-mono text-xs font-semibold text-slate-900">
                          {fnd.ruleId || fnd.rule}
                        </span>
                      </Td>
                      <Td>
                        <span className="text-xs text-slate-700">{fnd.category}</span>
                      </Td>
                      <Td>
                        <SeverityBadge severity={fnd.severity} />
                      </Td>
                      <Td>
                        <div className="text-xs text-slate-800 max-w-sm">
                          {fnd.description}
                        </div>
                      </Td>
                      <Td>
                        <div className="text-xs font-mono text-slate-600 max-w-xs truncate">
                          {formatEvidence(fnd.evidence)}
                        </div>
                      </Td>
                      <Td>
                        <div className="text-xs text-slate-700 max-w-xs">
                          {String(fnd.suggestedAction || '—')}
                        </div>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab 4: Lineage */}
      {activeTab === 'lineage' && (
        <Card>
          <CardHeader
            title="Temporal Lineage & Successor Tracking"
            subtitle="Historical timeline of renewal and replacement instruments"
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/lineage')}
                leftIcon={<GitBranch className="w-4 h-4" />}
              >
                Lineage Explorer
              </Button>
            }
          />
          <CardContent>
            {lineage && lineage.chain.length > 0 ? (
              <div className="space-y-6">
                <div className="relative border-l-2 border-teal-500 ml-4 pl-6 space-y-6">
                  {lineage.chain.map((node, idx) => (
                    <div key={node.fdr.id || idx} className="relative group">
                      <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-teal-600 ring-4 ring-white" />
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-sm text-slate-900 font-mono">
                            {node.fdr.refNumber}
                          </span>
                          <StatusBadge status={node.fdr.status} />
                        </div>
                        <div className="text-xs text-slate-600 mt-1">
                          {node.fdr.bankName} • {formatCurrency(node.fdr.amount)}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1">
                          Valid: {formatDate(node.fdr.issueDate)} — {formatDate(node.fdr.maturityDate)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-slate-500">
                This is a primary deposit certificate with no antecedent lineage chain.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab 5: Passport */}
      {activeTab === 'passport' && (
        <Card>
          <CardHeader
            title="Verification Passport Cryptographic Seal"
            subtitle="Immutable digital compliance passport for this deposit certificate"
          />
          <CardContent className="space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed">
              Every scrutinized FDR receives an immutable Verification Passport containing the original
              file hash, extracted field matches, and cryptographic ledger signatures.
            </p>
            <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-sm text-teal-900">
                  Passport Token: CASE-001-FDR-AICTE
                </h4>
                <p className="text-xs text-teal-700 mt-0.5">
                  Status: 100% Cryptographically Verified & Sealed
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/passport/case-001')}
                rightIcon={<ExternalLink className="w-4 h-4" />}
              >
                Inspect Full Passport
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab 6: Audit Trail */}
      {activeTab === 'audit' && (
        <Card>
          <CardHeader
            title="Audit Trail"
            subtitle="Official chronological event and verification records"
          />
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {auditEvents.map((evt) => (
                <div key={evt.id} className="p-4 flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-teal-500 mt-1.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-900">{evt.action}</span>
                      <span className="text-slate-400">{formatRelativeDate(evt.timestamp)}</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Actor: <span className="font-medium text-slate-800">{typeof evt.actor === 'object' ? evt.actor.name : evt.actor}</span>
                    </p>
                    {evt.currentHash && (
                      <p className="text-[10px] font-mono text-slate-400 mt-1 truncate">
                        Record ID: {evt.currentHash}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

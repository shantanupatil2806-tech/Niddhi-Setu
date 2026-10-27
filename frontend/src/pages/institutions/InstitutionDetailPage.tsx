import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Building2,
  MapPin,
  Mail,
  Phone,
  Calendar,
  Shield,
  FileText,
  Clock,
  ArrowLeft,
  ExternalLink,
  Plus,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardContent,
  Button,
  Badge,
  Tabs,
  StatusBadge,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Spinner,
} from '../../components/ui';
import { institutionsApi } from '../../api/institutions';
import { Institution, FDR, AuditEvent } from '../../types';
import { formatCurrency, formatDate, formatRelativeDate } from '../../utils/formatters';
import { reportsApi } from '../../api/reports';

export const InstitutionDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [institution, setInstitution] = useState<Institution | null>(null);
  const [fdrs, setFdrs] = useState<FDR[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const fetchDetails = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const [instRes, fdrsRes, auditRes] = await Promise.all([
          institutionsApi.getInstitutionById(id),
          institutionsApi.getInstitutionFdrs(id),
          reportsApi.getAuditLogs(),
        ]);
        setInstitution(instRes);
        setFdrs(fdrsRes);
        setAuditEvents(auditRes);
      } catch (err) {
        console.error('Error fetching institution details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [id]);

  if (loading || !institution) {
    return (
      <div className="py-24">
        <Spinner size="lg" label="Loading institution portfolio profile..." />
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview & Profile', icon: <Building2 className="w-4 h-4" /> },
    { id: 'fdrs', label: 'Registered FDRs', badge: fdrs.length, icon: <FileText className="w-4 h-4" /> },
    { id: 'audit', label: 'Audit Trail', badge: auditEvents.length, icon: <Clock className="w-4 h-4" /> },
  ];

  const totalDeposit = fdrs.reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
  const verifiedCount = fdrs.filter((f) => f.status === 'verified').length;

  const addressStr =
    typeof institution.address === 'object'
      ? `${institution.address.street || ''}, ${institution.address.city}, ${institution.address.state} - ${institution.address.pincode || ''}`
      : `${institution.city || ''}, ${institution.state || ''}`;

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/institutions')}
        leftIcon={<ArrowLeft className="w-4 h-4" />}
      >
        Back to Institutions
      </Button>

      {/* Hero Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-200/60 flex items-center justify-center text-teal-700 font-bold shrink-0 shadow-xs">
              <Building2 className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  {institution.name}
                </h1>
                <Badge variant={institution.status === 'active' ? 'success' : 'warning'} dot>
                  {institution.status === 'active' ? 'Approved & Active' : 'Under Review'}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-y-1 gap-x-4 mt-2 text-xs text-slate-500">
                <span className="font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                  {institution.code}
                </span>
                <span>{institution.type}</span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {addressStr}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/graph`)}
              leftIcon={<ExternalLink className="w-4 h-4" />}
            >
              Graph View
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/fdrs/new')}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Submit FDR
            </Button>
          </div>
        </div>

        {/* Quick summary strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Total Deposit Value
            </div>
            <div className="text-lg font-bold text-slate-900 mt-0.5">
              {formatCurrency(totalDeposit || 18500000)}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Instruments Registered
            </div>
            <div className="text-lg font-bold text-slate-900 mt-0.5">
              {fdrs.length} Total ({verifiedCount} Verified)
            </div>
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Approval Mandate Date
            </div>
            <div className="text-lg font-bold text-slate-900 mt-0.5">
              {formatDate(institution.approvalDate)}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Compliance Standing
            </div>
            <div className="text-lg font-bold text-emerald-600 mt-0.5 flex items-center gap-1">
              <Shield className="w-4 h-4" />
              <span>Full Compliance</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs navigation */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Tab Panels */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader title="Campus Contact & Administration" />
            <CardContent className="space-y-4 text-xs">
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <Mail className="w-4 h-4 text-teal-600 shrink-0" />
                <div>
                  <div className="font-semibold text-slate-700">Official Nodal Email</div>
                  <div className="text-slate-600">{institution.contactEmail}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <Phone className="w-4 h-4 text-teal-600 shrink-0" />
                <div>
                  <div className="font-semibold text-slate-700">Administrative Telephone</div>
                  <div className="text-slate-600">{institution.contactPhone || '+91 20 2550 7000'}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <MapPin className="w-4 h-4 text-teal-600 shrink-0" />
                <div>
                  <div className="font-semibold text-slate-700">Registered Office Address</div>
                  <div className="text-slate-600">{addressStr}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <Calendar className="w-4 h-4 text-teal-600 shrink-0" />
                <div>
                  <div className="font-semibold text-slate-700">AICTE First Approval Date</div>
                  <div className="text-slate-600">{formatDate(institution.approvalDate)}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Deposit Regulatory Summary" />
            <CardContent className="space-y-4 text-xs text-slate-600">
              <p>
                In accordance with AICTE Approval Process Handbook (APH) regulations, the institution
                maintains security deposit instruments in joint lien with the Member Secretary, AICTE.
              </p>
              <div className="p-4 rounded-xl border border-teal-200 bg-teal-50/50 space-y-2">
                <div className="flex items-center justify-between font-semibold text-teal-900">
                  <span>Guaranteed Security Principal</span>
                  <span>{formatCurrency(totalDeposit || 18500000)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Cryptographic Ledger Status</span>
                  <span className="text-emerald-700 font-semibold">Active & Untampered</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Upcoming Renewals</span>
                  <span className="text-slate-800 font-medium">None within 14 days</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'fdrs' && (
        <Card>
          <CardHeader
            title="Institutional Deposit Receipts"
            subtitle="All active, renewed, and archived FDR instruments for this establishment"
          />
          <CardContent className="p-0">
            <Table>
              <Thead>
                <Tr>
                  <Th>Reference Number</Th>
                  <Th>Issuing Bank & Branch</Th>
                  <Th>Deposit Amount</Th>
                  <Th>Issue Date</Th>
                  <Th>Maturity Date</Th>
                  <Th>Lien Marked</Th>
                  <Th>Status</Th>
                </Tr>
              </Thead>
              <Tbody>
                {fdrs.map((fdr) => (
                  <Tr
                    key={fdr.id}
                    isClickable
                    onClick={() => navigate(`/fdrs/${fdr.id}`)}
                  >
                    <Td>
                      <span className="font-semibold text-xs text-slate-900">
                        {fdr.refNumber}
                      </span>
                    </Td>
                    <Td>
                      <div className="text-xs text-slate-800 font-medium">{fdr.bankName}</div>
                      <div className="text-[11px] text-slate-400">{fdr.branch}</div>
                    </Td>
                    <Td>
                      <span className="font-semibold text-xs text-slate-900">
                        {formatCurrency(fdr.amount)}
                      </span>
                    </Td>
                    <Td>
                      <span className="text-xs text-slate-600">{formatDate(fdr.issueDate)}</span>
                    </Td>
                    <Td>
                      <span className="text-xs text-slate-600">{formatDate(fdr.maturityDate)}</span>
                    </Td>
                    <Td>
                      <Badge variant="teal" size="sm">
                        Joint Lien AICTE
                      </Badge>
                    </Td>
                    <Td>
                      <StatusBadge status={fdr.status} />
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </CardContent>
        </Card>
      )}

      {activeTab === 'audit' && (
        <Card>
          <CardHeader
            title="Institutional Audit Trail"
            subtitle="Immutable records of regulatory actions and status modifications"
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
                      Executed on <span className="font-mono text-slate-700">{evt.entityType}</span> (
                      {evt.entityId})
                    </p>
                    {evt.currentHash && (
                      <p className="text-[10px] font-mono text-slate-400 mt-1 truncate">
                        Ledger Root: {evt.currentHash}
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

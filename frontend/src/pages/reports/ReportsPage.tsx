import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  Filter,
  Calendar,
  CheckCircle,
  Clock,
  Search,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardContent,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Select,
  Input,
  Badge,
  StatusBadge,
  Spinner,
} from '../../components/ui';
import { reportsApi } from '../../api/reports';
import { fdrsApi } from '../../api/fdrs';
import { FDR, AuditEvent } from '../../types';
import { formatCurrency, formatDate, formatRelativeDate } from '../../utils/formatters';
import toast from 'react-hot-toast';

export const ReportsPage: React.FC = () => {
  const [selectedReport, setSelectedReport] = useState<string>('fdr_summary');
  const [fdrs, setFdrs] = useState<FDR[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchFilter, setSearchFilter] = useState('');

  const reportList = [
    {
      id: 'fdr_summary',
      name: 'FDR Summary Report',
      desc: 'Master ledger of all security deposits, lien status, and issuing banks',
    },
    {
      id: 'maturity_schedule',
      name: 'Maturity Schedule Report',
      desc: 'Chronological forecast of maturing deposits and rollover deadlines',
    },
    {
      id: 'verification_report',
      name: 'Verification & Scrutiny Report',
      desc: 'Analysis of automated OCR rule findings and officer clearance rates',
    },
    {
      id: 'renewal_report',
      name: 'Renewal & Succession Report',
      desc: 'Lineage tracking of renewed certificates and amount parity compliance',
    },
    {
      id: 'release_report',
      name: 'Release & Encashment Report',
      desc: 'Official audit record of discharged liens and refunds',
    },
    {
      id: 'audit_log',
      name: 'Regulatory Audit Log',
      desc: 'Official chronological audit trail of regulatory events and decisions',
    },
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [fdrsRes, auditRes] = await Promise.all([
          fdrsApi.getFDRs({ limit: 50 }),
          reportsApi.getAuditLogs(),
        ]);
        setFdrs(fdrsRes.items);
        setAuditEvents(auditRes);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleExport = async () => {
    try {
      setExporting(true);
      const blob = await reportsApi.exportReportCsv(selectedReport, { status: statusFilter });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `AICTE_${selectedReport.toUpperCase()}_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Report successfully exported as CSV!');
    } catch {
      toast.error('Failed to export report');
    } finally {
      setExporting(false);
    }
  };

  const currentReportObj = reportList.find((r) => r.id === selectedReport);

  // Filter FDRs
  const filteredFdrs = fdrs.filter((f) => {
    if (statusFilter !== 'all' && f.status !== statusFilter) return false;
    if (searchFilter && !f.refNumber.toLowerCase().includes(searchFilter.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-teal-600" />
          <span>Statutory Reports & Regulatory Export Center</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Generate consolidated compliance certificates, audit logs, and analytics reports for AICTE executive review
        </p>
      </div>

      {/* Main Layout: Left Sidebar + Right Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Report Selection Sidebar */}
        <div className="lg:col-span-4 space-y-2">
          <Card>
            <CardHeader title="Available Regulatory Reports" />
            <CardContent className="p-2 space-y-1">
              {reportList.map((rep) => {
                const isActive = selectedReport === rep.id;
                return (
                  <div
                    key={rep.id}
                    onClick={() => setSelectedReport(rep.id)}
                    className={`p-3 rounded-xl cursor-pointer transition-all ${
                      isActive
                        ? 'bg-teal-50 border-teal-500 border text-teal-950 font-semibold shadow-xs'
                        : 'hover:bg-slate-50 border border-transparent text-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold leading-tight">{rep.name}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                      {rep.desc}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Right Preview & Filter Panel */}
        <div className="lg:col-span-8 space-y-6">
          <Card>
            <CardHeader
              title={currentReportObj?.name}
              subtitle={currentReportObj?.desc}
              action={
                <Button
                  variant="primary"
                  size="sm"
                  isLoading={exporting}
                  onClick={handleExport}
                  leftIcon={<Download className="w-4 h-4" />}
                >
                  Export CSV
                </Button>
              }
            />

            {/* Filter controls */}
            <CardContent className="p-4 border-b border-slate-100 bg-slate-50/50">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input
                  placeholder="Filter by ref#, keyword..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  leftIcon={<Search className="w-4 h-4" />}
                />
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Statuses</option>
                  <option value="verified">Verified</option>
                  <option value="under_review">Under Review</option>
                  <option value="matured">Matured</option>
                  <option value="released">Released</option>
                </Select>
                <Button
                  variant="ghost"
                  size="md"
                  onClick={() => {
                    setSearchFilter('');
                    setStatusFilter('all');
                  }}
                >
                  Reset Filters
                </Button>
              </div>
            </CardContent>

            {/* Data Table Preview */}
            <CardContent className="p-0">
              {loading ? (
                <div className="py-16">
                  <Spinner label="Assembling preview data..." />
                </div>
              ) : selectedReport === 'audit_log' ? (
                <Table>
                  <Thead>
                    <Tr>
                      <Th>Timestamp</Th>
                      <Th>Actor & Role</Th>
                      <Th>Action Tag</Th>
                      <Th>Entity ID</Th>
                      <Th>Record Checksum</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {auditEvents.map((evt) => (
                      <Tr key={evt.id}>
                        <Td>
                          <span className="text-xs text-slate-500">
                            {formatDate(evt.timestamp)}
                          </span>
                        </Td>
                        <Td>
                          <div className="text-xs font-semibold text-slate-800">
                            {typeof evt.actor === 'object' ? evt.actor.name : evt.actor}
                          </div>
                          <div className="text-[10px] text-slate-400 uppercase">
                            {evt.actorRole}
                          </div>
                        </Td>
                        <Td>
                          <span className="text-xs font-mono font-medium text-teal-800 bg-teal-50 px-2 py-0.5 rounded">
                            {evt.action}
                          </span>
                        </Td>
                        <Td>
                          <span className="text-xs font-mono text-slate-700">
                            {evt.entityId}
                          </span>
                        </Td>
                        <Td>
                          <span className="text-[10px] font-mono text-slate-500 truncate max-w-[150px] block">
                            {evt.currentHash}
                          </span>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              ) : (
                <Table>
                  <Thead>
                    <Tr>
                      <Th>Reference #</Th>
                      <Th>Bank Name</Th>
                      <Th>Principal Value</Th>
                      <Th>Issue Date</Th>
                      <Th>Maturity Date</Th>
                      <Th>Regulatory Status</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {filteredFdrs.map((fdr) => (
                      <Tr key={fdr.id}>
                        <Td>
                          <span className="font-mono font-semibold text-xs text-slate-900">
                            {fdr.refNumber}
                          </span>
                        </Td>
                        <Td>
                          <span className="text-xs text-slate-700">{fdr.bankName}</span>
                        </Td>
                        <Td>
                          <span className="font-bold text-xs text-slate-900">
                            {formatCurrency(fdr.amount)}
                          </span>
                        </Td>
                        <Td>
                          <span className="text-xs text-slate-500">
                            {formatDate(fdr.issueDate)}
                          </span>
                        </Td>
                        <Td>
                          <span className="text-xs text-slate-900 font-medium">
                            {formatDate(fdr.maturityDate)}
                          </span>
                        </Td>
                        <Td>
                          <StatusBadge status={fdr.status} />
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

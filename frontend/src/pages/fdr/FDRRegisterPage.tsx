import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search,
  Plus,
  Download,
  Building,
  Calendar,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';
import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Button,
  Input,
  Select,
  Card,
  CardHeader,
  CardContent,
  Pagination,
  StatusBadge,
  Badge,
  Spinner,
  EmptyState,
} from '../../components/ui';
import { fdrsApi } from '../../api/fdrs';
import { institutionsApi } from '../../api/institutions';
import { reportsApi } from '../../api/reports';
import { FDR, Institution } from '../../types';
import { usePagination } from '../../hooks/usePagination';
import { useAuth } from '../../hooks/useAuth';
import { formatCurrency, formatDate, getDaysToMaturity } from '../../utils/formatters';
import toast from 'react-hot-toast';

export const FDRRegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isInstitution } = useAuth();
  const { page, limit, total, totalPages, setPage, setTotal } = usePagination();

  const [fdrs, setFdrs] = useState<FDR[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Filters
  const initialStatus = searchParams.get('status') || 'all';
  const [status, setStatus] = useState(initialStatus);
  const [institutionId, setInstitutionId] = useState(isInstitution && user?.institutionId ? (typeof user.institutionId === 'string' ? user.institutionId : user.institutionId.id) : 'all');
  const [search, setSearch] = useState('');

  // Sorting
  const [sortBy, setSortBy] = useState<string>('maturityDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    // Fetch institutions list for filter
    const fetchInstitutions = async () => {
      try {
        const res = await institutionsApi.getInstitutions({ limit: 100 });
        setInstitutions(res.items);
      } catch (e) {
        console.error(e);
      }
    };
    fetchInstitutions();
  }, []);

  const fetchFDRs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fdrsApi.getFDRs({
        status,
        institutionId: isInstitution && user?.institutionId ? (typeof user.institutionId === 'string' ? user.institutionId : user.institutionId.id) : institutionId,
        search,
        page,
        limit,
        sortBy,
        sortOrder,
      });

      // Client-side sort support if mock
      let sorted = [...res.items];
      sorted.sort((a, b) => {
        let valA: any = a[sortBy as keyof FDR];
        let valB: any = b[sortBy as keyof FDR];
        if (sortBy === 'amount') {
          return sortOrder === 'asc' ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
        }
        if (sortBy === 'maturityDate' || sortBy === 'issueDate') {
          return sortOrder === 'asc'
            ? new Date(valA).getTime() - new Date(valB).getTime()
            : new Date(valB).getTime() - new Date(valA).getTime();
        }
        return sortOrder === 'asc'
          ? String(valA).localeCompare(String(valB))
          : String(valB).localeCompare(String(valA));
      });

      setFdrs(sorted);
      setTotal(res.total);
    } catch (err) {
      console.error('Error fetching FDRs:', err);
      toast.error('Failed to load FDR register');
    } finally {
      setLoading(false);
    }
  }, [status, institutionId, search, page, limit, sortBy, sortOrder, isInstitution, user, setTotal]);

  useEffect(() => {
    fetchFDRs();
  }, [fetchFDRs]);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const handleExportCsv = async () => {
    try {
      setExporting(true);
      const blob = await reportsApi.exportReportCsv('fdr_register', { status, institutionId, search });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `AICTE_FDR_Register_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('FDR Register CSV exported successfully!');
    } catch {
      toast.error('Failed to export CSV report');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Financial Deposit Receipt Register
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Official repository of active, renewed, and matured institutional security deposit receipts
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            isLoading={exporting}
            onClick={handleExportCsv}
            leftIcon={<Download className="w-4 h-4" />}
          >
            Export CSV
          </Button>
          {isInstitution && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/fdrs/new')}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Submit FDR
            </Button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search */}
            <div>
              <Input
                placeholder="Search reference #, bank..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                leftIcon={<Search className="w-4 h-4" />}
              />
            </div>

            {/* Status Filter */}
            <div>
              <Select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">All Deposit Statuses</option>
                <option value="submitted">Submitted</option>
                <option value="under_review">Under Review</option>
                <option value="clarification_required">Clarification Required</option>
                <option value="verified">Verified</option>
                <option value="matured">Matured</option>
                <option value="released">Released</option>
                <option value="rejected">Rejected</option>
              </Select>
            </div>

            {/* Institution Filter (for Officer/Admin) */}
            {!isInstitution && (
              <div>
                <Select
                  value={institutionId}
                  onChange={(e) => {
                    setInstitutionId(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="all">All Institutions</option>
                  {institutions.map((inst) => (
                    <option key={inst.id} value={inst.id}>
                      {inst.name}
                    </option>
                  ))}
                </Select>
              </div>
            )}

            {/* Reset Filter Button */}
            <div>
              <Button
                variant="ghost"
                size="md"
                className="w-full text-slate-500"
                onClick={() => {
                  setStatus('all');
                  setInstitutionId('all');
                  setSearch('');
                  setPage(1);
                }}
              >
                Reset Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader
          title={`Registered Instruments (${total})`}
          subtitle="Showing security deposits maintained in joint lien with AICTE"
        />
        <CardContent className="p-0">
          {loading ? (
            <div className="py-16">
              <Spinner label="Loading deposit registry..." />
            </div>
          ) : fdrs.length === 0 ? (
            <EmptyState
              icon={FileSpreadsheet}
              title="No FDR instruments found"
              description="No registered deposit records match your applied filter conditions."
              actionLabel="Clear Filters"
              onAction={() => {
                setStatus('all');
                setInstitutionId('all');
                setSearch('');
              }}
            />
          ) : (
            <Table>
              <Thead>
                <Tr>
                  <Th
                    sortable
                    sortDirection={sortBy === 'refNumber' ? sortOrder : null}
                    onSort={() => handleSort('refNumber')}
                  >
                    FDR Reference #
                  </Th>
                  <Th>Institution</Th>
                  <Th
                    sortable
                    sortDirection={sortBy === 'bankName' ? sortOrder : null}
                    onSort={() => handleSort('bankName')}
                  >
                    Issuing Bank & Branch
                  </Th>
                  <Th
                    sortable
                    sortDirection={sortBy === 'amount' ? sortOrder : null}
                    onSort={() => handleSort('amount')}
                  >
                    Principal Amount
                  </Th>
                  <Th
                    sortable
                    sortDirection={sortBy === 'issueDate' ? sortOrder : null}
                    onSort={() => handleSort('issueDate')}
                  >
                    Issue Date
                  </Th>
                  <Th
                    sortable
                    sortDirection={sortBy === 'maturityDate' ? sortOrder : null}
                    onSort={() => handleSort('maturityDate')}
                  >
                    Maturity Date
                  </Th>
                  <Th>Days to Maturity</Th>
                  <Th>Status</Th>
                </Tr>
              </Thead>
              <Tbody>
                {fdrs.map((fdr) => {
                  const days = getDaysToMaturity(fdr.maturityDate);
                  const instName =
                    typeof fdr.institutionId === 'object'
                      ? (fdr.institutionId as any)?.name
                      : fdr.institution?.name || 'Institution Record';

                  return (
                    <Tr
                      key={fdr.id}
                      isClickable
                      onClick={() => navigate(`/fdrs/${fdr.id}`)}
                    >
                      <Td>
                        <div className="font-semibold text-xs text-slate-900 flex items-center gap-1.5">
                          <span>{fdr.refNumber}</span>
                          {fdr.parentFdrId && (
                            <span className="text-[10px] text-teal-700 bg-teal-50 px-1.5 py-0.2 rounded border border-teal-200">
                              Renewed
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                          ID: {fdr.id}
                        </div>
                      </Td>
                      <Td>
                        <div className="flex items-center gap-1.5 text-xs text-slate-800 font-medium max-w-[200px] truncate">
                          <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{instName}</span>
                        </div>
                      </Td>
                      <Td>
                        <div className="text-xs text-slate-900 font-medium">{fdr.bankName}</div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[160px]">
                          {fdr.branch || 'Branch N/A'}
                        </div>
                      </Td>
                      <Td>
                        <div className="font-semibold text-xs text-slate-900">
                          {formatCurrency(fdr.amount)}
                        </div>
                      </Td>
                      <Td>
                        <span className="text-xs text-slate-600">
                          {formatDate(fdr.issueDate)}
                        </span>
                      </Td>
                      <Td>
                        <span className="text-xs text-slate-900 font-medium">
                          {formatDate(fdr.maturityDate)}
                        </span>
                      </Td>
                      <Td>
                        {days < 0 ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                            <AlertCircle className="w-3 h-3" />
                            Overdue ({Math.abs(days)}d)
                          </span>
                        ) : days <= 30 ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            <Calendar className="w-3 h-3" />
                            {days} days
                          </span>
                        ) : (
                          <span className="text-xs text-slate-600">{days} days</span>
                        )}
                      </Td>
                      <Td>
                        <StatusBadge status={fdr.status} />
                      </Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          )}

          {/* Pagination */}
          {!loading && fdrs.length > 0 && (
            <div className="p-4 border-t border-slate-100">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                totalItems={total}
                pageSize={limit}
                onPageChange={(p) => setPage(p)}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

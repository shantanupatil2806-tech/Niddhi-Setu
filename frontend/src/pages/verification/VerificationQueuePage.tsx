import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardCheck,
  Building,
  Clock,
  Filter,
  CheckCircle2,
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
  Select,
  Card,
  CardHeader,
  CardContent,
  Pagination,
  Badge,
  Spinner,
  EmptyState,
} from '../../components/ui';
import { verificationApi } from '../../api/verification';
import { VerificationCase } from '../../types';
import { usePagination } from '../../hooks/usePagination';
import { formatDate } from '../../utils/formatters';
import toast from 'react-hot-toast';

export const VerificationQueuePage: React.FC = () => {
  const navigate = useNavigate();
  const { page, limit, total, totalPages, setPage, setTotal } = usePagination();

  const [cases, setCases] = useState<VerificationCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  const fetchQueue = useCallback(async () => {
    try {
      setLoading(true);
      const res = await verificationApi.getQueue({
        status: statusFilter,
        priority: priorityFilter,
        page,
        limit,
      });
      setCases(res.items);
      setTotal(res.total);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load scrutiny queue');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter, page, limit, setTotal]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Regulatory Scrutiny Queue
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Open deposit cases awaiting officer verification, discrepancy review, or institutional clarification
        </p>
      </div>

      {/* Filter Card */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="w-full sm:w-64">
              <Select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">All Active Scrutiny Cases</option>
                <option value="open">Open / Pending Review</option>
                <option value="in_review">Under Review</option>
                <option value="clarification_sent">Clarification Required</option>
                <option value="decided">Decided / Closed</option>
              </Select>
            </div>

            <div className="w-full sm:w-64">
              <Select
                value={priorityFilter}
                onChange={(e) => {
                  setPriorityFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">All Priorities</option>
                <option value="high">High Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="low">Low Priority</option>
              </Select>
            </div>

            <Button
              variant="ghost"
              size="md"
              className="text-slate-500"
              onClick={() => {
                setStatusFilter('all');
                setPriorityFilter('all');
                setPage(1);
              }}
            >
              Reset Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Queue Table */}
      <Card>
        <CardHeader
          title={`Active Scrutiny Cases (${total})`}
          subtitle="Click on any case to review automated findings and submit an official determination"
        />
        <CardContent className="p-0">
          {loading ? (
            <div className="py-16">
              <Spinner label="Loading verification queue..." />
            </div>
          ) : cases.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="All cases cleared"
              description="No cases currently pending in the scrutiny queue."
            />
          ) : (
            <Table>
              <Thead>
                <Tr>
                  <Th>FDR Reference #</Th>
                  <Th>Institution</Th>
                  <Th>Date Submitted</Th>
                  <Th>Priority</Th>
                  <Th>Case Status</Th>
                  <Th>Assigned Officer</Th>
                  <Th>Days Open</Th>
                </Tr>
              </Thead>
              <Tbody>
                {cases.map((c) => {
                  const fdrObj = typeof c.fdrId === 'object' ? (c.fdrId as any) : c.fdr;
                  const fdrRef = fdrObj?.refNumber || 'FDR-REF-PENDING';

                  const instObj = fdrObj?.institutionId || fdrObj?.institution;
                  const instName =
                    typeof instObj === 'object'
                      ? instObj?.name
                      : 'Indian Institute of Technology Delhi';

                  const officerObj = typeof c.assignedTo === 'object' ? (c.assignedTo as any) : c.officer;
                  const officerName = officerObj?.name || 'Regulation Officer (AICTE)';

                  return (
                    <Tr
                      key={c.id}
                      isClickable
                      onClick={() => navigate(`/verification/${c.id}`)}
                    >
                      <Td>
                        <div className="font-semibold text-xs text-slate-900 font-mono">
                          {fdrRef}
                        </div>
                        <div className="text-[10px] text-slate-400">Case ID: {c.id}</div>
                      </Td>
                      <Td>
                        <div className="flex items-center gap-1.5 text-xs text-slate-800 font-medium max-w-[220px] truncate">
                          <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{instName}</span>
                        </div>
                      </Td>
                      <Td>
                        <span className="text-xs text-slate-600">{formatDate(c.createdAt)}</span>
                      </Td>
                      <Td>
                        {c.priority === 'high' ? (
                          <Badge variant="danger" dot size="sm">
                            High Priority
                          </Badge>
                        ) : c.priority === 'medium' ? (
                          <Badge variant="warning" dot size="sm">
                            Medium
                          </Badge>
                        ) : (
                          <Badge variant="neutral" size="sm">
                            Normal
                          </Badge>
                        )}
                      </Td>
                      <Td>
                        {c.status === 'under_review' ? (
                          <Badge variant="info" dot size="sm">
                            Under Review
                          </Badge>
                        ) : c.status === 'clarification_required' ? (
                          <Badge variant="warning" dot size="sm">
                            Clarification Req.
                          </Badge>
                        ) : c.status === 'verified' ? (
                          <Badge variant="success" dot size="sm">
                            Verified
                          </Badge>
                        ) : (
                          <Badge variant="default" dot size="sm">
                            Pending
                          </Badge>
                        )}
                      </Td>
                      <Td>
                        <span className="text-xs text-slate-700">{officerName}</span>
                      </Td>
                      <Td>
                        <div className="flex items-center gap-1 text-xs text-slate-600">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{c.daysOpen ?? 2} days</span>
                        </div>
                      </Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          )}

          {/* Pagination */}
          {!loading && cases.length > 0 && (
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

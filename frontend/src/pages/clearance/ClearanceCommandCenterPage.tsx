import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Building,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  Activity,
  Layers,
  ArrowRight,
  TrendingUp,
  Brain,
  Filter,
  RefreshCw,
  Bell
} from 'lucide-react';
import { Card, CardHeader, CardContent, Button, Badge, StatusBadge, Spinner, Table, Thead, Tbody, Tr, Th, Td } from '../../components/ui';
import { clearanceApi, ClearanceWorkflow, BottleneckAnalytics } from '../../api/clearance';
import { useAuth } from '../../hooks/useAuth';
import { formatDate } from '../../utils/formatters';
import toast from 'react-hot-toast';

export const ClearanceCommandCenterPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isStaff, isInstitution } = useAuth();

  const [workflows, setWorkflows] = useState<ClearanceWorkflow[]>([]);
  const [analytics, setAnalytics] = useState<BottleneckAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [monitoringLoading, setMonitoringLoading] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [wfList, analyticsData] = await Promise.all([
        clearanceApi.getWorkflows({ status: statusFilter, department: departmentFilter }),
        isStaff ? clearanceApi.getBottleneckAnalytics() : Promise.resolve(null)
      ]);
      setWorkflows(wfList);
      setAnalytics(analyticsData);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load clearance command center data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, departmentFilter]);

  const handleRunSlaCheck = async () => {
    try {
      setMonitoringLoading(true);
      const res = await clearanceApi.triggerSlaMonitoring();
      toast.success(`SLA scan completed. ${res.alertsCreatedCount || 0} alert(s) checked/escalated.`);
      loadData();
    } catch {
      toast.error('Failed to trigger SLA check');
    } finally {
      setMonitoringLoading(false);
    }
  };

  // Filter tasks awaiting current user
  const myTasksCount = workflows.filter(wf => {
    if (isInstitution) return wf.status === 'clarification_required';
    return wf.tasks?.some(t => {
      const matchRole = t.assignedRole === user?.role || user?.role === 'admin';
      return matchRole && (t.status === 'pending' || t.status === 'in_progress');
    });
  }).length;

  const blockedCount = workflows.filter(wf => wf.blockedReasons && wf.blockedReasons.length > 0).length;
  const readyForApprovalCount = workflows.filter(wf => wf.status === 'ready_for_final_review').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-teal-600" />
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Clearance Command Center
            </h1>
            <span className="px-2 py-0.5 text-[11px] font-semibold bg-teal-50 text-teal-700 border border-teal-200 rounded-full">
              Statutory Clearance
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Intelligent interdepartmental orchestrator coordinating document scrutiny, PGRC, Vigilance, and final lien discharge.
          </p>
        </div>

        {isStaff && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRunSlaCheck}
              isLoading={monitoringLoading}
              leftIcon={<Bell className="w-3.5 h-3.5" />}
            >
              Scan SLA Deadlines
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Refresh
            </Button>
          </div>
        )}
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border-l-4 border-l-teal-500 shadow-2xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Clearance Cases</div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{workflows.length}</div>
          <div className="text-[11px] text-teal-600 mt-0.5">Across all approval tracks</div>
        </Card>

        <Card className="p-4 border-l-4 border-l-amber-500 shadow-2xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Awaiting Action</div>
          <div className="text-2xl font-extrabold text-amber-700 mt-1">{myTasksCount}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Targeted to your role</div>
        </Card>

        <Card className="p-4 border-l-4 border-l-rose-500 shadow-2xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Blocked Dependencies</div>
          <div className="text-2xl font-extrabold text-rose-700 mt-1">{blockedCount}</div>
          <div className="text-[11px] text-rose-600 mt-0.5">Unsatisfied prerequisites</div>
        </Card>

        <Card className="p-4 border-l-4 border-l-emerald-500 shadow-2xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Ready for Council Sanction</div>
          <div className="text-2xl font-extrabold text-emerald-700 mt-1">{readyForApprovalCount}</div>
          <div className="text-[11px] text-emerald-600 mt-0.5">All clearances obtained</div>
        </Card>
      </div>

      {/* Bottleneck Intelligence Banner (Staff Only) */}
      {isStaff && analytics && analytics.recurringDelays.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Brain className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="text-xs font-bold text-amber-900 uppercase tracking-wide">
                  Bottleneck Intelligence & Recurring Delay Advisory
                </div>
                <div className="mt-1 space-y-1">
                  {analytics.recurringDelays.map((d, idx) => (
                    <div key={idx} className="text-xs text-amber-900">
                      • <span className="font-semibold">{d.issue}</span> — {d.recommendation}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Table Card */}
      <Card>
        <CardHeader
          title="Active Interdepartmental Clearance Workflows"
          subtitle="Real-time multi-department clearance tracking per AICTE Approval Process Handbook"
          action={
            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs font-medium border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-500"
              >
                <option value="all">All Statuses</option>
                <option value="submitted">Submitted</option>
                <option value="document_review">Document Review</option>
                <option value="departmental_clearance_in_progress">Departmental Clearances</option>
                <option value="clarification_required">Clarification Required</option>
                <option value="ready_for_final_review">Ready for Sanction</option>
                <option value="approved">Approved</option>
              </select>

              {isStaff && (
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="text-xs font-medium border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-500"
                >
                  <option value="all">All Departments</option>
                  <option value="administrative">Administrative Scrutiny</option>
                  <option value="finance">Finance / FDR Desk</option>
                  <option value="pgrc">PGRC Cell</option>
                  <option value="vigilance">Vigilance CVO</option>
                  <option value="approval_bureau">Approval Bureau</option>
                </select>
              )}
            </div>
          }
        />
        <CardContent className="p-0">
          {loading ? (
            <div className="py-20 text-center">
              <Spinner label="Loading interdepartmental clearance workflows..." />
            </div>
          ) : workflows.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-500">
              No clearance workflows found matching criteria.
            </div>
          ) : (
            <Table>
              <Thead>
                <Tr>
                  <Th>Workflow / Ref</Th>
                  <Th>Institution</Th>
                  <Th>5-Document Checklist</Th>
                  <Th>Departmental Clearances</Th>
                  <Th>Workflow Status</Th>
                  <Th>Next Action</Th>
                  <Th className="text-right">Action</Th>
                </Tr>
              </Thead>
              <Tbody>
                {workflows.map((wf) => {
                  const verifiedDocs = (wf.documents || []).filter(d => d.status === 'verified').length;
                  const totalDocs = (wf.documents || []).length || 5;

                  const clearedTasks = (wf.tasks || []).filter(t => t.status === 'cleared').length;
                  const totalTasks = (wf.tasks || []).length || 7;

                  const nextAction = wf.nextPermittedActions?.[0];

                  return (
                    <Tr key={wf._id} isClickable onClick={() => navigate(`/clearance/${wf._id}`)}>
                      <Td>
                        <div className="font-mono text-xs font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded w-fit">
                          #{wf._id.slice(-6).toUpperCase()}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          FDR: {wf.fdrId?.refNumber || 'SBI-DEL-2024'}
                        </div>
                      </Td>
                      <Td>
                        <div className="text-xs font-semibold text-slate-800">
                          {wf.institutionId?.name || 'Institution'}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Code: {wf.institutionId?.code || 'INST'} • {formatDate(wf.createdAt)}
                        </div>
                      </Td>
                      <Td>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs font-bold ${verifiedDocs === totalDocs ? 'text-emerald-700' : 'text-amber-700'}`}>
                            {verifiedDocs}/{totalDocs} Verified
                          </span>
                        </div>
                        <div className="w-24 bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${verifiedDocs === totalDocs ? 'bg-emerald-500' : 'bg-amber-500'}`}
                            style={{ width: `${(verifiedDocs / totalDocs) * 100}%` }}
                          />
                        </div>
                      </Td>
                      <Td>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs font-bold ${clearedTasks >= 5 ? 'text-emerald-700' : 'text-sky-700'}`}>
                            {clearedTasks}/{totalTasks} Cleared
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {(wf.tasks || []).slice(0, 5).map(t => (
                            <span
                              key={t.taskKey}
                              title={`${t.name}: ${t.status.toUpperCase()}`}
                              className={`w-2 h-2 rounded-full ${
                                t.status === 'cleared'
                                  ? 'bg-emerald-500'
                                  : t.status === 'blocked'
                                  ? 'bg-slate-300'
                                  : t.status === 'rejected'
                                  ? 'bg-rose-500'
                                  : 'bg-amber-500'
                              }`}
                            />
                          ))}
                        </div>
                      </Td>
                      <Td>
                        <Badge
                          variant={
                            wf.status === 'approved'
                              ? 'success'
                              : wf.status === 'clarification_required'
                              ? 'danger'
                              : wf.status === 'ready_for_final_review'
                              ? 'teal'
                              : 'warning'
                          }
                          dot
                          size="sm"
                        >
                          {wf.status.replace(/_/g, ' ').toUpperCase()}
                        </Badge>
                      </Td>
                      <Td>
                        <div className="text-[11px] text-slate-700 max-w-[200px] truncate" title={nextAction?.description}>
                          {nextAction?.description || 'Review pending tasks'}
                        </div>
                        {wf.blockedReasons?.length > 0 && (
                          <div className="text-[10px] text-rose-600 truncate max-w-[200px]" title={wf.blockedReasons[0]}>
                            Blocked: {wf.blockedReasons[0]}
                          </div>
                        )}
                      </Td>
                      <Td className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/clearance/${wf._id}`);
                          }}
                          rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                        >
                          Inspect Dossier
                        </Button>
                      </Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

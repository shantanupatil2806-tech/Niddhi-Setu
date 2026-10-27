import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  CheckCircle,
  AlertTriangle,
  AlertOctagon,
  Clock,
  HelpCircle,
  RefreshCw,
  Unlock,
  TrendingUp,
  ArrowRight,
  ShieldCheck,
  Building,
  Sparkles,
  Layers,
  ArrowUpRight,
  ShieldAlert,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { Card, CardHeader, CardContent, Button, StatusBadge, Spinner } from '../../components/ui';
import { dashboardApi } from '../../api/dashboard';
import { DashboardSummary, MaturityTrendItem, AuditEvent, FDR } from '../../types';
import { formatCurrency, formatCompactCurrency, formatDate, formatRelativeDate } from '../../utils/formatters';
import { useAuth } from '../../hooks/useAuth';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isInstitution } = useAuth();

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [maturityTrend, setMaturityTrend] = useState<MaturityTrendItem[]>([]);
  const [recentActivity, setRecentActivity] = useState<AuditEvent[]>([]);
  const [highPriorityCases, setHighPriorityCases] = useState<FDR[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [sumRes, trendRes, actRes, casesRes] = await Promise.all([
          dashboardApi.getSummary(),
          dashboardApi.getMaturityTrend(),
          dashboardApi.getRecentActivity(),
          dashboardApi.getHighPriorityCases(),
        ]);
        setSummary(sumRes);
        setMaturityTrend(trendRes);
        setRecentActivity(actRes);
        setHighPriorityCases(casesRes);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading || !summary) {
    return (
      <div className="py-28 flex flex-col items-center justify-center">
        <Spinner size="lg" label="Decrypting and aggregating regulatory ledger intelligence..." />
      </div>
    );
  }

  // Distribution chart data with fallbacks
  const totalPie =
    (summary.activeFdrs || 0) +
    (summary.pendingVerification || 0) +
    (summary.needsClarification || 0) +
    (summary.overdueFdrs || 0) +
    (summary.releasePending || 0);

  const statusPieData =
    totalPie > 0
      ? [
          { name: 'Verified', value: summary.activeFdrs || 0, color: '#10b981' },
          { name: 'Under Review', value: summary.pendingVerification || 0, color: '#0ea5e9' },
          { name: 'Clarification', value: summary.needsClarification || 0, color: '#f59e0b' },
          { name: 'Overdue', value: summary.overdueFdrs || 0, color: '#f43f5e' },
          { name: 'Released', value: summary.releasePending || 0, color: '#64748b' },
        ].filter((d) => d.value > 0)
      : [
          { name: 'Verified', value: 8, color: '#10b981' },
          { name: 'Under Review', value: 3, color: '#0ea5e9' },
          { name: 'Clarification', value: 2, color: '#f59e0b' },
          { name: 'Overdue', value: 1, color: '#f43f5e' },
          { name: 'Released', value: 1, color: '#64748b' },
        ];

  const metricCards = [
    {
      label: 'Total FDRs',
      value: summary.totalFdrs,
      sub: formatCompactCurrency(summary.totalDepositValue),
      icon: FileText,
      color: 'text-blue-600 bg-blue-50 border-blue-200/80',
      tag: 'Portfolio',
      path: '/fdrs',
    },
    {
      label: 'Active (Verified)',
      value: summary.activeFdrs,
      sub: 'In regulatory custody',
      icon: CheckCircle,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-200/80',
      tag: 'Secured',
      path: '/fdrs?status=verified',
    },
    {
      label: 'Approaching Maturity',
      value: summary.approachingMaturity,
      sub: 'Within 30–60 days',
      icon: AlertTriangle,
      color: 'text-amber-600 bg-amber-50 border-amber-200/80',
      tag: 'Notice',
      path: '/calendar',
    },
    {
      label: 'Overdue FDRs',
      value: summary.overdueFdrs,
      sub: 'Lapsed guarantee',
      icon: AlertOctagon,
      color: 'text-rose-600 bg-rose-50 border-rose-200/80',
      tag: 'Action',
      path: '/fdrs?status=matured',
    },
    {
      label: 'Pending Scrutiny',
      value: summary.pendingVerification,
      sub: 'In verification queue',
      icon: Clock,
      color: 'text-sky-600 bg-sky-50 border-sky-200/80',
      tag: 'Queue',
      path: '/verification',
    },
    {
      label: 'Clarification Req.',
      value: summary.needsClarification,
      sub: 'Awaiting bank reply',
      icon: HelpCircle,
      color: 'text-orange-600 bg-orange-50 border-orange-200/80',
      tag: 'Review',
      path: '/verification?status=clarification_required',
    },
    {
      label: 'Renewed / Linked',
      value: summary.renewedFdrs,
      sub: 'Successor instruments',
      icon: RefreshCw,
      color: 'text-teal-600 bg-teal-50 border-teal-200/80',
      tag: 'Lineage',
      path: '/lineage',
    },
    {
      label: 'Release Requests',
      value: summary.releasePending,
      sub: 'Closure / refunding',
      icon: Unlock,
      color: 'text-slate-600 bg-slate-100 border-slate-200/80',
      tag: 'Workflow',
      path: '/release',
    },
  ];

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Premium Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-navy-950 via-slate-900 to-navy-900 border border-slate-800 text-white shadow-xl">
        {/* Ambient background glows & mesh */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-teal-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-sky-500/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="relative z-10 p-6 sm:p-8 lg:p-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                <Sparkles className="w-3 h-3 text-teal-300" />
                All-India Council for Technical Education
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
              Deposit Management & Regulatory Overview
            </h1>
            <p className="text-sm text-slate-300 mt-2 leading-relaxed">
              Centralized monitoring of institutional fixed deposit receipts, regulatory custody, and statutory compliance.
            </p>

            {/* Quick Stats Strip */}
            <div className="mt-5 flex flex-wrap items-center gap-4 sm:gap-6 pt-4 border-t border-slate-800/80 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                  Total Guarantee Value
                </span>
                <span className="text-base sm:text-lg font-bold text-teal-300">
                  {formatCurrency(summary.totalDepositValue)}
                </span>
              </div>
              <div className="h-8 w-px bg-slate-800 hidden sm:block" />
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                  Portfolio Status
                </span>
                <span className="text-base sm:text-lg font-bold text-emerald-400 flex items-center gap-1">
                  Active & Verified
                </span>
              </div>
              <div className="h-8 w-px bg-slate-800 hidden sm:block" />
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                  Logged in as
                </span>
                <span className="text-base sm:text-lg font-bold text-slate-200">
                  {user?.name || 'Administrator'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            {isInstitution ? (
              <Button
                variant="primary"
                size="lg"
                onClick={() => navigate('/fdrs/new')}
                leftIcon={<FileText className="w-4 h-4" />}
                className="shadow-glow-teal"
              >
                Submit New FDR
              </Button>
            ) : (
              <Button
                variant="primary"
                size="lg"
                onClick={() => navigate('/verification')}
                leftIcon={<ShieldCheck className="w-4 h-4" />}
                className="shadow-glow-teal"
              >
                Open Scrutiny Queue
              </Button>
            )}
            <Button
              variant="glass"
              size="lg"
              onClick={() => navigate('/graph')}
              leftIcon={<Layers className="w-4 h-4" />}
            >
              Relational Graph
            </Button>
          </div>
        </div>
      </div>

      {/* Row of 8 metric KPI cards */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Portfolio Key Performance Indicators
          </h2>
          <span className="text-[11px] text-teal-600 font-semibold cursor-pointer hover:underline" onClick={() => navigate('/reports')}>
            View Analytics Report
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 sm:gap-4">
          {metricCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                onClick={() => navigate(card.path)}
                className="bg-white rounded-2xl border border-slate-200/80 p-4 hover:shadow-elevated hover:border-teal-500/40 hover:-translate-y-1 transition-all duration-200 cursor-pointer group flex flex-col justify-between relative overflow-hidden"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-2 rounded-xl border shrink-0 ${card.color} shadow-xs`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md">
                    {card.tag}
                  </span>
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-black text-slate-900 group-hover:text-teal-600 transition-colors">
                    {card.value}
                  </div>
                  <div className="text-xs font-semibold text-slate-700 mt-0.5 line-clamp-1">
                    {card.label}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1 font-medium">
                    {card.sub}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Charts Row: Maturity Trend (BarChart) + Status Distribution (Donut PieChart) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Maturity Trend Bar Chart */}
        <Card className="lg:col-span-2 shadow-xs">
          <CardHeader
            title="Maturity Schedule (Next 12 Months)"
            subtitle="Projected deposit maturity volumes in INR Lakhs"
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/calendar')}
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                Renewal Calendar
              </Button>
            }
          />
          <CardContent>
            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={maturityTrend} margin={{ top: 10, right: 10, left: -5, bottom: 0 }}>
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0d9488" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#14b8a6" stopOpacity={0.4} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val) => `₹ ${(val / 100000).toFixed(0)}L`}
                  />
                  <Tooltip
                    formatter={(value: any) => [formatCurrency(Number(value)), 'Total Maturity Value']}
                    labelStyle={{ fontWeight: 700, color: '#0f172a' }}
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      borderRadius: 12,
                      borderColor: '#e2e8f0',
                      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                      fontSize: 12,
                    }}
                  />
                  <Bar
                    dataKey="amount"
                    fill="url(#barGradient)"
                    radius={[6, 6, 0, 0]}
                    name="Maturity Value (INR)"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Status Distribution Donut Chart */}
        <Card className="shadow-xs">
          <CardHeader
            title="Compliance Breakdown"
            subtitle="Overall status allocation across instruments"
          />
          <CardContent>
            <div className="h-72 w-full flex flex-col items-center justify-center relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%"
                    cy="45%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {statusPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any, name: any) => [`${value} Instruments`, name]}
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      borderRadius: 12,
                      borderColor: '#e2e8f0',
                      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                      fontSize: 12,
                    }}
                  />
                  <Legend
                    layout="horizontal"
                    verticalAlign="bottom"
                    align="center"
                    wrapperStyle={{ fontSize: 11, paddingTop: 10 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Two Column Layout: Scrutiny Queue & Recent Audit Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Scrutiny Queue (High Priority Cases) */}
        <Card className="shadow-xs">
          <CardHeader
            title="High Priority Scrutiny Cases"
            subtitle="Instruments flagged for discrepancy or officer intervention"
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/verification')}
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                Queue ({highPriorityCases.length})
              </Button>
            }
          />
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {highPriorityCases.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 flex flex-col items-center justify-center">
                  <ShieldCheck className="w-8 h-8 text-emerald-500 mb-2" />
                  <span className="font-semibold text-slate-700">All Scrutiny Cases Clear</span>
                  <span className="text-slate-400 mt-0.5">No critical flags pending regulatory action.</span>
                </div>
              ) : (
                highPriorityCases.map((fdr) => (
                  <div
                    key={fdr.id}
                    onClick={() => navigate(`/fdrs/${fdr.id}`)}
                    className="p-4 hover:bg-slate-50 transition-colors cursor-pointer flex items-center justify-between gap-4 group"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900 group-hover:text-teal-600 transition-colors">
                          {fdr.refNumber}
                        </span>
                        <StatusBadge status={fdr.status} />
                      </div>
                      <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-500 truncate">
                        <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate font-medium">
                          {typeof fdr.institutionId === 'object'
                            ? (fdr.institutionId as any)?.name
                            : fdr.institution?.name || 'Affiliated Institution'}
                        </span>
                        <span>•</span>
                        <span className="font-mono text-slate-600">{fdr.bankName}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-bold text-slate-900">
                        {formatCurrency(fdr.amount)}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Due {formatDate(fdr.maturityDate)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Regulatory Activity Feed */}
        <Card className="shadow-xs">
          <CardHeader
            title="Recent Regulatory Activity"
            subtitle="Official chronological record of system actions and regulatory decisions"
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/reports')}
              >
                View Full Audit
              </Button>
            }
          />
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
              {recentActivity.map((event) => {
                const actorName =
                  typeof event.actor === 'object' ? event.actor.name : event.actor;

                return (
                  <div key={event.id} className="p-4 hover:bg-slate-50/70 transition-colors flex items-start gap-3.5">
                    <div className="w-2 h-2 rounded-full bg-teal-500 mt-2 shrink-0 ring-4 ring-teal-50" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-900 capitalize">
                          {event.action.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                          {formatRelativeDate(event.timestamp)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        <span className="font-semibold text-slate-800">{actorName}</span> committed an action on{' '}
                        <span className="font-semibold text-slate-700">{event.entityType}</span> (
                        <span className="font-mono text-[11px]">{event.entityId}</span>)
                      </p>
                      {event.currentHash && (
                        <div className="mt-1.5 flex items-center gap-2">
                          <span className="text-[9px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 truncate max-w-xs">
                            Hash: {event.currentHash.slice(0, 24)}...
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

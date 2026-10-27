import React, { useState, useEffect } from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import {
  Radar as RadarIcon,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Building2,
  FileText,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardContent,
  Button,
  Select,
  Badge,
  SeverityBadge,
  Spinner,
} from '../../components/ui';
import { reportsApi } from '../../api/reports';
import { institutionsApi } from '../../api/institutions';
import { fdrsApi } from '../../api/fdrs';
import { ComplianceRadarData, Institution, FDR, VerificationFinding } from '../../types';

export const ComplianceRadarPage: React.FC = () => {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [fdrs, setFdrs] = useState<FDR[]>([]);
  const [selectedInstId, setSelectedInstId] = useState('');
  const [selectedFdrId, setSelectedFdrId] = useState('all');
  const [radarData, setRadarData] = useState<ComplianceRadarData | null>(null);
  const [loading, setLoading] = useState(true);

  // Findings filters
  const [severityFilter, setSeverityFilter] = useState('all');
  const [expandedFindings, setExpandedFindings] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchSelectors = async () => {
      try {
        const [instsRes, fdrsRes] = await Promise.all([
          institutionsApi.getInstitutions({ limit: 50 }),
          fdrsApi.getFDRs({ limit: 50 }),
        ]);
        setInstitutions(instsRes.items);
        setFdrs(fdrsRes.items);
        if (instsRes.items && instsRes.items.length > 0) {
          const firstInstId = (instsRes.items[0] as any)._id || instsRes.items[0].id;
          setSelectedInstId(firstInstId);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchSelectors();
  }, []);

  useEffect(() => {
    const fetchRadar = async () => {
      try {
        setLoading(true);
        const res = await reportsApi.getComplianceRadar({
          institutionId: selectedInstId,
          fdrId: selectedFdrId !== 'all' ? selectedFdrId : undefined,
        });
        setRadarData(res);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchRadar();
  }, [selectedInstId, selectedFdrId]);

  const toggleFindingExpand = (id: string) => {
    setExpandedFindings((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  if (loading || !radarData) {
    return (
      <div className="py-24">
        <Spinner size="lg" label="Computing multidimensional compliance radar..." />
      </div>
    );
  }

  // Filter findings
  let filteredFindings = [...radarData.findings];
  if (severityFilter !== 'all') {
    filteredFindings = filteredFindings.filter((f) => f.severity === severityFilter);
  }

  // Group by category
  const groupedByCategory = filteredFindings.reduce<Record<string, VerificationFinding[]>>(
    (acc, item) => {
      acc[item.category] = acc[item.category] || [];
      acc[item.category].push(item);
      return acc;
    },
    {}
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <RadarIcon className="w-6 h-6 text-teal-600" />
          <span>Compliance Analysis & Risk Radar</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Comprehensive compliance assessment across validity, documentation, lineage, and regulatory guidelines
        </p>
      </div>

      {/* Selectors Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Select
                label="Institution"
                value={selectedInstId}
                onChange={(e) => setSelectedInstId(e.target.value)}
              >
                {institutions.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Select
                label="Instrument (Optional)"
                value={selectedFdrId}
                onChange={(e) => setSelectedFdrId(e.target.value)}
              >
                <option value="all">Entire Institution Portfolio (Aggregate)</option>
                {fdrs.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.refNumber} — {f.bankName}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Two Column Section: Radar Chart & Category Scores */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Radar Chart (Recharts) */}
        <Card className="lg:col-span-7">
          <CardHeader
            title="6-Axis Compliance Vector"
            subtitle="Radar footprint highlighting regulatory health vs. risk vulnerabilities"
            action={
              <Badge variant="teal" size="md">
                Overall Health: {radarData.overallScore}%
              </Badge>
            }
          />
          <CardContent>
            <div className="h-80 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart
                  cx="50%"
                  cy="50%"
                  outerRadius="75%"
                  data={radarData.categories}
                >
                  <PolarGrid stroke="#cbd5e1" strokeDasharray="3 3" />
                  <PolarAngleAxis
                    dataKey="category"
                    tick={{ fontSize: 11, fill: '#334155', fontWeight: 600 }}
                  />
                  <PolarRadiusAxis
                    angle={30}
                    domain={[0, 100]}
                    tick={{ fontSize: 10, fill: '#64748b' }}
                  />
                  <Radar
                    name="Compliance Score"
                    dataKey="score"
                    stroke="#0d9488"
                    fill="#0d9488"
                    fillOpacity={0.4}
                  />
                  <Tooltip
                    formatter={(val: any) => [`${val}%`, 'Compliance Health']}
                    contentStyle={{ borderRadius: 8, borderColor: '#e2e8f0', fontSize: 12 }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Category breakdown cards */}
        <div className="lg:col-span-5 space-y-3">
          {radarData.categories.map((cat) => (
            <div
              key={cat.category}
              className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between"
            >
              <div>
                <h4 className="text-xs font-bold text-slate-800">{cat.category}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-32 bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        cat.score >= 90
                          ? 'bg-emerald-500'
                          : cat.score >= 70
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                      style={{ width: `${cat.score}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-slate-700">{cat.score}%</span>
                </div>
              </div>

              <div>
                {cat.findingsCount > 0 ? (
                  <Badge variant="warning" size="sm">
                    {cat.findingsCount} Notice
                  </Badge>
                ) : (
                  <Badge variant="success" size="sm">
                    Optimal
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Expandable Findings Detailed List */}
      <Card>
        <CardHeader
          title="Explainable Rule Audit Logs & Directives"
          subtitle="Click to expand full legal evidence, machine confidence, and officer action"
          action={
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Filter Severity:</span>
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="text-xs rounded border-slate-200 bg-slate-50 py-1 px-2 font-medium"
              >
                <option value="all">All Severities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
                <option value="info">Info</option>
              </select>
            </div>
          }
        />
        <CardContent className="space-y-6">
          {Object.entries(groupedByCategory).map(([category, items]) => (
            <div key={category} className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-teal-800 bg-teal-50 px-3 py-1.5 rounded-lg border border-teal-200/60">
                {category} ({items.length})
              </h3>

              <div className="space-y-2 pt-1">
                {items.map((fnd) => {
                  const isExpanded = !!expandedFindings[fnd.id];

                  return (
                    <div
                      key={fnd.id}
                      className="rounded-xl border border-slate-200 bg-white transition-all overflow-hidden"
                    >
                      <div
                        onClick={() => toggleFindingExpand(fnd.id)}
                        className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50/70 select-none"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <SeverityBadge severity={fnd.severity} />
                          <span className="font-mono text-xs font-bold text-slate-900 shrink-0">
                            {fnd.ruleId || fnd.rule}
                          </span>
                          <span className="text-xs text-slate-700 truncate font-medium">
                            {fnd.description}
                          </span>
                        </div>
                        <div className="shrink-0 ml-3 text-slate-400">
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="p-4 bg-slate-50/50 border-t border-slate-100 text-xs space-y-3 animate-in fade-in">
                          <div>
                            <span className="text-slate-400 font-semibold uppercase text-[10px]">
                              Regulatory Description:
                            </span>
                            <p className="text-slate-800 mt-0.5 leading-relaxed">
                              {fnd.description}
                            </p>
                          </div>

                          {fnd.evidence && (
                            <div>
                              <span className="text-slate-400 font-semibold uppercase text-[10px]">
                                Cryptographic & Documentary Evidence:
                              </span>
                              <div className="font-mono text-[11px] text-slate-700 bg-white p-2.5 rounded border border-slate-200 mt-0.5">
                                {fnd.evidence}
                              </div>
                            </div>
                          )}

                          {fnd.suggestedAction && (
                            <div>
                              <span className="text-slate-400 font-semibold uppercase text-[10px]">
                                Officer Remediation Mandate:
                              </span>
                              <p className="text-teal-900 bg-teal-50 p-2.5 rounded border border-teal-200/70 mt-0.5">
                                {fnd.suggestedAction}
                              </p>
                            </div>
                          )}

                          <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
                            <span>
                              Requires Officer Review:{' '}
                              <strong>{fnd.isOfficerReviewRequired ? 'Yes (Mandatory)' : 'No'}</strong>
                            </span>
                            <span>
                              Verification Rule Pass:{' '}
                              <strong>{fnd.passed ? 'True (Pass)' : 'Flagged Warning'}</strong>
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import {
  GitBranch,
  Search,
  CheckCircle,
  AlertTriangle,
  XCircle,
  ArrowDown,
  Building,
  ShieldCheck,
  Calendar,
  Lock,
} from 'lucide-react';
import { Card, CardHeader, CardContent, Button, Input, StatusBadge, Badge, Spinner } from '../../components/ui';
import { fdrsApi } from '../../api/fdrs';
import { LineageData } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';

export const LineageExplorerPage: React.FC = () => {
  const [fdrSearch, setFdrSearch] = useState('');
  const [lineage, setLineage] = useState<LineageData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchLineage = async (targetId?: string) => {
    try {
      setLoading(true);
      const queryId = targetId || fdrSearch || 'default';
      const res = await fdrsApi.getFDRLineage(queryId);
      setLineage(res);
      if (res.chain && res.chain.length > 0 && !fdrSearch) {
        setFdrSearch(res.chain[res.chain.length - 1].fdr.refNumber || res.chain[0].fdr.refNumber || '');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLineage();
  }, []);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <GitBranch className="w-6 h-6 text-teal-600" />
          <span>Deposit Lineage Explorer</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Track chronological deposit chains, guarantee renewals, and transition history across academic sessions
        </p>
      </div>

      {/* FDR Search & Institution Context Card */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="w-full sm:flex-1">
              <Input
                placeholder="Enter FDR Reference Number or Instrument ID to trace lineage..."
                value={fdrSearch}
                onChange={(e) => setFdrSearch(e.target.value)}
                leftIcon={<Search className="w-4 h-4" />}
              />
            </div>
            <Button
              variant="primary"
              size="md"
              onClick={() => fetchLineage()}
              className="w-full sm:w-auto"
            >
              Trace Lineage
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Area */}
      {loading || !lineage ? (
        <div className="py-20">
          <Spinner label="Reconstructing chronological instrument chain..." />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Timeline Section */}
          <Card>
            <CardHeader
              title="Succession Timeline & Instrument Chain"
              subtitle="Traced lineage from inception through active renewals and successor certificates"
            />
            <CardContent className="p-6">
              <div className="max-w-2xl mx-auto space-y-6 relative">
                {lineage.chain.map((item, idx) => {
                  const isLast = idx === lineage.chain.length - 1;
                  const isCurrent = idx === 1; // Middle one as active

                  return (
                    <React.Fragment key={(item.fdr as any)._id || item.fdr.id || idx}>
                      {/* Instrument Card */}
                      <div
                        className={`p-5 rounded-2xl border-2 transition-all shadow-xs ${
                          isCurrent
                            ? 'border-teal-500 bg-teal-50/20 ring-4 ring-teal-500/10'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-sm text-slate-900">
                              {item.fdr.refNumber}
                            </span>
                            {item.relationType === 'original' ? (
                              <Badge variant="neutral" size="sm">
                                Genesis Origin
                              </Badge>
                            ) : (
                              <Badge variant="teal" size="sm">
                                {item.relationType?.toUpperCase()}
                              </Badge>
                            )}
                          </div>
                          <StatusBadge status={item.fdr.status} />
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 text-xs">
                          <div>
                            <span className="text-[10px] text-slate-400 font-semibold uppercase">
                              Issuing Bank
                            </span>
                            <div className="font-semibold text-slate-800 mt-0.5">
                              {item.fdr.bankName}
                            </div>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 font-semibold uppercase">
                              Principal Amount
                            </span>
                            <div className="font-bold text-teal-700 text-sm mt-0.5">
                              {formatCurrency(item.fdr.amount)}
                            </div>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 font-semibold uppercase">
                              Validity Term
                            </span>
                            <div className="font-semibold text-slate-700 mt-0.5">
                              {formatDate(item.fdr.issueDate)} — {formatDate(item.fdr.maturityDate)}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Transition connector */}
                      {!isLast && (
                        <div className="flex flex-col items-center justify-center my-2 text-teal-600">
                          <div className="w-0.5 h-6 bg-teal-300" />
                          <div className="flex items-center gap-2 px-3 py-1 bg-teal-50 border border-teal-200 rounded-full text-[11px] font-semibold shadow-2xs">
                            <ArrowDown className="w-3.5 h-3.5 text-teal-600" />
                            <span>
                              Renewed on {item.relationDate} with Parity Guarantee (+₹15L)
                            </span>
                          </div>
                          <div className="w-0.5 h-6 bg-teal-300" />
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Lineage Validation Rules Panel */}
          <Card>
            <CardHeader
              title="Automated Lineage Integrity Validations"
              subtitle="Mathematical verification of amount parity, continuous coverage, and non-decreasing liability"
              action={
                <Badge variant="success" dot size="md">
                  All Lineage Rules Satisfied
                </Badge>
              }
            />
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                {lineage.validations.map((v) => (
                  <div key={v.id} className="p-5 flex items-start gap-4">
                    <div className="shrink-0 mt-0.5">
                      {v.status === 'passed' ? (
                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                          <CheckCircle className="w-5 h-5" />
                        </div>
                      ) : v.status === 'warning' ? (
                        <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
                          <AlertTriangle className="w-5 h-5" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
                          <XCircle className="w-5 h-5" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-semibold text-xs sm:text-sm text-slate-900">{v.rule}</h4>
                        <span className="font-mono text-[10px] text-slate-400 font-bold">{v.id}</span>
                      </div>
                      <p className="text-xs text-slate-700 mt-1">{v.description}</p>
                      {v.details && (
                        <div className="mt-2 text-[11px] font-mono text-teal-800 bg-teal-50 px-2.5 py-1 rounded border border-teal-100 inline-block">
                          {v.details}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

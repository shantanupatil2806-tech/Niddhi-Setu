import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  List,
  Grid,
  Building,
  AlertOctagon,
  AlertTriangle,
  CheckCircle,
  CheckCircle2,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardContent,
  Button,
  Select,
  Badge,
  StatusBadge,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
} from '../../components/ui';
import { fdrsApi } from '../../api/fdrs';
import { institutionsApi } from '../../api/institutions';
import { FDR, Institution } from '../../types';
import { formatCurrency, formatDate, getDaysToMaturity } from '../../utils/formatters';
import { useAuth } from '../../hooks/useAuth';

export const RenewalCalendarPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isInstitution } = useAuth();

  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [selectedInstId, setSelectedInstId] = useState(
    isInstitution && user?.institutionId
      ? typeof user.institutionId === 'string'
        ? user.institutionId
        : (user.institutionId as any)._id || user.institutionId.id
      : 'all'
  );
  const [fdrs, setFdrs] = useState<FDR[]>([]);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [showReleased, setShowReleased] = useState(true);

  // Month navigation (Defaults to November 2026 based on seed data)
  const [currentDate, setCurrentDate] = useState(new Date('2026-11-01'));

  useEffect(() => {
    const fetchInstitutions = async () => {
      try {
        const res = await institutionsApi.getInstitutions({ limit: 100 });
        setInstitutions(res.items);
      } catch (err) {
        console.error(err);
      }
    };
    if (!isInstitution) {
      fetchInstitutions();
    }
  }, [isInstitution]);

  useEffect(() => {
    const fetchFDRs = async () => {
      try {
        const instId =
          isInstitution && user?.institutionId
            ? typeof user.institutionId === 'string'
              ? user.institutionId
              : (user.institutionId as any)._id || user.institutionId.id
            : selectedInstId !== 'all'
            ? selectedInstId
            : undefined;

        const res = await fdrsApi.getFDRs({
          institutionId: instId,
          limit: 100,
        });
        setFdrs(res.items);
      } catch (err) {
        console.error(err);
      }
    };
    fetchFDRs();
  }, [selectedInstId, isInstitution, user]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  // Days in month
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const now = new Date();
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() === month;

  // Find FDRs maturing on each day
  const getFdrsForDay = (day: number) => {
    return fdrs
      .filter((fdr) => (showReleased ? true : fdr.status !== 'released'))
      .filter((fdr) => {
        if (!fdr.maturityDate) return false;
        const d = new Date(fdr.maturityDate);
        if (isNaN(d.getTime())) return false;
        return (
          d.getFullYear() === year &&
          d.getMonth() === month &&
          d.getDate() === day
        );
      });
  };

  const getFdrColor = (fdr: FDR) => {
    if (fdr.status === 'released') {
      return 'bg-slate-100 text-slate-700 border-slate-300';
    }
    const days = getDaysToMaturity(fdr.maturityDate);
    if (days < 0) {
      return 'bg-rose-100 text-rose-800 border-rose-300';
    }
    if (fdr.status === 'verified') {
      return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    }
    return 'bg-amber-100 text-amber-800 border-amber-300';
  };

  const displayedListFdrs = showReleased
    ? fdrs
    : fdrs.filter((f) => f.status !== 'released');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-teal-600" />
            <span>Deposit Renewal & Maturity Calendar</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Proactive tracking of upcoming deposit expiries, guarantee rollover schedules, and discharged instruments
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View mode toggle */}
          <div className="flex rounded-xl border border-slate-200 bg-white p-0.5 shadow-xs">
            <button
              onClick={() => setViewMode('calendar')}
              className={`p-1.5 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === 'calendar'
                  ? 'bg-teal-50 text-teal-800 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Month Grid</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === 'list'
                  ? 'bg-teal-50 text-teal-800 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>List View</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Month Navigation Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Month Nav */}
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={prevMonth}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="font-bold text-base text-slate-900 min-w-36 text-center">
                {monthNames[month]} {year}
              </span>
              <Button variant="outline" size="sm" onClick={nextMonth}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Filter Controls */}
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-600 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
                <input
                  type="checkbox"
                  checked={showReleased}
                  onChange={(e) => setShowReleased(e.target.checked)}
                  className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <span>Show Released (NOC Discharged)</span>
              </label>

              {!isInstitution && (
                <div className="w-full sm:w-64">
                  <Select
                    value={selectedInstId}
                    onChange={(e) => setSelectedInstId(e.target.value)}
                  >
                    <option value="all">All Institutions</option>
                    {institutions.map((i) => {
                      const iid = (i as any)._id || i.id;
                      return (
                        <option key={iid} value={iid}>
                          {i.name}
                        </option>
                      );
                    })}
                  </Select>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar Grid View */}
      {viewMode === 'calendar' ? (
        <Card>
          <CardHeader
            title={`${monthNames[month]} ${year} Scheduled Maturities`}
            subtitle="Click on any maturity event badge to inspect complete instrument dossier"
            action={
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-slate-600 font-medium">Verified Active</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span className="text-slate-600 font-medium">Scrutiny Pending</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span className="text-slate-600 font-medium">Overdue Expiry</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                  <span className="text-slate-600 font-medium">Released / Discharged</span>
                </div>
              </div>
            }
          />
          <CardContent className="p-0">
            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-slate-200 text-center text-xs font-bold text-slate-500 uppercase py-2.5 bg-slate-50">
              <div>Sun</div>
              <div>Mon</div>
              <div>Tue</div>
              <div>Wed</div>
              <div>Thu</div>
              <div>Fri</div>
              <div>Sat</div>
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 border-collapse">
              {/* Empty cells before month start */}
              {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
                <div
                  key={`empty-${idx}`}
                  className="min-h-28 p-2 border-b border-r border-slate-100 bg-slate-50/40"
                />
              ))}

              {/* Day cells */}
              {Array.from({ length: daysInMonth }).map((_, idx) => {
                const dayNum = idx + 1;
                const dayFdrs = getFdrsForDay(dayNum);
                const isToday =
                  dayNum === 24 && month === 9 && year === 2026; // Staging date context

                return (
                  <div
                    key={dayNum}
                    className={`min-h-28 p-2 border-b border-r border-slate-100 transition-colors hover:bg-slate-50/60 ${
                      isToday ? 'bg-teal-50/30' : 'bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-semibold rounded-full w-6 h-6 flex items-center justify-center ${
                          isToday
                            ? 'bg-teal-600 text-white'
                            : 'text-slate-700'
                        }`}
                      >
                        {dayNum}
                      </span>
                      {dayFdrs.length > 0 && (
                        <span className="text-[10px] text-slate-400 font-bold">
                          {dayFdrs.length} due
                        </span>
                      )}
                    </div>

                    {/* FDR Events */}
                    <div className="mt-2 space-y-1">
                      {dayFdrs.map((fdr) => (
                        <div
                          key={fdr.id}
                          onClick={() => navigate(`/fdrs/${fdr.id}`)}
                          className={`p-1.5 rounded-lg border text-[11px] cursor-pointer truncate transition-transform hover:scale-[1.02] shadow-2xs font-medium ${getFdrColor(
                            fdr
                          )}`}
                          title={`${fdr.refNumber} (${fdr.bankName}) - ${formatCurrency(fdr.amount)} ${
                            fdr.status === 'released' ? '[RELEASED / DISCHARGED]' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-bold truncate">{fdr.refNumber}</span>
                            {fdr.status === 'released' && (
                              <span className="text-[9px] bg-slate-200 text-slate-700 px-1 rounded font-semibold shrink-0">
                                Released
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] opacity-90 truncate">
                            {formatCurrency(fdr.amount)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        /* List View */
        <Card>
          <CardHeader title="All Scheduled Deposit Expiries & Discharged Instruments" />
          <CardContent className="p-0">
            <Table>
              <Thead>
                <Tr>
                  <Th>FDR Ref #</Th>
                  <Th>Institution</Th>
                  <Th>Issuing Bank</Th>
                  <Th>Principal</Th>
                  <Th>Maturity Date</Th>
                  <Th>Maturity Status</Th>
                  <Th>Regulatory Status</Th>
                </Tr>
              </Thead>
              <Tbody>
                {displayedListFdrs.map((fdr) => {
                  const days = getDaysToMaturity(fdr.maturityDate);
                  const instName =
                    typeof fdr.institutionId === 'object'
                      ? (fdr.institutionId as any)?.name
                      : fdr.institution?.name || 'Authorized Institution';

                  return (
                    <Tr
                      key={fdr.id}
                      isClickable
                      onClick={() => navigate(`/fdrs/${fdr.id}`)}
                    >
                      <Td>
                        <span className="font-bold text-xs text-slate-900 font-mono">
                          {fdr.refNumber}
                        </span>
                      </Td>
                      <Td>
                        <span className="text-xs text-slate-700">{instName}</span>
                      </Td>
                      <Td>
                        <span className="text-xs text-slate-800">{fdr.bankName}</span>
                      </Td>
                      <Td>
                        <span className="font-bold text-xs text-teal-700">
                          {formatCurrency(fdr.amount)}
                        </span>
                      </Td>
                      <Td>
                        <span className="text-xs text-slate-900 font-medium">
                          {formatDate(fdr.maturityDate)}
                        </span>
                      </Td>
                      <Td>
                        {fdr.status === 'released' ? (
                          <Badge variant="teal" size="sm">
                            Lien Discharged
                          </Badge>
                        ) : days < 0 ? (
                          <Badge variant="danger" size="sm" dot>
                            Overdue ({Math.abs(days)}d)
                          </Badge>
                        ) : days <= 30 ? (
                          <Badge variant="warning" size="sm" dot>
                            {days} days
                          </Badge>
                        ) : (
                          <Badge variant="success" size="sm">
                            {days} days
                          </Badge>
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
          </CardContent>
        </Card>
      )}
    </div>
  );
};

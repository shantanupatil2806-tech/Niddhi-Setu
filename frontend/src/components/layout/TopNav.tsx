import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  LogOut,
  ChevronDown,
  CheckCircle2,
  Menu,
  Search,
  Command,
  ExternalLink,
} from 'lucide-react';
import { Breadcrumbs } from './Breadcrumbs';
import { useAuth } from '../../hooks/useAuth';
import { ROLE_LABELS } from '../../utils/constants';

interface TopNavProps {
  onToggleSidebar?: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({ onToggleSidebar }) => {
  const navigate = useNavigate();
  const { user, logout, role } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const notifications = [
    {
      id: '1',
      title: 'Maturity Alert (30 Days)',
      desc: 'BOB-FDR-2025-11042 matures on 15 Nov 2026',
      time: '15m ago',
      unread: true,
      tag: 'Urgent',
      tagColor: 'bg-amber-50 text-amber-700 border-amber-200',
    },
    {
      id: '2',
      title: 'Verification Discrepancy',
      desc: 'Clarification required for DTU PNB FDR-2023',
      time: '2h ago',
      unread: true,
      tag: 'Scrutiny',
      tagColor: 'bg-rose-50 text-rose-700 border-rose-200',
    },
    {
      id: '3',
      title: 'Release Sanctioned',
      desc: 'RVCE PG Deposit release approved by AICTE Council',
      time: '1d ago',
      unread: false,
      tag: 'Approved',
      tagColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
  ];

  // Hotkey listener for Ctrl+K or Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/fdrs?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="h-16 bg-white/85 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20 shadow-xs">
      {/* Left: Sidebar Toggle & Breadcrumbs */}
      <div className="flex items-center min-w-0 gap-3">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100/80 transition-colors"
            title="Toggle Sidebar Navigation"
            aria-label="Toggle Navigation Sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <Breadcrumbs />
      </div>

      {/* Middle: Quick Search Input */}
      <div className="hidden md:flex items-center flex-1 max-w-md mx-6">
        <form onSubmit={handleSearchSubmit} className="relative w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Quick search instruments, ref#, banks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-14 py-1.5 text-xs rounded-xl bg-slate-100/80 border border-slate-200/80 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:bg-white transition-all shadow-inner"
          />
          <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
            <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono font-medium text-slate-400 bg-white border border-slate-200 rounded-md shadow-xs">
              <Command className="w-2.5 h-2.5" /> K
            </kbd>
          </div>
        </form>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Notification Bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors relative"
            aria-label="Notifications"
          >
            <Bell className="w-4.5 h-4.5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-elevated border border-slate-200/90 py-2.5 z-50 animate-in fade-in zoom-in-95">
              <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900">Regulatory Alerts</span>
                  <span className="px-1.5 py-0.2 bg-teal-50 text-teal-700 text-[10px] font-semibold rounded-full border border-teal-200">
                    2 unread
                  </span>
                </div>
                <span className="text-[11px] text-teal-600 font-medium cursor-pointer hover:underline">
                  Mark all as read
                </span>
              </div>
              <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                {notifications.map((n) => (
                  <div key={n.id} className="p-3.5 hover:bg-slate-50/80 transition-colors cursor-pointer">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-900">{n.title}</span>
                        {n.tag && (
                          <span className={`text-[9px] px-1.5 py-0.2 rounded-full border font-semibold ${n.tagColor}`}>
                            {n.tag}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0">{n.time}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{n.desc}</p>
                  </div>
                ))}
              </div>
              <div className="px-4 pt-2 pb-1 border-t border-slate-100 text-center">
                <button
                  onClick={() => {
                    setShowNotifications(false);
                    navigate('/verification');
                  }}
                  className="text-xs text-teal-600 font-semibold hover:text-teal-700 flex items-center justify-center gap-1 mx-auto"
                >
                  <span>View All Alerts in Verification Queue</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Menu */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-100/80 transition-all border border-transparent hover:border-slate-200/60"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-navy-900 to-navy-800 text-teal-400 font-bold text-xs flex items-center justify-center shadow-xs ring-1 ring-slate-200">
              {user?.name ? user.name[0].toUpperCase() : 'A'}
            </div>
            <div className="hidden lg:flex flex-col text-left">
              <span className="text-xs font-semibold text-slate-900 leading-tight">
                {user?.name || 'Administrator'}
              </span>
              <span className="text-[10px] text-slate-500 font-medium">
                {role ? ROLE_LABELS[role] : 'Official User'}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showDropdown && (
            <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-elevated border border-slate-200/90 py-2 z-50 animate-in fade-in zoom-in-95">
              <div className="px-4 py-2.5 border-b border-slate-100">
                <div className="text-xs font-bold text-slate-900">{user?.name}</div>
                <div className="text-[11px] text-slate-500 truncate">{user?.email}</div>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                    <CheckCircle2 className="w-3 h-3 text-teal-600" />
                    {role ? ROLE_LABELS[role] : 'User'}
                  </span>
                </div>
              </div>

              <div className="p-1.5">
                <button
                  onClick={() => {
                    setShowDropdown(false);
                    navigate('/admin');
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 rounded-xl transition-colors font-medium"
                >
                  <span>Portal Preferences</span>
                </button>
                <button
                  onClick={logout}
                  className="w-full mt-1 flex items-center gap-2 px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 rounded-xl transition-colors font-semibold"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

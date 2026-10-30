import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  FileText,
  ClipboardCheck,
  Network,
  GitBranch,
  Shield,
  ShieldCheck,
  Radar,
  Calendar,
  Unlock,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  User as UserIcon,
  Sparkles,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useAuth } from '../../hooks/useAuth';
import { ROLE_LABELS } from '../../utils/constants';
import { UserRole } from '../../types';
import { verificationApi } from '../../api/verification';

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: UserRole[];
  badge?: number;
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, onToggle }) => {
  const { user, logout, role } = useAuth();
  const location = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [queueCount, setQueueCount] = useState<number | null>(null);

  useEffect(() => {
    if (role === 'officer' || role === 'admin') {
      verificationApi
        .getQueue({ limit: 1 })
        .then((res) => setQueueCount(res.total))
        .catch(() => setQueueCount(null));
    }
  }, [role, location.pathname]);

  const navGroups: NavGroup[] = [
    {
      group: 'Core Operations',
      items: [
        {
          name: 'Dashboard',
          path: '/dashboard',
          icon: LayoutDashboard,
        },
        {
          name: 'Institutions',
          path: '/institutions',
          icon: Building2,
          roles: ['officer', 'admin'],
        },
        {
          name: 'FDR Register',
          path: '/fdrs',
          icon: FileText,
        },
        {
          name: 'Verification Queue',
          path: '/verification',
          icon: ClipboardCheck,
          roles: ['officer', 'admin'],
          badge: queueCount !== null && queueCount > 0 ? queueCount : undefined,
        },
      ],
    },
    {
      group: 'Analytics & Integrity',
      items: [
        {
          name: 'Relationship Graph',
          path: '/graph',
          icon: Network,
        },
        {
          name: 'Lineage Explorer',
          path: '/lineage',
          icon: GitBranch,
        },
        {
          name: 'Verification Passport',
          path: '/passport',
          icon: Shield,
        },
        {
          name: 'Compliance Radar',
          path: '/compliance',
          icon: Radar,
        },
      ],
    },
    {
      group: 'Workflows & Management',
      items: [
        {
          name: 'Renewal Calendar',
          path: '/calendar',
          icon: Calendar,
        },
        {
          name: 'Release Requests',
          path: '/release',
          icon: Unlock,
        },
        {
          name: 'Clearance Command Center',
          path: '/clearance',
          icon: ShieldCheck,
        },
        {
          name: 'Reports',
          path: '/reports',
          icon: BarChart3,
          roles: ['officer', 'admin'],
        },
        {
          name: 'Admin Settings',
          path: '/admin',
          icon: Settings,
          roles: ['admin'],
        },
      ],
    },
  ];

  const canView = (item: NavItem) => {
    if (!item.roles) return true;
    if (!role) return false;
    if (item.roles.includes(role)) return true;
    if (item.roles.includes('officer') && typeof role === 'string' && role.startsWith('officer_')) return true;
    return false;
  };

  return (
    <aside
      className={clsx(
        'fixed top-0 left-0 z-30 h-screen bg-navy-950 border-r border-slate-800/80 text-slate-300 transition-all duration-300 flex flex-col shadow-xl select-none',
        isCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800/80 shrink-0 bg-navy-950/90 backdrop-blur-sm">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="relative flex items-center justify-center shrink-0">
            <div className="w-10 h-10 rounded-2xl bg-teal-600 flex items-center justify-center text-white shadow-md shadow-teal-500/25 ring-1 ring-teal-400/30">
              <ShieldCheck className="w-6 h-6 text-white stroke-[2.2]" />
            </div>
          </div>
          {!isCollapsed && (
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-white text-base tracking-wide leading-none">
                  Niddhi Setu
                </span>
              </div>
              <span className="text-[10px] text-teal-400/90 font-medium tracking-wider uppercase mt-1">
                AICTE Regulatory Portal
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-2.5 space-y-5 scrollbar-none">
        {navGroups.map((group) => {
          const visibleItems = group.items.filter(canView);
          if (visibleItems.length === 0) return null;

          return (
            <div key={group.group} className="space-y-1">
              {!isCollapsed && (
                <div className="px-3 mb-1.5 flex items-center justify-between text-[10px] font-bold tracking-widest text-slate-500 uppercase">
                  <span>{group.group}</span>
                </div>
              )}
              {visibleItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  location.pathname === item.path ||
                  (item.path !== '/dashboard' && location.pathname.startsWith(item.path));

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    title={isCollapsed ? item.name : undefined}
                    className={clsx(
                      'flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 group relative',
                      isActive
                        ? 'bg-gradient-to-r from-teal-600 to-teal-500 text-white font-semibold shadow-md shadow-teal-600/30 ring-1 ring-white/10'
                        : 'text-slate-400 hover:text-white hover:bg-slate-900/80'
                    )}
                  >
                    <Icon
                      className={clsx(
                        'w-4 h-4 shrink-0 transition-transform duration-150 group-hover:scale-110',
                        isActive ? 'text-white' : 'text-slate-400 group-hover:text-teal-400'
                      )}
                    />
                    {!isCollapsed && (
                      <span className="truncate flex-1 tracking-tight">{item.name}</span>
                    )}
                    {!isCollapsed && item.badge && (
                      <span
                        className={clsx(
                          'px-1.5 py-0.5 text-[10px] font-bold rounded-full',
                          isActive ? 'bg-teal-900/80 text-teal-100 ring-1 ring-white/20' : 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                        )}
                      >
                        {item.badge}
                      </span>
                    )}

                    {/* Tooltip for collapsed state */}
                    {isCollapsed && (
                      <div className="absolute left-full ml-3 px-3 py-1.5 bg-navy-900 text-white text-xs font-medium rounded-lg shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap border border-slate-700/80">
                        {item.name}
                      </div>
                    )}
                  </NavLink>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* User profile & bottom toggle */}
      <div className="p-3 border-t border-slate-800/80 bg-navy-950 shrink-0">
        <div className="relative">
          <div
            onClick={() => setShowUserMenu(!showUserMenu)}
            className={clsx(
              'flex items-center gap-3 p-2 rounded-xl cursor-pointer hover:bg-slate-900 transition-all border border-transparent hover:border-slate-800',
              isCollapsed && 'justify-center p-1'
            )}
          >
            <div className="relative shrink-0">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-slate-800 to-navy-900 border border-slate-700 flex items-center justify-center text-teal-400 font-bold text-xs shadow-inner">
                {user?.name ? user.name[0].toUpperCase() : <UserIcon className="w-4 h-4" />}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full ring-2 ring-navy-950" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-xs font-semibold text-white truncate">
                  {user?.name || 'Administrator'}
                </span>
                <span className="text-[10px] text-teal-400/80 truncate font-medium">
                  {role ? ROLE_LABELS[role] : 'Regulatory Authority'}
                </span>
              </div>
            )}
          </div>

          {/* Quick User Popover */}
          {showUserMenu && !isCollapsed && (
            <div className="absolute bottom-full left-0 mb-2 w-full bg-navy-900 border border-slate-800 rounded-2xl shadow-2xl p-2.5 z-50 animate-in fade-in zoom-in-95">
              <div className="px-3 py-2 border-b border-slate-800">
                <div className="text-xs font-semibold text-white truncate">{user?.name}</div>
                <div className="text-[11px] text-slate-400 truncate">{user?.email}</div>
                <div className="mt-1 flex items-center gap-1.5 text-[10px] text-emerald-400 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Verified Access</span>
                </div>
              </div>
              <button
                onClick={logout}
                className="w-full mt-1.5 flex items-center gap-2 px-3 py-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-xl transition-colors font-medium"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>

        {/* Collapse toggle */}
        <button
          onClick={onToggle}
          className="mt-2 w-full flex items-center justify-center p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <div className="flex items-center gap-2 text-[11px] font-medium">
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Collapse Sidebar</span>
            </div>
          )}
        </button>
      </div>
    </aside>
  );
};

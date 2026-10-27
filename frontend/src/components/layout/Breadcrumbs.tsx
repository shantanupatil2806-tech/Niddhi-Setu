import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

const ROUTE_NAME_MAP: Record<string, string> = {
  dashboard: 'Dashboard',
  institutions: 'Institutions',
  fdrs: 'FDR Register',
  new: 'New Submission',
  verification: 'Verification Queue',
  graph: 'Relationship Graph',
  lineage: 'Lineage Explorer',
  passport: 'Verification Passport',
  compliance: 'Compliance Radar',
  calendar: 'Renewal Calendar',
  release: 'Release Requests',
  reports: 'Reports',
  admin: 'Admin Settings',
};

export const Breadcrumbs: React.FC = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  return (
    <nav className="flex items-center text-xs font-medium text-slate-500" aria-label="Breadcrumb">
      <Link
        to="/dashboard"
        className="flex items-center gap-1.5 hover:text-slate-800 transition-colors"
      >
        <Home className="w-3.5 h-3.5 text-slate-400" />
        <span className="hidden sm:inline">Home</span>
      </Link>

      {pathnames.map((segment, index) => {
        const routeTo = `/${pathnames.slice(0, index + 1).join('/')}`;
        const isLast = index === pathnames.length - 1;
        const name = ROUTE_NAME_MAP[segment] || (segment.length > 15 ? `${segment.slice(0, 12)}...` : segment);

        return (
          <React.Fragment key={routeTo}>
            <ChevronRight className="w-3.5 h-3.5 mx-1.5 text-slate-400 shrink-0" />
            {isLast ? (
              <span className="font-semibold text-slate-900 truncate max-w-xs">{name}</span>
            ) : (
              <Link
                to={routeTo}
                className="hover:text-slate-800 transition-colors truncate max-w-xs"
              >
                {name}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

import React from 'react';
import { clsx } from 'clsx';

export interface TabItem {
  id: string;
  label: string;
  badge?: string | number;
  icon?: React.ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  variant?: 'line' | 'pills';
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  variant = 'line',
  className,
}) => {
  return (
    <div
      className={clsx(
        variant === 'line'
          ? 'border-b border-slate-200 flex gap-6 overflow-x-auto scrollbar-none'
          : 'flex gap-1.5 p-1 bg-slate-100 rounded-lg overflow-x-auto scrollbar-none',
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;

        if (variant === 'pills') {
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={clsx(
                'flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-all',
                isActive
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              )}
            >
              {tab.icon && <span className="inline-flex shrink-0">{tab.icon}</span>}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={clsx(
                    'px-1.5 py-0.5 text-[10px] font-semibold rounded-full',
                    isActive ? 'bg-teal-100 text-teal-800' : 'bg-slate-200 text-slate-700'
                  )}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        }

        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={clsx(
              'group relative flex items-center gap-2 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px',
              isActive
                ? 'border-teal-600 text-teal-700 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            )}
          >
            {tab.icon && (
              <span
                className={clsx(
                  'inline-flex shrink-0 transition-colors',
                  isActive ? 'text-teal-600' : 'text-slate-400 group-hover:text-slate-600'
                )}
              >
                {tab.icon}
              </span>
            )}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={clsx(
                  'px-2 py-0.5 text-[11px] font-medium rounded-full',
                  isActive
                    ? 'bg-teal-50 text-teal-700 font-semibold'
                    : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
                )}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

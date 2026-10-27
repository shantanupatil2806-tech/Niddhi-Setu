import React from 'react';
import { clsx } from 'clsx';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'teal' | 'indigo';
  size?: 'sm' | 'md';
  dot?: boolean;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
  className,
}) => {
  const variants = {
    default: 'bg-slate-100 text-slate-700 ring-slate-200/80',
    success: 'bg-emerald-50/90 text-emerald-700 ring-emerald-500/20',
    warning: 'bg-amber-50/90 text-amber-800 ring-amber-500/20',
    danger: 'bg-rose-50/90 text-rose-700 ring-rose-500/20',
    info: 'bg-sky-50/90 text-sky-700 ring-sky-500/20',
    neutral: 'bg-slate-100 text-slate-600 ring-slate-200/80',
    teal: 'bg-teal-50 text-teal-800 ring-teal-600/20',
    indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-500/20',
  };

  const dotColors = {
    default: 'bg-slate-400',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-rose-500',
    info: 'bg-sky-500',
    neutral: 'bg-slate-400',
    teal: 'bg-teal-500',
    indigo: 'bg-indigo-500',
  };

  const sizes = {
    sm: 'text-[10px] px-2 py-0.5 gap-1.5 font-medium tracking-wide',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-medium tracking-tight',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full ring-1 ring-inset leading-none select-none',
        variants[variant],
        sizes[size],
        className
      )}
    >
      {dot && (
        <span className="relative flex h-1.5 w-1.5">
          {variant === 'success' || variant === 'teal' ? (
            <span className={clsx('animate-ping absolute inline-flex h-full w-full rounded-full opacity-75', dotColors[variant])} />
          ) : null}
          <span className={clsx('relative inline-flex rounded-full h-1.5 w-1.5', dotColors[variant])} />
        </span>
      )}
      <span>{children}</span>
    </span>
  );
};

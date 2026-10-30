import React from 'react';
import { clsx } from 'clsx';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  hoverable = false,
  className,
  ...props
}) => {
  return (
    <div
      className={clsx(
        'bg-white rounded-2xl border border-slate-200/80 shadow-xs transition-all duration-200 overflow-hidden',
        hoverable && 'hover:shadow-elevated hover:border-slate-300 hover:-translate-y-0.5',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export interface CardHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  title,
  subtitle,
  action,
  children,
  className,
  ...props
}) => {
  return (
    <div
      className={clsx(
        'px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-4 bg-slate-50/40',
        className
      )}
      {...props}
    >
      {children || (
        <>
          <div>
            {title && (
              <h3 className="font-semibold text-slate-900 text-sm sm:text-base leading-snug tracking-tight">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </>
      )}
    </div>
  );
};

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className,
  ...props
}) => {
  return (
    <div className={clsx('p-6', className)} {...props}>
      {children}
    </div>
  );
};

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className,
  ...props
}) => {
  return (
    <div
      className={clsx(
        'px-6 py-4 bg-slate-50/60 border-t border-slate-100/90 rounded-b-2xl flex items-center justify-between text-sm text-slate-500',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

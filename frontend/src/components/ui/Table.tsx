import React from 'react';
import { clsx } from 'clsx';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

export const Table: React.FC<React.TableHTMLAttributes<HTMLTableElement>> = ({
  children,
  className,
  ...props
}) => {
  return (
    <div className="w-full overflow-x-auto rounded-xl border border-slate-200/80 shadow-xs bg-white">
      <table className={clsx('w-full text-left border-collapse text-sm', className)} {...props}>
        {children}
      </table>
    </div>
  );
};

export const Thead: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  children,
  className,
  ...props
}) => {
  return (
    <thead
      className={clsx(
        'bg-slate-50/90 border-b border-slate-200/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500 select-none',
        className
      )}
      {...props}
    >
      {children}
    </thead>
  );
};

export const Tbody: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  children,
  className,
  ...props
}) => {
  return (
    <tbody className={clsx('divide-y divide-slate-100 bg-white', className)} {...props}>
      {children}
    </tbody>
  );
};

export const Tr: React.FC<React.HTMLAttributes<HTMLTableRowElement> & { isClickable?: boolean }> = ({
  children,
  className,
  isClickable = false,
  ...props
}) => {
  return (
    <tr
      className={clsx(
        'transition-colors duration-150',
        isClickable
          ? 'cursor-pointer hover:bg-slate-50/90 active:bg-slate-100/70'
          : 'hover:bg-slate-50/40',
        className
      )}
      {...props}
    >
      {children}
    </tr>
  );
};

export interface ThProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  sortable?: boolean;
  sortDirection?: 'asc' | 'desc' | null;
  onSort?: () => void;
}

export const Th: React.FC<ThProps> = ({
  children,
  sortable = false,
  sortDirection = null,
  onSort,
  className,
  ...props
}) => {
  return (
    <th
      className={clsx(
        'px-4 py-3 select-none font-semibold text-slate-600',
        sortable && 'cursor-pointer hover:text-slate-900 hover:bg-slate-100/50 transition-colors',
        className
      )}
      onClick={sortable ? onSort : undefined}
      {...props}
    >
      <div className="inline-flex items-center gap-1.5">
        <span>{children}</span>
        {sortable && (
          <span className="text-slate-400 inline-flex">
            {sortDirection === 'asc' ? (
              <ArrowUp className="w-3.5 h-3.5 text-teal-600 animate-in fade-in" />
            ) : sortDirection === 'desc' ? (
              <ArrowDown className="w-3.5 h-3.5 text-teal-600 animate-in fade-in" />
            ) : (
              <ArrowUpDown className="w-3 h-3 opacity-50" />
            )}
          </span>
        )}
      </div>
    </th>
  );
};

export const Td: React.FC<React.TdHTMLAttributes<HTMLTableCellElement>> = ({
  children,
  className,
  ...props
}) => {
  return (
    <td
      className={clsx('px-4 py-3.5 text-slate-700 align-middle', className)}
      {...props}
    >
      {children}
    </td>
  );
};

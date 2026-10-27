import React from 'react';
import { Loader2 } from 'lucide-react';
import { clsx } from 'clsx';

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  label?: string;
  className?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  label,
  className,
}) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
  };

  return (
    <div className={clsx('flex flex-col items-center justify-center p-6 text-slate-500', className)}>
      <Loader2 className={clsx('animate-spin text-teal-600', sizes[size])} />
      {label && <p className="mt-3 text-xs font-medium text-slate-600">{label}</p>}
    </div>
  );
};

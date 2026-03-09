import React from 'react';
import { Info } from 'lucide-react';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  insightStrip?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function ChartCard({ title, subtitle, children, insightStrip, footer, className = '' }: ChartCardProps) {
  return (
    <div className={`chart-card ${className}`}>
      <div className="flex items-start justify-between mb-1">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
            <button
              className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              aria-label="More information"
            >
              <Info size={13} />
            </button>
          </div>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>

      {insightStrip && (
        <div className="mt-3 mb-4">
          {insightStrip}
        </div>
      )}

      <div className="mt-4">
        {children}
      </div>

      {footer && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          {footer}
        </div>
      )}
    </div>
  );
}

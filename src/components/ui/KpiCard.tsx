import React from 'react';

interface KpiCardProps {
  label: string;
  value: string;
  subtext?: string;
  icon: React.ReactNode;
  iconBg?: string;
  active?: boolean;
  onClick?: () => void;
}

export function KpiCard({ label, value, subtext, icon, iconBg = 'bg-blue-50 text-blue-500', active, onClick }: KpiCardProps) {
  return (
    <div
      className={`kpi-card card-hover cursor-pointer transition-all duration-200 ${
        active
          ? 'border-amber-400 ring-1 ring-amber-300'
          : 'border-gray-200 hover:border-gray-300'
      }`}
      onClick={onClick}
    >
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{label}</p>
        <p className="text-2xl font-700 text-slate-900 leading-tight" style={{ fontWeight: 700 }}>{value}</p>
        {subtext && <p className="text-xs text-slate-500 mt-1">{subtext}</p>}
      </div>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ml-4 ${iconBg}`}>
        {icon}
      </div>
    </div>
  );
}

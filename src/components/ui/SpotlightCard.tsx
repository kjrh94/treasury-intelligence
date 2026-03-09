import React, { useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface SpotlightCardProps {
  tag?: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export function SpotlightCard({ tag = 'Spotlight', title, subtitle, children, defaultOpen = true }: SpotlightCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="spotlight-card p-5">
      <div
        className="flex items-start justify-between cursor-pointer select-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">{tag}</span>
            <span className="text-sm font-semibold text-slate-900">{title}</span>
          </div>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
        <button className="text-slate-400 hover:text-slate-600 transition-colors mt-0.5 cursor-pointer">
          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>
      {isOpen && (
        <div className="mt-4 animate-slide-down">
          {children}
        </div>
      )}
    </div>
  );
}

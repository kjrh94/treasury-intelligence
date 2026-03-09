import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface AiInsightStripProps {
  title?: string;
  preview: string;
  expanded?: React.ReactNode;
  defaultOpen?: boolean;
}

export function AiInsightStrip({ title = 'AI Insight', preview, expanded, defaultOpen = false }: AiInsightStripProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="ai-strip" onClick={() => setIsOpen(!isOpen)}>
      <div className="flex items-start justify-between gap-3 w-full">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
            <div className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center">
              <svg className="w-2.5 h-2.5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="text-xs font-semibold text-blue-700">{title}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-600 leading-relaxed">{preview}</p>
            {isOpen && expanded && (
              <div className="mt-2 space-y-1.5 animate-slide-down">
                {expanded}
              </div>
            )}
          </div>
        </div>
        <div className="flex-shrink-0 text-blue-500 mt-0.5">
          {expanded ? (isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : null}
        </div>
      </div>
    </div>
  );
}

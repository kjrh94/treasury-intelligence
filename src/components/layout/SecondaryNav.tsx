import React from 'react';
import { CalendarDays, Upload, ChevronDown } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { BorrowingsTab } from '../../types';

const tabs: { key: BorrowingsTab; label: string }[] = [
  { key: 'portfolio', label: 'Portfolio' },
  { key: 'expense-tracking', label: 'Expense Tracking' },
  { key: 'repayments', label: 'Repayments' },
];

const periods = ['Monthly', 'Quarterly', 'Annually'];

export function SecondaryNav() {
  const { activeBorrowingsTab, setActiveBorrowingsTab, period, setPeriod, navigateTo } = useApp();
  const [showPeriodMenu, setShowPeriodMenu] = React.useState(false);

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="page-container">
        <div className="flex items-center justify-between h-11">
          {/* Tab nav */}
          <div className="flex items-center gap-6" role="tablist">
            {tabs.map(tab => (
              <button
                key={tab.key}
                role="tab"
                aria-selected={activeBorrowingsTab === tab.key}
                onClick={() => setActiveBorrowingsTab(tab.key)}
                className={`
                  tab-item relative py-0 h-11 flex items-center
                  ${activeBorrowingsTab === tab.key ? 'tab-active' : 'tab-inactive'}
                `}
              >
                {tab.label}
                {activeBorrowingsTab === tab.key && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full" />
                )}
              </button>
            ))}
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2">
            <button
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-gray-100 transition-colors cursor-pointer border border-gray-200"
              aria-label="Filter by date"
            >
              <CalendarDays size={15} />
            </button>

            {/* Period dropdown */}
            <div className="relative">
              <button
                className="flex items-center gap-1.5 text-sm font-medium text-slate-700 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors cursor-pointer bg-white"
                onClick={() => setShowPeriodMenu(!showPeriodMenu)}
                aria-label="Select period"
              >
                {period}
                <ChevronDown size={13} className="text-slate-400" />
              </button>
              {showPeriodMenu && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-elevated z-30 py-1 min-w-[130px]">
                  {periods.map(p => (
                    <button
                      key={p}
                      onClick={() => { setPeriod(p); setShowPeriodMenu(false); }}
                      className={`w-full text-left px-4 py-2 text-sm cursor-pointer transition-colors ${
                        p === period ? 'text-blue-600 bg-blue-50 font-medium' : 'text-slate-700 hover:bg-gray-50'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => navigateTo('upload')}
              className="flex items-center gap-1.5 text-sm font-medium text-slate-700 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors cursor-pointer bg-white"
            >
              <Upload size={13} />
              Upload
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

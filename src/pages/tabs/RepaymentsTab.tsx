import React, { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { Clock, Calendar, CalendarDays, CalendarRange, ChevronLeft, ChevronRight } from 'lucide-react';
import { SpotlightCard } from '../../components/ui/SpotlightCard';
import { ChartCard } from '../../components/ui/ChartCard';
import { AiInsightStrip } from '../../components/ui/AiInsightStrip';
import { repaymentScheduleData } from '../../data/mockData';

type BucketKey = 'week' | 'month' | 'quarter' | 'year';

const buckets: { key: BucketKey; label: string; value: string; subtext: string; icon: React.ReactNode }[] = [
  {
    key: 'week',
    label: 'Due in 1 Week',
    value: '₹3,314.42 Cr',
    subtext: 'Next 7 days',
    icon: <Clock size={15} />,
  },
  {
    key: 'month',
    label: 'Due in 1 Month',
    value: '₹6,549.29 Cr',
    subtext: 'Next 30 days',
    icon: <Calendar size={15} />,
  },
  {
    key: 'quarter',
    label: 'Due in 1 Quarter',
    value: '₹1.39 Thousand Cr',
    subtext: 'Next 90 days',
    icon: <CalendarDays size={15} />,
  },
  {
    key: 'year',
    label: 'Due in 1 Year',
    value: '₹3.70 Thousand Cr',
    subtext: 'Next 365 days',
    icon: <CalendarRange size={15} />,
  },
];

// Repayment Bucket Cards
function BucketCards({ active, setActive }: { active: BucketKey; setActive: (k: BucketKey) => void }) {
  const iconBgs: Record<BucketKey, string> = {
    week: 'bg-red-50 text-red-500',
    month: 'bg-amber-50 text-amber-500',
    quarter: 'bg-blue-50 text-blue-500',
    year: 'bg-emerald-50 text-emerald-500',
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {buckets.map(b => (
        <button
          key={b.key}
          onClick={() => setActive(b.key)}
          className={`
            text-left p-5 rounded-2xl border transition-all duration-200 cursor-pointer
            ${active === b.key
              ? 'border-amber-400 ring-2 ring-amber-200 bg-amber-50/40'
              : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-card-hover'
            }
          `}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{b.label}</p>
            </div>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ml-3 flex-shrink-0 ${iconBgs[b.key]}`}>
              {b.icon}
            </div>
          </div>
          <p className="text-xl font-bold text-slate-900 leading-tight" style={{ fontWeight: 700 }}>{b.value}</p>
          <p className="text-xs text-slate-400 mt-1">{b.subtext}</p>
        </button>
      ))}
    </div>
  );
}

// Repayments Spotlight
function RepaymentsSpotlight() {
  const summaryRows = [
    { label: '1 Week', value: '₹3,314.42 Cr' },
    { label: '1 Month', value: '₹6,549.29 Cr' },
    { label: '1 Quarter', value: '₹1.39 Thousand Cr' },
    { label: '1 Year', value: '₹3.70 Thousand Cr' },
  ];

  return (
    <SpotlightCard
      tag="Spotlight"
      title="Repayments Spotlight"
      subtitle="Key findings & recommended actions"
      defaultOpen={true}
    >
      <div className="space-y-5">
        {/* Top summary boxes */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-xl p-4 border border-blue-100">
            <p className="text-xs text-slate-500 mb-1">90-Day Repayments</p>
            <p className="text-lg font-bold text-slate-900" style={{ fontWeight: 700 }}>₹1.39 Thousand Cr</p>
            <p className="text-xs text-slate-400 mt-0.5">Normal distribution</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-blue-100">
            <p className="text-xs text-slate-500 mb-1">Liquidity Coverage</p>
            <p className="text-lg font-bold text-emerald-600" style={{ fontWeight: 700 }}>4.19x</p>
            <p className="text-xs text-slate-400 mt-0.5">Minimum: 1.2x</p>
          </div>
        </div>

        {/* Bucket summary grid */}
        <div className="grid grid-cols-4 gap-3 bg-white rounded-xl p-4 border border-blue-100">
          {summaryRows.map(row => (
            <div key={row.label} className="text-center">
              <p className="text-xs text-slate-500 mb-1">{row.label}</p>
              <p className="text-sm font-semibold text-slate-900">{row.value}</p>
            </div>
          ))}
        </div>

        {/* Current position */}
        <div>
          <p className="text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wide">Current Position</p>
          <p className="text-sm text-slate-700 leading-relaxed">
            Upcoming repayments of <strong>₹1.39 Thousand Cr</strong> over the next 90 days represent{' '}
            <strong>0.5%</strong> of total cash inflow. Liquidity coverage ratio stands at{' '}
            <span className="text-emerald-600 font-semibold">4.19x</span> against policy minimum of 1.2x,
            providing adequate buffer for repayment obligations.
          </p>
        </div>

        {/* Recommendations */}
        <div>
          <p className="text-xs font-semibold text-slate-700 mb-3 uppercase tracking-wide">Actionable Recommendations</p>
          <ul className="space-y-3">
            {[
              { icon: <span className="text-amber-500">→</span>, text: 'Consider selective prepayment of ₹6,549.29 Cr in high-interest obligations (>10% APR) when liquidity permits, saving approximately ₹294.68 Cr in interest costs annually.' },
              { icon: <span className="text-blue-500">↔</span>, text: 'Hedge interest rate exposure on ₹2.22 Thousand Cr of floating-rate debt using interest rate swaps or caps to protect against rate increases (current weighted avg: ~8.5%).' },
              { icon: <span className="text-emerald-500">✓</span>, text: 'Maintain current repayment schedule while conducting quarterly stress tests to ensure resilience against 20–30% cash flow volatility.' },
            ].map((rec, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="text-base font-bold flex-shrink-0 mt-0.5">{rec.icon}</span>
                <span className="text-sm text-slate-600 leading-relaxed">{rec.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </SpotlightCard>
  );
}

// Repayment Schedule Overview Chart
function RepaymentScheduleChart() {
  return (
    <ChartCard
      title="Repayment Schedule Overview"
      subtitle="Click on any time bucket to see product-level breakdown"
      insightStrip={
        <AiInsightStrip
          preview="What this chart suggests and what to watch"
          expanded={
            <p className="text-xs text-slate-600 leading-relaxed">
              The bulk of repayment obligations are concentrated in the <strong>1–5 year</strong> buckets,
              indicating a well-laddered maturity profile. Near-term obligations (within 1 month)
              are manageable relative to current liquidity coverage.
            </p>
          }
        />
      }
      footer={
        <div className="flex flex-wrap gap-x-6 gap-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-amber-400" />
            <span className="text-xs text-slate-500">Interest Amount</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-blue-500" />
            <span className="text-xs text-slate-500">Principal Amount</span>
          </div>
        </div>
      }
    >
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={repaymentScheduleData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="bucket" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
          <Tooltip
            content={({ active, payload, label }) => {
              if (active && payload?.length) {
                return (
                  <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-elevated text-xs">
                    <p className="font-semibold text-slate-800 mb-2">{label}</p>
                    {payload.map((p: any) => (
                      <div key={p.name} className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: p.color }} />
                        <span className="text-slate-500">{p.name}:</span>
                        <span className="font-medium text-slate-700">{p.value} Cr</span>
                      </div>
                    ))}
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar dataKey="principal" name="Principal Amount" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
          <Bar dataKey="interest" name="Interest Amount" stackId="a" fill="#f59e0b" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// Upcoming Repayments Timeline Chart
function UpcomingRepaymentsChart() {
  const [page, setPage] = useState(0);
  const totalPages = 3;
  const pageDots = Array.from({ length: totalPages }, (_, i) => i);

  const timelineData = [
    { bucket: '1-7 days', value: 3314 },
    { bucket: '8-14 days', value: 1850 },
    { bucket: '15d-1mo', value: 6549 },
  ];

  const legendItems = [
    { color: '#1e40af', label: 'CP (earmarking Bank Limits)' },
    { color: '#16a34a', label: 'Cash Credit' },
    { color: '#7c3aed', label: 'Commercial Paper (Issued to Investors)' },
    { color: '#059669', label: 'FX Loans: ECB' },
    { color: '#dc2626', label: 'Loan: ECB – INR' },
    { color: '#0891b2', label: 'NCD (Special Cases)' },
    { color: '#0284c7', label: 'NCD (earmarking Bank Limits)' },
    { color: '#2563eb', label: 'NCD – Instalment Repayment' },
    { color: '#4f46e5', label: 'Non-Convertible Debentures' },
    { color: '#9333ea', label: 'Perpetual Debentures' },
    { color: '#ec4899', label: 'TREPs (Borrowing)' },
    { color: '#0d9488', label: 'Term Loans' },
    { color: '#f59e0b', label: 'Tier II Debentures' },
    { color: '#84cc16', label: 'Tier II Debentures – ZCD' },
    { color: '#f97316', label: 'Working Capital Demand Loan' },
    { color: '#6b7280', label: 'ZCD (earmarking Bank Limits)' },
    { color: '#d97706', label: 'Zero Coupon Debentures' },
  ];

  return (
    <ChartCard
      title="Upcoming Repayments Timeline"
      subtitle="Click on any category bar to view detailed breakdown by lender and product. Use arrows to navigate between time periods."
      insightStrip={
        <AiInsightStrip
          preview="What this chart suggests and what to watch"
          expanded={
            <p className="text-xs text-slate-600 leading-relaxed">
              Near-term repayment concentration in the 15-day to 1-month bucket warrants proactive
              liquidity planning. Ensure cash reserves are aligned to cover upcoming principal maturities,
              particularly for NCD and Term Loan instruments.
            </p>
          }
        />
      }
      footer={
        <div>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {legendItems.map(item => (
              <div key={item.label} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-xs text-slate-500">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      }
    >
      {/* Pagination controls */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setPage(p => Math.max(0, p - 1))}
          disabled={page === 0}
          className={`flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${
            page === 0 ? 'text-slate-300 border-slate-100' : 'text-slate-600 border-gray-200 hover:bg-gray-50'
          }`}
        >
          <ChevronLeft size={13} />
          Previous
        </button>
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs text-slate-500">Showing {page * 3 + 1}–{Math.min((page + 1) * 3, 9)} of 9 buckets</span>
          <div className="flex gap-1.5">
            {pageDots.map(i => (
              <button
                key={i}
                onClick={() => setPage(i)}
                className={`rounded-full transition-all cursor-pointer ${i === page ? 'w-5 h-2 bg-blue-600' : 'w-2 h-2 bg-slate-200'}`}
              />
            ))}
          </div>
        </div>
        <button
          onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
          disabled={page === totalPages - 1}
          className={`flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${
            page === totalPages - 1 ? 'text-slate-300 border-slate-100' : 'text-slate-600 border-gray-200 hover:bg-gray-50'
          }`}
        >
          Next
          <ChevronRight size={13} />
        </button>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={timelineData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="bucket" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
          <Tooltip
            content={({ active, payload, label }) => {
              if (active && payload?.length) {
                return (
                  <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-elevated text-xs">
                    <p className="font-semibold text-slate-800 mb-1">{label}</p>
                    <p className="text-slate-600">Amount: <strong className="text-slate-800">₹{payload[0]?.value} Cr</strong></p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={60}>
            {timelineData.map((_, i) => (
              <Cell key={i} fill={['#2563eb', '#60a5fa', '#93c5fd'][i]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// --- Main Repayments Tab ---
export function RepaymentsTab() {
  const [activeBucket, setActiveBucket] = useState<BucketKey>('month');

  return (
    <div className="space-y-5">
      <BucketCards active={activeBucket} setActive={setActiveBucket} />
      <RepaymentsSpotlight />
      <RepaymentScheduleChart />
      <UpcomingRepaymentsChart />
    </div>
  );
}

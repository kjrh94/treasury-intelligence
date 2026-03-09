import {
  LineChart, Line, BarChart, Bar, ScatterChart, Scatter, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts';
import { TrendingUp, TrendingDown, ReceiptText, Building2 } from 'lucide-react';
import { ChartCard } from '../../components/ui/ChartCard';
import { AiInsightStrip } from '../../components/ui/AiInsightStrip';
import { SpotlightCard } from '../../components/ui/SpotlightCard';
import { KpiCard } from '../../components/ui/KpiCard';
import {
  costOfFundsData as mockCostOfFunds,
  feesOverTimeData as mockFees,
  productRateData as mockProductRate,
  productRateColors,
} from '../../data/mockData';
import { useApp } from '../../context/AppContext';

// Cost of Funds Hero Chart
function CostOfFundsHeroChart() {
  const { parsedData } = useApp();
  const data = parsedData?.costOfFundsData ?? mockCostOfFunds;

  const currentValue = data[data.length - 1]?.value ?? 9.8;
  const allValues = data.map(d => d.value).filter(v => v > 0);
  const avgValue = allValues.length
    ? (allValues.reduce((a, b) => a + b, 0) / allValues.length).toFixed(1)
    : '9.1';
  const trend = allValues.length >= 2 && allValues[allValues.length - 1] > allValues[0]
    ? 'Rising'
    : 'Stable';
  const trendRising = trend === 'Rising';

  const summaryCards = [
    { label: 'Current Quarter', value: `${currentValue}%`, color: 'text-slate-900' },
    { label: `${data.length}-Quarter Average`, value: `${avgValue}%`, color: 'text-slate-900' },
    {
      label: 'Trend',
      value: trend,
      color: trendRising ? 'text-red-600' : 'text-emerald-600',
      icon: trendRising
        ? <TrendingUp size={13} className="text-red-500" />
        : <TrendingDown size={13} className="text-emerald-500" />,
    },
  ];

  return (
    <ChartCard
      title="Cost of Funds Movement (Quarter-on-Quarter)"
      subtitle="Measures the efficiency of borrowing costs across the portfolio over time"
      insightStrip={
        <AiInsightStrip
          title="AI Insight"
          preview="What this means for your borrowing costs"
          defaultOpen={true}
          expanded={
            <div className="space-y-2">
              <p className="text-xs text-slate-700 leading-relaxed">
                <span className="inline-flex items-center gap-1 text-blue-600 font-medium"><span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" /> Costs are {trendRising ? 'rising' : 'stable'}:</span>{' '}
                The Cost of Funds is currently at{' '}<strong>{currentValue}%</strong>{' '}
                with a {data.length}-quarter average of <strong>{avgValue}%</strong>.
                {trendRising ? ' This means each rupee borrowed is costing more in interest.' : ''}
              </p>
              <p className="text-xs text-slate-700 leading-relaxed">
                <span className="font-semibold">What to do next:</span>{' '}
                {trendRising
                  ? 'With costs trending up, review existing loan terms and consider locking in current rates before they rise further.'
                  : 'Costs are well-managed. Continue monitoring quarterly for any emerging uptick.'}
              </p>
            </div>
          }
        />
      }
    >
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 4, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="quarter" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
          <YAxis
            tick={{ fontSize: 11, fill: '#64748b' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={v => `${v}%`}
            domain={['auto', 'auto']}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (active && payload?.length) {
                return (
                  <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-elevated text-xs">
                    <p className="font-semibold text-slate-800 mb-1">{label}</p>
                    <p className="text-slate-600">Cost of Funds: <strong className="text-slate-800">{payload[0]?.value}%</strong></p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#2563eb"
            strokeWidth={2.5}
            dot={{ r: 4, fill: '#2563eb', strokeWidth: 0 }}
            activeDot={{ r: 6, fill: '#2563eb' }}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* 3 mini summary cards */}
      <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-gray-100">
        {summaryCards.map(card => (
          <div key={card.label} className="text-center">
            <p className="text-xs text-slate-500 mb-1">{card.label}</p>
            <div className={`flex items-center justify-center gap-1 text-lg font-bold ${card.color}`} style={{ fontWeight: 700 }}>
              {card.icon}
              {card.value}
            </div>
          </div>
        ))}
      </div>
    </ChartCard>
  );
}

// Small KPI Row
function ExpenseKpis() {
  const { parsedData } = useApp();
  const kpis = parsedData?.expenseKpis;

  const feesCr = kpis ? kpis.totalFeesCr : 204;
  const feesLabel = feesCr >= 1000 ? `₹${(feesCr / 1000).toFixed(2)} Thousand Cr` : `₹${feesCr} Cr`;
  const highestBank = kpis ? kpis.highestFeeBank : 'IDFC First Bank';
  const highestFee = kpis ? kpis.highestFeeBankCr : 38.4;
  const highestFeeLabel = highestFee >= 1000 ? `${(highestFee / 1000).toFixed(2)} Thousand Cr` : `${highestFee} Cr`;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <KpiCard
        label="Total Fees Paid"
        value={feesLabel}
        subtext="Last 90 days"
        icon={<ReceiptText size={16} />}
        iconBg="bg-blue-50 text-blue-500"
      />
      <KpiCard
        label="Bank with Highest Fees"
        value={highestBank}
        subtext={`₹${highestFeeLabel} — current quarter`}
        icon={<Building2 size={16} />}
        iconBg="bg-amber-50 text-amber-500"
      />
    </div>
  );
}

// Expense Tracking Spotlight
function ExpenseSpotlight() {
  return (
    <SpotlightCard
      tag="Spotlight"
      title="Expense Tracking Spotlight"
      subtitle="Key findings & recommended actions"
      defaultOpen={true}
    >
      <div className="space-y-4">
        <div>
          <p className="text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wide">Current Position</p>
          <p className="text-sm text-slate-700 leading-relaxed">
            Your borrowing portfolio reflects a wide interest rate spectrum across all active instruments.
            Quarter-on-quarter analysis indicates borrowing costs are trending upward, likely influenced
            by monetary policy conditions and credit market dynamics.
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wide">Recommendations</p>
          <ul className="space-y-2">
            {[
              'Consider gradually replacing higher-cost instruments with lower-cost alternatives where structurally feasible, subject to prepayment terms.',
              'Rising rate environment warrants close monitoring of refinancing windows and potential lock-in opportunities on floating-rate exposures.',
              'Maintain quarterly rate benchmarking across all lender facilities to identify renegotiation opportunities.',
            ].map((rec, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />
                <span className="text-sm text-slate-600 leading-relaxed">{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </SpotlightCard>
  );
}

// Fees Over Time Chart
function FeesOverTimeChart() {
  const { parsedData } = useApp();
  const data = parsedData?.feesOverTimeData ?? mockFees;

  return (
    <ChartCard
      title="Fees Over Time"
      subtitle="Quarterly fees incurred — last 5 quarters trend analysis"
      insightStrip={
        <AiInsightStrip
          preview="What your fee spending pattern looks like"
          expanded={
            <div className="space-y-1.5">
              <p className="text-xs text-slate-700 leading-relaxed">
                <span className="inline-flex items-center gap-1 text-slate-800 font-medium"><span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" /> Fees are steady:</span>{' '}
                Fee levels have remained within a consistent range across the observed quarters, reflecting stable borrowing activity.
              </p>
              <p className="text-xs text-slate-700 leading-relaxed">
                <span className="inline-flex items-center gap-1 text-slate-800 font-medium"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /> Spending in line:</span>{' '}
                This quarter's fees are within the normal range of the multi-quarter average — your fee spending is predictable and well-managed.
              </p>
            </div>
          }
        />
      }
      footer={
        <p className="text-xs text-slate-400 flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full border border-slate-300 flex items-center justify-center">
            <span className="text-[8px]">i</span>
          </span>
          Click on any bar to view detailed fee breakdown for that quarter
        </p>
      }
    >
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="quarter" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}`} />
          <Tooltip
            content={({ active, payload, label }) => {
              if (active && payload?.length) {
                return (
                  <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-elevated text-xs">
                    <p className="font-semibold text-slate-800 mb-1">{label}</p>
                    <p className="text-slate-600">Fees: <strong className="text-slate-800">₹{payload[0]?.value} Cr</strong></p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar dataKey="fees" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={36}>
            {data.map((_, i) => (
              <Cell key={i} fill={i === data.length - 1 ? '#2563eb' : '#93c5fd'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// Product-wise Interest Rate Chart (Scatter/Dot)
function ProductRateChart() {
  const { parsedData } = useApp();
  const data = parsedData?.productRateData ?? mockProductRate;
  const products = Object.keys(data[0] ?? {}).filter(k => k !== 'quarter');

  // Transform for ScatterChart — one series per product
  const scatterSeries = products.map((product, i) => ({
    product,
    color: productRateColors[i % productRateColors.length],
    data: data.map((d, qi) => ({
      x: qi,
      y: d[product as keyof typeof d] as number,
      quarter: d.quarter,
    })),
  }));

  const ratesFlat = scatterSeries.flatMap(s => s.data.map(d => d.y)).filter(v => v > 0);
  const maxRate = ratesFlat.length ? Math.max(...ratesFlat) : 12.75;
  const minRate = ratesFlat.length ? Math.min(...ratesFlat) : 7.85;
  const maxProduct = scatterSeries.find(s => s.data.some(d => d.y === maxRate))?.product ?? 'N/A';
  const minProduct = scatterSeries.find(s => s.data.some(d => d.y === minRate))?.product ?? 'N/A';

  const bottomCards = [
    { label: 'Highest Rate', sublabel: maxProduct, value: `${maxRate}%`, color: 'text-red-600', icon: <TrendingUp size={14} className="text-red-500" /> },
    { label: 'Lowest Rate', sublabel: minProduct, value: `${minRate}%`, color: 'text-emerald-600', icon: <TrendingDown size={14} className="text-emerald-500" /> },
    { label: 'Rate Trend', sublabel: 'Across All Products', value: 'Rising', color: 'text-red-600', icon: <TrendingUp size={14} className="text-red-500" /> },
  ];

  return (
    <ChartCard
      title="Product-Wise Interest Rate Movement (Quarter-on-Quarter)"
      subtitle="Interest rate trends for borrowing products over last 5 quarters – identify cost trends and refinancing opportunities"
      insightStrip={
        <AiInsightStrip
          preview="How interest rates are changing across your loans"
          expanded={
            <div className="space-y-1.5">
              {[
                { color: 'bg-red-500', label: 'Rates went up:', text: `Interest rates are rising across your loans. Consider locking in current rates on existing loans and looking into replacing higher-rate ones.` },
                { color: 'bg-amber-500', label: 'Big rate gap between products:', text: `${maxProduct} has the highest rate at ${maxRate}%, while ${minProduct} has the lowest at ${minRate}%. This ${(maxRate - minRate).toFixed(2)}% difference means you could save by shifting toward lower-rate loans.` },
                { color: 'bg-blue-500', label: 'Action recommended:', text: 'Consider replacing higher-cost instruments with cheaper options before rates rise further.' },
              ].map(item => (
                <p key={item.label} className="text-xs text-slate-700 leading-relaxed">
                  <span className="inline-flex items-center gap-1 font-medium"><span className={`w-1.5 h-1.5 rounded-full ${item.color} inline-block`} /> {item.label}</span>{' '}
                  {item.text}
                </p>
              ))}
            </div>
          }
        />
      }
      footer={
        <div className="grid grid-cols-3 gap-4">
          {bottomCards.map(card => (
            <div key={card.label} className="text-center p-3 bg-slate-50 rounded-xl">
              <p className="text-xs text-slate-500 mb-0.5">{card.label}</p>
              <p className="text-xs text-slate-400 mb-2 truncate">{card.sublabel}</p>
              <div className={`flex items-center justify-center gap-1 text-base font-bold ${card.color}`} style={{ fontWeight: 700 }}>
                {card.icon}
                {card.value}
              </div>
            </div>
          ))}
        </div>
      }
    >
      {/* Simple dot/line simulation for product rates */}
      <div className="w-full">
        <ResponsiveContainer width="100%" height={280}>
          <ScatterChart margin={{ top: 10, right: 20, left: 0, bottom: 30 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              type="number"
              dataKey="x"
              tick={{ fontSize: 10, fill: '#64748b' }}
              axisLine={false}
              tickLine={false}
              tickCount={data.length}
              tickFormatter={i => data[i]?.quarter ?? ''}
              domain={[-0.5, data.length - 0.5]}
              label={{ value: 'Quarter', position: 'insideBottom', offset: -10, fontSize: 10, fill: '#94a3b8' }}
            />
            <YAxis
              type="number"
              dataKey="y"
              tick={{ fontSize: 10, fill: '#64748b' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={v => `${v}%`}
              domain={['auto', 'auto']}
              label={{ value: 'Interest Rate (%)', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#94a3b8' }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload?.length) {
                  const d = payload[0]?.payload;
                  return (
                    <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-elevated text-xs">
                      <p className="font-semibold text-slate-800 mb-1">{d?.quarter}</p>
                      <p className="text-slate-600">Rate: <strong className="text-slate-800">{d?.y}%</strong></p>
                    </div>
                  );
                }
                return null;
              }}
            />
            {scatterSeries.map(series => (
              <Scatter
                key={series.product}
                name={series.product}
                data={series.data}
                fill={series.color}
                line={{ stroke: series.color, strokeWidth: 1.5, strokeDasharray: '0' }}
                lineType="fitting"
              >
                {series.data.map((_, i) => (
                  <Cell key={i} fill={series.color} />
                ))}
              </Scatter>
            ))}
            <Legend
              iconType="circle"
              iconSize={6}
              wrapperStyle={{ paddingTop: 16, fontSize: 10, bottom: 0 }}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

// --- Main Expense Tracking Tab ---
export function ExpenseTrackingTab() {
  return (
    <div className="space-y-5">
      <CostOfFundsHeroChart />
      <ExpenseKpis />
      <ExpenseSpotlight />
      <FeesOverTimeChart />
      <ProductRateChart />
    </div>
  );
}

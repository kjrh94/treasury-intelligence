import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Cell,
} from 'recharts';
import { Clock, IndianRupee, FileText } from 'lucide-react';
import { KpiCard } from '../../components/ui/KpiCard';
import { SpotlightCard } from '../../components/ui/SpotlightCard';
import { ChartCard } from '../../components/ui/ChartCard';
import { AiInsightStrip } from '../../components/ui/AiInsightStrip';
import {
  portfolioMovementData as mockPortfolioMovement,
  portfolioColors,
  lenderExposureData as mockLenderExposure,
  ltStDebtData as mockLtSt,
  tenureByProductData as mockTenure,
} from '../../data/mockData';
import { useApp } from '../../context/AppContext';

// Custom tooltip
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-elevated text-xs">
        <p className="font-semibold text-slate-800 mb-2">{label}</p>
        {payload.map((entry: any) => (
          <div key={entry.name} className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-slate-500">{entry.name}:</span>
            <span className="font-medium text-slate-700">{entry.value} Cr</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

function fmt(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(2)} Thousand Cr`;
  return `${n.toLocaleString('en-IN')} Cr`;
}

// KPI section
function PortfolioKpis() {
  const { parsedData } = useApp();
  const kpis = parsedData?.portfolioKpis;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <KpiCard
        label="Average Portfolio Tenure"
        value={kpis ? `${kpis.avgTenureYears} years` : '2.9 years'}
        subtext="Weighted average repayment timeline"
        icon={<Clock size={16} />}
        iconBg="bg-blue-50 text-blue-500"
      />
      <KpiCard
        label="Total Outstanding"
        value={kpis ? `₹${fmt(kpis.totalOutstandingCr)}` : '₹2.96 Thousand Cr'}
        subtext="Across all active instruments"
        icon={<IndianRupee size={16} />}
        iconBg="bg-emerald-50 text-emerald-500"
      />
      <KpiCard
        label="Active Loans"
        value={kpis ? `${kpis.activeLoans.toLocaleString('en-IN')} loans` : '4,083 loans'}
        subtext="Currently active borrowings"
        icon={<FileText size={16} />}
        iconBg="bg-violet-50 text-violet-500"
      />
    </div>
  );
}

// Portfolio Spotlight
function PortfolioSpotlight() {
  const { parsedData } = useApp();
  const kpis = parsedData?.portfolioKpis;

  return (
    <SpotlightCard
      tag="Spotlight"
      title="Portfolio Spotlight"
      subtitle="Key findings & recommended actions"
      defaultOpen={true}
    >
      <div>
        <p className="text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wide">Current Position</p>
        <p className="text-sm text-slate-700 leading-relaxed">
          Portfolio maintains an average tenure of{' '}
          <span className="font-semibold text-slate-900">{kpis ? `${kpis.avgTenureYears} years` : '2.9 years'}</span> across{' '}
          <span className="font-semibold text-slate-900">{kpis ? kpis.activeLoans.toLocaleString('en-IN') : '4,083'}</span> active loans totalling{' '}
          <span className="font-semibold text-slate-900">{kpis ? `₹${fmt(kpis.totalOutstandingCr)}` : '₹2.96 Thousand Cr'}</span>.{' '}
          <span className="text-blue-600 font-medium">
            Long-term tenure reduces refinancing pressure but may lock in higher rates; monitor for
            refinancing opportunities if rates decline.
          </span>{' '}
          Average loan size indicates large-ticket financing requiring enhanced due diligence and
          covenant monitoring. Lender concentration in the top 3 banks warrants ongoing review against
          internal exposure limits.
        </p>
      </div>
    </SpotlightCard>
  );
}

// Chart 1: Total Portfolio Movement
function TotalPortfolioMovementChart() {
  const { parsedData } = useApp();
  const data = parsedData?.portfolioMovementData ?? mockPortfolioMovement;
  const keys = Object.keys(data[0] ?? {}).filter(k => k !== 'quarter');

  return (
    <ChartCard
      title="Total Portfolio Movement (Quarter-on-Quarter)"
      subtitle="Showing last 5 quarters of portfolio composition by product type"
      insightStrip={
        <AiInsightStrip
          preview="How your loan portfolio is changing over time"
          expanded={
            <p className="text-xs text-slate-600 leading-relaxed">
              Portfolio has grown over the observed period, driven primarily by
              Non-Convertible Debentures and Market Linked instruments. Working Capital utilisation
              remained stable, suggesting disciplined short-term funding.
            </p>
          }
        />
      }
    >
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="quarter" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}`} />
          <Tooltip content={<CustomTooltip />} />
          <Legend iconType="square" iconSize={8} wrapperStyle={{ paddingTop: 16, fontSize: 11 }} />
          {keys.map((key, i) => (
            <Bar key={key} dataKey={key} stackId="a" fill={portfolioColors[i % portfolioColors.length]} radius={i === keys.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// Chart 2: Top 10 Lenders
function LenderExposureChart() {
  const { parsedData } = useApp();
  const data = parsedData?.lenderExposureData ?? mockLenderExposure;

  return (
    <ChartCard
      title="Top 10 Lenders Exposure"
      subtitle="Outstanding Exposure by Lender"
      insightStrip={
        <AiInsightStrip
          preview="How your borrowings are spread across banks"
          expanded={
            <p className="text-xs text-slate-600 leading-relaxed">
              Top 3 lenders account for approximately{' '}
              <strong>38%</strong> of total portfolio exposure. Consider gradual diversification to reduce
              refinancing risk at renewal.
            </p>
          }
        />
      }
    >
      <ResponsiveContainer width="100%" height={280}>
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 0, right: 30, left: 10, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: '#64748b' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={() => '₹'}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 11, fill: '#475569' }}
            axisLine={false}
            tickLine={false}
            width={110}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload?.length) {
                return (
                  <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-elevated text-xs">
                    <p className="font-semibold text-slate-800">{payload[0]?.payload?.name}</p>
                    <p className="text-slate-600 mt-1">Exposure: <strong className="text-slate-800">{payload[0]?.value} Cr</strong></p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={18}>
            {data.map((_, i) => (
              <Cell key={i} fill={i === 0 ? '#2563eb' : i === 1 ? '#3b82f6' : '#60a5fa'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// Chart 3: Long-Term vs Short-Term
function LtStDebtChart() {
  const { parsedData } = useApp();
  const data = parsedData?.ltStDebtData ?? mockLtSt;

  return (
    <ChartCard
      title="Long-Term vs Short-Term Debt"
      subtitle="Quarterly breakdown of debt maturity composition"
      insightStrip={
        <AiInsightStrip
          preview="Your debt split between short-term and long-term loans"
          expanded={
            <p className="text-xs text-slate-600 leading-relaxed">
              Long-term debt dominates at <strong>~91%</strong> of total portfolio, providing
              structural stability. Short-term borrowings have remained proportionally flat,
              suggesting a deliberate long-duration funding strategy.
            </p>
          }
        />
      }
    >
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="quarter" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Legend iconType="square" iconSize={8} wrapperStyle={{ paddingTop: 12, fontSize: 11 }} />
          <Bar dataKey="Long-Term Debt" stackId="a" fill="#22c55e" radius={[0, 0, 0, 0]} />
          <Bar dataKey="Short-Term Debt" stackId="a" fill="#f59e0b" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// Chart 4: Tenure by Product Type
function TenureByProductChart() {
  const { parsedData } = useApp();
  const data = parsedData?.tenureByProductData ?? mockTenure;

  const tenureLegend = [
    { color: '#ef4444', label: 'Very Short-Term: <60 days' },
    { color: '#f59e0b', label: 'Short-Term: 2–12 months' },
    { color: '#3b82f6', label: 'Medium-Term: 1–3 years' },
    { color: '#22c55e', label: 'Long-Term: 3+ years' },
  ];

  return (
    <ChartCard
      title="Average Portfolio Tenure by Product Type"
      subtitle="Weighted average remaining maturity by product category"
      insightStrip={
        <AiInsightStrip
          preview="How long each loan product typically lasts"
          expanded={
            <p className="text-xs text-slate-600 leading-relaxed">
              Non-Convertible Debentures and NCDs carry the longest average tenure,
              while short-tenor instruments have the shortest remaining maturity.
              This tenure spread supports laddered maturity management.
            </p>
          }
        />
      }
      footer={
        <div>
          <p className="text-xs font-semibold text-slate-600 mb-2">Tenure Classification</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {tenureLegend.map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-xs text-slate-500">{label}</span>
              </div>
            ))}
          </div>
        </div>
      }
    >
      <ResponsiveContainer width="100%" height={200}>
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 0, right: 20, left: 10, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: '#64748b' }}
            axisLine={false}
            tickLine={false}
            label={{ value: 'Average Tenure (days)', position: 'insideBottom', offset: -2, fontSize: 10, fill: '#94a3b8' }}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 10, fill: '#475569' }}
            axisLine={false}
            tickLine={false}
            width={140}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload?.length) {
                return (
                  <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-elevated text-xs">
                    <p className="font-semibold text-slate-800">{payload[0]?.payload?.name}</p>
                    <p className="text-slate-600 mt-1">Avg. Tenure: <strong className="text-slate-800">{payload[0]?.value} days</strong></p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
            {data.map((_entry, i) => {
              const colors = ['#f59e0b', '#f59e0b', '#f59e0b', '#3b82f6', '#ef4444'];
              return <Cell key={i} fill={colors[i % colors.length]} />;
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// --- Main Portfolio Tab ---
export function PortfolioTab() {
  return (
    <div className="space-y-5">
      <PortfolioKpis />
      <PortfolioSpotlight />
      <TotalPortfolioMovementChart />
      <LenderExposureChart />
      <LtStDebtChart />
      <TenureByProductChart />
    </div>
  );
}

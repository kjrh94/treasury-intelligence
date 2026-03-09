import { useApp } from '../context/AppContext';
import {
  ArrowRight, Upload, BarChart3, TrendingUp,
  Shield, Zap, Globe, Activity, Users, Database,
  ChevronRight, LayoutDashboard
} from 'lucide-react';

// --- Landing Header ---
function LandingHeader() {
  const { navigateTo } = useApp();
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="page-container">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-2.5">
            <TILogo />
            <span className="text-sm font-bold text-slate-900">Treasury Intelligence</span>
          </div>
          <nav className="flex items-center gap-6">
            <button className="text-sm text-slate-600 hover:text-slate-900 transition-colors cursor-pointer font-medium">Home</button>
            <button
              onClick={() => navigateTo('upload')}
              className="text-sm text-slate-600 hover:text-slate-900 transition-colors cursor-pointer font-medium"
            >
              Upload
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
}

function TILogo() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="28" height="28" rx="7" fill="#2563eb"/>
      <rect x="6" y="17" width="4" height="5" rx="1" fill="white" opacity="0.7"/>
      <rect x="12" y="13" width="4" height="9" rx="1" fill="white" opacity="0.85"/>
      <rect x="18" y="8" width="4" height="14" rx="1" fill="white"/>
      <path d="M7 15 L14 10 L21 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
    </svg>
  );
}

// --- Dashboard Preview Card ---
function DashboardPreviewCard() {
  return (
    <div className="relative">
      {/* Main card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-elevated w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-slate-500 font-medium">Portfolio Overview</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">+12.5%</span>
            <span className="text-xs text-slate-400">Q4 2024</span>
          </div>
        </div>
        {/* Mini bar chart */}
        <div className="flex items-end gap-1.5 h-20 mb-4">
          {[40, 55, 65, 50, 72, 68, 85, 90, 88, 95].map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-sm"
              style={{
                height: `${h}%`,
                backgroundColor: i >= 7 ? '#2563eb' : '#dbeafe',
                opacity: i >= 7 ? 1 : 0.7,
              }}
            />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-100">
          <div>
            <p className="text-xs text-slate-500">Total Borrowings</p>
            <p className="text-sm font-bold text-slate-900">₹1,245 Cr</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Avg. Tenure</p>
            <p className="text-sm font-bold text-slate-900">18 months</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Borrowings Mix</p>
            <div className="space-y-1 mt-1">
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 rounded-full bg-blue-500" style={{width: '60%'}} />
                <span className="text-xs text-slate-500">60%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 rounded-full bg-blue-200" style={{width: '40%'}} />
                <span className="text-xs text-slate-500">40%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating mini card */}
      <div className="absolute -top-6 -right-6 bg-white rounded-xl border border-gray-200 p-3 shadow-card w-36">
        <div className="flex items-center gap-1.5 mb-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-xs text-slate-500 font-medium">Active Loans</span>
        </div>
        <p className="text-lg font-bold text-slate-900">4,083</p>
        <p className="text-xs text-emerald-600 flex items-center gap-1 mt-0.5">
          <TrendingUp size={10} /> 8.2% this quarter
        </p>
      </div>
    </div>
  );
}

// --- Hero ---
function HeroSection() {
  const { navigateTo } = useApp();
  return (
    <section className="pt-16 pb-20 bg-white">
      <div className="page-container">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full border border-blue-100 mb-6">
              <Activity size={12} />
              AI-Powered Treasury Analytics
            </div>
            <h1 className="text-5xl font-bold text-slate-900 leading-[1.1] mb-6" style={{ letterSpacing: '-0.02em' }}>
              Treasury Intelligence<br />
              <span className="text-blue-600">for Modern Finance</span><br />
              Teams
            </h1>
            <p className="text-base text-slate-600 leading-relaxed mb-8 max-w-lg">
              Upload your transaction data and get AI-powered insights across borrowings,
              investments, cash flow, and risk — in seconds. Built for enterprise treasury teams
              that need clarity without complexity.
            </p>
            <div className="flex items-center gap-3 mb-8">
              <button
                onClick={() => navigateTo('upload')}
                className="btn-primary px-6 py-3 text-base"
              >
                <Upload size={16} />
                Upload File
              </button>
              <button className="btn-secondary px-6 py-3 text-base">
                How it works
                <ArrowRight size={15} />
              </button>
            </div>
            <div className="flex items-center gap-6">
              {[
                { icon: <Zap size={12} />, label: 'Fast setup' },
                { icon: <Shield size={12} />, label: 'Secure by design' },
                { icon: <Activity size={12} />, label: 'Insights in seconds' },
              ].map(({ icon, label }) => (
                <div key={label} className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                  <span className="text-blue-500">{icon}</span>
                  {label}
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-center lg:justify-end pr-6">
            <DashboardPreviewCard />
          </div>
        </div>
      </div>
    </section>
  );
}

// --- Section: What it Does ---
function WhatItDoesSection() {
  return (
    <section className="py-20 bg-slate-50/70">
      <div className="page-container">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">What Treasury Intelligence Does</h2>
        <p className="text-base text-slate-600 leading-relaxed max-w-3xl mb-3">
          Treasury Intelligence provides an AI-enabled insight layer over your existing treasury data.
          It transforms complex borrowing, investment, and cash flow information into structured,
          executive-ready insights — without altering accounting logic, controls, or source systems.
        </p>
        <p className="text-sm text-slate-400 font-medium">
          Designed to integrate seamlessly with ERP, SAP Treasury & Risk Management, and banking systems.
        </p>
      </div>
    </section>
  );
}

// --- Section: Why It's Needed ---
function WhyNeededSection() {
  const leftPoints = [
    'Treasury data is detailed — but often fragmented across multiple reports.',
    'CFO-level insight still depends heavily on manual interpretation.',
    'Risk and concentration signals are buried in operational views.',
  ];
  const rightPoints = [
    'Senior stakeholders require clarity — not operational detail.',
    'Funding, liquidity, and exposure trends must be visible instantly.',
    'Decision-making requires structured, management-ready summaries.',
  ];
  return (
    <section className="py-20 bg-white">
      <div className="page-container">
        <h2 className="text-2xl font-bold text-slate-900 text-center mb-12">Why It's Needed</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <ul className="space-y-4">
            {leftPoints.map(p => (
              <li key={p} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                </div>
                <span className="text-sm text-slate-600 leading-relaxed">{p}</span>
              </li>
            ))}
          </ul>
          <ul className="space-y-4">
            {rightPoints.map(p => (
              <li key={p} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                </div>
                <span className="text-sm text-slate-600 leading-relaxed">{p}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

// --- Section: Key Areas ---
function KeyAreasSection() {
  const areas = [
    {
      icon: <BarChart3 size={20} className="text-blue-600" />,
      title: 'Borrowing Structure',
      desc: 'Analyze instrument mix, maturity buckets, lender exposure, and cost distribution.',
    },
    {
      icon: <Activity size={20} className="text-blue-600" />,
      title: 'Liquidity & Maturity',
      desc: 'Track short-term vs long-term obligations and refinancing risk.',
    },
    {
      icon: <TrendingUp size={20} className="text-blue-600" />,
      title: 'Cost & Performance',
      desc: 'Monitor interest rate trends, fee movements, and funding efficiency.',
    },
    {
      icon: <Globe size={20} className="text-blue-600" />,
      title: 'Exposure & Concentration',
      desc: 'Identify lender concentration, instrument clustering, and structural risk.',
    },
  ];
  return (
    <section className="py-20 bg-slate-50/70">
      <div className="page-container">
        <h2 className="text-2xl font-bold text-slate-900 text-center mb-12">Key Areas of Visibility</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {areas.map(area => (
            <div key={area.title} className="card card-hover p-6">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
                {area.icon}
              </div>
              <h3 className="text-sm font-semibold text-slate-900 mb-2">{area.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{area.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// --- Section: How Insight Is Presented ---
function HowInsightSection() {
  return (
    <section className="py-20 bg-white">
      <div className="page-container">
        <h2 className="text-2xl font-bold text-slate-900 text-center mb-4">How Insight Is Presented</h2>
        <p className="text-sm text-slate-500 text-center max-w-2xl mx-auto mb-10 leading-relaxed">
          Insights are delivered in clear, structured language supported by quantitative metrics. Each recommendation
          is directly traceable to underlying data — ensuring transparency, auditability, and executive confidence.
        </p>
        {/* Example insight card */}
        <div className="max-w-2xl mx-auto">
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-blue-700">Example Insight</span>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">
              Your organisation maintains <strong>₹2,310 Cr</strong> in borrowings across 8 lenders —
              with 54% long-term exposure and moderate refinancing concentration. Interest rate volatility
              increased 0.8% QoQ, suggesting a review of floating-rate exposure.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// --- Section: Enterprise ---
function EnterpriseSection() {
  const cards = [
    {
      icon: <Database size={20} className="text-blue-600" />,
      title: 'Seamless Integration',
      desc: 'Works alongside SAP, ERP, and banking systems without altering core workflows.',
    },
    {
      icon: <Zap size={20} className="text-blue-600" />,
      title: 'Flexible Connectivity',
      desc: 'Supports structured uploads and secure integration with treasury systems.',
    },
    {
      icon: <Shield size={20} className="text-blue-600" />,
      title: 'Enterprise Security',
      desc: 'Built with role-based access, data isolation, and audit-friendly controls.',
    },
  ];
  return (
    <section className="py-20 bg-slate-50/70">
      <div className="page-container">
        <h2 className="text-2xl font-bold text-slate-900 text-center mb-12">
          Designed for Enterprise Treasury Environments
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {cards.map(card => (
            <div key={card.title} className="card card-hover p-6">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
                {card.icon}
              </div>
              <h3 className="text-sm font-semibold text-slate-900 mb-2">{card.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{card.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// --- Section: Who Uses ---
function WhoUsesSection() {
  return (
    <section className="py-20 bg-white">
      <div className="page-container text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Users size={20} className="text-blue-500" />
          <h2 className="text-2xl font-bold text-slate-900">Who Uses Treasury Intelligence</h2>
        </div>
        <p className="text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Built for treasury teams, CFO offices, risk managers, and finance leadership requiring
          structured visibility without operational complexity.
        </p>
      </div>
    </section>
  );
}

// --- Section: How It Works ---
function HowItWorksSection() {
  const steps = [
    {
      step: '01',
      icon: <Upload size={22} className="text-blue-600" />,
      title: 'Upload Your Data',
      desc: 'Import your Excel file with treasury transactions.',
    },
    {
      step: '02',
      icon: <Activity size={22} className="text-blue-600" />,
      title: 'AI Classification',
      desc: 'Transactions are categorised and structured automatically.',
    },
    {
      step: '03',
      icon: <LayoutDashboard size={22} className="text-blue-600" />,
      title: 'Interactive Dashboard',
      desc: 'Explore insights across borrowings, cash flow, and exposure.',
    },
  ];
  return (
    <section className="py-20 bg-slate-50/70">
      <div className="page-container">
        <h2 className="text-2xl font-bold text-slate-900 text-center mb-2">How It Works</h2>
        <p className="text-sm text-slate-500 text-center mb-12">Get started in three simple steps</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-3xl mx-auto">
          {steps.map((step, i) => (
            <div key={step.title} className="card card-hover p-6 relative">
              <div className="flex items-start justify-between mb-4">
                <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center">
                  {step.icon}
                </div>
                <span className="text-2xl font-bold text-slate-100" style={{ fontWeight: 800 }}>{step.step}</span>
              </div>
              <h3 className="text-sm font-semibold text-slate-900 mb-2">{step.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{step.desc}</p>
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-1/2 -right-3 z-10">
                  <ChevronRight size={16} className="text-slate-300" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// --- CTA Banner ---
function CtaBanner() {
  const { navigateTo } = useApp();
  return (
    <section className="py-16 bg-slate-900">
      <div className="page-container">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Ready to analyse your treasury data?</h2>
            <p className="text-slate-400 text-sm">Upload your file and get instant insights</p>
          </div>
          <button
            onClick={() => navigateTo('upload')}
            className="flex-shrink-0 flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-blue-500 transition-colors cursor-pointer"
          >
            <Upload size={16} />
            Upload Your File
          </button>
        </div>
      </div>
    </section>
  );
}

// --- Footer ---
function Footer() {
  return (
    <footer className="py-8 bg-slate-900 border-t border-slate-800">
      <div className="page-container">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 28 28" fill="none" aria-hidden="true">
              <rect width="28" height="28" rx="7" fill="#2563eb"/>
              <rect x="6" y="17" width="4" height="5" rx="1" fill="white" opacity="0.7"/>
              <rect x="12" y="13" width="4" height="9" rx="1" fill="white" opacity="0.85"/>
              <rect x="18" y="8" width="4" height="14" rx="1" fill="white"/>
            </svg>
            <span className="text-xs text-slate-400">Treasury Intelligence</span>
          </div>
          <p className="text-xs text-slate-600">Enterprise Treasury Analytics Platform</p>
        </div>
      </div>
    </footer>
  );
}

// --- Main Landing Page ---
export function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <LandingHeader />
      <HeroSection />
      <WhatItDoesSection />
      <WhyNeededSection />
      <KeyAreasSection />
      <HowInsightSection />
      <EnterpriseSection />
      <WhoUsesSection />
      <HowItWorksSection />
      <CtaBanner />
      <Footer />
    </div>
  );
}

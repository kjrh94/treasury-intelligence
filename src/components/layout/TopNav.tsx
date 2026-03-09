import { LogOut, User } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ComingSoonBadge } from '../ui/EmptyState';
import type { MainModule } from '../../types';

const Logo = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect width="28" height="28" rx="7" fill="#2563eb"/>
    <rect x="6" y="17" width="4" height="5" rx="1" fill="white" opacity="0.7"/>
    <rect x="12" y="13" width="4" height="9" rx="1" fill="white" opacity="0.85"/>
    <rect x="18" y="8" width="4" height="14" rx="1" fill="white"/>
    <path d="M7 15 L14 10 L21 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
  </svg>
);

const navItems: { key: MainModule; label: string; comingSoon?: boolean }[] = [
  { key: 'borrowings', label: 'Borrowings' },
  { key: 'investments', label: 'Investments', comingSoon: true },
  { key: 'foreign-debt', label: 'Foreign Debt', comingSoon: true },
];

export function TopNav() {
  const { activeModule, setActiveModule, navigateTo } = useApp();

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="page-container">
        <div className="flex items-center h-14">
          {/* Logo */}
          <div className="flex items-center gap-2.5 mr-8">
            <Logo />
            <span className="text-sm font-700 text-slate-900" style={{ fontWeight: 700 }}>
              Treasury Intelligence
            </span>
          </div>

          {/* Main Nav */}
          <nav className="flex items-center gap-1 flex-1" aria-label="Main navigation">
            {navItems.map(item => (
              <button
                key={item.key}
                onClick={() => !item.comingSoon && setActiveModule(item.key)}
                disabled={item.comingSoon}
                className={`
                  flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-150 cursor-pointer
                  ${activeModule === item.key
                    ? 'text-blue-600 bg-blue-50'
                    : item.comingSoon
                    ? 'text-slate-400 cursor-not-allowed'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-gray-50'
                  }
                `}
              >
                {item.label}
                {item.comingSoon && <ComingSoonBadge />}
              </button>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <button
              className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors cursor-pointer"
              aria-label="User profile"
            >
              <User size={15} />
            </button>
            <button
              onClick={() => navigateTo('landing')}
              className="btn-ghost text-slate-600 text-xs"
              aria-label="Logout"
            >
              <LogOut size={14} />
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

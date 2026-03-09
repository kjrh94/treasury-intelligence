import { TopNav } from '../components/layout/TopNav';
import { SecondaryNav } from '../components/layout/SecondaryNav';
import { useApp } from '../context/AppContext';
import { PortfolioTab } from './tabs/PortfolioTab';
import { ExpenseTrackingTab } from './tabs/ExpenseTrackingTab';
import { RepaymentsTab } from './tabs/RepaymentsTab';
import { EmptyState } from '../components/ui/EmptyState';
import { LayoutDashboard } from 'lucide-react';

function BorrowingsContent() {
  const { activeBorrowingsTab } = useApp();

  return (
    <div
      key={activeBorrowingsTab}
      className="animate-fade-in"
    >
      {activeBorrowingsTab === 'portfolio' && <PortfolioTab />}
      {activeBorrowingsTab === 'expense-tracking' && <ExpenseTrackingTab />}
      {activeBorrowingsTab === 'repayments' && <RepaymentsTab />}
    </div>
  );
}

export function AppShell() {
  const { activeModule } = useApp();

  return (
    <div className="min-h-screen bg-slate-50">
      <TopNav />
      {activeModule === 'borrowings' && <SecondaryNav />}

      <main className="page-container py-6">
        {activeModule === 'borrowings' ? (
          <BorrowingsContent />
        ) : (
          <div className="card mt-8">
            <EmptyState
              icon={<LayoutDashboard size={24} />}
              title="Coming Soon"
              description={`The ${activeModule === 'investments' ? 'Investments' : 'Foreign Debt'} module is currently under development and will be available in an upcoming release.`}
            />
          </div>
        )}
      </main>
    </div>
  );
}

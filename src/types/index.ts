export type UploadState =
  | 'idle'
  | 'drag-over'
  | 'selected'
  | 'validating'
  | 'parsing'
  | 'success'
  | 'error-type'
  | 'error-size'
  | 'error-unreadable'
  | 'error-missing-sheets';

export interface UploadedFile {
  name: string;
  size: number;
  uploadedAt: string;
  status: 'success';
}

export type BorrowingsTab = 'portfolio' | 'expense-tracking' | 'repayments';
export type MainModule = 'borrowings' | 'investments' | 'foreign-debt';
export type AppPage = 'landing' | 'upload' | 'upload-success' | 'data-quality' | 'app';

export interface AppState {
  page: AppPage;
  uploadedFile: UploadedFile | null;
  activeModule: MainModule;
  activeBorrowingsTab: BorrowingsTab;
  period: string;
}

// ---------------------------------------------------------------------------
// Parsed data shapes — mirror exactly what mockData.ts exports so charts
// can switch from mock → real without changing chart components.
// ---------------------------------------------------------------------------

/** One data point in the quarter-on-quarter portfolio movement stacked bar. */
export interface PortfolioMovementPoint {
  quarter: string;
  [productName: string]: string | number;
}

/** One lender's total outstanding exposure. */
export interface LenderExposurePoint {
  name: string;
  value: number; // Cr
}

/** Long-term vs Short-term split per quarter. */
export interface LtStDebtPoint {
  quarter: string;
  'Long-Term Debt': number;
  'Short-Term Debt': number;
}

/** Average tenure in days per product type. */
export interface TenureByProductPoint {
  name: string;
  value: number; // days
}

/** Cost of funds percentage per quarter. */
export interface CostOfFundsPoint {
  quarter: string;
  value: number; // %
}

/** Total fees per quarter. */
export interface FeesOverTimePoint {
  quarter: string;
  fees: number; // Cr
}

/** Per-product interest rate per quarter (scatter series). */
export interface ProductRatePoint {
  quarter: string;
  [productName: string]: string | number;
}

/** Principal + interest obligation per time bucket. */
export interface RepaymentSchedulePoint {
  bucket: string;
  principal: number; // Cr
  interest: number;  // Cr
}

/** Upcoming repayments (short-horizon buckets). */
export interface UpcomingRepaymentPoint {
  bucket: string;
  value: number; // Cr
}

/** Aggregated KPIs derived from the uploaded file. */
export interface PortfolioKpis {
  avgTenureYears: number;
  totalOutstandingCr: number;
  activeLoans: number;
}

export interface ExpenseKpis {
  totalFeesCr: number;
  highestFeeBank: string;
  highestFeeBankCr: number;
}

export interface RepaymentKpis {
  dueWeekCr: number;
  dueMonthCr: number;
  dueQuarterCr: number;
  dueYearCr: number;
  liquidityCoverageRatio: number;
}

/** Top-level container for all data derived from one uploaded workbook. */
export interface ParsedData {
  // Portfolio tab
  portfolioMovementData: PortfolioMovementPoint[];
  lenderExposureData: LenderExposurePoint[];
  ltStDebtData: LtStDebtPoint[];
  tenureByProductData: TenureByProductPoint[];
  portfolioKpis: PortfolioKpis;

  // Expense tracking tab
  costOfFundsData: CostOfFundsPoint[];
  feesOverTimeData: FeesOverTimePoint[];
  productRateData: ProductRatePoint[];
  expenseKpis: ExpenseKpis;

  // Repayments tab
  repaymentScheduleData: RepaymentSchedulePoint[];
  upcomingRepaymentsData: UpcomingRepaymentPoint[];
  repaymentKpis: RepaymentKpis;
}

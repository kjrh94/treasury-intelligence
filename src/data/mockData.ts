// Portfolio tab mock data
export const portfolioMovementData = [
  {
    quarter: '2025 Q1',
    'Market Linked Debentures': 280,
    'NCD (Special Cases)': 150,
    'Non-Convertible Debentures': 320,
    'Par-Premium Debentures': 90,
    'TREPs (Borrowing)': 60,
    'Working Capital': 40,
  },
  {
    quarter: '2025 Q2',
    'Market Linked Debentures': 310,
    'NCD (Special Cases)': 180,
    'Non-Convertible Debentures': 360,
    'Par-Premium Debentures': 110,
    'TREPs (Borrowing)': 80,
    'Working Capital': 55,
  },
  {
    quarter: '2025 Q3',
    'Market Linked Debentures': 350,
    'NCD (Special Cases)': 210,
    'Non-Convertible Debentures': 420,
    'Par-Premium Debentures': 130,
    'TREPs (Borrowing)': 95,
    'Working Capital': 70,
  },
  {
    quarter: '2025 Q4',
    'Market Linked Debentures': 390,
    'NCD (Special Cases)': 240,
    'Non-Convertible Debentures': 480,
    'Par-Premium Debentures': 155,
    'TREPs (Borrowing)': 110,
    'Working Capital': 85,
  },
  {
    quarter: '2026 Q1',
    'Market Linked Debentures': 420,
    'NCD (Special Cases)': 260,
    'Non-Convertible Debentures': 510,
    'Par-Premium Debentures': 170,
    'TREPs (Borrowing)': 125,
    'Working Capital': 95,
  },
];

export const portfolioColors = [
  '#22c55e', '#ef4444', '#3b82f6', '#f59e0b',
  '#ec4899', '#8b5cf6', '#06b6d4',
];

export const lenderExposureData = [
  { name: 'IDFC First Bank', value: 480 },
  { name: 'IDBI Bank', value: 420 },
  { name: 'ICICI Bank', value: 400 },
  { name: 'HDFC Bank', value: 390 },
  { name: 'Punjab National Bank', value: 370 },
  { name: 'IndusInd Bank', value: 280 },
  { name: 'Canara Bank', value: 240 },
  { name: 'Bank of Baroda', value: 220 },
  { name: 'RBL Bank', value: 180 },
  { name: 'Yes Bank', value: 150 },
];

export const ltStDebtData = [
  { quarter: '2025 Q1', 'Long-Term Debt': 180, 'Short-Term Debt': 40 },
  { quarter: '2025 Q2', 'Long-Term Debt': 620, 'Short-Term Debt': 85 },
  { quarter: '2025 Q3', 'Long-Term Debt': 1100, 'Short-Term Debt': 140 },
  { quarter: '2025 Q4', 'Long-Term Debt': 1800, 'Short-Term Debt': 210 },
  { quarter: '2026 Q1', 'Long-Term Debt': 2100, 'Short-Term Debt': 190 },
];

export const tenureByProductData = [
  { name: 'Non-Convertible Debentures', value: 285 },
  { name: 'NCD - Instalment Repay', value: 210 },
  { name: 'TREPs (Borrowing)', value: 195 },
  { name: 'Term Loans', value: 145 },
  { name: 'ZCD (earmarking Bank Limits)', value: 82 },
];

// Expense Tracking tab mock data
export const costOfFundsData = [
  { quarter: '2025 Q1', value: 8.2 },
  { quarter: '2025 Q2', value: 8.6 },
  { quarter: '2025 Q3', value: 9.1 },
  { quarter: '2025 Q4', value: 9.4 },
  { quarter: '2025 Q1 (prev)', value: 9.0 },
  { quarter: '2026 Q1', value: 9.8 },
];

export const feesOverTimeData = [
  { quarter: '2025 Q1', fees: 42 },
  { quarter: '2025 Q2', fees: 51 },
  { quarter: '2025 Q3', fees: 48 },
  { quarter: '2025 Q4', fees: 63 },
  { quarter: '2026 Q1', fees: 58 },
];

export const productRateData = [
  {
    quarter: '2025 Q1',
    'Tier II Debentures': 12.25,
    'NCD (Special Cases)': 10.8,
    'Term Loans': 9.5,
    'TREPs (Borrowing)': 8.1,
    'Loan: ECB - INR': 7.85,
  },
  {
    quarter: '2025 Q2',
    'Tier II Debentures': 12.40,
    'NCD (Special Cases)': 11.0,
    'Term Loans': 9.7,
    'TREPs (Borrowing)': 8.3,
    'Loan: ECB - INR': 8.0,
  },
  {
    quarter: '2025 Q3',
    'Tier II Debentures': 12.55,
    'NCD (Special Cases)': 11.2,
    'Term Loans': 10.0,
    'TREPs (Borrowing)': 8.5,
    'Loan: ECB - INR': 8.1,
  },
  {
    quarter: '2025 Q4',
    'Tier II Debentures': 12.60,
    'NCD (Special Cases)': 11.4,
    'Term Loans': 10.2,
    'TREPs (Borrowing)': 8.7,
    'Loan: ECB - INR': 8.15,
  },
  {
    quarter: '2026 Q1',
    'Tier II Debentures': 12.75,
    'NCD (Special Cases)': 11.6,
    'Term Loans': 10.4,
    'TREPs (Borrowing)': 8.9,
    'Loan: ECB - INR': 8.2,
  },
];

export const productRateColors = ['#ef4444', '#f59e0b', '#3b82f6', '#22c55e', '#8b5cf6'];

// Repayments tab mock data
export const repaymentScheduleData = [
  { bucket: '1-7 days', principal: 650, interest: 85 },
  { bucket: '8-14 days', principal: 420, interest: 60 },
  { bucket: '15d-1mo', principal: 980, interest: 130 },
  { bucket: '1-3 mo', principal: 1400, interest: 180 },
  { bucket: '3-6 mo', principal: 2200, interest: 290 },
  { bucket: '6m-1yr', principal: 3100, interest: 410 },
  { bucket: '1-3 yrs', principal: 8500, interest: 1100 },
  { bucket: '3-5 yrs', principal: 12000, interest: 1600 },
  { bucket: '5+ yrs', principal: 6800, interest: 900 },
];

export const upcomingRepaymentsData = [
  { bucket: '1-7 days', value: 3314 },
  { bucket: '8-14 days', value: 1850 },
  { bucket: '15d-1mo', value: 6549 },
];

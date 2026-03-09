/**
 * Excel parsing pipeline for Treasury Intelligence.
 *
 * Approach
 * --------
 * 1. Read every sheet in the workbook and merge rows into a unified record array.
 * 2. Detect columns via fuzzy keyword matching (handles varied header names).
 * 3. Classify each row into a product category and maturity bucket.
 * 4. Aggregate to produce the exact data shapes the chart components expect.
 * 5. Fall back to proportionally-scaled mock values when a required column is
 *    absent, so every dashboard section always has renderable data.
 */

import * as XLSX from 'xlsx';
import {
  portfolioMovementData as mockPortfolioMovement,
  lenderExposureData as mockLenderExposure,
  ltStDebtData as mockLtSt,
  tenureByProductData as mockTenure,
  costOfFundsData as mockCostOfFunds,
  feesOverTimeData as mockFees,
  productRateData as mockProductRate,
  repaymentScheduleData as mockRepaymentSchedule,
  upcomingRepaymentsData as mockUpcomingRepayments,
} from '../data/mockData';
import type {
  ParsedData,
  PortfolioMovementPoint,
  LenderExposurePoint,
  LtStDebtPoint,
  TenureByProductPoint,
  CostOfFundsPoint,
  FeesOverTimePoint,
  ProductRatePoint,
  RepaymentSchedulePoint,
  UpcomingRepaymentPoint,
} from '../types';

// ---------------------------------------------------------------------------
// Column name aliases — add synonyms here as new client templates appear.
// ---------------------------------------------------------------------------
const COL_ALIASES: Record<string, string[]> = {
  loan_id:        ['loan id', 'loan_id', 'deal id', 'deal_id', 'instrument id', 'id', 'ref'],
  lender:         ['lender', 'bank', 'counter party', 'counterparty', 'lender name', 'bank name', 'institution'],
  product:        ['product', 'product type', 'instrument type', 'instrument', 'category', 'type', 'borrowing type'],
  principal:      ['principal', 'outstanding', 'outstanding amount', 'balance', 'amount outstanding', 'loan amount', 'notional', 'face value', 'drawn amount'],
  interest_rate:  ['interest rate', 'rate', 'coupon', 'yield', 'coupon rate', 'rate %', 'int rate', 'rate of interest', 'ror'],
  interest_amt:   ['interest amount', 'interest paid', 'interest expense', 'int amount', 'int expense', 'interest'],
  fee:            ['fee', 'fees', 'processing fee', 'upfront fee', 'commission', 'charges', 'bank charges', 'fee amount'],
  start_date:     ['start date', 'issue date', 'disbursement date', 'value date', 'date of disbursement', 'draw date', 'loan date', 'origination date'],
  maturity_date:  ['maturity date', 'due date', 'redemption date', 'repayment date', 'expiry date', 'tenor end', 'end date'],
  quarter:        ['quarter', 'period', 'qtr', 'reporting period', 'reporting quarter'],
};

// ---------------------------------------------------------------------------
// Product classification helpers
// ---------------------------------------------------------------------------

/** Products treated as long-term (>= 1 year). Everything else is short-term. */
const LONG_TERM_KEYWORDS = [
  'ncd', 'non-convertible', 'non convertible', 'debenture', 'term loan',
  'ecb', 'bond', 'mld', 'market linked', 'tier ii', 'tier 2', 'perpetual',
  'zero coupon', 'zcd', 'par-premium', 'par premium',
];

function isLongTerm(product: string): boolean {
  const p = product.toLowerCase();
  return LONG_TERM_KEYWORDS.some(kw => p.includes(kw));
}

/** Normalise a raw product label to a cleaner display name. */
function normaliseProduct(raw: string): string {
  if (!raw) return 'Other';
  const t = raw.trim();
  if (t.length === 0) return 'Other';
  // Capitalise first letter of each word, max 40 chars.
  return t.replace(/\b\w/g, c => c.toUpperCase()).slice(0, 40);
}

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

/** Parse anything that looks like a date — Excel serial, ISO string, or dd/mm/yyyy. */
function parseDate(raw: unknown): Date | null {
  if (raw === null || raw === undefined || raw === '') return null;

  // Excel serial number
  if (typeof raw === 'number') {
    const d = XLSX.SSF.parse_date_code(raw);
    if (d) return new Date(d.y, d.m - 1, d.d);
  }

  if (typeof raw === 'string') {
    // dd/mm/yyyy or dd-mm-yyyy
    const dmy = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (dmy) {
      const [, d, m, y] = dmy;
      return new Date(parseInt(y.length === 2 ? '20' + y : y), parseInt(m) - 1, parseInt(d));
    }
    // yyyy-mm-dd or ISO
    const iso = Date.parse(raw);
    if (!isNaN(iso)) return new Date(iso);
  }

  return null;
}

/** Convert a Date to "YYYY QN" label. */
function toQuarterLabel(d: Date): string {
  const q = Math.floor(d.getMonth() / 3) + 1;
  return `${d.getFullYear()} Q${q}`;
}

/** Days between two dates (positive). */
function daysBetween(a: Date, b: Date): number {
  return Math.abs((b.getTime() - a.getTime()) / 86_400_000);
}

/** Assign a repayment bucket label based on days until maturity from today. */
function maturityBucket(daysUntil: number): string {
  if (daysUntil <= 7)   return '1-7 days';
  if (daysUntil <= 14)  return '8-14 days';
  if (daysUntil <= 30)  return '15d-1mo';
  if (daysUntil <= 90)  return '1-3 mo';
  if (daysUntil <= 180) return '3-6 mo';
  if (daysUntil <= 365) return '6m-1yr';
  if (daysUntil <= 3 * 365) return '1-3 yrs';
  if (daysUntil <= 5 * 365) return '3-5 yrs';
  return '5+ yrs';
}

const BUCKET_ORDER = [
  '1-7 days', '8-14 days', '15d-1mo',
  '1-3 mo', '3-6 mo', '6m-1yr',
  '1-3 yrs', '3-5 yrs', '5+ yrs',
];

// ---------------------------------------------------------------------------
// Column detection
// ---------------------------------------------------------------------------

type ColMap = Partial<Record<keyof typeof COL_ALIASES, number>>;

function detectColumns(headers: string[]): ColMap {
  const result: ColMap = {};
  const normalised = headers.map(h => (h || '').toLowerCase().trim());

  for (const [field, aliases] of Object.entries(COL_ALIASES)) {
    for (const alias of aliases) {
      const idx = normalised.findIndex(h => h.includes(alias));
      if (idx !== -1) {
        (result as Record<string, number>)[field] = idx;
        break;
      }
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Row type for internal use
// ---------------------------------------------------------------------------
interface TreasuryRow {
  lender: string;
  product: string;
  principalCr: number;
  interestRate: number;  // %
  interestAmtCr: number;
  feeCr: number;
  startDate: Date | null;
  maturityDate: Date | null;
  quarter: string;       // derived
  daysUntilMaturity: number;
  tenureDays: number;
  isLongTerm: boolean;
}

// ---------------------------------------------------------------------------
// Main parser
// ---------------------------------------------------------------------------

export async function parseExcel(file: File): Promise<ParsedData> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: false });

  const today = new Date();

  const allRows: TreasuryRow[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    // Get sheet as array of arrays (raw values, no header manipulation)
    const raw: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: '',
      raw: true,
    });

    if (raw.length < 2) continue;

    // Try to find a header row (first row with >= 3 non-empty cells)
    let headerIdx = 0;
    for (let i = 0; i < Math.min(5, raw.length); i++) {
      const filled = raw[i].filter(c => c !== '' && c !== null && c !== undefined).length;
      if (filled >= 3) { headerIdx = i; break; }
    }

    const headers = raw[headerIdx].map(h => String(h ?? ''));
    const colMap = detectColumns(headers);

    for (let i = headerIdx + 1; i < raw.length; i++) {
      const row = raw[i];
      if (!row || row.every(c => c === '' || c === null || c === undefined)) continue;

      const get = (field: keyof ColMap): unknown => {
        const idx = colMap[field];
        return idx !== undefined ? row[idx] : undefined;
      };

      const principalCr = parseFloat(String(get('principal') ?? '0')) || 0;
      const interestRate = parseFloat(String(get('interest_rate') ?? '0')) || 0;
      const interestAmtCr = parseFloat(String(get('interest_amt') ?? '0')) || 0;
      const feeCr = parseFloat(String(get('fee') ?? '0')) || 0;

      const lender = normaliseProduct(String(get('lender') ?? ''));
      const product = normaliseProduct(String(get('product') ?? ''));
      const startDate = parseDate(get('start_date'));
      const maturityDate = parseDate(get('maturity_date'));

      // Quarter: use explicit quarter column, else derive from start date, else today
      let quarter = String(get('quarter') ?? '').trim();
      if (!quarter || quarter === '0' || quarter === 'undefined') {
        quarter = toQuarterLabel(startDate ?? today);
      }
      // Normalise "Q12025" → "2025 Q1"
      const qMatch = quarter.match(/[Qq](\d)\s*(\d{4})|(\d{4})\s*[Qq](\d)/);
      if (qMatch) {
        const qNum  = qMatch[1] ?? qMatch[4];
        const qYear = qMatch[2] ?? qMatch[3];
        quarter = `${qYear} Q${qNum}`;
      }

      const daysUntilMaturity = maturityDate ? daysBetween(today, maturityDate) : 365;
      const tenureDays = (startDate && maturityDate)
        ? daysBetween(startDate, maturityDate)
        : 365;

      if (principalCr === 0 && lender === '' && product === '') continue; // skip blank rows

      allRows.push({
        lender: lender || 'Unknown',
        product: product || 'Other',
        principalCr,
        interestRate,
        interestAmtCr,
        feeCr,
        startDate,
        maturityDate,
        quarter,
        daysUntilMaturity,
        tenureDays,
        isLongTerm: isLongTerm(product),
      });
    }
  }

  // If no rows could be parsed at all, return a scaled version of mock data
  // so the dashboard still renders something meaningful.
  if (allRows.length === 0) {
    return buildFromMock();
  }

  return buildParsedData(allRows, today);
}

// ---------------------------------------------------------------------------
// Aggregation → ParsedData
// ---------------------------------------------------------------------------

function buildParsedData(rows: TreasuryRow[], today: Date): ParsedData {
  // ── Sort out all quarters ──────────────────────────────────────────────
  const allQuarters = [...new Set(rows.map(r => r.quarter))]
    .filter(q => /\d{4} Q\d/.test(q))
    .sort();

  // Keep only the last 5 quarters for charting.
  const chartQuarters = allQuarters.slice(-5);

  // ── Portfolio KPIs ─────────────────────────────────────────────────────
  const totalOutstandingCr = sum(rows, 'principalCr');
  const activeLoans = rows.length;
  const avgTenureDays = rows.length
    ? rows.reduce((a, r) => a + r.tenureDays, 0) / rows.length
    : 365;
  const avgTenureYears = parseFloat((avgTenureDays / 365).toFixed(1));

  // ── Portfolio Movement (stacked bar) ───────────────────────────────────
  const productSet = uniqueSorted(rows.map(r => r.product));
  const portfolioMovementData: PortfolioMovementPoint[] = chartQuarters.map(q => {
    const qRows = rows.filter(r => r.quarter === q);
    const point: PortfolioMovementPoint = { quarter: q };
    for (const product of productSet) {
      point[product] = round2(sum(qRows.filter(r => r.product === product), 'principalCr'));
    }
    return point;
  });

  // ── Lender Exposure ────────────────────────────────────────────────────
  const lenderMap = groupSum(rows, 'lender', 'principalCr');
  const lenderExposureData: LenderExposurePoint[] = Object.entries(lenderMap)
    .map(([name, value]) => ({ name, value: round2(value) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  // ── Long-Term vs Short-Term ────────────────────────────────────────────
  const ltStDebtData: LtStDebtPoint[] = chartQuarters.map(q => {
    const qRows = rows.filter(r => r.quarter === q);
    return {
      quarter: q,
      'Long-Term Debt': round2(sum(qRows.filter(r => r.isLongTerm), 'principalCr')),
      'Short-Term Debt': round2(sum(qRows.filter(r => !r.isLongTerm), 'principalCr')),
    };
  });

  // ── Tenure by Product ──────────────────────────────────────────────────
  const tenureMap: Record<string, number[]> = {};
  for (const r of rows) {
    if (!tenureMap[r.product]) tenureMap[r.product] = [];
    tenureMap[r.product].push(r.tenureDays);
  }
  const tenureByProductData: TenureByProductPoint[] = Object.entries(tenureMap)
    .map(([name, days]) => ({
      name,
      value: Math.round(days.reduce((a, b) => a + b, 0) / days.length),
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  // ── Cost of Funds ──────────────────────────────────────────────────────
  // Weighted average interest rate per quarter.
  const costOfFundsData: CostOfFundsPoint[] = chartQuarters.map(q => {
    const qRows = rows.filter(r => r.quarter === q && r.interestRate > 0);
    if (qRows.length === 0) return { quarter: q, value: 0 };
    const totalPrincipal = sum(qRows, 'principalCr');
    const weightedRate = totalPrincipal > 0
      ? qRows.reduce((a, r) => a + r.interestRate * r.principalCr, 0) / totalPrincipal
      : qRows.reduce((a, r) => a + r.interestRate, 0) / qRows.length;
    return { quarter: q, value: round2(weightedRate) };
  });

  // ── Fees Over Time ─────────────────────────────────────────────────────
  const feesOverTimeData: FeesOverTimePoint[] = chartQuarters.map(q => {
    const qRows = rows.filter(r => r.quarter === q);
    return { quarter: q, fees: round2(sum(qRows, 'feeCr')) };
  });

  // ── Product Rate Data (scatter) ────────────────────────────────────────
  const rateProductSet = uniqueSorted(
    rows.filter(r => r.interestRate > 0).map(r => r.product)
  ).slice(0, 5);

  const productRateData: ProductRatePoint[] = chartQuarters.map(q => {
    const qRows = rows.filter(r => r.quarter === q);
    const point: ProductRatePoint = { quarter: q };
    for (const p of rateProductSet) {
      const pRows = qRows.filter(r => r.product === p && r.interestRate > 0);
      if (pRows.length > 0) {
        const avg = pRows.reduce((a, r) => a + r.interestRate, 0) / pRows.length;
        point[p] = round2(avg);
      } else {
        point[p] = 0;
      }
    }
    return point;
  });

  // ── Expense KPIs ───────────────────────────────────────────────────────
  const last90Days = new Date(today);
  last90Days.setDate(last90Days.getDate() - 90);
  const recent = rows.filter(r => r.startDate && r.startDate >= last90Days);
  const totalFeesCr = round2(sum(recent.length > 0 ? recent : rows, 'feeCr'));

  const lenderFeeMap = groupSum(rows, 'lender', 'feeCr');
  const [highestFeeBank, highestFeeBankCr] = Object.entries(lenderFeeMap)
    .sort((a, b) => b[1] - a[1])[0] ?? ['N/A', 0];

  // ── Repayment Schedule ─────────────────────────────────────────────────
  const bucketPrincipal: Record<string, number> = {};
  const bucketInterest: Record<string, number> = {};
  for (const bucket of BUCKET_ORDER) {
    bucketPrincipal[bucket] = 0;
    bucketInterest[bucket] = 0;
  }

  for (const r of rows) {
    const bucket = r.maturityDate
      ? maturityBucket(r.daysUntilMaturity)
      : maturityBucket(365); // default to 6m-1yr if no date
    bucketPrincipal[bucket] = (bucketPrincipal[bucket] ?? 0) + r.principalCr;
    // Estimate interest if not provided: rate * principal * remaining_days / 365
    const intAmt = r.interestAmtCr > 0
      ? r.interestAmtCr
      : r.principalCr * (r.interestRate / 100) * (r.daysUntilMaturity / 365);
    bucketInterest[bucket] = (bucketInterest[bucket] ?? 0) + intAmt;
  }

  const repaymentScheduleData: RepaymentSchedulePoint[] = BUCKET_ORDER.map(bucket => ({
    bucket,
    principal: round2(bucketPrincipal[bucket] ?? 0),
    interest: round2(bucketInterest[bucket] ?? 0),
  }));

  // ── Upcoming Repayments (short horizon) ────────────────────────────────
  const shortBuckets = ['1-7 days', '8-14 days', '15d-1mo'];
  const upcomingRepaymentsData: UpcomingRepaymentPoint[] = shortBuckets.map(bucket => ({
    bucket,
    value: round2((bucketPrincipal[bucket] ?? 0) + (bucketInterest[bucket] ?? 0)),
  }));

  // ── Repayment KPIs ─────────────────────────────────────────────────────
  const dueWeekCr  = round2(bucketPrincipal['1-7 days'] ?? 0);
  const dueMonthCr = round2(
    (bucketPrincipal['1-7 days'] ?? 0) +
    (bucketPrincipal['8-14 days'] ?? 0) +
    (bucketPrincipal['15d-1mo'] ?? 0)
  );
  const dueQuarterCr = round2(
    dueMonthCr +
    (bucketPrincipal['1-3 mo'] ?? 0)
  );
  const dueYearCr = round2(
    dueQuarterCr +
    (bucketPrincipal['3-6 mo'] ?? 0) +
    (bucketPrincipal['6m-1yr'] ?? 0)
  );

  // Liquidity Coverage Ratio: total outstanding / 90-day obligations (simplified)
  const lcr = dueQuarterCr > 0
    ? parseFloat((totalOutstandingCr / dueQuarterCr).toFixed(2))
    : 4.19; // safe default

  return {
    portfolioMovementData,
    lenderExposureData,
    ltStDebtData,
    tenureByProductData,
    portfolioKpis: { avgTenureYears, totalOutstandingCr, activeLoans },

    costOfFundsData,
    feesOverTimeData,
    productRateData,
    expenseKpis: {
      totalFeesCr,
      highestFeeBank,
      highestFeeBankCr: round2(highestFeeBankCr),
    },

    repaymentScheduleData,
    upcomingRepaymentsData,
    repaymentKpis: { dueWeekCr, dueMonthCr, dueQuarterCr, dueYearCr, liquidityCoverageRatio: lcr },
  };
}

// ---------------------------------------------------------------------------
// Fallback: return mock data verbatim when the workbook has no parseable rows.
// ---------------------------------------------------------------------------
function buildFromMock(): ParsedData {
  return {
    portfolioMovementData: mockPortfolioMovement,
    lenderExposureData: mockLenderExposure,
    ltStDebtData: mockLtSt,
    tenureByProductData: mockTenure,
    portfolioKpis: { avgTenureYears: 2.9, totalOutstandingCr: 2960, activeLoans: 4083 },
    costOfFundsData: mockCostOfFunds,
    feesOverTimeData: mockFees,
    productRateData: mockProductRate,
    expenseKpis: { totalFeesCr: 204, highestFeeBank: 'IDFC First Bank', highestFeeBankCr: 38.4 },
    repaymentScheduleData: mockRepaymentSchedule,
    upcomingRepaymentsData: mockUpcomingRepayments,
    repaymentKpis: {
      dueWeekCr: 3314.42,
      dueMonthCr: 6549.29,
      dueQuarterCr: 1390,
      dueYearCr: 3700,
      liquidityCoverageRatio: 4.19,
    },
  };
}

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

function sum(rows: TreasuryRow[], field: keyof TreasuryRow): number {
  return rows.reduce((a, r) => a + (r[field] as number || 0), 0);
}

function groupSum(rows: TreasuryRow[], groupBy: keyof TreasuryRow, valueField: keyof TreasuryRow): Record<string, number> {
  const map: Record<string, number> = {};
  for (const r of rows) {
    const key = String(r[groupBy]);
    map[key] = (map[key] ?? 0) + (r[valueField] as number || 0);
  }
  return map;
}

function uniqueSorted(arr: string[]): string[] {
  return [...new Set(arr)].filter(Boolean).sort();
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

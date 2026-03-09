/**
 * ignoreRules.ts — Product type masters and fallback ignore rules
 *
 * Classification is driven PRIMARILY by Prd Type against product type masters.
 * Fallback rules (UpdateType / desc keywords) are used ONLY when Prd Type
 * is missing, not found, or ambiguous.
 *
 * Product Type Masters:
 *   BORROWINGS_PRODUCT_TYPE_CODES — rows to include as Borrowings candidates
 *   INVESTMENTS_PRODUCT_TYPE_CODES — rows to ignore as Investments
 *   FOREX_PRODUCT_TYPE_CODES — rows to ignore as Forex
 *
 * Fallback (secondary evidence only, used when Prd Type is unknown):
 *   FOREX_UPDATE_TYPE_CODES — UpdateType codes signalling Forex activity
 *   FOREX_DESC_KEYWORDS — UpdateType Desc keywords signalling Forex activity
 *   INVESTMENTS_UPDATE_TYPE_CODES — UpdateType codes signalling Investments
 *   INVESTMENTS_DESC_KEYWORDS — UpdateType Desc keywords signalling Investments
 *
 * Raw business values are NEVER modified during matching.
 */

import type { IgnoreCategory } from '../types/workbook';

export interface IgnoreRule {
  id: string;
  category: IgnoreCategory;
  reason: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Product Type Masters — primary grouping classifiers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Prd Type codes that belong to the Borrowings grouping.
 * Rows matching these are Borrowings candidates — never excluded by this check.
 * Extensible: add codes here as new product types are onboarded.
 */
export const BORROWINGS_PRODUCT_TYPE_CODES = new Set<string>([
  // Money Market / Inter-corporate
  'ICD',    // Inter-Corporate Deposits (borrowing leg)
  // Term Loans
  'TL',     // Term Loans
  // Non-Convertible Debentures
  'NCD',
  // Commercial Paper
  'CP',
  // Cash Credit / Overdraft
  'CC',
  'OD',
  // Working Capital Demand Loan
  'WCDL',
  // Bill Discounting
  'BD',
  // Bank Guarantee / Letter of Credit
  'BG',
  'LC',
  // TREPS / Tri-party repos
  'TREP',
  // Bonds (borrowing)
  'BON',
]);

/**
 * Prd Type codes that belong to the Investments grouping.
 * Rows matching these go to IGNORED_EXPLICIT (INVESTMENTS).
 * Extensible: add codes here as new investment product types are identified.
 */
export const INVESTMENTS_PRODUCT_TYPE_CODES = new Set<string>([
  '23A',  // Fixed Deposits
  '23B',  // ICD (Investment leg)
  '21A',  // Mutual Funds
  '21B',  // Mutual Funds - Dividend Reinvestment
  '22A',  // Govt Securities
  '22B',  // Corporate Bonds (investment)
  '22C',  // T-Bill
]);

/**
 * Prd Type codes that belong to the Forex / derivatives grouping.
 * Rows matching these go to IGNORED_EXPLICIT (FOREX).
 */
export const FOREX_PRODUCT_TYPE_CODES = new Set<string>([
  '10L',  // FX Loans: ECB
  '45A',  // Cross-Currency Swap (CCS)
  '45B',  // Interest Rate Swap (IRS)
  '40A',  // Forward
]);

// ─────────────────────────────────────────────────────────────────────────────
// Fallback — Forex (used only when Prd Type is missing / unknown)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * UpdateType codes that indicate Forex / derivative activity.
 * Used ONLY when rawPrdType is absent or not found in any product master.
 */
export const FOREX_UPDATE_TYPE_CODES = new Set<string>([
  'AD1000', 'AD1001', 'AD1018', 'AD1020', 'AD1021', 'AD1022', 'AD1023',
  'AD1024', 'AD1025', 'AD1035', 'AD1036',
  'DBT_B002', 'DBT_B008', 'DBT_B013', 'DBT_B014', 'DBT_B033', 'DBT_B034',
  'DBT_C010', 'DBT_C030',
  'DBT_E002',
  'DE1100-', 'DE1100+',
  'DE1105-', 'DE1105+',
  'DE1115-', 'DE1115+',
  'DE1120-', 'DE1120+',
  'DE1125-', 'DE1125+',
  'DE1200-', 'DE1200+',
  'DE1201-', 'DE1201+',
  'DE1205',  'DE1205+',
  'DE1903-', 'DE1952-',
  'FX1000+', 'FX1100+', 'FX1252',
  'FX2000-', 'FX2100-',
  'MM1105+', 'MM1110-', 'MM1120-', 'MM1121-',
  'MM1200-', 'MM1201-',
  'MM1486-', 'MM1486+',
  'MM1922-', 'MM1930-',
  'OTC001',  'OTC002',
  'V202',    'V203',    'V285',    'V286',
  'V500_OCI', 'V501_OCI',
  'VR202',   'VR203',   'VR285',  'VR286',
  'VR500_OC', 'VR501_OC',
]);

/**
 * UpdateType Desc keywords indicating Forex / derivative activity.
 * Used ONLY as fallback when Prd Type is unknown.
 */
export const FOREX_DESC_KEYWORDS: string[] = [
  'ccs',
  'irs',
  'open otc',
  'nominal amount',
  'swap',
  'forward',
  ' fx ',
  'forex',
  'cross-currency',
  'cross currency',
  'interest rate swap',
];

// ─────────────────────────────────────────────────────────────────────────────
// Fallback — Investments (used only when Prd Type is missing / unknown)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * UpdateType codes that indicate Investments activity.
 * Used ONLY when rawPrdType is absent or not found in any product master.
 * Extend this list as new investment update types are identified.
 */
export const INVESTMENTS_UPDATE_TYPE_CODES = new Set<string>([
  // Add investment-specific update type codes here as identified
]);

/**
 * UpdateType Desc keywords indicating Investments activity.
 * Used ONLY as fallback when Prd Type is unknown.
 */
export const INVESTMENTS_DESC_KEYWORDS: string[] = [
  'fixed deposit',
  'mutual fund',
  'govt security',
  'government security',
  't-bill',
  'treasury bill',
  'corporate bond',
];

// ─────────────────────────────────────────────────────────────────────────────
// Canonical rule objects — stored on each ignored row for audit trail
// ─────────────────────────────────────────────────────────────────────────────

export const INVESTMENT_PRODUCT_TYPE_RULE: IgnoreRule = {
  id: 'IGNORE_INVESTMENT_PRODUCT_TYPE',
  category: 'INVESTMENTS',
  reason: 'Product type code belongs to Investments grouping',
};

export const INVESTMENT_FALLBACK_RULE: IgnoreRule = {
  id: 'IGNORE_INVESTMENT_FALLBACK',
  category: 'INVESTMENTS',
  reason: 'Prd Type unknown; fallback evidence (UpdateType or desc) indicates Investments activity',
};

export const FOREX_PRODUCT_TYPE_RULE: IgnoreRule = {
  id: 'IGNORE_FOREX_PRODUCT_TYPE',
  category: 'FOREX',
  reason: 'Product type code belongs to Forex / derivatives grouping',
};

export const FOREX_FALLBACK_RULE: IgnoreRule = {
  id: 'IGNORE_FOREX_FALLBACK',
  category: 'FOREX',
  reason: 'Prd Type unknown; fallback evidence (UpdateType or desc) indicates Forex / derivative activity',
};

export const VALUATION_RULE: IgnoreRule = {
  id: 'IGNORE_VALUATION',
  category: 'VALUATION',
  reason: 'Prd Type Desc contains "valuation" — mark-to-market accounting entry, not a principal cashflow',
};

export const ZERO_AMOUNT_RULE: IgnoreRule = {
  id: 'IGNORE_ZERO_AMOUNT',
  category: 'ZERO_AMOUNT',
  reason: 'Zero-amount row with no identifying content — excluded as placeholder',
};

// ─────────────────────────────────────────────────────────────────────────────
// Primary product-type-based ignore check
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check rawPrdType against Investments and Forex product masters.
 * Returns the applicable ignore rule, or null if not an exclusion type.
 *
 * Called FIRST in the classifier — before any fallback checks.
 * Uses rawPrdType only (exact match, trimmed).
 */
export function checkProductTypeMasterIgnore(rawPrdType: string): IgnoreRule | null {
  const code = rawPrdType.trim();
  if (!code) return null;

  if (INVESTMENTS_PRODUCT_TYPE_CODES.has(code)) return INVESTMENT_PRODUCT_TYPE_RULE;
  if (FOREX_PRODUCT_TYPE_CODES.has(code)) return FOREX_PRODUCT_TYPE_RULE;

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Fallback ignore check (used only when Prd Type is unknown)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * When rawPrdType is absent or not found in any product master, check secondary
 * evidence to determine if the row clearly belongs to Investments or Forex.
 *
 * Matching order:
 *   1. Investments update type code
 *   2. Investments desc keyword
 *   3. Forex update type code
 *   4. Forex desc keyword
 *   5. Valuation prd type desc keyword
 *
 * Returns the applicable ignore rule, or null if evidence is insufficient.
 * All matching uses RAW values only.
 */
export function checkFallbackIgnore(
  rawUpdateType: string,
  rawPrdTypeDesc: string,
  rawUpdateTypeDesc: string,
): IgnoreRule | null {

  // 1. Investments — update type code
  if (rawUpdateType && INVESTMENTS_UPDATE_TYPE_CODES.has(rawUpdateType.trim())) {
    return INVESTMENT_FALLBACK_RULE;
  }

  // 2. Investments — desc keyword
  if (rawUpdateTypeDesc) {
    const descLower = rawUpdateTypeDesc.toLowerCase();
    if (INVESTMENTS_DESC_KEYWORDS.some(kw => descLower.includes(kw.toLowerCase()))) {
      return INVESTMENT_FALLBACK_RULE;
    }
  }

  // 3. Forex — update type code
  if (rawUpdateType && FOREX_UPDATE_TYPE_CODES.has(rawUpdateType.trim())) {
    return FOREX_FALLBACK_RULE;
  }

  // 4. Forex — desc keyword
  if (rawUpdateTypeDesc) {
    const descLower = rawUpdateTypeDesc.toLowerCase();
    if (FOREX_DESC_KEYWORDS.some(kw => descLower.includes(kw.toLowerCase()))) {
      return FOREX_FALLBACK_RULE;
    }
  }

  // 5. Valuation — prd type desc keyword
  if (rawPrdTypeDesc && rawPrdTypeDesc.toLowerCase().includes('valuation')) {
    return VALUATION_RULE;
  }

  return null;
}

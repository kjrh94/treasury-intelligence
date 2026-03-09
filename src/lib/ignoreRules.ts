/**
 * Ignore rules engine for Treasury Intelligence workbook parsing.
 *
 * Three clean ignore categories:
 *   FOREX       — FX loans, derivatives, swaps, forwards
 *   VALUATION   — mark-to-market / accounting adjustment entries
 *   ZERO_AMOUNT — placeholder rows with no financial value
 *   INVESTMENTS — (reserved for future phase)
 *   OTHER       — catch-all for any additional exclusions
 *
 * Matching priority per row (all using RAW values only):
 *   1. Prd Type code in FOREX_PRODUCT_TYPES        → FOREX
 *   2. UpdateType code in FOREX_UPDATE_TYPES        → FOREX
 *   3. Update Type Desc keyword in FOREX_DESC_KEYWORDS → FOREX
 *   4. Prd Type Desc substring "valuation"          → VALUATION
 *   5. Zero-amount sentinel (programmatic)          → ZERO_AMOUNT
 *
 * Raw business values are NEVER modified during matching.
 */

import type { IgnoreCategory } from '../types/workbook';

export interface IgnoreRule {
  id: string;
  category: IgnoreCategory;
  reason: string;
  // Matching fields — all optional; only defined fields are checked
  updateTypeCode?: string;        // exact match on rawUpdateType
  productTypeCode?: string;       // exact match on rawPrdType
  productTypeDesc?: string;       // substring match on rawPrdTypeDesc (case-insensitive)
  updateTypeDescKeyword?: string; // substring match on rawUpdateTypeDesc (case-insensitive)
}

// ─────────────────────────────────────────────────────────────────────────────
// Forex — product type codes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Prd Type codes that identify Forex / derivative instruments.
 * If a cashflow row's rawPrdType matches any of these, it is Forex-ignored.
 */
export const FOREX_PRODUCT_TYPE_CODES = new Set<string>([
  '10L',  // FX Loans: ECB
  '45A',  // Cross-Currency Swap (CCS)
  '45B',  // Interest Rate Swap (IRS)
  '40A',  // Forward
]);

// ─────────────────────────────────────────────────────────────────────────────
// Forex — update type codes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * UpdateType codes that belong to Forex / derivative activity.
 * If a cashflow row's rawUpdateType matches any of these, it is Forex-ignored.
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

// ─────────────────────────────────────────────────────────────────────────────
// Forex — update type description keywords
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Keywords found in rawUpdateTypeDesc that clearly indicate Forex / derivative
 * activity. Used when Prd Type or Prd Type Desc is absent from Data Foundation.
 * Rows matching any keyword go directly to IGNORED_EXPLICIT (FOREX) — never
 * left in UNMAPPED_REVIEW.
 */
export const FOREX_DESC_KEYWORDS: string[] = [
  'ccs',
  'irs',
  'open otc',
  'nominal amount',
  'accrual',
  'swap',
  'forward',
  ' fx ',     // padded to avoid matching "fx" inside other words
  'forex',
  'cross-currency',
  'cross currency',
  'interest rate swap',
];

// ─────────────────────────────────────────────────────────────────────────────
// Programmatic rule objects (for audit trail on ignored rows)
// ─────────────────────────────────────────────────────────────────────────────

export const FOREX_PRODUCT_TYPE_RULE: IgnoreRule = {
  id: 'IGNORE_FOREX_PRODUCT_TYPE',
  category: 'FOREX',
  reason: 'Product type code identifies this as a Forex / derivative instrument',
};

export const FOREX_UPDATE_TYPE_RULE: IgnoreRule = {
  id: 'IGNORE_FOREX_UPDATE_TYPE',
  category: 'FOREX',
  reason: 'Update type code belongs to Forex / derivative activity',
};

export const FOREX_DESC_KEYWORD_RULE: IgnoreRule = {
  id: 'IGNORE_FOREX_DESC_KEYWORD',
  category: 'FOREX',
  reason: 'Update Type Desc contains keyword indicating Forex / derivative activity',
};

export const VALUATION_RULE: IgnoreRule = {
  id: 'IGNORE_VALUATION',
  category: 'VALUATION',
  reason: 'Valuation / mark-to-market adjustment — accounting entry, not a principal cashflow',
};

export const ZERO_AMOUNT_RULE: IgnoreRule = {
  id: 'IGNORE_ZERO_AMOUNT',
  category: 'ZERO_AMOUNT',
  reason: 'Zero-amount row with no identifying content — excluded as placeholder',
};

// ─────────────────────────────────────────────────────────────────────────────
// Main matching function
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check whether a cashflow row matches any ignore rule.
 * Returns the matching IgnoreRule or null.
 *
 * Priority:
 *   1. Forex prd type code
 *   2. Forex update type code
 *   3. Forex update type desc keyword
 *   4. Valuation prd type desc keyword
 *
 * The ZERO_AMOUNT rule is applied separately in the classifier (programmatic).
 * All matching uses RAW values only.
 */
export function findMatchingIgnoreRule(
  rawUpdateType: string,
  rawPrdType: string,
  rawPrdTypeDesc: string,
  rawUpdateTypeDesc: string,
): IgnoreRule | null {

  // 1. Forex — product type code
  if (rawPrdType && FOREX_PRODUCT_TYPE_CODES.has(rawPrdType.trim())) {
    return FOREX_PRODUCT_TYPE_RULE;
  }

  // 2. Forex — update type code
  if (rawUpdateType && FOREX_UPDATE_TYPE_CODES.has(rawUpdateType.trim())) {
    return FOREX_UPDATE_TYPE_RULE;
  }

  // 3. Forex — update type desc keyword
  if (rawUpdateTypeDesc) {
    const descLower = rawUpdateTypeDesc.toLowerCase();
    const matched = FOREX_DESC_KEYWORDS.find(kw => descLower.includes(kw.toLowerCase()));
    if (matched) {
      return FOREX_DESC_KEYWORD_RULE;
    }
  }

  // 4. Valuation — prd type desc keyword
  if (rawPrdTypeDesc && rawPrdTypeDesc.toLowerCase().includes('valuation')) {
    return VALUATION_RULE;
  }

  return null;
}

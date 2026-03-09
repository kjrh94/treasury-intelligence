/**
 * Ignore rules engine for Treasury Intelligence workbook parsing.
 *
 * Rules are data-driven and modular — add/remove entries here without
 * touching any parsing or classification logic.
 *
 * Each rule may match on:
 *   - updateTypeCode   (exact match on rawUpdateType)
 *   - productType      (optional, exact match on rawPrdType)
 *   - productTypeDesc  (optional, substring match on rawPrdTypeDesc, case-insensitive)
 *
 * All matching uses raw values — never derived or normalized wording.
 */

export interface IgnoreRule {
  id: string;                     // unique rule identifier
  reason: string;                 // human-readable explanation stored on ignored rows
  updateTypeCode?: string;        // match rawUpdateType exactly
  productType?: string;           // optionally also match rawPrdType exactly
  productTypeDesc?: string;       // optionally also match rawPrdTypeDesc (substring, case-insensitive)
}

/**
 * Active ignore rules.
 * These represent rows that are explicitly excluded from borrowings analysis.
 * Extend this array to add new exclusion patterns.
 */
export const IGNORE_RULES: IgnoreRule[] = [
  // Interest accrual / accounting entries — not principal cashflows
  {
    id: 'IGNORE_INTEREST_ACCRUAL',
    reason: 'Interest accrual entries are accounting movements, not principal cashflows',
    updateTypeCode: 'MM1300',
  },
  // Reversal entries — negated transactions
  {
    id: 'IGNORE_REVERSAL',
    reason: 'Reversal entries offset prior transactions and should not be double-counted',
    updateTypeCode: 'MM1410',
  },
  // Fee/commission postings — not borrowing principal flows
  {
    id: 'IGNORE_FEE_POSTING',
    reason: 'Fee or commission postings are cost entries, not principal borrowing flows',
    updateTypeCode: 'MM1600',
  },
  // Valuation / mark-to-market entries
  {
    id: 'IGNORE_VALUATION',
    reason: 'Valuation adjustments are accounting entries, not principal cashflows',
    productTypeDesc: 'valuation',
  },
  // Zero-amount placeholder rows
  {
    id: 'IGNORE_ZERO_AMOUNT',
    reason: 'Zero-amount rows carry no financial value and are excluded from analysis',
    // Applied programmatically in the classifier when parsedAmtInPc === 0
    // and no other content suggests it should be reviewed
    updateTypeCode: '__ZERO_AMOUNT__',  // sentinel — applied by classifier logic
  },
];

/**
 * Check whether a row matches any ignore rule.
 * Returns the matching rule or null.
 *
 * Matching uses RAW values only — never normalized or derived wording.
 */
export function findMatchingIgnoreRule(
  rawUpdateType: string,
  rawPrdType: string,
  rawPrdTypeDesc: string,
): IgnoreRule | null {
  for (const rule of IGNORE_RULES) {
    // Skip the programmatic sentinel — handled separately in classifier
    if (rule.updateTypeCode === '__ZERO_AMOUNT__') continue;

    const codeMatch = rule.updateTypeCode
      ? rawUpdateType === rule.updateTypeCode
      : true;

    const prdTypeMatch = rule.productType
      ? rawPrdType === rule.productType
      : true;

    const prdDescMatch = rule.productTypeDesc
      ? rawPrdTypeDesc.toLowerCase().includes(rule.productTypeDesc.toLowerCase())
      : true;

    if (codeMatch && prdTypeMatch && prdDescMatch) {
      return rule;
    }
  }
  return null;
}

/**
 * The zero-amount ignore rule, applied separately by the classifier.
 */
export const ZERO_AMOUNT_RULE: IgnoreRule = IGNORE_RULES.find(
  r => r.updateTypeCode === '__ZERO_AMOUNT__',
)!;

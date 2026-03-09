/**
 * Workbook parsing type system for Treasury Intelligence.
 *
 * Three-layer field model per the specification:
 *   A. Raw fields    — exact values from Excel, never altered
 *   B. Normalized    — whitespace-trimmed, dates/numbers parsed, lowercase helpers
 *   C. Derived       — classification, mapping status, audit trails
 *
 * Raw business values (e.g. "ICD Borrowing", "MM1400") must NEVER be rewritten.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Sheet name constants
// ─────────────────────────────────────────────────────────────────────────────
export const SHEET_DATA_FOUNDATION = 'Data Foundation';
export const SHEET_TCL_CASHFLOW    = 'TCL Cashflow';

// ─────────────────────────────────────────────────────────────────────────────
// Workbook metadata
// ─────────────────────────────────────────────────────────────────────────────
export interface RawWorkbookMeta {
  fileName: string;
  fileSize: number;           // bytes
  uploadedAt: string;         // ISO timestamp
  sheetNames: string[];
  workbookValid: boolean;
  parseStatus: 'success' | 'partial' | 'failed';
  parseErrors: string[];
  parseWarnings: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// A. Raw rows — Data Foundation
// ─────────────────────────────────────────────────────────────────────────────
export interface DataFoundationRawRow {
  sourceSheet: typeof SHEET_DATA_FOUNDATION;
  sourceRowNumber: number;

  // Raw values exactly as they appear in Excel
  rawClient: string;
  rawGrouping: string;
  rawProductType: string;
  rawInstrumentName: string;
  rawFlowCode: string;
  rawFlowCategoryDesc: string;
  rawUpdateTypeCode: string;       // the CODE column (e.g. MM1400)
  rawUpdateTypeDesc: string;       // the DESCRIPTION column (e.g. "Borrowing")
  rawDashboardDescription: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// B. Normalized rows — Data Foundation
// ─────────────────────────────────────────────────────────────────────────────
export interface DataFoundationNormalizedRow extends DataFoundationRawRow {
  // Normalized helpers (trimmed, lowercased for matching only — never replace raw)
  normClient: string;
  normGrouping: string;
  normProductType: string;
  normInstrumentName: string;
  normFlowCode: string;
  normFlowCategoryDesc: string;
  normUpdateTypeCode: string;
  normUpdateTypeDesc: string;
  normDashboardDescription: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// A. Raw rows — TCL Cashflow
// ─────────────────────────────────────────────────────────────────────────────
export interface CashflowRawRow {
  sourceSheet: typeof SHEET_TCL_CASHFLOW;
  sourceRowNumber: number;

  // Raw values exactly as they appear in Excel — never overwrite these
  rawCoCode: string;
  rawPrdType: string;            // product type CODE (e.g. "TL")
  rawPrdTypeDesc: string;        // product type DESCRIPTION (e.g. "Term Loans")
  rawClassId: string;
  rawTxnNo: string;
  rawTrlDate: unknown;           // kept as-is; parsed version is in normalized layer
  rawUpdateType: string;         // update type CODE (e.g. "MM1400")
  rawUpdateTypeDesc: string;     // update type DESCRIPTION (e.g. "Borrowing")
  rawAmtInPc: unknown;           // kept as-is; parsed version is in normalized layer
  rawPosCurrency: string;
  rawStatus: string;
  rawDays: unknown;
  rawUnits: unknown;
  rawAmtValCrcy: unknown;
  rawValnCrcy: string;
  rawCalFrom: unknown;
  rawCalcTo: unknown;
  rawCalcDate: unknown;
  rawBaseAmount: unknown;
  rawDifferentPostingDate: unknown;
  rawPortfolio: string;
  rawPortfolioName: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// B. Normalized rows — TCL Cashflow
// ─────────────────────────────────────────────────────────────────────────────
export interface CashflowNormalizedRow extends CashflowRawRow {
  // Technical normalizations only — do NOT alter business meaning
  normCoCode: string;
  normPrdType: string;
  normPrdTypeDesc: string;
  normUpdateType: string;
  normUpdateTypeDesc: string;
  normPortfolioName: string;

  // Safely parsed numbers/dates
  parsedTrlDate: Date | null;
  parsedAmtInPc: number | null;
  parsedDays: number | null;
  parsedUnits: number | null;
  parsedAmtValCrcy: number | null;
  parsedBaseAmount: number | null;
  parsedCalFrom: Date | null;
  parsedCalcTo: Date | null;
  parsedCalcDate: Date | null;
  parsedDifferentPostingDate: Date | null;

  // Quarter derived from parsedTrlDate (e.g. "2025 Q1") — NEVER overwrites raw
  derivedQuarter: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Mapping statuses (spec §10)
// ─────────────────────────────────────────────────────────────────────────────
export type MappingStatus =
  | 'MAPPED_BORROWINGS'
  | 'MAPPED_NON_BORROWINGS'
  | 'UNMAPPED_REVIEW'
  | 'IGNORED_EXPLICIT'
  | 'INSUFFICIENT_DATA';

/**
 * Category applied to IGNORED_EXPLICIT rows.
 * Extensible — add new categories here as needed.
 */
export type IgnoreCategory =
  | 'FOREX'
  | 'INVESTMENTS'
  | 'VALUATION'
  | 'ZERO_AMOUNT'
  | 'OTHER';

/**
 * The stage at which a row's grouping was determined.
 *   PRODUCT_TYPE_PRIMARY — Prd Type matched a known product master (strongest signal)
 *   FALLBACK_EVIDENCE    — Prd Type missing/unknown; secondary fields used
 *   ZERO_AMOUNT          — programmatic zero-amount exclusion
 *   INSUFFICIENT_DATA    — no usable identifiers at all
 */
export type ClassificationStage =
  | 'PRODUCT_TYPE_PRIMARY'
  | 'FALLBACK_EVIDENCE'
  | 'ZERO_AMOUNT'
  | 'INSUFFICIENT_DATA';

/**
 * The specific rule ID applied during classification.
 * Stored verbatim on every row for full auditability.
 */
export type ClassificationRuleApplied =
  | 'BORROWINGS_PRODUCT_TYPE_MATCH'
  | 'INVESTMENT_PRODUCT_TYPE_MATCH'
  | 'FOREX_PRODUCT_TYPE_MATCH'
  | 'BORROWINGS_DATA_FOUNDATION_MATCH'
  | 'NON_BORROWINGS_DATA_FOUNDATION_MATCH'
  | 'INVESTMENT_UPDATE_OR_DESC_MATCH'
  | 'FOREX_UPDATE_OR_DESC_MATCH'
  | 'BORROWINGS_FALLBACK_SIGNAL'
  | 'ZERO_AMOUNT_EXCLUSION'
  | 'INSUFFICIENT_DATA'
  | 'NO_SIGNAL';

// ─────────────────────────────────────────────────────────────────────────────
// Product type master entry — built from Data Foundation left-side table
// ─────────────────────────────────────────────────────────────────────────────
export interface ProductTypeMasterEntry {
  rawProductType: string;       // exact code as in Data Foundation (e.g. "TL")
  rawInstrumentName: string;    // exact description (e.g. "Term Loans")
  rawGrouping: string;          // exact grouping (e.g. "Borrowings")
  normProductType: string;      // lowercase trimmed for matching
  normGrouping: string;         // lowercase trimmed for matching
  sourceRowNumber: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// C. Classified (derived) cashflow row — extends normalized
// ─────────────────────────────────────────────────────────────────────────────
export interface ClassifiedCashflowRow extends CashflowNormalizedRow {
  // Derived classification — always separate from raw/normalized layers
  mappedGrouping: string | null;
  mappedProductType: string | null;
  mappedInstrumentName: string | null;
  mappedFlowCode: string | null;
  mappedFlowCategoryDesc: string | null;
  mappingStatus: MappingStatus;
  mappingConfidence: 'high' | 'medium' | 'low' | 'none';
  mappingReason: string;
  matchedOn: string | null;       // e.g. "prdType" | "updateTypeCode" | "fallback"

  // Classification audit trail
  classificationStage: ClassificationStage;
  classificationRuleApplied: ClassificationRuleApplied;

  // Borrowings relevance flag — review support only, not final classification
  borrowingsRelevant: boolean;

  // Ignore tracking
  ignored: boolean;
  ignoreRuleId: string | null;
  ignoreReason: string | null;
  ignoreCategory: IgnoreCategory | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Borrowings mapping reference — derived from Data Foundation
// ─────────────────────────────────────────────────────────────────────────────
export interface BorrowingsMappingEntry {
  // Raw source values preserved
  rawUpdateTypeCode: string;
  rawUpdateTypeDesc: string;
  rawProductType: string;
  rawInstrumentName: string;
  rawFlowCode: string;
  rawFlowCategoryDesc: string;
  rawDashboardDescription: string;

  // Normalized for matching
  normUpdateTypeCode: string;
  normUpdateTypeDesc: string;
  normProductType: string;
  normInstrumentName: string;

  sourceRowNumber: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Parse summary
// ─────────────────────────────────────────────────────────────────────────────
export interface ParseSummary {
  totalDataFoundationRows: number;
  totalCashflowRows: number;
  totalMappedBorrowingsRows: number;
  totalMappedNonBorrowingsRows: number;
  totalUnmappedReviewRows: number;
  totalIgnoredRows: number;
  totalIgnoredForexRows: number;
  totalIgnoredInvestmentRows: number;
  totalInsufficientDataRows: number;
  uniqueBorrowingsUpdateTypes: string[];   // raw values
  uniqueUnmappedUpdateTypes: string[];     // raw values
  parseWarningsCount: number;
  validationAssertionFailures: string[];   // any assertion violations found
}

// ─────────────────────────────────────────────────────────────────────────────
// Top-level workbook session — stored in AppContext
// ─────────────────────────────────────────────────────────────────────────────
export interface WorkbookSession {
  rawWorkbookMeta: RawWorkbookMeta;

  // Raw + normalized sheet outputs
  dataFoundationRawRows: DataFoundationRawRow[];
  dataFoundationNormalizedRows: DataFoundationNormalizedRow[];
  cashflowRawRows: CashflowRawRow[];
  cashflowNormalizedRows: CashflowNormalizedRow[];

  // Product type master — built from Data Foundation left-side table
  // Primary source of truth for grouping classification
  productTypeMaster: ProductTypeMasterEntry[];

  // Classification datasets
  borrowingsMappingReference: BorrowingsMappingEntry[];
  classifiedCashflowRows: ClassifiedCashflowRow[];

  // Bucketed row views
  // borrowingsCandidateRows: Prd Type matched borrowings master (pre-exclusion)
  // finalBorrowingsRows: same as borrowingsCandidateRows at this stage;
  //   reserved for future sub-classification refinement
  borrowingsCandidateRows: ClassifiedCashflowRow[];
  finalBorrowingsRows: ClassifiedCashflowRow[];       // alias: use for all metrics
  borrowingsRows: ClassifiedCashflowRow[];             // kept for backwards compat
  nonBorrowingsRows: ClassifiedCashflowRow[];
  unmappedReviewRows: ClassifiedCashflowRow[];
  ignoredRows: ClassifiedCashflowRow[];
  insufficientDataRows: ClassifiedCashflowRow[];

  // Summary
  parseSummary: ParseSummary;
}

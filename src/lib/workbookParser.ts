/**
 * workbookParser.ts — Treasury Intelligence parsing engine
 *
 * Implements the five-stage pipeline from the specification:
 *
 *   Stage A — Workbook validation
 *   Stage B — Raw extraction (exact source values, zero modification)
 *   Stage C — Technical normalization (trim, parse dates/numbers, lowercase helpers)
 *   Stage D — Mapping/classification (borrowings-focused, explainable, with unmapped detection)
 *   Stage E — Frontend state assembly
 *
 * Critical rules enforced throughout:
 *   - Raw business values are NEVER rewritten or inferred
 *   - UpdateType (code) and Update Type Desc (description) are always separate fields
 *   - Prd Type (code) and Prd Type Desc (description) are always separate fields
 *   - Unmapped borrowings-relevant rows surface as UNMAPPED_REVIEW, not silently dropped
 *   - All matches are explainable via matchedOn + mappingReason fields
 */

import * as XLSX from 'xlsx';
import {
  SHEET_DATA_FOUNDATION,
  SHEET_TCL_CASHFLOW,
  type DataFoundationRawRow,
  type DataFoundationNormalizedRow,
  type CashflowRawRow,
  type CashflowNormalizedRow,
  type ClassifiedCashflowRow,
  type BorrowingsMappingEntry,
  type MappingStatus,
  type ClassificationStage,
  type ClassificationRuleApplied,
  type ProductTypeMasterEntry,
  type ParseSummary,
  type RawWorkbookMeta,
  type WorkbookSession,
} from '../types/workbook';
import {
  checkProductTypeMasterIgnore,
  checkFallbackIgnore,
  ZERO_AMOUNT_RULE,
  BORROWINGS_PRODUCT_TYPE_CODES,
} from './ignoreRules';

// ─────────────────────────────────────────────────────────────────────────────
// Stage A — Workbook validation
// ─────────────────────────────────────────────────────────────────────────────

export type ValidationResult =
  | { valid: true; workbook: XLSX.WorkBook; sheetNames: string[] }
  | { valid: false; error: 'error-type' | 'error-size' | 'error-unreadable' | 'error-missing-sheets'; missingSheets?: string[] };

export function validateUpload(file: File): 'error-type' | 'error-size' | null {
  const ext = '.' + (file.name.split('.').pop() ?? '').toLowerCase();
  if (!['.xlsx', '.xls'].includes(ext)) return 'error-type';
  if (file.size > 50 * 1024 * 1024) return 'error-size';
  return null;
}

async function stageA_validate(file: File): Promise<ValidationResult> {
  let workbook: XLSX.WorkBook;
  try {
    const buffer = await file.arrayBuffer();
    workbook = XLSX.read(buffer, { type: 'array', cellDates: false, raw: true });
  } catch {
    return { valid: false, error: 'error-unreadable' };
  }

  const sheetNames = workbook.SheetNames;
  const required = [SHEET_DATA_FOUNDATION, SHEET_TCL_CASHFLOW];
  const missing = required.filter(s => !sheetNames.includes(s));
  if (missing.length > 0) {
    return { valid: false, error: 'error-missing-sheets', missingSheets: missing };
  }

  return { valid: true, workbook, sheetNames };
}

// ─────────────────────────────────────────────────────────────────────────────
// Header detection helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Find the first row index that has at least `minFilled` non-empty cells. */
function findHeaderRow(rows: unknown[][], minFilled = 3): number {
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const filled = rows[i].filter(c => c !== '' && c !== null && c !== undefined).length;
    if (filled >= minFilled) return i;
  }
  return 0;
}

/** Return the column index of the first header that matches any alias (case-insensitive, trimmed). */
function colIdx(headers: string[], ...aliases: string[]): number {
  const norm = headers.map(h => (h ?? '').toLowerCase().trim());
  for (const alias of aliases) {
    const a = alias.toLowerCase().trim();
    const i = norm.findIndex(h => h === a);
    if (i !== -1) return i;
  }
  // Second pass: substring match
  for (const alias of aliases) {
    const a = alias.toLowerCase().trim();
    const i = norm.findIndex(h => h.includes(a));
    if (i !== -1) return i;
  }
  return -1;
}

function cellStr(row: unknown[], idx: number): string {
  if (idx < 0 || idx >= row.length) return '';
  const v = row[idx];
  if (v === null || v === undefined) return '';
  return String(v);
}

function cellRaw(row: unknown[], idx: number): unknown {
  if (idx < 0 || idx >= row.length) return '';
  const v = row[idx];
  return v === null || v === undefined ? '' : v;
}

// ─────────────────────────────────────────────────────────────────────────────
// Stage B/C — Raw extraction + normalization (Data Foundation)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Column layout for Data Foundation.
 * The sheet may have multiple repeating blocks; we target the primary block.
 * Spec fields: Client, Grouping, Product Type, Instrument Name,
 *              Flow Code, Flow Category Desc, UpdateType, Update Type Desc,
 *              Description - Dashboard
 */
interface DataFoundationColMap {
  client: number;
  grouping: number;
  productType: number;
  instrumentName: number;
  flowCode: number;
  flowCategoryDesc: number;
  updateTypeCode: number;   // the CODE column
  updateTypeDesc: number;   // the DESCRIPTION column (separate!)
  dashboardDescription: number;
}

function detectDataFoundationCols(headers: string[]): DataFoundationColMap {
  return {
    client:              colIdx(headers, 'client'),
    grouping:            colIdx(headers, 'grouping'),
    productType:         colIdx(headers, 'product type', 'producttype', 'prd type'),
    instrumentName:      colIdx(headers, 'instrument name', 'instrument'),
    flowCode:            colIdx(headers, 'flow code', 'flowcode'),
    flowCategoryDesc:    colIdx(headers, 'flow category desc', 'flow category description', 'flow category'),
    // CRITICAL: These are two separate columns
    updateTypeCode:      colIdx(headers, 'updatetype', 'update type', 'update_type'),
    updateTypeDesc:      colIdx(headers, 'update type desc', 'updatetypedesc', 'update type description', 'update_type_desc'),
    dashboardDescription: colIdx(headers, 'description - dashboard', 'description-dashboard', 'dashboard description', 'description'),
  };
}

function stageBC_parseDataFoundation(
  workbook: XLSX.WorkBook,
  warnings: string[],
): { raw: DataFoundationRawRow[]; normalized: DataFoundationNormalizedRow[] } {
  const sheet = workbook.Sheets[SHEET_DATA_FOUNDATION];
  const rawSheet: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: '',
    raw: true,
  });

  if (rawSheet.length < 2) {
    warnings.push('Data Foundation sheet appears empty');
    return { raw: [], normalized: [] };
  }

  const headerRowIdx = findHeaderRow(rawSheet, 3);
  const headers = rawSheet[headerRowIdx].map(h => String(h ?? ''));
  const cols = detectDataFoundationCols(headers);

  // Warn if critical columns not found
  if (cols.updateTypeCode === -1) warnings.push('Data Foundation: "UpdateType" code column not found');
  if (cols.updateTypeDesc === -1) warnings.push('Data Foundation: "Update Type Desc" description column not found');
  if (cols.grouping === -1)       warnings.push('Data Foundation: "Grouping" column not found');

  const rawRows: DataFoundationRawRow[] = [];
  const normalizedRows: DataFoundationNormalizedRow[] = [];

  for (let i = headerRowIdx + 1; i < rawSheet.length; i++) {
    const row = rawSheet[i];
    if (!row || row.every(c => c === '' || c === null || c === undefined)) continue;

    // Stage B — exact raw values, zero modification
    const raw: DataFoundationRawRow = {
      sourceSheet: SHEET_DATA_FOUNDATION,
      sourceRowNumber: i + 1, // 1-based for human readability
      rawClient:              cellStr(row, cols.client),
      rawGrouping:            cellStr(row, cols.grouping),
      rawProductType:         cellStr(row, cols.productType),
      rawInstrumentName:      cellStr(row, cols.instrumentName),
      rawFlowCode:            cellStr(row, cols.flowCode),
      rawFlowCategoryDesc:    cellStr(row, cols.flowCategoryDesc),
      rawUpdateTypeCode:      cellStr(row, cols.updateTypeCode),
      rawUpdateTypeDesc:      cellStr(row, cols.updateTypeDesc),
      rawDashboardDescription: cellStr(row, cols.dashboardDescription),
    };

    // Skip rows with absolutely no useful content
    if (
      !raw.rawUpdateTypeCode &&
      !raw.rawGrouping &&
      !raw.rawProductType &&
      !raw.rawInstrumentName
    ) continue;

    rawRows.push(raw);

    // Stage C — normalization helpers (lowercase, trim; never alter business meaning)
    const normalized: DataFoundationNormalizedRow = {
      ...raw,
      normClient:              raw.rawClient.trim().toLowerCase(),
      normGrouping:            raw.rawGrouping.trim().toLowerCase(),
      normProductType:         raw.rawProductType.trim().toLowerCase(),
      normInstrumentName:      raw.rawInstrumentName.trim().toLowerCase(),
      normFlowCode:            raw.rawFlowCode.trim().toLowerCase(),
      normFlowCategoryDesc:    raw.rawFlowCategoryDesc.trim().toLowerCase(),
      normUpdateTypeCode:      raw.rawUpdateTypeCode.trim().toLowerCase(),
      normUpdateTypeDesc:      raw.rawUpdateTypeDesc.trim().toLowerCase(),
      normDashboardDescription: raw.rawDashboardDescription.trim().toLowerCase(),
    };

    normalizedRows.push(normalized);
  }

  return { raw: rawRows, normalized: normalizedRows };
}

// ─────────────────────────────────────────────────────────────────────────────
// Stage B/C — Raw extraction + normalization (TCL Cashflow)
// ─────────────────────────────────────────────────────────────────────────────

interface CashflowColMap {
  coCode: number;
  prdType: number;        // product type CODE
  prdTypeDesc: number;    // product type DESCRIPTION — separate column
  classId: number;
  txnNo: number;
  trlDate: number;
  updateType: number;     // update type CODE
  updateTypeDesc: number; // update type DESCRIPTION — separate column
  amtInPc: number;
  posCurrency: number;
  status: number;
  days: number;
  units: number;
  amtValCrcy: number;
  valnCrcy: number;
  calFrom: number;
  calcTo: number;
  calcDate: number;
  baseAmount: number;
  differentPostingDate: number;
  portfolio: number;
  portfolioName: number;
}

function detectCashflowCols(headers: string[]): CashflowColMap {
  return {
    coCode:               colIdx(headers, 'co code', 'co.code', 'cocode', 'company code'),
    // CRITICAL: prd type (code) vs prd type desc (description) — must remain separate
    prdType:              colIdx(headers, 'prd type', 'prdtype', 'product type code'),
    prdTypeDesc:          colIdx(headers, 'prd type desc', 'prdtypedesc', 'prd type description', 'product type desc', 'product type description'),
    classId:              colIdx(headers, 'class id', 'classid', 'class_id'),
    txnNo:                colIdx(headers, 'txn no', 'txnno', 'transaction no', 'txn number'),
    trlDate:              colIdx(headers, 'trl date', 'trldate', 'transaction date', 'trade date', 'value date'),
    // CRITICAL: updatetype (code) vs update type desc (description) — must remain separate
    updateType:           colIdx(headers, 'updatetype', 'update type'),
    updateTypeDesc:       colIdx(headers, 'update type desc', 'updatetypedesc', 'update type description'),
    amtInPc:              colIdx(headers, 'amt in pc', 'amtinpc', 'amount in pc', 'amount'),
    posCurrency:          colIdx(headers, 'pos.c', 'pos c', 'position currency', 'posc'),
    status:               colIdx(headers, 'status'),
    days:                 colIdx(headers, 'days'),
    units:                colIdx(headers, 'units'),
    amtValCrcy:           colIdx(headers, 'amtvalcrcy', 'amt val crcy', 'amount val crcy'),
    valnCrcy:             colIdx(headers, 'valn crcy', 'valncrcy', 'valuation currency'),
    calFrom:              colIdx(headers, 'cal.from', 'cal from', 'calfrom', 'calculate from'),
    calcTo:               colIdx(headers, 'calc. to', 'calc to', 'calcto', 'calculate to'),
    calcDate:             colIdx(headers, 'calc. date', 'calc date', 'calcdate', 'calculation date'),
    baseAmount:           colIdx(headers, 'base amount', 'baseamount'),
    differentPostingDate: colIdx(headers, 'different posting date', 'differentpostingdate', 'posting date'),
    portfolio:            colIdx(headers, 'portfolio'),
    portfolioName:        colIdx(headers, 'portfolio name', 'portfolioname'),
  };
}

/** Safely parse a date from an Excel cell value. */
function safeParseDate(raw: unknown): Date | null {
  if (raw === null || raw === undefined || raw === '') return null;
  if (typeof raw === 'number') {
    // Excel date serial
    try {
      const d = XLSX.SSF.parse_date_code(raw);
      if (d && d.y > 1900) return new Date(d.y, d.m - 1, d.d);
    } catch { /* ignore */ }
  }
  if (typeof raw === 'string' && raw.trim() !== '') {
    // dd/mm/yyyy or dd-mm-yyyy
    const dmy = raw.trim().match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (dmy) {
      const yr = dmy[3].length === 2 ? '20' + dmy[3] : dmy[3];
      const d = new Date(parseInt(yr), parseInt(dmy[2]) - 1, parseInt(dmy[1]));
      if (!isNaN(d.getTime())) return d;
    }
    const iso = Date.parse(raw.trim());
    if (!isNaN(iso)) return new Date(iso);
  }
  return null;
}

/** Safely parse a number from a cell. Returns null (not 0) when genuinely absent. */
function safeParseNumber(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === '') return null;
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'string') {
    const n = parseFloat(raw.replace(/,/g, ''));
    return isNaN(n) ? null : n;
  }
  return null;
}

/** Derive quarter label from a Date (e.g. "2025 Q1"). */
function toQuarter(d: Date): string {
  const q = Math.floor(d.getMonth() / 3) + 1;
  return `${d.getFullYear()} Q${q}`;
}

function stageBC_parseCashflow(
  workbook: XLSX.WorkBook,
  warnings: string[],
): { raw: CashflowRawRow[]; normalized: CashflowNormalizedRow[] } {
  const sheet = workbook.Sheets[SHEET_TCL_CASHFLOW];
  const rawSheet: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: '',
    raw: true,
  });

  if (rawSheet.length < 2) {
    warnings.push('TCL Cashflow sheet appears empty');
    return { raw: [], normalized: [] };
  }

  const headerRowIdx = findHeaderRow(rawSheet, 3);
  const headers = rawSheet[headerRowIdx].map(h => String(h ?? ''));
  const cols = detectCashflowCols(headers);

  // Warn if critical columns not found
  if (cols.updateType === -1)     warnings.push('TCL Cashflow: "UpdateType" code column not found');
  if (cols.updateTypeDesc === -1) warnings.push('TCL Cashflow: "Update Type Desc" description column not found');
  if (cols.prdType === -1)        warnings.push('TCL Cashflow: "Prd Type" code column not found');
  if (cols.prdTypeDesc === -1)    warnings.push('TCL Cashflow: "Prd Type Desc" description column not found');
  if (cols.amtInPc === -1)        warnings.push('TCL Cashflow: "Amt in PC" column not found');

  const rawRows: CashflowRawRow[] = [];
  const normalizedRows: CashflowNormalizedRow[] = [];

  for (let i = headerRowIdx + 1; i < rawSheet.length; i++) {
    const row = rawSheet[i];
    if (!row || row.every(c => c === '' || c === null || c === undefined)) continue;

    // Stage B — raw extraction, zero modification to business values
    const raw: CashflowRawRow = {
      sourceSheet: SHEET_TCL_CASHFLOW,
      sourceRowNumber: i + 1,
      rawCoCode:               cellStr(row, cols.coCode),
      rawPrdType:              cellStr(row, cols.prdType),
      rawPrdTypeDesc:          cellStr(row, cols.prdTypeDesc),
      rawClassId:              cellStr(row, cols.classId),
      rawTxnNo:                cellStr(row, cols.txnNo),
      rawTrlDate:              cellRaw(row, cols.trlDate),
      rawUpdateType:           cellStr(row, cols.updateType),
      rawUpdateTypeDesc:       cellStr(row, cols.updateTypeDesc),
      rawAmtInPc:              cellRaw(row, cols.amtInPc),
      rawPosCurrency:          cellStr(row, cols.posCurrency),
      rawStatus:               cellStr(row, cols.status),
      rawDays:                 cellRaw(row, cols.days),
      rawUnits:                cellRaw(row, cols.units),
      rawAmtValCrcy:           cellRaw(row, cols.amtValCrcy),
      rawValnCrcy:             cellStr(row, cols.valnCrcy),
      rawCalFrom:              cellRaw(row, cols.calFrom),
      rawCalcTo:               cellRaw(row, cols.calcTo),
      rawCalcDate:             cellRaw(row, cols.calcDate),
      rawBaseAmount:           cellRaw(row, cols.baseAmount),
      rawDifferentPostingDate: cellRaw(row, cols.differentPostingDate),
      rawPortfolio:            cellStr(row, cols.portfolio),
      rawPortfolioName:        cellStr(row, cols.portfolioName),
    };

    // Skip rows with zero identifying content
    if (
      !raw.rawUpdateType &&
      !raw.rawPrdType &&
      !raw.rawTxnNo &&
      !raw.rawPortfolioName
    ) continue;

    rawRows.push(raw);

    // Stage C — technical normalization (trim, parse; never alter business labels)
    const parsedTrlDate = safeParseDate(raw.rawTrlDate);

    const normalized: CashflowNormalizedRow = {
      ...raw,
      normCoCode:          raw.rawCoCode.trim().toLowerCase(),
      normPrdType:         raw.rawPrdType.trim().toLowerCase(),
      normPrdTypeDesc:     raw.rawPrdTypeDesc.trim().toLowerCase(),
      normUpdateType:      raw.rawUpdateType.trim().toLowerCase(),
      normUpdateTypeDesc:  raw.rawUpdateTypeDesc.trim().toLowerCase(),
      normPortfolioName:   raw.rawPortfolioName.trim().toLowerCase(),

      parsedTrlDate,
      parsedAmtInPc:              safeParseNumber(raw.rawAmtInPc),
      parsedDays:                 safeParseNumber(raw.rawDays),
      parsedUnits:                safeParseNumber(raw.rawUnits),
      parsedAmtValCrcy:           safeParseNumber(raw.rawAmtValCrcy),
      parsedBaseAmount:           safeParseNumber(raw.rawBaseAmount),
      parsedCalFrom:              safeParseDate(raw.rawCalFrom),
      parsedCalcTo:               safeParseDate(raw.rawCalcTo),
      parsedCalcDate:             safeParseDate(raw.rawCalcDate),
      parsedDifferentPostingDate: safeParseDate(raw.rawDifferentPostingDate),

      derivedQuarter: parsedTrlDate ? toQuarter(parsedTrlDate) : null,
    };

    normalizedRows.push(normalized);
  }

  return { raw: rawRows, normalized: normalizedRows };
}

// ─────────────────────────────────────────────────────────────────────────────
// Stage D — Mapping / classification
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build the product type master from the Data Foundation left-side table.
 * One entry per unique (grouping, productType) pair.
 * This is the PRIMARY source of truth for grouping classification.
 */
function buildProductTypeMaster(
  normalizedDF: DataFoundationNormalizedRow[],
): ProductTypeMasterEntry[] {
  const seen = new Set<string>();
  const master: ProductTypeMasterEntry[] = [];

  for (const r of normalizedDF) {
    if (!r.rawProductType) continue;
    const key = `${r.normGrouping}||${r.normProductType}`;
    if (seen.has(key)) continue;
    seen.add(key);
    master.push({
      rawProductType:   r.rawProductType,
      rawInstrumentName: r.rawInstrumentName,
      rawGrouping:      r.rawGrouping,
      normProductType:  r.normProductType,
      normGrouping:     r.normGrouping,
      sourceRowNumber:  r.sourceRowNumber,
    });
  }
  return master;
}

/** Build the borrowings-focused mapping reference from Data Foundation rows. */
function buildBorrowingsMappingReference(
  normalizedDF: DataFoundationNormalizedRow[],
): BorrowingsMappingEntry[] {
  return normalizedDF
    .filter(r => r.normGrouping === 'borrowings')
    .map(r => ({
      rawUpdateTypeCode:    r.rawUpdateTypeCode,
      rawUpdateTypeDesc:    r.rawUpdateTypeDesc,
      rawProductType:       r.rawProductType,
      rawInstrumentName:    r.rawInstrumentName,
      rawFlowCode:          r.rawFlowCode,
      rawFlowCategoryDesc:  r.rawFlowCategoryDesc,
      rawDashboardDescription: r.rawDashboardDescription,
      normUpdateTypeCode:   r.normUpdateTypeCode,
      normUpdateTypeDesc:   r.normUpdateTypeDesc,
      normProductType:      r.normProductType,
      normInstrumentName:   r.normInstrumentName,
      sourceRowNumber:      r.sourceRowNumber,
    }));
}

/**
 * Look up a rawPrdType in the product type master built from Data Foundation.
 * Returns the matching entry or null. Exact match on trimmed code.
 */
function lookupProductTypeMaster(
  rawPrdType: string,
  master: ProductTypeMasterEntry[],
): ProductTypeMasterEntry | null {
  if (!rawPrdType) return null;
  const code = rawPrdType.trim();
  return master.find(e => e.rawProductType.trim() === code) ?? null;
}

/**
 * Borrowings-relevance heuristic — used ONLY on unknown-product-type rows
 * as additional signal for UNMAPPED_REVIEW. Review support only, never metrics.
 */
const BORROWINGS_RELEVANCE_KEYWORDS = [
  'borrow', 'loan', 'ncd', 'debenture', 'term loan', 'icd', 'ecb',
  'overdraft', 'cash credit', 'commercial paper', 'bond', 'trep',
  'working capital', 'bill discounting',
];

function isBorrowingsRelevant(row: CashflowNormalizedRow): boolean {
  const fields = [row.normPrdTypeDesc, row.normPortfolioName].join(' ');
  return BORROWINGS_RELEVANCE_KEYWORDS.some(kw => fields.includes(kw));
}

/**
 * Stage D — Product-Type-First Classification
 *
 * Classification precedence (per spec §4):
 *
 *   Step 1 — PRODUCT_TYPE_PRIMARY (strongest signal)
 *     1a. rawPrdType in INVESTMENTS_PRODUCT_TYPE_CODES → IGNORED_EXPLICIT (INVESTMENTS)
 *     1b. rawPrdType in FOREX_PRODUCT_TYPE_CODES       → IGNORED_EXPLICIT (FOREX)
 *     1c. rawPrdType in BORROWINGS_PRODUCT_TYPE_CODES  → MAPPED_BORROWINGS candidate
 *     1d. rawPrdType found in Data Foundation master   → grouping from master
 *
 *   Step 2 — Zero-amount sentinel (programmatic)
 *
 *   Step 3 — Insufficient data
 *
 *   Step 4 — FALLBACK_EVIDENCE (Prd Type absent/unknown only)
 *     4a. Fallback → Investments (updateType code or desc keyword)
 *     4b. Fallback → Forex (updateType code or desc keyword)
 *     4c. Fallback → Borrowings signal (heuristic keywords) → UNMAPPED_REVIEW
 *     4d. Weak signal → UNMAPPED_REVIEW
 *
 * UpdateType is never used for grouping inclusion/exclusion in Step 1.
 */
function stageD_classify(
  normalizedCF: CashflowNormalizedRow[],
  productTypeMaster: ProductTypeMasterEntry[],
): ClassifiedCashflowRow[] {

  return normalizedCF.map(row => {

    // ── Step 1: Product Type Primary ──────────────────────────────────────────

    if (row.rawPrdType) {
      // 1a/1b: Check curated exclusion masters first (Investments, Forex)
      const exclusionRule = checkProductTypeMasterIgnore(row.rawPrdType);
      if (exclusionRule) {
        return {
          ...row,
          mappedGrouping: null,
          mappedProductType: null,
          mappedInstrumentName: null,
          mappedFlowCode: null,
          mappedFlowCategoryDesc: null,
          mappingStatus: 'IGNORED_EXPLICIT' as MappingStatus,
          mappingConfidence: 'high' as const,
          mappingReason: `Prd Type "${row.rawPrdType}" belongs to ${exclusionRule.category} grouping — ${exclusionRule.reason}`,
          matchedOn: 'prdType',
          classificationStage: 'PRODUCT_TYPE_PRIMARY' as ClassificationStage,
          classificationRuleApplied: (exclusionRule.category === 'INVESTMENTS'
            ? 'INVESTMENT_PRODUCT_TYPE_MATCH'
            : 'FOREX_PRODUCT_TYPE_MATCH') as ClassificationRuleApplied,
          borrowingsRelevant: false,
          ignored: true,
          ignoreRuleId: exclusionRule.id,
          ignoreReason: exclusionRule.reason,
          ignoreCategory: exclusionRule.category,
        };
      }

      // 1c: Check curated Borrowings master
      if (BORROWINGS_PRODUCT_TYPE_CODES.has(row.rawPrdType.trim())) {
        return {
          ...row,
          mappedGrouping: 'Borrowings',
          mappedProductType: row.rawPrdType,
          mappedInstrumentName: row.rawPrdTypeDesc || null,
          mappedFlowCode: null,
          mappedFlowCategoryDesc: null,
          mappingStatus: 'MAPPED_BORROWINGS' as MappingStatus,
          mappingConfidence: 'high' as const,
          mappingReason: `Prd Type "${row.rawPrdType}" matched Borrowings product master`,
          matchedOn: 'prdType',
          classificationStage: 'PRODUCT_TYPE_PRIMARY' as ClassificationStage,
          classificationRuleApplied: 'BORROWINGS_PRODUCT_TYPE_MATCH' as ClassificationRuleApplied,
          borrowingsRelevant: true,
          ignored: false,
          ignoreRuleId: null,
          ignoreReason: null,
          ignoreCategory: null,
        };
      }

      // 1d: Check Data Foundation product type master
      const masterEntry = lookupProductTypeMaster(row.rawPrdType, productTypeMaster);
      if (masterEntry) {
        const isBorrowings = masterEntry.normGrouping === 'borrowings';
        const status: MappingStatus = isBorrowings ? 'MAPPED_BORROWINGS' : 'MAPPED_NON_BORROWINGS';
        return {
          ...row,
          mappedGrouping: masterEntry.rawGrouping,
          mappedProductType: masterEntry.rawProductType,
          mappedInstrumentName: masterEntry.rawInstrumentName,
          mappedFlowCode: null,
          mappedFlowCategoryDesc: null,
          mappingStatus: status,
          mappingConfidence: 'high' as const,
          mappingReason: `Prd Type "${row.rawPrdType}" matched Data Foundation product master — Grouping: "${masterEntry.rawGrouping}" (row ${masterEntry.sourceRowNumber})`,
          matchedOn: 'prdType',
          classificationStage: 'PRODUCT_TYPE_PRIMARY' as ClassificationStage,
          classificationRuleApplied: (isBorrowings
            ? 'BORROWINGS_DATA_FOUNDATION_MATCH'
            : 'NON_BORROWINGS_DATA_FOUNDATION_MATCH') as ClassificationRuleApplied,
          borrowingsRelevant: isBorrowings,
          ignored: false,
          ignoreRuleId: null,
          ignoreReason: null,
          ignoreCategory: null,
        };
      }

      // Prd Type is present but not in any master — fall through to fallback
    }

    // ── Step 2: Zero-amount sentinel ──────────────────────────────────────────

    if (
      row.parsedAmtInPc === 0 &&
      !row.rawUpdateType &&
      !row.rawPrdType &&
      !row.rawPortfolioName
    ) {
      return {
        ...row,
        mappedGrouping: null,
        mappedProductType: null,
        mappedInstrumentName: null,
        mappedFlowCode: null,
        mappedFlowCategoryDesc: null,
        mappingStatus: 'IGNORED_EXPLICIT' as MappingStatus,
        mappingConfidence: 'none' as const,
        mappingReason: ZERO_AMOUNT_RULE.reason,
        matchedOn: null,
        classificationStage: 'ZERO_AMOUNT' as ClassificationStage,
        classificationRuleApplied: 'ZERO_AMOUNT_EXCLUSION' as ClassificationRuleApplied,
        borrowingsRelevant: false,
        ignored: true,
        ignoreRuleId: ZERO_AMOUNT_RULE.id,
        ignoreReason: ZERO_AMOUNT_RULE.reason,
        ignoreCategory: ZERO_AMOUNT_RULE.category,
      };
    }

    // ── Step 3: Insufficient data ─────────────────────────────────────────────

    const hasAnyIdentifier = !!(
      row.rawUpdateType || row.rawPrdType ||
      row.rawPrdTypeDesc || row.rawPortfolioName
    );
    if (!hasAnyIdentifier) {
      return {
        ...row,
        mappedGrouping: null,
        mappedProductType: null,
        mappedInstrumentName: null,
        mappedFlowCode: null,
        mappedFlowCategoryDesc: null,
        mappingStatus: 'INSUFFICIENT_DATA' as MappingStatus,
        mappingConfidence: 'none' as const,
        mappingReason: 'No identifiable product type, update type, or portfolio name present',
        matchedOn: null,
        classificationStage: 'INSUFFICIENT_DATA' as ClassificationStage,
        classificationRuleApplied: 'INSUFFICIENT_DATA' as ClassificationRuleApplied,
        borrowingsRelevant: false,
        ignored: false,
        ignoreRuleId: null,
        ignoreReason: null,
        ignoreCategory: null,
      };
    }

    // ── Step 4: Fallback evidence (Prd Type absent or unknown) ────────────────

    const fallbackRule = checkFallbackIgnore(
      row.rawUpdateType,
      row.rawPrdTypeDesc,
      row.rawUpdateTypeDesc,
    );

    if (fallbackRule) {
      const ruleApplied: ClassificationRuleApplied = fallbackRule.category === 'INVESTMENTS'
        ? 'INVESTMENT_UPDATE_OR_DESC_MATCH'
        : fallbackRule.category === 'FOREX'
          ? 'FOREX_UPDATE_OR_DESC_MATCH'
          : 'NO_SIGNAL';

      return {
        ...row,
        mappedGrouping: null,
        mappedProductType: null,
        mappedInstrumentName: null,
        mappedFlowCode: null,
        mappedFlowCategoryDesc: null,
        mappingStatus: 'IGNORED_EXPLICIT' as MappingStatus,
        mappingConfidence: 'medium' as const,
        mappingReason: `Prd Type absent/unknown. Fallback: ${fallbackRule.reason}`,
        matchedOn: 'fallback',
        classificationStage: 'FALLBACK_EVIDENCE' as ClassificationStage,
        classificationRuleApplied: ruleApplied,
        borrowingsRelevant: false,
        ignored: true,
        ignoreRuleId: fallbackRule.id,
        ignoreReason: fallbackRule.reason,
        ignoreCategory: fallbackRule.category,
      };
    }

    // Fallback: check if row has borrowings-relevance signals → UNMAPPED_REVIEW
    const borrowingsHint = isBorrowingsRelevant(row);

    return {
      ...row,
      mappedGrouping: null,
      mappedProductType: null,
      mappedInstrumentName: null,
      mappedFlowCode: null,
      mappedFlowCategoryDesc: null,
      mappingStatus: 'UNMAPPED_REVIEW' as MappingStatus,
      mappingConfidence: 'none' as const,
      mappingReason: borrowingsHint
        ? `Prd Type "${row.rawPrdType || '(absent)'}" not in any product master. Borrowings-relevance keywords found in product/portfolio fields.`
        : `Prd Type "${row.rawPrdType || '(absent)'}" not in any product master. Insufficient signals to classify grouping.`,
      matchedOn: null,
      classificationStage: 'FALLBACK_EVIDENCE' as ClassificationStage,
      classificationRuleApplied: borrowingsHint
        ? 'BORROWINGS_FALLBACK_SIGNAL' as ClassificationRuleApplied
        : 'NO_SIGNAL' as ClassificationRuleApplied,
      borrowingsRelevant: borrowingsHint,
      ignored: false,
      ignoreRuleId: null,
      ignoreReason: null,
      ignoreCategory: null,
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Stage E — Frontend state assembly
// ─────────────────────────────────────────────────────────────────────────────

function stageE_assemble(
  file: File,
  sheetNames: string[],
  errors: string[],
  warnings: string[],
  dfRaw: DataFoundationRawRow[],
  dfNorm: DataFoundationNormalizedRow[],
  cfRaw: CashflowRawRow[],
  cfNorm: CashflowNormalizedRow[],
  productTypeMaster: ProductTypeMasterEntry[],
  borrowingsRef: BorrowingsMappingEntry[],
  classified: ClassifiedCashflowRow[],
): WorkbookSession {
  const borrowingsCandidateRows = classified.filter(r => r.mappingStatus === 'MAPPED_BORROWINGS');
  const finalBorrowingsRows     = borrowingsCandidateRows; // alias — same at this phase
  const nonBorrowingsRows       = classified.filter(r => r.mappingStatus === 'MAPPED_NON_BORROWINGS');
  const unmappedReviewRows      = classified.filter(r => r.mappingStatus === 'UNMAPPED_REVIEW');
  const ignoredRows             = classified.filter(r => r.mappingStatus === 'IGNORED_EXPLICIT');
  const insufficientDataRows    = classified.filter(r => r.mappingStatus === 'INSUFFICIENT_DATA');

  // ── Validation assertions ────────────────────────────────────────────────
  const assertionFailures: string[] = [];

  // Assertion 1: No Investment product type in finalBorrowingsRows
  const investmentInBorrowings = finalBorrowingsRows.filter(
    r => r.ignoreCategory === 'INVESTMENTS',
  );
  if (investmentInBorrowings.length > 0) {
    assertionFailures.push(
      `ASSERTION_FAIL: ${investmentInBorrowings.length} row(s) with INVESTMENTS ignoreCategory found in finalBorrowingsRows`,
    );
  }

  // Assertion 2: No Forex product type in finalBorrowingsRows
  const forexInBorrowings = finalBorrowingsRows.filter(
    r => r.ignoreCategory === 'FOREX',
  );
  if (forexInBorrowings.length > 0) {
    assertionFailures.push(
      `ASSERTION_FAIL: ${forexInBorrowings.length} row(s) with FOREX ignoreCategory found in finalBorrowingsRows`,
    );
  }

  // Assertion 3: Unknown product type rows should not be auto-mapped to Borrowings
  const unknownAutoMapped = finalBorrowingsRows.filter(
    r => r.classificationStage !== 'PRODUCT_TYPE_PRIMARY',
  );
  if (unknownAutoMapped.length > 0) {
    assertionFailures.push(
      `ASSERTION_FAIL: ${unknownAutoMapped.length} row(s) in finalBorrowingsRows were not classified via PRODUCT_TYPE_PRIMARY stage`,
    );
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  const uniqueBorrowingsUpdateTypes = [
    ...new Set(finalBorrowingsRows.map(r => r.rawUpdateType).filter(Boolean)),
  ].sort();

  const uniqueUnmappedUpdateTypes = [
    ...new Set(unmappedReviewRows.map(r => r.rawUpdateType).filter(Boolean)),
  ].sort();

  const totalIgnoredForexRows = ignoredRows.filter(r => r.ignoreCategory === 'FOREX').length;
  const totalIgnoredInvestmentRows = ignoredRows.filter(r => r.ignoreCategory === 'INVESTMENTS').length;

  const parseSummary: ParseSummary = {
    totalDataFoundationRows:      dfRaw.length,
    totalCashflowRows:            cfRaw.length,
    totalMappedBorrowingsRows:    finalBorrowingsRows.length,
    totalMappedNonBorrowingsRows: nonBorrowingsRows.length,
    totalUnmappedReviewRows:      unmappedReviewRows.length,
    totalIgnoredRows:             ignoredRows.length,
    totalIgnoredForexRows,
    totalIgnoredInvestmentRows,
    totalInsufficientDataRows:    insufficientDataRows.length,
    uniqueBorrowingsUpdateTypes,
    uniqueUnmappedUpdateTypes,
    parseWarningsCount:           warnings.length,
    validationAssertionFailures:  assertionFailures,
  };

  const rawWorkbookMeta: RawWorkbookMeta = {
    fileName:      file.name,
    fileSize:      file.size,
    uploadedAt:    new Date().toISOString(),
    sheetNames,
    workbookValid: errors.length === 0 && assertionFailures.length === 0,
    parseStatus:   errors.length > 0 ? 'failed' : (warnings.length > 0 || assertionFailures.length > 0) ? 'partial' : 'success',
    parseErrors:   [...errors, ...assertionFailures],
    parseWarnings: warnings,
  };

  return {
    rawWorkbookMeta,
    dataFoundationRawRows:        dfRaw,
    dataFoundationNormalizedRows: dfNorm,
    cashflowRawRows:              cfRaw,
    cashflowNormalizedRows:       cfNorm,
    productTypeMaster,
    borrowingsMappingReference:   borrowingsRef,
    classifiedCashflowRows:       classified,
    borrowingsCandidateRows,
    finalBorrowingsRows,
    borrowingsRows:               finalBorrowingsRows, // backwards compat
    nonBorrowingsRows,
    unmappedReviewRows,
    ignoredRows,
    insufficientDataRows,
    parseSummary,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

export type ParseWorkbookResult =
  | { success: true;  session: WorkbookSession }
  | { success: false; error: 'error-type' | 'error-size' | 'error-unreadable' | 'error-missing-sheets'; missingSheets?: string[] };

export async function parseWorkbook(file: File): Promise<ParseWorkbookResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Stage A
  const validation = await stageA_validate(file);
  if (!validation.valid) {
    return { success: false, error: validation.error, missingSheets: validation.missingSheets };
  }

  const { workbook, sheetNames } = validation;

  // Stages B + C — Data Foundation
  const { raw: dfRaw, normalized: dfNorm } = stageBC_parseDataFoundation(workbook, warnings);

  // Stages B + C — TCL Cashflow
  const { raw: cfRaw, normalized: cfNorm } = stageBC_parseCashflow(workbook, warnings);

  if (cfRaw.length === 0) {
    warnings.push('TCL Cashflow: no data rows found after header');
  }

  // Stage D — Classification (product-type-first)
  const productTypeMaster = buildProductTypeMaster(dfNorm);
  const borrowingsRef = buildBorrowingsMappingReference(dfNorm);
  const classified = stageD_classify(cfNorm, productTypeMaster);

  // Stage E — Assemble
  const session = stageE_assemble(
    file, sheetNames, errors, warnings,
    dfRaw, dfNorm, cfRaw, cfNorm,
    productTypeMaster, borrowingsRef, classified,
  );

  return { success: true, session };
}

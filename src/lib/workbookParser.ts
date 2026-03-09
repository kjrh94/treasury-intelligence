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
  type ParseSummary,
  type RawWorkbookMeta,
  type WorkbookSession,
} from '../types/workbook';
import { findMatchingIgnoreRule, ZERO_AMOUNT_RULE } from './ignoreRules';

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
 * Borrowings-relevance heuristic.
 * This flag is for REVIEW SUPPORT only — it surfaces rows that look like
 * borrowings but are not confidently mapped. It must NOT be used for metrics.
 */
const BORROWINGS_RELEVANCE_KEYWORDS = [
  'borrow', 'loan', 'ncd', 'debenture', 'term loan', 'icd', 'ecb',
  'overdraft', 'cash credit', 'commercial paper', 'bond', 'trep',
  'working capital', 'bill discounting', 'lc', 'bg', 'guarantee',
];

function isBorrowingsRelevant(row: CashflowNormalizedRow): boolean {
  const fields = [
    row.normPrdTypeDesc,
    row.normUpdateTypeDesc,
    row.normPortfolioName,
  ].join(' ');
  return BORROWINGS_RELEVANCE_KEYWORDS.some(kw => fields.includes(kw));
}

/**
 * Attempt to match a cashflow row against the Data Foundation mapping reference.
 * Returns the matched entry and the field that was used to match, or null.
 *
 * Priority order per spec §9:
 *   P1: rawUpdateType ↔ updateTypeCode
 *   P2: rawUpdateTypeDesc ↔ updateTypeDesc
 *   P3: rawPrdType ↔ productType
 *   P4: rawPrdTypeDesc ↔ instrumentName (or related descriptive fields)
 */
function matchToMapping(
  row: CashflowNormalizedRow,
  allNormDF: DataFoundationNormalizedRow[],
): {
  matchedEntry: DataFoundationNormalizedRow | null;
  matchedOn: string | null;
  confidence: 'high' | 'medium' | 'low' | 'none';
} {
  // P1: updateTypeCode exact match
  if (row.rawUpdateType) {
    const match = allNormDF.find(
      m => m.rawUpdateTypeCode === row.rawUpdateType,
    );
    if (match) return { matchedEntry: match, matchedOn: 'updateTypeCode', confidence: 'high' };
  }

  // P2: updateTypeDesc exact match (case-insensitive, trimmed)
  if (row.normUpdateTypeDesc) {
    const match = allNormDF.find(
      m => m.normUpdateTypeDesc !== '' && m.normUpdateTypeDesc === row.normUpdateTypeDesc,
    );
    if (match) return { matchedEntry: match, matchedOn: 'updateTypeDesc', confidence: 'high' };
  }

  // P3: prdType exact match
  if (row.normPrdType) {
    const match = allNormDF.find(
      m => m.normProductType !== '' && m.normProductType === row.normPrdType,
    );
    if (match) return { matchedEntry: match, matchedOn: 'prdType', confidence: 'medium' };
  }

  // P4: prdTypeDesc substring match against instrumentName
  if (row.normPrdTypeDesc) {
    const match = allNormDF.find(
      m =>
        m.normInstrumentName !== '' &&
        (
          m.normInstrumentName.includes(row.normPrdTypeDesc) ||
          row.normPrdTypeDesc.includes(m.normInstrumentName)
        ),
    );
    if (match) return { matchedEntry: match, matchedOn: 'prdTypeDesc', confidence: 'low' };
  }

  return { matchedEntry: null, matchedOn: null, confidence: 'none' };
}

function stageD_classify(
  normalizedCF: CashflowNormalizedRow[],
  normalizedDF: DataFoundationNormalizedRow[],
  borrowingsRef: BorrowingsMappingEntry[],
): ClassifiedCashflowRow[] {
  // Build a lookup set of borrowings updateTypeCodes for fast reference
  const borrowingsUpdateTypeCodes = new Set(
    borrowingsRef.map(r => r.rawUpdateTypeCode).filter(Boolean),
  );

  return normalizedCF.map(row => {
    // 1. Check explicit ignore rules first (using raw values only)
    const ignoreRule = findMatchingIgnoreRule(
      row.rawUpdateType,
      row.rawPrdType,
      row.rawPrdTypeDesc,
      row.rawUpdateTypeDesc,
    );
    if (ignoreRule) {
      return {
        ...row,
        mappedGrouping: null,
        mappedProductType: null,
        mappedInstrumentName: null,
        mappedFlowCode: null,
        mappedFlowCategoryDesc: null,
        mappingStatus: 'IGNORED_EXPLICIT' as MappingStatus,
        mappingConfidence: 'none' as const,
        mappingReason: `Matched ignore rule: ${ignoreRule.id} — ${ignoreRule.reason}`,
        matchedOn: null,
        borrowingsRelevant: false,
        ignored: true,
        ignoreRuleId: ignoreRule.id,
        ignoreReason: ignoreRule.reason,
        ignoreCategory: ignoreRule.category,
      };
    }

    // 2. Check zero-amount sentinel
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
        mappingReason: `Matched ignore rule: ${ZERO_AMOUNT_RULE.id} — ${ZERO_AMOUNT_RULE.reason}`,
        matchedOn: null,
        borrowingsRelevant: false,
        ignored: true,
        ignoreRuleId: ZERO_AMOUNT_RULE.id,
        ignoreReason: ZERO_AMOUNT_RULE.reason,
        ignoreCategory: ZERO_AMOUNT_RULE.category,
      };
    }

    // 3. Check for insufficient data
    const hasAnyIdentifier = !!(
      row.rawUpdateType ||
      row.rawPrdType ||
      row.rawPrdTypeDesc ||
      row.rawPortfolioName
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
        mappingReason: 'No identifiable update type, product type, or portfolio name present',
        matchedOn: null,
        borrowingsRelevant: false,
        ignored: false,
        ignoreRuleId: null,
        ignoreReason: null,
        ignoreCategory: null,
      };
    }

    // 4. Attempt match against Data Foundation
    const { matchedEntry, matchedOn, confidence } = matchToMapping(row, normalizedDF);

    if (matchedEntry) {
      const grouping = matchedEntry.rawGrouping; // raw grouping value, never rewritten
      const isBorrowings = matchedEntry.normGrouping === 'borrowings';
      const status: MappingStatus = isBorrowings ? 'MAPPED_BORROWINGS' : 'MAPPED_NON_BORROWINGS';

      return {
        ...row,
        mappedGrouping:       grouping,
        mappedProductType:    matchedEntry.rawProductType,
        mappedInstrumentName: matchedEntry.rawInstrumentName,
        mappedFlowCode:       matchedEntry.rawFlowCode,
        mappedFlowCategoryDesc: matchedEntry.rawFlowCategoryDesc,
        mappingStatus:        status,
        mappingConfidence:    confidence,
        mappingReason:        `Matched via ${matchedOn} against Data Foundation row ${matchedEntry.sourceRowNumber}. Grouping: "${grouping}"`,
        matchedOn,
        borrowingsRelevant:   isBorrowings,
        ignored: false,
        ignoreRuleId: null,
        ignoreReason: null,
        ignoreCategory: null,
      };
    }

    // 5. No match — check borrowings relevance heuristic
    const relevant = isBorrowingsRelevant(row);

    // Also check if the raw updateTypeCode is known to be a borrowings code
    const updateTypeIsBorrowings = row.rawUpdateType
      ? borrowingsUpdateTypeCodes.has(row.rawUpdateType)
      : false;

    const borrowingsHint = relevant || updateTypeIsBorrowings;

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
        ? `No match in Data Foundation. Borrowings-relevance heuristic triggered on: ${[
            relevant ? 'product/portfolio keywords' : '',
            updateTypeIsBorrowings ? 'updateTypeCode matches known borrowings code' : '',
          ].filter(Boolean).join(', ')}`
        : `No match in Data Foundation. Insufficient signals to classify grouping.`,
      matchedOn: null,
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
  borrowingsRef: BorrowingsMappingEntry[],
  classified: ClassifiedCashflowRow[],
): WorkbookSession {
  const borrowingsRows      = classified.filter(r => r.mappingStatus === 'MAPPED_BORROWINGS');
  const nonBorrowingsRows   = classified.filter(r => r.mappingStatus === 'MAPPED_NON_BORROWINGS');
  const unmappedReviewRows  = classified.filter(r => r.mappingStatus === 'UNMAPPED_REVIEW');
  const ignoredRows         = classified.filter(r => r.mappingStatus === 'IGNORED_EXPLICIT');
  const insufficientDataRows = classified.filter(r => r.mappingStatus === 'INSUFFICIENT_DATA');

  const uniqueBorrowingsUpdateTypes = [
    ...new Set(borrowingsRows.map(r => r.rawUpdateType).filter(Boolean)),
  ].sort();

  const uniqueUnmappedUpdateTypes = [
    ...new Set(unmappedReviewRows.map(r => r.rawUpdateType).filter(Boolean)),
  ].sort();

  const parseSummary: ParseSummary = {
    totalDataFoundationRows:      dfRaw.length,
    totalCashflowRows:            cfRaw.length,
    totalMappedBorrowingsRows:    borrowingsRows.length,
    totalMappedNonBorrowingsRows: nonBorrowingsRows.length,
    totalUnmappedReviewRows:      unmappedReviewRows.length,
    totalIgnoredRows:             ignoredRows.length,
    totalInsufficientDataRows:    insufficientDataRows.length,
    uniqueBorrowingsUpdateTypes,
    uniqueUnmappedUpdateTypes,
    parseWarningsCount:           warnings.length,
  };

  const rawWorkbookMeta: RawWorkbookMeta = {
    fileName:      file.name,
    fileSize:      file.size,
    uploadedAt:    new Date().toISOString(),
    sheetNames,
    workbookValid: errors.length === 0,
    parseStatus:   errors.length > 0 ? 'failed' : warnings.length > 0 ? 'partial' : 'success',
    parseErrors:   errors,
    parseWarnings: warnings,
  };

  return {
    rawWorkbookMeta,
    dataFoundationRawRows:        dfRaw,
    dataFoundationNormalizedRows: dfNorm,
    cashflowRawRows:              cfRaw,
    cashflowNormalizedRows:       cfNorm,
    borrowingsMappingReference:   borrowingsRef,
    classifiedCashflowRows:       classified,
    borrowingsRows,
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

  // Stage D — Classification
  const borrowingsRef = buildBorrowingsMappingReference(dfNorm);
  const classified = stageD_classify(cfNorm, dfNorm, borrowingsRef);

  // Stage E — Assemble
  const session = stageE_assemble(
    file, sheetNames, errors, warnings,
    dfRaw, dfNorm, cfRaw, cfNorm,
    borrowingsRef, classified,
  );

  return { success: true, session };
}

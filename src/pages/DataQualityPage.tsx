/**
 * DataQualityPage — reusable QA/debug screen for workbook parsing output.
 *
 * Sections:
 *   1. Parse Summary — counts for each classification bucket
 *   2. Unmapped Review table — rows that could not be confidently classified
 *   3. Ignored Rows table — rows excluded by ignore rules
 *   4. Borrowings Mapping Coverage — unique update types mapped to borrowings
 */

import React, { useState } from 'react';
import {
  ArrowLeft, ClipboardList, LayoutDashboard, AlertTriangle,
  CheckCircle2, XCircle, Info, ChevronDown, ChevronUp,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { ClassifiedCashflowRow } from '../types/workbook';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function fmt(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  return n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

function Badge({ label, variant }: { label: string; variant: 'green' | 'amber' | 'red' | 'slate' | 'blue' }) {
  const styles = {
    green: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-700',
    red:   'bg-red-100 text-red-700',
    slate: 'bg-slate-100 text-slate-600',
    blue:  'bg-blue-100 text-blue-700',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${styles[variant]}`}>
      {label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Parse Summary section
// ─────────────────────────────────────────────────────────────────────────────
function ParseSummarySection() {
  const { workbookSession } = useApp();
  if (!workbookSession) return null;
  const s = workbookSession.parseSummary;
  const meta = workbookSession.rawWorkbookMeta;

  const statusColor = meta.parseStatus === 'success' ? 'text-emerald-600'
    : meta.parseStatus === 'partial' ? 'text-amber-600'
    : 'text-red-600';

  const items = [
    { label: 'Data Foundation rows',      value: s.totalDataFoundationRows,      variant: 'slate' as const },
    { label: 'TCL Cashflow rows',          value: s.totalCashflowRows,            variant: 'slate' as const },
    { label: 'Mapped — Borrowings',        value: s.totalMappedBorrowingsRows,    variant: 'green' as const },
    { label: 'Mapped — Non-Borrowings',    value: s.totalMappedNonBorrowingsRows, variant: 'blue' as const },
    { label: 'Unmapped — Review Required', value: s.totalUnmappedReviewRows,      variant: s.totalUnmappedReviewRows > 0 ? 'amber' as const : 'slate' as const },
    { label: 'Ignored (explicit rules)',   value: s.totalIgnoredRows,             variant: 'slate' as const },
    { label: 'Insufficient Data',          value: s.totalInsufficientDataRows,    variant: 'slate' as const },
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-start gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
          <ClipboardList size={18} className="text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-slate-900">Parse Summary</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {meta.fileName} · Status: <span className={`font-semibold ${statusColor}`}>{meta.parseStatus}</span>
          </p>
        </div>
      </div>

      {/* Metric grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {items.map(item => (
          <div key={item.label} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
            <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">{item.label}</p>
            <p className="text-xl font-bold text-slate-900" style={{ fontWeight: 700 }}>
              {item.value.toLocaleString('en-IN')}
            </p>
          </div>
        ))}
      </div>

      {/* Warnings */}
      {meta.parseWarnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-1 mt-2">
          <p className="text-xs font-semibold text-amber-800 flex items-center gap-1.5 mb-1.5">
            <AlertTriangle size={12} />
            {meta.parseWarnings.length} Parse Warning{meta.parseWarnings.length > 1 ? 's' : ''}
          </p>
          {meta.parseWarnings.map((w, i) => (
            <p key={i} className="text-xs text-amber-700 flex items-start gap-1.5">
              <span className="w-1 h-1 rounded-full bg-amber-500 flex-shrink-0 mt-1.5" />
              {w}
            </p>
          ))}
        </div>
      )}

      {/* Unique borrowings update types */}
      {s.uniqueBorrowingsUpdateTypes.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-semibold text-slate-700 mb-2">
            Borrowings — unique update type codes found ({s.uniqueBorrowingsUpdateTypes.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {s.uniqueBorrowingsUpdateTypes.map(code => (
              <Badge key={code} label={code} variant="green" />
            ))}
          </div>
        </div>
      )}

      {/* Unique unmapped update types */}
      {s.uniqueUnmappedUpdateTypes.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold text-slate-700 mb-2">
            Unmapped — unique update type codes found ({s.uniqueUnmappedUpdateTypes.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {s.uniqueUnmappedUpdateTypes.map(code => (
              <Badge key={code} label={code || '(empty)'} variant="amber" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Reusable data table with row limit / expand
// ─────────────────────────────────────────────────────────────────────────────
const PAGE_SIZE = 50;

function RowTable({
  rows,
  columns,
  emptyMessage,
}: {
  rows: ClassifiedCashflowRow[];
  columns: { header: string; render: (r: ClassifiedCashflowRow) => React.ReactNode }[];
  emptyMessage: string;
}) {
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(rows.length / PAGE_SIZE);
  const visible = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  if (rows.length === 0) {
    return (
      <div className="flex items-center gap-2 py-6 text-slate-400 text-sm">
        <CheckCircle2 size={16} className="text-emerald-500" />
        {emptyMessage}
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs text-slate-400 mb-2">
        Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, rows.length)} of {rows.length.toLocaleString('en-IN')} rows
      </p>
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {columns.map(col => (
                <th key={col.header} className="px-3 py-2.5 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visible.map((row, i) => (
              <tr key={`${row.sourceRowNumber}-${i}`} className="hover:bg-slate-50 transition-colors">
                {columns.map(col => (
                  <td key={col.header} className="px-3 py-2 text-slate-700 whitespace-nowrap">
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-slate-600 disabled:text-slate-300 disabled:border-slate-100 hover:bg-slate-50 cursor-pointer"
          >
            Previous
          </button>
          <span className="text-xs text-slate-500">Page {page + 1} of {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page === totalPages - 1}
            className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-slate-600 disabled:text-slate-300 disabled:border-slate-100 hover:bg-slate-50 cursor-pointer"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Collapsible section wrapper
// ─────────────────────────────────────────────────────────────────────────────
function Section({
  title,
  subtitle,
  count,
  icon,
  defaultOpen = false,
  children,
}: {
  title: string;
  subtitle: string;
  count: number;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 p-5 text-left hover:bg-slate-50 transition-colors cursor-pointer"
      >
        <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-900">{title}</span>
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              {count.toLocaleString('en-IN')}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
        </div>
        {open ? <ChevronUp size={16} className="text-slate-400 flex-shrink-0" /> : <ChevronDown size={16} className="text-slate-400 flex-shrink-0" />}
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Unmapped Review table
// ─────────────────────────────────────────────────────────────────────────────
function UnmappedReviewSection() {
  const { workbookSession } = useApp();
  if (!workbookSession) return null;
  const rows = workbookSession.unmappedReviewRows;

  const columns = [
    { header: 'Row #',             render: (r: ClassifiedCashflowRow) => <span className="text-slate-400">{r.sourceRowNumber}</span> },
    { header: 'Prd Type',          render: (r: ClassifiedCashflowRow) => r.rawPrdType || <span className="text-slate-300">—</span> },
    { header: 'Prd Type Desc',     render: (r: ClassifiedCashflowRow) => r.rawPrdTypeDesc || <span className="text-slate-300">—</span> },
    { header: 'UpdateType',        render: (r: ClassifiedCashflowRow) => r.rawUpdateType ? <code className="bg-slate-100 px-1 rounded text-[10px]">{r.rawUpdateType}</code> : <span className="text-slate-300">—</span> },
    { header: 'Update Type Desc',  render: (r: ClassifiedCashflowRow) => r.rawUpdateTypeDesc || <span className="text-slate-300">—</span> },
    { header: 'Amt in PC',         render: (r: ClassifiedCashflowRow) => r.parsedAmtInPc !== null ? fmt(r.parsedAmtInPc) : <span className="text-slate-300">—</span> },
    { header: 'Portfolio Name',    render: (r: ClassifiedCashflowRow) => r.rawPortfolioName || <span className="text-slate-300">—</span> },
    {
      header: 'Borrow Relevant',
      render: (r: ClassifiedCashflowRow) => r.borrowingsRelevant
        ? <Badge label="Yes" variant="amber" />
        : <Badge label="No" variant="slate" />,
    },
    { header: 'Mapping Reason',    render: (r: ClassifiedCashflowRow) => <span className="text-slate-400 max-w-xs truncate block" title={r.mappingReason}>{r.mappingReason}</span> },
  ];

  return (
    <Section
      title="Unmapped — Review Required"
      subtitle="Rows that could not be confidently matched to Data Foundation. Borrowings-relevant rows are flagged."
      count={rows.length}
      icon={<AlertTriangle size={16} className="text-amber-500" />}
      defaultOpen={rows.length > 0}
    >
      <RowTable
        rows={rows}
        columns={columns}
        emptyMessage="No unmapped rows — all cashflow rows were successfully classified."
      />
    </Section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Ignored rows table
// ─────────────────────────────────────────────────────────────────────────────
function IgnoredRowsSection() {
  const { workbookSession } = useApp();
  if (!workbookSession) return null;
  const rows = workbookSession.ignoredRows;

  const categoryVariant = (cat: string | null): 'amber' | 'blue' | 'slate' | 'red' => {
    if (cat === 'FOREX') return 'blue';
    if (cat === 'VALUATION') return 'amber';
    if (cat === 'INVESTMENTS') return 'green' as never;
    return 'slate';
  };

  const columns = [
    { header: 'Row #',               render: (r: ClassifiedCashflowRow) => <span className="text-slate-400">{r.sourceRowNumber}</span> },
    { header: 'Category',            render: (r: ClassifiedCashflowRow) => r.ignoreCategory ? <Badge label={r.ignoreCategory} variant={categoryVariant(r.ignoreCategory)} /> : <span className="text-slate-300">—</span> },
    { header: 'UpdateType',          render: (r: ClassifiedCashflowRow) => r.rawUpdateType ? <code className="bg-slate-100 px-1 rounded text-[10px]">{r.rawUpdateType}</code> : <span className="text-slate-300">—</span> },
    { header: 'Update Type Desc',    render: (r: ClassifiedCashflowRow) => <span className="text-slate-600 max-w-[160px] truncate block" title={r.rawUpdateTypeDesc}>{r.rawUpdateTypeDesc || <span className="text-slate-300">—</span>}</span> },
    { header: 'Prd Type',            render: (r: ClassifiedCashflowRow) => r.rawPrdType || <span className="text-slate-300">—</span> },
    { header: 'Prd Type Desc',       render: (r: ClassifiedCashflowRow) => <span className="text-slate-600 max-w-[140px] truncate block" title={r.rawPrdTypeDesc}>{r.rawPrdTypeDesc || <span className="text-slate-300">—</span>}</span> },
    { header: 'Ignore Rule',         render: (r: ClassifiedCashflowRow) => r.ignoreRuleId ? <code className="bg-red-50 text-red-600 px-1 rounded text-[10px]">{r.ignoreRuleId}</code> : <span className="text-slate-300">—</span> },
    { header: 'Ignore Reason',       render: (r: ClassifiedCashflowRow) => <span className="text-slate-400 max-w-xs truncate block" title={r.ignoreReason ?? ''}>{r.ignoreReason ?? '—'}</span> },
  ];

  return (
    <Section
      title="Ignored Rows"
      subtitle="Rows excluded by configured ignore rules. These are not included in any analysis."
      count={rows.length}
      icon={<XCircle size={16} className="text-slate-400" />}
      defaultOpen={false}
    >
      <RowTable
        rows={rows}
        columns={columns}
        emptyMessage="No rows were explicitly ignored."
      />
    </Section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Borrowings mapping coverage table
// ─────────────────────────────────────────────────────────────────────────────
function BorrowingsCoverageSection() {
  const { workbookSession } = useApp();
  if (!workbookSession) return null;

  const borrowingsRows = workbookSession.borrowingsRows;

  // Group by rawUpdateType + rawUpdateTypeDesc to show coverage
  type CoverageEntry = {
    rawUpdateType: string;
    rawUpdateTypeDesc: string;
    rowCount: number;
    totalAmount: number;
    mappingStatus: string;
  };

  const coverageMap: Record<string, CoverageEntry> = {};
  for (const r of borrowingsRows) {
    const key = `${r.rawUpdateType}||${r.rawUpdateTypeDesc}`;
    if (!coverageMap[key]) {
      coverageMap[key] = {
        rawUpdateType:     r.rawUpdateType,
        rawUpdateTypeDesc: r.rawUpdateTypeDesc,
        rowCount:          0,
        totalAmount:       0,
        mappingStatus:     r.mappingStatus,
      };
    }
    coverageMap[key].rowCount++;
    coverageMap[key].totalAmount += r.parsedAmtInPc ?? 0;
  }

  const coverageEntries = Object.values(coverageMap).sort((a, b) => b.totalAmount - a.totalAmount);

  return (
    <Section
      title="Borrowings Mapping Coverage"
      subtitle="Unique UpdateType codes and descriptions mapped to Borrowings grouping."
      count={coverageEntries.length}
      icon={<CheckCircle2 size={16} className="text-emerald-500" />}
      defaultOpen={true}
    >
      {coverageEntries.length === 0 ? (
        <div className="flex items-center gap-2 py-6 text-slate-400 text-sm">
          <Info size={16} />
          No borrowings rows mapped yet. Ensure Data Foundation sheet has rows with Grouping = "Borrowings".
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">UpdateType</th>
                <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Update Type Desc</th>
                <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Row Count</th>
                <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Total Amount</th>
                <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {coverageEntries.map((entry, i) => (
                <tr key={i} className="hover:bg-slate-50 transition-colors">
                  <td className="px-3 py-2">
                    {entry.rawUpdateType ? (
                      <code className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">{entry.rawUpdateType}</code>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-slate-700">{entry.rawUpdateTypeDesc || <span className="text-slate-300">—</span>}</td>
                  <td className="px-3 py-2 text-slate-700 font-medium">{entry.rowCount.toLocaleString('en-IN')}</td>
                  <td className="px-3 py-2 text-slate-700">{fmt(entry.totalAmount)}</td>
                  <td className="px-3 py-2">
                    <Badge label="MAPPED_BORROWINGS" variant="green" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main DataQualityPage
// ─────────────────────────────────────────────────────────────────────────────
export function DataQualityPage() {
  const { navigateTo, workbookSession } = useApp();

  if (!workbookSession) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#f8fafc' }}>
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-5xl mx-auto px-6 py-4">
            <button
              onClick={() => navigateTo('upload')}
              className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors cursor-pointer font-medium"
            >
              <ArrowLeft size={15} />
              Back to Upload
            </button>
          </div>
        </div>
        <div className="max-w-5xl mx-auto px-6 py-12 text-center">
          <p className="text-slate-400 text-sm">No workbook session found. Please upload a file first.</p>
          <button onClick={() => navigateTo('upload')} className="btn-primary mt-4">
            Upload File
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f8fafc' }}>
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => navigateTo('upload')}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors cursor-pointer font-medium"
          >
            <ArrowLeft size={15} />
            Back
          </button>
          <button
            onClick={() => navigateTo('app')}
            className="btn-primary text-xs gap-1.5"
          >
            <LayoutDashboard size={13} />
            Continue to Application
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-1" style={{ letterSpacing: '-0.02em' }}>
            Data Quality Report
          </h1>
          <p className="text-sm text-slate-500">
            Review parsing results, unmapped rows, and borrowings coverage before proceeding to the dashboard.
          </p>
        </div>

        <div className="space-y-4">
          <ParseSummarySection />
          <BorrowingsCoverageSection />
          <UnmappedReviewSection />
          <IgnoredRowsSection />
        </div>
      </div>
    </div>
  );
}

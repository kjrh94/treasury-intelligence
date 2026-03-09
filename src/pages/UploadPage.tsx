import React, { useState, useRef, useCallback } from 'react';
import {
  ArrowLeft, Upload, FileSpreadsheet, CheckCircle2, AlertCircle,
  X, FileCheck, LayoutDashboard, ClipboardList,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { parseWorkbook, validateUpload } from '../lib/workbookParser';
import type { UploadState } from '../types';
import type { WorkbookSession } from '../types/workbook';

const MAX_SIZE_MB = 50;
const ACCEPTED = ['.xlsx', '.xls'];

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function validateFile(file: File): UploadState {
  const clientError = validateUpload(file);
  if (clientError) return clientError;
  return 'selected';
}

// ─────────────────────────────────────────────────────────────────────────────
// Parsing progress animation
// ─────────────────────────────────────────────────────────────────────────────
function ParsingProgress({ fileName }: { fileName: string }) {
  const [progress, setProgress] = React.useState(0);

  React.useEffect(() => {
    const steps = [10, 25, 42, 58, 72, 85, 95, 100];
    let i = 0;
    const timer = setInterval(() => {
      if (i < steps.length) {
        setProgress(steps[i]);
        i++;
      } else {
        clearInterval(timer);
      }
    }, 320);
    return () => clearInterval(timer);
  }, []);

  const stageLabels = [
    { label: 'Validating workbook structure',        done: progress > 15 },
    { label: 'Reading Data Foundation sheet',         done: progress > 30 },
    { label: 'Reading TCL Cashflow sheet',            done: progress > 50 },
    { label: 'Normalizing fields',                    done: progress > 65 },
    { label: 'Classifying borrowings transactions',   done: progress > 80 },
    { label: 'Building data quality summary',         done: progress >= 100 },
  ];

  return (
    <div className="flex flex-col items-center gap-5 py-6">
      <div className="relative w-16 h-16">
        <div className="w-16 h-16 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <FileSpreadsheet size={18} className="text-blue-600" />
        </div>
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-slate-900 mb-0.5">Parsing your file…</p>
        <p className="text-xs text-slate-500">{fileName}</p>
      </div>
      <div className="w-64">
        <div className="flex justify-between text-xs text-slate-500 mb-1.5">
          <span>Processing</span>
          <span>{progress}%</span>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      <div className="space-y-1.5 text-left w-64">
        {stageLabels.map(step => (
          <div key={step.label} className="flex items-center gap-2">
            <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 transition-colors duration-300 ${
              step.done ? 'bg-emerald-100' : 'bg-slate-100'
            }`}>
              {step.done
                ? <CheckCircle2 size={11} className="text-emerald-600" />
                : <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
              }
            </div>
            <span className={`text-xs transition-colors duration-300 ${step.done ? 'text-slate-700 font-medium' : 'text-slate-400'}`}>
              {step.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Upload success screen
// ─────────────────────────────────────────────────────────────────────────────
function UploadSuccess({ session, onContinue, onDataQuality }: {
  session: WorkbookSession;
  onContinue: () => void;
  onDataQuality: () => void;
}) {
  const s = session.parseSummary;
  const meta = session.rawWorkbookMeta;

  const summaryItems = [
    { label: 'Total cashflow rows parsed',  value: s.totalCashflowRows.toLocaleString('en-IN'), color: 'text-slate-900' },
    { label: 'Borrowings rows mapped',       value: s.totalMappedBorrowingsRows.toLocaleString('en-IN'), color: 'text-emerald-700' },
    { label: 'Unmapped review rows found',   value: s.totalUnmappedReviewRows.toLocaleString('en-IN'), color: s.totalUnmappedReviewRows > 0 ? 'text-amber-700' : 'text-slate-500' },
    { label: 'Ignored rows',                 value: s.totalIgnoredRows.toLocaleString('en-IN'), color: 'text-slate-500' },
  ];

  return (
    <div className="card p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
          <CheckCircle2 size={24} className="text-emerald-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">File processed successfully</p>
          <p className="text-xs text-slate-500 mt-0.5">{meta.fileName} · {formatSize(meta.fileSize)}</p>
          {meta.parseWarnings.length > 0 && (
            <p className="text-xs text-amber-600 mt-1">
              {meta.parseWarnings.length} warning{meta.parseWarnings.length > 1 ? 's' : ''} detected
            </p>
          )}
        </div>
      </div>

      {/* Summary grid */}
      <div className="grid grid-cols-2 gap-3">
        {summaryItems.map(item => (
          <div key={item.label} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
            <p className="text-xs text-slate-500 mb-1">{item.label}</p>
            <p className={`text-lg font-bold ${item.color}`} style={{ fontWeight: 700 }}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* Warnings list */}
      {meta.parseWarnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-1">
          <p className="text-xs font-semibold text-amber-800 mb-1.5">Parse Warnings</p>
          {meta.parseWarnings.map((w, i) => (
            <p key={i} className="text-xs text-amber-700 flex items-start gap-1.5">
              <span className="w-1 h-1 rounded-full bg-amber-500 flex-shrink-0 mt-1.5" />
              {w}
            </p>
          ))}
        </div>
      )}

      {/* CTAs */}
      <div className="flex flex-col gap-2.5 pt-1">
        <button
          onClick={onContinue}
          className="btn-primary w-full justify-center gap-2"
        >
          <LayoutDashboard size={15} />
          Continue to Application
        </button>
        <button
          onClick={onDataQuality}
          className="btn-secondary w-full justify-center gap-2"
        >
          <ClipboardList size={15} />
          View Data Quality
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Dropzone
// ─────────────────────────────────────────────────────────────────────────────
interface DropzoneProps {
  state: UploadState;
  file: File | null;
  missingSheets?: string[];
  onFile: (file: File) => void;
  onClear: () => void;
  onSubmit: () => void;
}

function Dropzone({ state, file, missingSheets, onFile, onClear, onSubmit }: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) onFile(dropped);
  }, [onFile]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };
  const handleDragLeave = () => setDragOver(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) onFile(f);
    // Reset input so same file can be re-selected
    e.target.value = '';
  };

  const isError = ['error-type', 'error-size', 'error-unreadable', 'error-missing-sheets'].includes(state);

  if (state === 'parsing') {
    return (
      <div className="card p-6">
        <ParsingProgress fileName={file?.name ?? ''} />
      </div>
    );
  }

  return (
    <div className="card p-4">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => state === 'idle' && inputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-xl p-10 flex flex-col items-center gap-4 transition-all duration-200
          ${dragOver
            ? 'border-blue-400 bg-blue-50 scale-[1.01]'
            : state === 'selected'
            ? 'border-emerald-300 bg-emerald-50'
            : isError
            ? 'border-red-300 bg-red-50'
            : 'border-slate-200 bg-slate-50/50 hover:border-blue-300 hover:bg-blue-50/30 cursor-pointer'
          }
        `}
      >
        {state === 'selected' && file ? (
          <>
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center">
              <FileCheck size={26} className="text-emerald-600" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-slate-900 mb-0.5">{file.name}</p>
              <p className="text-xs text-slate-500">{formatSize(file.size)}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={onSubmit} className="btn-primary">
                <Upload size={14} />
                Process File
              </button>
              <button onClick={(e) => { e.stopPropagation(); onClear(); }} className="btn-ghost text-slate-500">
                <X size={14} />
                Remove
              </button>
            </div>
          </>
        ) : state === 'error-type' ? (
          <>
            <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center">
              <AlertCircle size={26} className="text-red-500" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-red-700 mb-1">Invalid file type</p>
              <p className="text-xs text-red-500">Only .xlsx and .xls files are accepted</p>
            </div>
            <button onClick={onClear} className="btn-secondary text-xs">Try again</button>
          </>
        ) : state === 'error-size' ? (
          <>
            <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center">
              <AlertCircle size={26} className="text-red-500" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-red-700 mb-1">File too large</p>
              <p className="text-xs text-red-500">Maximum file size is {MAX_SIZE_MB} MB</p>
            </div>
            <button onClick={onClear} className="btn-secondary text-xs">Try again</button>
          </>
        ) : state === 'error-unreadable' ? (
          <>
            <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center">
              <AlertCircle size={26} className="text-red-500" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-red-700 mb-1">File could not be read</p>
              <p className="text-xs text-red-500">The file may be corrupted or password-protected</p>
            </div>
            <button onClick={onClear} className="btn-secondary text-xs">Try again</button>
          </>
        ) : state === 'error-missing-sheets' ? (
          <>
            <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center">
              <AlertCircle size={26} className="text-red-500" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-red-700 mb-1">Required sheets not found</p>
              <p className="text-xs text-red-500 mb-2">
                The workbook must contain: <strong>Data Foundation</strong> and <strong>TCL Cashflow</strong>
              </p>
              {missingSheets && missingSheets.length > 0 && (
                <p className="text-xs text-red-400">
                  Missing: {missingSheets.join(', ')}
                </p>
              )}
            </div>
            <button onClick={onClear} className="btn-secondary text-xs">Try again</button>
          </>
        ) : (
          <>
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${dragOver ? 'bg-blue-200' : 'bg-blue-100'}`}>
              <Upload size={26} className="text-blue-600" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-slate-900 mb-1">
                {dragOver ? 'Drop your file here' : 'Drag and drop your Excel file'}
              </p>
              <p className="text-xs text-slate-500">or click to browse</p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
              className="btn-primary"
            >
              Select File
            </button>
          </>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(',')}
        className="hidden"
        onChange={handleChange}
        aria-label="Select Excel file"
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// File requirements card
// ─────────────────────────────────────────────────────────────────────────────
function FileRequirements() {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center">
          <CheckCircle2 size={13} className="text-blue-600" />
        </div>
        <span className="text-sm font-semibold text-slate-900">File Requirements</span>
      </div>
      <ul className="space-y-2.5">
        {[
          'Accepted formats: .xlsx, .xls',
          'Maximum file size: 50 MB',
          'Must contain sheet: Data Foundation',
          'Must contain sheet: TCL Cashflow',
        ].map(req => (
          <li key={req} className="flex items-start gap-2.5">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />
            <span className="text-sm text-blue-700">{req}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Upload Page
// ─────────────────────────────────────────────────────────────────────────────
export function UploadPage() {
  const { navigateTo, setUploadedFile, setWorkbookSession } = useApp();
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [missingSheets, setMissingSheets] = useState<string[] | undefined>(undefined);
  const [successSession, setSuccessSession] = useState<WorkbookSession | null>(null);

  const handleFile = (file: File) => {
    const state = validateFile(file);
    setSelectedFile(state === 'selected' ? file : null);
    setUploadState(state);
    setMissingSheets(undefined);
    setSuccessSession(null);
  };

  const handleClear = () => {
    setSelectedFile(null);
    setUploadState('idle');
    setMissingSheets(undefined);
    setSuccessSession(null);
  };

  const handleSubmit = async () => {
    if (!selectedFile) return;
    setUploadState('parsing');

    const result = await parseWorkbook(selectedFile);

    if (!result.success) {
      if (result.error === 'error-missing-sheets') {
        setMissingSheets(result.missingSheets);
      }
      setUploadState(result.error);
      return;
    }

    const session = result.session;
    setWorkbookSession(session);
    setUploadedFile({
      name: selectedFile.name,
      size: selectedFile.size,
      uploadedAt: new Date().toISOString(),
      status: 'success',
    });
    setSuccessSession(session);
    setUploadState('success');
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f8fafc' }}>
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-6 py-4">
          <button
            onClick={() => navigateTo('landing')}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors cursor-pointer font-medium"
          >
            <ArrowLeft size={15} />
            Back to Home
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2" style={{ letterSpacing: '-0.02em' }}>
            Upload Treasury Data
          </h1>
          <p className="text-base text-slate-500">Import your Excel workbook to begin analysis.</p>
        </div>

        <div className="space-y-4">
          {uploadState === 'success' && successSession ? (
            <UploadSuccess
              session={successSession}
              onContinue={() => navigateTo('app')}
              onDataQuality={() => navigateTo('data-quality')}
            />
          ) : (
            <>
              <Dropzone
                state={uploadState}
                file={selectedFile}
                missingSheets={missingSheets}
                onFile={handleFile}
                onClear={handleClear}
                onSubmit={handleSubmit}
              />
              {uploadState !== 'parsing' && <FileRequirements />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

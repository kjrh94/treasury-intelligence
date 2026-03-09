import React, { useState, useRef, useCallback } from 'react';
import { ArrowLeft, Upload, FileSpreadsheet, CheckCircle2, AlertCircle, X, FileCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { UploadState } from '../types';

const MAX_SIZE_MB = 50;
const ACCEPTED = ['.xlsx', '.xls'];

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function validateFile(file: File): UploadState {
  const ext = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!ACCEPTED.includes(ext)) return 'error-type';
  if (file.size > MAX_SIZE_MB * 1024 * 1024) return 'error-size';
  return 'selected';
}

// --- Parsing Progress ---
function ParsingProgress({ fileName }: { fileName: string }) {
  const [progress, setProgress] = React.useState(0);

  React.useEffect(() => {
    const steps = [15, 35, 55, 72, 88, 97, 100];
    let i = 0;
    const timer = setInterval(() => {
      if (i < steps.length) {
        setProgress(steps[i]);
        i++;
      } else {
        clearInterval(timer);
      }
    }, 280);
    return () => clearInterval(timer);
  }, []);

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
          <span>Analysing transaction data</span>
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
        {[
          { label: 'Reading workbook structure', done: progress > 20 },
          { label: 'Identifying data columns', done: progress > 40 },
          { label: 'Classifying transactions', done: progress > 60 },
          { label: 'Building portfolio view', done: progress > 80 },
          { label: 'Generating AI insights', done: progress >= 100 },
        ].map(step => (
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

// --- Dropzone ---
interface DropzoneProps {
  state: UploadState;
  file: File | null;
  onFile: (file: File) => void;
  onClear: () => void;
  onSubmit: () => void;
}

function Dropzone({ state, file, onFile, onClear, onSubmit }: DropzoneProps) {
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
  };

  if (state === 'parsing') {
    return (
      <div className="card p-6">
        <ParsingProgress fileName={file?.name ?? ''} />
      </div>
    );
  }

  return (
    <div className="card p-4">
      {/* Dropzone area */}
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
            : state === 'error-type' || state === 'error-size'
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
              <button
                onClick={(e) => { e.stopPropagation(); onClear(); }}
                className="btn-ghost text-slate-500"
              >
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
              <p className="text-xs text-red-500">Maximum file size is 50 MB</p>
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
        accept=".xlsx,.xls"
        className="hidden"
        onChange={handleChange}
        aria-label="Select Excel file"
      />
    </div>
  );
}

// --- File Requirements ---
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
          'Must contain transaction data with dates and amounts',
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

// --- Main Upload Page ---
export function UploadPage() {
  const { navigateTo, setUploadedFile } = useApp();
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFile = (file: File) => {
    const state = validateFile(file);
    setSelectedFile(state === 'selected' ? file : null);
    setUploadState(state);
  };

  const handleClear = () => {
    setSelectedFile(null);
    setUploadState('idle');
  };

  const handleSubmit = () => {
    if (!selectedFile) return;
    setUploadState('parsing');

    // Simulate parse and navigate
    setTimeout(() => {
      setUploadedFile({
        name: selectedFile.name,
        size: selectedFile.size,
        uploadedAt: new Date().toISOString(),
        status: 'success',
      });
      navigateTo('app');
    }, 2400);
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
          <p className="text-base text-slate-500">Import an Excel file to begin analysis.</p>
        </div>

        <div className="space-y-4">
          <Dropzone
            state={uploadState}
            file={selectedFile}
            onFile={handleFile}
            onClear={handleClear}
            onSubmit={handleSubmit}
          />
          {uploadState !== 'parsing' && <FileRequirements />}
        </div>
      </div>
    </div>
  );
}

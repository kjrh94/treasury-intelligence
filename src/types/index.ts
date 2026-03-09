export type UploadState =
  | 'idle'
  | 'drag-over'
  | 'selected'
  | 'validating'
  | 'parsing'
  | 'success'
  | 'error-type'
  | 'error-size';

export interface UploadedFile {
  name: string;
  size: number;
  uploadedAt: string;
  status: 'success';
}

export type BorrowingsTab = 'portfolio' | 'expense-tracking' | 'repayments';
export type MainModule = 'borrowings' | 'investments' | 'foreign-debt';
export type AppPage = 'landing' | 'upload' | 'app';

export interface AppState {
  page: AppPage;
  uploadedFile: UploadedFile | null;
  activeModule: MainModule;
  activeBorrowingsTab: BorrowingsTab;
  period: string;
}

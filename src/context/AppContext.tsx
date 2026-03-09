import React, { createContext, useContext, useState, useCallback } from 'react';
import type { AppState, AppPage, BorrowingsTab, MainModule, UploadedFile, ParsedData } from '../types';
import type { WorkbookSession } from '../types/workbook';

interface AppContextType extends AppState {
  navigateTo: (page: AppPage) => void;
  setUploadedFile: (file: UploadedFile) => void;
  setActiveModule: (module: MainModule) => void;
  setActiveBorrowingsTab: (tab: BorrowingsTab) => void;
  setPeriod: (period: string) => void;
  // Legacy chart data (used by existing tabs, fed from mock until borrowings logic is wired)
  parsedData: ParsedData | null;
  setParsedData: (data: ParsedData) => void;
  // Workbook session — the full trustworthy parsed output from this phase
  workbookSession: WorkbookSession | null;
  setWorkbookSession: (session: WorkbookSession) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>({
    page: 'landing',
    uploadedFile: null,
    activeModule: 'borrowings',
    activeBorrowingsTab: 'portfolio',
    period: 'Monthly',
  });

  const [parsedData, setParsedDataState] = useState<ParsedData | null>(null);
  const [workbookSession, setWorkbookSessionState] = useState<WorkbookSession | null>(null);

  const navigateTo = useCallback((page: AppPage) => {
    setState(prev => ({ ...prev, page }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const setUploadedFile = useCallback((file: UploadedFile) => {
    setState(prev => ({ ...prev, uploadedFile: file }));
  }, []);

  const setActiveModule = useCallback((module: MainModule) => {
    setState(prev => ({ ...prev, activeModule: module }));
  }, []);

  const setActiveBorrowingsTab = useCallback((tab: BorrowingsTab) => {
    setState(prev => ({ ...prev, activeBorrowingsTab: tab }));
  }, []);

  const setPeriod = useCallback((period: string) => {
    setState(prev => ({ ...prev, period }));
  }, []);

  const setParsedData = useCallback((data: ParsedData) => {
    setParsedDataState(data);
  }, []);

  const setWorkbookSession = useCallback((session: WorkbookSession) => {
    setWorkbookSessionState(session);
  }, []);

  return (
    <AppContext.Provider value={{
      ...state,
      navigateTo,
      setUploadedFile,
      setActiveModule,
      setActiveBorrowingsTab,
      setPeriod,
      parsedData,
      setParsedData,
      workbookSession,
      setWorkbookSession,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

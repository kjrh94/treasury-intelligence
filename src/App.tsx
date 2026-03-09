import { AppProvider, useApp } from './context/AppContext';
import { LandingPage } from './pages/LandingPage';
import { UploadPage } from './pages/UploadPage';
import { AppShell } from './pages/AppShell';
import './index.css';

function AppRouter() {
  const { page } = useApp();

  switch (page) {
    case 'landing':
      return <LandingPage />;
    case 'upload':
      return <UploadPage />;
    case 'app':
      return <AppShell />;
    default:
      return <LandingPage />;
  }
}

function App() {
  return (
    <AppProvider>
      <AppRouter />
    </AppProvider>
  );
}

export default App;

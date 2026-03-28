import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { SettingsProvider } from './contexts/SettingsContext';

const LandingPage = lazy(() => import('./pages/LandingPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));

function AppShellFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fdfcfb]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin" />
        <p className="text-[#717171] font-medium">Loading...</p>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <Router>
          <Suspense fallback={<AppShellFallback />}>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/admin/*" element={<AdminPage />} />
            </Routes>
          </Suspense>
        </Router>
      </SettingsProvider>
    </AuthProvider>
  );
}

export default App;

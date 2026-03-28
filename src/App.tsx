import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import AdminPage from './pages/AdminPage';
import LoginPage from './pages/LoginPage';
import { AuthProvider } from './contexts/AuthContext';
import { SettingsProvider } from './contexts/SettingsContext';

function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <Router>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/admin/*" element={<AdminPage />} />
          </Routes>
        </Router>
      </SettingsProvider>
    </AuthProvider>
  );
}

export default App;

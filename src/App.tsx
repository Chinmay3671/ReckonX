import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { NavigationProvider } from './context/NavigationContext';
import { Toast } from './components/Toast';

import { SplashPage } from './pages/SplashPage';
import { LoginPage } from './pages/LoginPage';
import { PermissionsPage } from './pages/PermissionsPage';
import { ExplorePage } from './pages/ExplorePage';
import { RouteSetupPage } from './pages/RouteSetupPage';
import { NavigationHudPage } from './pages/NavigationHudPage';
import { TelemetryPage } from './pages/TelemetryPage';
import { SummaryPage } from './pages/SummaryPage';
import { ProfilePage } from './pages/ProfilePage';

export const App: React.FC = () => {
  return (
    <NavigationProvider>
      <Router>
        <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] selection:bg-blue-100 selection:text-blue-900">
          <Routes>
            <Route path="/" element={<SplashPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/permissions" element={<PermissionsPage />} />
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/route-setup" element={<RouteSetupPage />} />
            <Route path="/navigation" element={<NavigationHudPage />} />
            <Route path="/telemetry" element={<TelemetryPage />} />
            <Route path="/summary" element={<SummaryPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Toast />
        </div>
      </Router>
    </NavigationProvider>
  );
};

export default App;

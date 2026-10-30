import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './hooks/useAuth';
import { AppLayout } from './components/layout/AppLayout';

// Pages
import { LoginPage } from './pages/auth/LoginPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { InstitutionsPage } from './pages/institutions/InstitutionsPage';
import { InstitutionDetailPage } from './pages/institutions/InstitutionDetailPage';
import { FDRRegisterPage } from './pages/fdr/FDRRegisterPage';
import { FDRDetailPage } from './pages/fdr/FDRDetailPage';
import { NewFDRPage } from './pages/fdr/NewFDRPage';
import { VerificationQueuePage } from './pages/verification/VerificationQueuePage';
import { VerificationCasePage } from './pages/verification/VerificationCasePage';
import { RelationshipGraphPage } from './pages/graph/RelationshipGraphPage';
import { LineageExplorerPage } from './pages/lineage/LineageExplorerPage';
import { VerificationPassportPage } from './pages/passport/VerificationPassportPage';
import { ComplianceRadarPage } from './pages/compliance/ComplianceRadarPage';
import { RenewalCalendarPage } from './pages/calendar/RenewalCalendarPage';
import { ReleaseRequestsPage } from './pages/release/ReleaseRequestsPage';
import { ReleaseRequestDetailPage } from './pages/release/ReleaseRequestDetailPage';
import { ClearanceCommandCenterPage } from './pages/clearance/ClearanceCommandCenterPage';
import { ClearanceWorkflowDetailPage } from './pages/clearance/ClearanceWorkflowDetailPage';
import { ReportsPage } from './pages/reports/ReportsPage';
import { AdminPage } from './pages/admin/AdminPage';
import { Spinner } from './components/ui';

// Protected Route Wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode; adminOnly?: boolean }> = ({
  children,
  adminOnly = false,
}) => {
  const { isAuthenticated, isLoading, isAdmin } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        <Spinner size="lg" label="Authorizing session..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  const { initAuth } = useAuth();

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#0f172a',
            color: '#fff',
            fontSize: '12px',
            borderRadius: '10px',
            padding: '12px 16px',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#f43f5e',
              secondary: '#fff',
            },
          },
        }}
      />
      <Routes>
        {/* Public route */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected App Layout routes */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/institutions" element={<InstitutionsPage />} />
          <Route path="/institutions/:id" element={<InstitutionDetailPage />} />
          <Route path="/fdrs" element={<FDRRegisterPage />} />
          <Route path="/fdrs/new" element={<NewFDRPage />} />
          <Route path="/fdrs/:id" element={<FDRDetailPage />} />
          <Route path="/verification" element={<VerificationQueuePage />} />
          <Route path="/verification/:caseId" element={<VerificationCasePage />} />
          <Route path="/graph" element={<RelationshipGraphPage />} />
          <Route path="/lineage" element={<LineageExplorerPage />} />
          <Route path="/passport" element={<VerificationPassportPage />} />
          <Route path="/passport/:caseId" element={<VerificationPassportPage />} />
          <Route path="/compliance" element={<ComplianceRadarPage />} />
          <Route path="/calendar" element={<RenewalCalendarPage />} />
          <Route path="/release" element={<ReleaseRequestsPage />} />
          <Route path="/release/:id" element={<ReleaseRequestDetailPage />} />
          <Route path="/clearance" element={<ClearanceCommandCenterPage />} />
          <Route path="/clearance/:id" element={<ClearanceWorkflowDetailPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute adminOnly>
                <AdminPage />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;

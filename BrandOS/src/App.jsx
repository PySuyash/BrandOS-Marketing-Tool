import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { AppShell } from './components/AppShell.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { OverviewPage } from './pages/OverviewPage.jsx';
import { NewReviewPage } from './pages/NewReviewPage.jsx';
import { SubmissionsPage } from './pages/SubmissionsPage.jsx';
import { SubmissionDetailPage } from './pages/SubmissionDetailPage.jsx';
import { KnowledgeBasePage } from './pages/KnowledgeBasePage.jsx';
import { ApprovalsPage } from './pages/ApprovalsPage.jsx';
import { VersionHistoryPage } from './pages/VersionHistoryPage.jsx';
import { TeamPage } from './pages/TeamPage.jsx';
import { SettingsPage } from './pages/SettingsPage.jsx';

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-sm text-slate-500">
        Loading BrandOS workspace...
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  return <AppShell>{children}</AppShell>;
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <OverviewPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/review/new"
              element={
                <ProtectedRoute roles={['Admin', 'Creator']}>
                  <NewReviewPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/submissions"
              element={
                <ProtectedRoute>
                  <SubmissionsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/submissions/:id"
              element={
                <ProtectedRoute>
                  <SubmissionDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/submissions/:id/versions"
              element={
                <ProtectedRoute>
                  <VersionHistoryPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/knowledge"
              element={
                <ProtectedRoute>
                  <KnowledgeBasePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/approvals"
              element={
                <ProtectedRoute roles={['Admin', 'Manager', 'Reviewer']}>
                  <ApprovalsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/versions"
              element={
                <ProtectedRoute>
                  <VersionHistoryPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/team"
              element={
                <ProtectedRoute roles={['Admin', 'Manager']}>
                  <TeamPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <SettingsPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
}

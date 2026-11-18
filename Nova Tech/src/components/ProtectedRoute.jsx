import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { PageLoadingState } from './LoadingSkeleton.jsx';

export default function ProtectedRoute({
  children,
  requireAdmin = false,
  requireEmployee = false,
}) {
  const { user, loading, isAuthenticated, isEmployee, isAdmin } = useAuth();
  const location = useLocation();

  if (loading) {
    return <PageLoadingState label="Verifying authenticated session..." />;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  if (requireEmployee && !isEmployee) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

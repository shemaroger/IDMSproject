// Check your ProtectedRoute.jsx file - Make sure AdminRoute exists and works

import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Base Protected Route
const ProtectedRoute = ({ children, requiredRole = null }) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  console.log('ProtectedRoute check:', { 
    isAuthenticated, 
    isLoading, 
    userRole: user?.role?.name, 
    requiredRole 
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    console.log('Not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user?.role?.name !== requiredRole) {
    console.log(`Role mismatch: Required ${requiredRole}, but user has ${user?.role?.name}`);
    return <Navigate to="/unauthorized" replace />;
  }

  console.log('Access granted, rendering children');
  return children;
};

// Admin Route Component
export const AdminRoute = ({ children }) => {
  console.log('AdminRoute component rendered');
  return (
    <ProtectedRoute requiredRole="Admin">
      {children}
    </ProtectedRoute>
  );
};

// Patient Route Component
export const PatientRoute = ({ children }) => {
  return (
    <ProtectedRoute requiredRole="Patient">
      {children}
    </ProtectedRoute>
  );
};

// Provider Route Component (for Doctor/Nurse)
export const ProviderRoute = ({ children }) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const userRole = user?.role?.name;
  if (!['Doctor', 'Nurse'].includes(userRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default ProtectedRoute;
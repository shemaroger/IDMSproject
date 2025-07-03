// src/components/ProtectedRoute.jsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Base Protected Route Component
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
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
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

// Patient Route Component
export const PatientRoute = ({ children }) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  console.log('PatientRoute check:', { isAuthenticated, isLoading, userRole: user?.role?.name });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading patient portal...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    console.log('PatientRoute: Not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  if (user?.role?.name !== 'Patient') {
    console.log(`PatientRoute: Access denied. User role: ${user?.role?.name}`);
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

// Nurse Route Component
export const NurseRoute = ({ children }) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  console.log('NurseRoute check:', { isAuthenticated, isLoading, userRole: user?.role?.name });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading nurse portal...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    console.log('NurseRoute: Not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  if (user?.role?.name !== 'Nurse') {
    console.log(`NurseRoute: Access denied. User role: ${user?.role?.name}`);
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

// Doctor Route Component
export const DoctorRoute = ({ children }) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  console.log('DoctorRoute check:', { isAuthenticated, isLoading, userRole: user?.role?.name });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading doctor portal...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    console.log('DoctorRoute: Not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  if (user?.role?.name !== 'Doctor') {
    console.log(`DoctorRoute: Access denied. User role: ${user?.role?.name}`);
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

// Provider Route Component (for Healthcare Providers - Doctor, Nurse, Health Provider)
export const ProviderRoute = ({ children }) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  console.log('ProviderRoute check:', { isAuthenticated, isLoading, userRole: user?.role?.name });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading provider portal...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    console.log('ProviderRoute: Not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  const allowedRoles = ['Doctor', 'Nurse', 'Health Provider', 'Public Health Provider'];
  const userRole = user?.role?.name;
  
  if (!allowedRoles.includes(userRole)) {
    console.log(`ProviderRoute: Access denied. User role: ${userRole}, Allowed: ${allowedRoles.join(', ')}`);
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

// Admin Route Component
export const AdminRoute = ({ children }) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  console.log('AdminRoute check:', { isAuthenticated, isLoading, userRole: user?.role?.name });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin portal...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    console.log('AdminRoute: Not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  if (user?.role?.name !== 'Admin') {
    console.log(`AdminRoute: Access denied. User role: ${user?.role?.name}`);
    return <Navigate to="/unauthorized" replace />;
  }

  console.log('AdminRoute: Access granted');
  return children;
};

// Multi-Role Route Component (for routes accessible by multiple specific roles)
export const MultiRoleRoute = ({ children, allowedRoles = [] }) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  console.log('MultiRoleRoute check:', { 
    isAuthenticated, 
    isLoading, 
    userRole: user?.role?.name, 
    allowedRoles 
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    console.log('MultiRoleRoute: Not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  const userRole = user?.role?.name;
  if (!allowedRoles.includes(userRole)) {
    console.log(`MultiRoleRoute: Access denied. User role: ${userRole}, Allowed: ${allowedRoles.join(', ')}`);
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

// Health Provider Route Component (for Health Provider role specifically)
export const HealthProviderRoute = ({ children }) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  console.log('HealthProviderRoute check:', { isAuthenticated, isLoading, userRole: user?.role?.name });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading health provider portal...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    console.log('HealthProviderRoute: Not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  if (user?.role?.name !== 'Health Provider') {
    console.log(`HealthProviderRoute: Access denied. User role: ${user?.role?.name}`);
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

// Public Health Provider Route Component
export const PublicHealthProviderRoute = ({ children }) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  console.log('PublicHealthProviderRoute check:', { isAuthenticated, isLoading, userRole: user?.role?.name });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading public health portal...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    console.log('PublicHealthProviderRoute: Not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  if (user?.role?.name !== 'Public Health Provider') {
    console.log(`PublicHealthProviderRoute: Access denied. User role: ${user?.role?.name}`);
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default ProtectedRoute;
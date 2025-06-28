// src/App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute, { PatientRoute, ProviderRoute, AdminRoute } from './components/ProtectedRoute';

// Auth pages
import Login from './pages/auth/Login';
import SignUp from './pages/auth/SignUp';

// Dashboard pages
import PatientDashboard from './pages/patient/Dashboard';
import ProviderDashboard from './pages/provider/Dashboard';
import AdminDashboard from './pages/admin/Dashboard';
import ClinicManagement from './pages/admin/ClinicManagement';

// Admin Management pages
import UserManagement from './pages/admin/UserManagement';

// Profile page
import UserProfile from './pages/profile/UserProfile';

// Error pages
import Unauthorized from './pages/errors/Unauthorized';
import NotFound from './pages/errors/NotFound';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />
            
            {/* Generic Dashboard Route - Redirects based on role */}
            <Route path="/dashboard" element={<RoleBasedRedirect />} />
            
            {/* Profile Route - Available to all authenticated users */}
            <Route path="/profile" element={
              <ProtectedRoute>
                <UserProfile />
              </ProtectedRoute>
            } />
            
            {/* Patient Routes */}
            <Route path="/patient/dashboard" element={
              <PatientRoute>
                <PatientDashboard />
              </PatientRoute>
            } />
            
            {/* Provider Routes */}
            <Route path="/provider/dashboard" element={
              <ProviderRoute>
                <ProviderDashboard />
              </ProviderRoute>
            } />
            
            {/* Admin Routes */}
            <Route path="/admin/dashboard" element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            } />
            
            <Route path="/admin/users" element={
              <AdminRoute>
                <UserManagement />
              </AdminRoute>
            } />
            <Route path="/admin/clinic" element={
              <AdminRoute>
                <ClinicManagement />
              </AdminRoute>
            } />
            
            
            {/* Catch-all admin routes */}
            <Route path="/admin/*" element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            } />
            
            {/* Additional role-specific routes */}
            <Route path="/doctor/dashboard" element={
              <ProtectedRoute requiredRole="Doctor">
                <ProviderDashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/nurse/dashboard" element={
              <ProtectedRoute requiredRole="Nurse">
                <ProviderDashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/health-provider/dashboard" element={
              <ProtectedRoute requiredRole="Health Provider">
                <ProviderDashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/public-health/dashboard" element={
              <ProtectedRoute requiredRole="Public Health Provider">
                <AdminDashboard />
              </ProtectedRoute>
            } />
            
            {/* Catch-all routes for role-specific dashboards */}
            <Route path="/patient/*" element={
              <PatientRoute>
                <PatientDashboard />
              </PatientRoute>
            } />
            
            <Route path="/provider/*" element={
              <ProviderRoute>
                <ProviderDashboard />
              </ProviderRoute>
            } />
            
            <Route path="/doctor/*" element={
              <ProtectedRoute requiredRole="Doctor">
                <ProviderDashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/nurse/*" element={
              <ProtectedRoute requiredRole="Nurse">
                <ProviderDashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/health-provider/*" element={
              <ProtectedRoute requiredRole="Health Provider">
                <ProviderDashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/public-health/*" element={
              <ProtectedRoute requiredRole="Public Health Provider">
                <AdminDashboard />
              </ProtectedRoute>
            } />
            
            {/* Default redirect based on authentication */}
            <Route path="/" element={<RoleBasedRedirect />} />
            
            {/* Error Routes */}
            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

// Component to redirect users based on their role
const RoleBasedRedirect = () => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Redirect based on user role (updated to match your healthcare system)
  const userRole = user?.role?.name;
  
  console.log('Redirecting user with role:', userRole); // Debug log
  
  switch (userRole) {
    case 'Patient':
      return <Navigate to="/patient/dashboard" replace />;
      
    case 'Doctor':
      return <Navigate to="/doctor/dashboard" replace />;
      
    case 'Nurse':
      return <Navigate to="/nurse/dashboard" replace />;
      
    case 'Health Provider':
      return <Navigate to="/health-provider/dashboard" replace />;
      
    case 'Public Health Provider':
      return <Navigate to="/public-health/dashboard" replace />;
      
    case 'Admin':
      return <Navigate to="/admin/dashboard" replace />;
      
    default:
      // For any unrecognized role, redirect to patient dashboard as fallback
      console.warn(`Unrecognized user role: ${userRole}, redirecting to patient dashboard`);
      return <Navigate to="/patient/dashboard" replace />;
  }
};

export default App;
// src/App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute, { PatientRoute, ProviderRoute, AdminRoute, NurseRoute } from './components/ProtectedRoute';

// Auth pages
import Login from './pages/auth/Login';
import SignUp from './pages/auth/SignUp';

// Dashboard pages
import PatientDashboard from './pages/patient/Dashboard';
import PatientAppointments from './pages/patient/Appointments';
import ProviderDashboard from './pages/provider/Dashboard';
import AdminDashboard from './pages/admin/Dashboard';
import NurseDashboard from './pages/nurse/Dashboard';
import ClinicSessionReview from './pages/admin/ClinicSessionReview';
import ClinicDiseaseConfirmation from './pages/admin/ClinicDiseaseConfirmation';
import PatientDiagnosesPage from './pages/patient/PatientDiagnosesPage';
import ClinicSymptomDashboard from './pages/admin/ClinicSymptomDashboard';
import SymptomHistoryPage from './pages/patient/SymptomHistoryPage';
import SymptomResultsPage from './pages/patient/SymptomResultsPage';
import PreventionTipManagement from './pages/admin/PreventionTipManagement';
import PatientPreventionTips from './pages/patient/PatientPreventionTips';
import HealthTips from './pages/nurse/HealthTips';
import RoleManagement from './pages/admin/RoleManagement';
import AnalyticsReports from './pages/admin/AnalyticsReports';
import ReportPage from './pages/nurse/ReportPage';
import ApprovedAppointments from './pages/nurse/ApprovedAppointments';

// Provider pages
import AppointmentManagement from './pages/nurse/AppointmentManagement';

// Patient pages
import EmergencyAmbulanceRequest from './pages/patient/EmergencyAmbulanceRequest';
import EmergencyApproval from './pages/emergency/EmergencyApproval';
import SelfCheckPage from './pages/patient/SelfCheck';

// Nurse pages
import NurseAppointmentManagement from './pages/nurse/AppointmentManagement';

// Admin pages
import ClinicManagement from './pages/admin/ClinicManagement';
import UserManagement from './pages/admin/UserManagement';

// NEW: Medical Management Pages
import MedicalTestsPage from './pages/admin/MedicalTestsPage';
import TreatmentPlansPage from './pages/admin/TreatmentPlanPage';
import TestResultsPage from './pages/admin/TestResultsPage';
import DoctorCasesPage from './pages/admin/DoctorCasesPage';

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
            
            {/* ================================ */}
            {/* PATIENT ROUTES */}
            {/* ================================ */}
            <Route path="/patient/dashboard" element={
              <PatientRoute>
                <PatientDashboard />
              </PatientRoute>
            } />
            <Route path="/patient/appointments" element={
              <PatientRoute>
                <PatientAppointments />
              </PatientRoute>
            } />
            <Route path="patient/emergency" element={
              <PatientRoute>
                <EmergencyAmbulanceRequest />
              </PatientRoute>
            } />
            <Route path="patient/symptom-checker" element={
              <PatientRoute>
                <SelfCheckPage />
              </PatientRoute>
            } />
            <Route path="/patient/diagnoses" element={
              <PatientRoute>
              <PatientDiagnosesPage />
            </PatientRoute>
          } />
            <Route path="/patient/symptom-history" element={
              <PatientRoute>
                <SymptomHistoryPage />
              </PatientRoute>
            } />

            <Route path="/patient/prevention-tips" element={
              <PatientRoute>
                <PatientPreventionTips />
              </PatientRoute>
            } />

            <Route path="/patient/symptom-checker/results/:sessionId" element={
             <PatientRoute>
                <SymptomResultsPage />
              </PatientRoute>
                     } />
            {/* Catch-all patient routes */}
            <Route path="/patient/*" element={
              <PatientRoute>
                <PatientDashboard />
              </PatientRoute>
            } />
            
            {/* ================================ */}
            {/* NURSE ROUTES */}
            {/* ================================ */}
            <Route path="/nurse/dashboard" element={
              <NurseRoute>
                <NurseDashboard />
              </NurseRoute>
            } />
            <Route path="/nurse/appointments" element={
              <NurseRoute>
                <NurseAppointmentManagement />
              </NurseRoute>
            } />
            <Route path="/nurse/prevention-tips" element={
              <NurseRoute>
                <HealthTips />
              </NurseRoute>
            } />
            <Route path="/nurse/reports" element={
              <NurseRoute>
                <ReportPage />
              </NurseRoute>
            } />
            {/* NEW: Medical Management for Nurses */}
            <Route path="/nurse/test-results" element={
              <NurseRoute>
                <TestResultsPage />
              </NurseRoute>
            } />
            <Route path="/nurse/medical-tests" element={
              <NurseRoute>
                <MedicalTestsPage />
              </NurseRoute>
            } />
            <Route path="/nurse/patients" element={
              <NurseRoute>
                <div>Nurse Patient Registry - Coming Soon</div>
              </NurseRoute>
            } />
            <Route path="/nurse/reception" element={
              <NurseRoute>
                <div>Reception Desk - Coming Soon</div>
              </NurseRoute>
            } />
            <Route path="/nurse/records" element={
              <NurseRoute>
                <div>Medical Records - Coming Soon</div>
              </NurseRoute>
            } />
            <Route path="/nurse/emergency" element={
              <NurseRoute>
                <EmergencyApproval/>
              </NurseRoute>
            } />
            <Route path="/nurse/vitals" element={
              <NurseRoute>
                <div>Vital Signs - Coming Soon</div>
              </NurseRoute>
            } />
            <Route path="/nurse/medications" element={
              <NurseRoute>
                <div>Medication Admin - Coming Soon</div>
              </NurseRoute>
            } />
            <Route path="/nurse/coordination" element={
              <NurseRoute>
                <div>Care Coordination - Coming Soon</div>
              </NurseRoute>
            } />
            <Route path="/nurse/settings" element={
              <NurseRoute>
                <div>Nurse Settings - Coming Soon</div>
              </NurseRoute>
            } />
            
            {/* Catch-all nurse routes */}
            <Route path="/nurse/*" element={
              <NurseRoute>
                <NurseDashboard />
              </NurseRoute>
            } />
            
            {/* ================================ */}
            {/* DOCTOR ROUTES */}
            {/* ================================ */}
            <Route path="/doctor/dashboard" element={
              <ProtectedRoute requiredRole="Doctor">
                <ProviderDashboard />
              </ProtectedRoute>
            } />
            <Route path="/doctor/appointments" element={
              <ProtectedRoute requiredRole="Doctor">
                <ApprovedAppointments/>
              </ProtectedRoute>
            } />
            {/* NEW: Medical Management for Doctors */}
            <Route path="/doctor/cases" element={
              <ProtectedRoute requiredRole="Doctor">
                <DoctorCasesPage />
              </ProtectedRoute>
            } />
            <Route path="/patient/treatment-plan/:id" element={
              <ProtectedRoute >
                <TreatmentPlansPage />
              </ProtectedRoute>
            } />
            <Route path="/doctor/test-results" element={
              <ProtectedRoute requiredRole="Doctor">
                <TestResultsPage />
              </ProtectedRoute>
            } />
            <Route path="/doctor/medical-tests" element={
              <ProtectedRoute requiredRole="Doctor">
                <MedicalTestsPage />
              </ProtectedRoute>
            } />
            <Route path="/doctor/patients" element={
              <ProtectedRoute requiredRole="Doctor">
                <div>Doctor Patient List - Coming Soon</div>
              </ProtectedRoute>
            } />
            <Route path="/doctor/records" element={
              <ProtectedRoute requiredRole="Doctor">
                <div>Medical Records - Coming Soon</div>
              </ProtectedRoute>
            } />
            <Route path="/doctor/ApprovedAppointments" element={
              <ProtectedRoute requiredRole="Doctor">
                <ApprovedAppointments />
              </ProtectedRoute>
            } />
            
            {/* ADDED: Clinic session review route for doctors */}
            
            {/* FIXED: Added sessionId parameter to the route */}
            <Route path="/doctor/clinic-session-review/:sessionId" element={
              <ProtectedRoute requiredRole="Doctor">
                <ClinicSessionReview />
              </ProtectedRoute>
            } />
            
            {/* ADDED: Symptom dashboard route for doctors */}
            <Route path="/doctor/symptom-dashboard" element={
              <ProtectedRoute requiredRole="Doctor">
                <ClinicSymptomDashboard />
              </ProtectedRoute>
            } />
            
            {/* ADDED: Diagnosis review route for doctors */}
            <Route path="/doctor/diagnosis-review/:diagnosisId" element={
              <ProtectedRoute requiredRole="Doctor">
                <div>Diagnosis Review - Coming Soon</div>
              </ProtectedRoute>
            } />
            
            <Route path="/doctor/emergencies" element={
              <ProtectedRoute requiredRole="Doctor">
                <div>Emergency Cases - Coming Soon</div>
              </ProtectedRoute>
            } />
            <Route path="/doctor/consultations" element={
              <ProtectedRoute requiredRole="Doctor">
                <div>Consultations - Coming Soon</div>
              </ProtectedRoute>
            } />
            <Route path="/doctor/prescriptions" element={
              <ProtectedRoute requiredRole="Doctor">
                <div>Prescriptions - Coming Soon</div>
              </ProtectedRoute>
            } />
            <Route path="/doctor/clinic-disease-confirmation" element={
              <ProtectedRoute requiredRole="Doctor">
                <ClinicDiseaseConfirmation />
              </ProtectedRoute>
            } />
            
            {/* DEPRECATED: Old route without parameter - redirect to dashboard */}
            <Route path="/doctor/clinic-session-review" element={
              <ProtectedRoute requiredRole="Doctor">
                <Navigate to="/doctor/symptom-dashboard" replace />
              </ProtectedRoute>
            } />
            
            <Route path="/doctor/clinic-symptoms-check" element={
              <ProtectedRoute requiredRole="Doctor">
                <ClinicSymptomDashboard />
              </ProtectedRoute>
            } />
            <Route path="/doctor/reports" element={
              <ProtectedRoute requiredRole="Doctor">
                <div>Clinical Reports - Coming Soon</div>
              </ProtectedRoute>
            } />
            
            {/* Catch-all doctor routes */}
            <Route path="/doctor/*" element={
              <ProtectedRoute requiredRole="Doctor">
                <ProviderDashboard />
              </ProtectedRoute>
            } />
            
            {/* ================================ */}
            {/* PROVIDER ROUTES */}
            {/* ================================ */}
            <Route path="/provider/dashboard" element={
              <ProviderRoute>
                <ProviderDashboard />
              </ProviderRoute>
            } />
            <Route path="/provider/appointments" element={
              <ProviderRoute>
                <AppointmentManagement />
              </ProviderRoute>
            } />
            
            {/* Catch-all provider routes */}
            <Route path="/provider/*" element={
              <ProviderRoute>
                <ProviderDashboard />
              </ProviderRoute>
            } />
            
            {/* ================================ */}
            {/* HEALTH PROVIDER ROUTES */}
            {/* ================================ */}
            <Route path="/health-provider/dashboard" element={
              <ProtectedRoute requiredRole="Health Provider">
                <ProviderDashboard />
              </ProtectedRoute>
            } />
            
            {/* Catch-all health provider routes */}
            <Route path="/health-provider/*" element={
              <ProtectedRoute requiredRole="Health Provider">
                <ProviderDashboard />
              </ProtectedRoute>
            } />
            
            {/* ================================ */}
            {/* PUBLIC HEALTH PROVIDER ROUTES */}
            {/* ================================ */}
            <Route path="/public-health/dashboard" element={
              <ProtectedRoute requiredRole="Public Health Provider">
                <AdminDashboard />
              </ProtectedRoute>
            } />
            
            {/* Catch-all public health routes */}
            <Route path="/public-health/*" element={
              <ProtectedRoute requiredRole="Public Health Provider">
                <AdminDashboard />
              </ProtectedRoute>
            } />
            
            {/* ================================ */}
            {/* ADMIN ROUTES */}
            {/* ================================ */}
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
            <Route path="/admin/roles" element={
              <AdminRoute>
                <RoleManagement />
              </AdminRoute>
            } />
            <Route path="/admin/clinic" element={
              <AdminRoute>
                <ClinicManagement />
              </AdminRoute>
            } />
            <Route path="/admin/appointments" element={
              <AdminRoute>
                <AppointmentManagement />
              </AdminRoute>
            } />
            <Route path="/admin/prevention-tips" element={
              <AdminRoute>
                <PreventionTipManagement />
              </AdminRoute>
            } />
            <Route path="/admin/analytics" element={
              <AdminRoute>
                <AnalyticsReports />
              </AdminRoute>
            } />
            
            {/* ADMIN: Symptom monitoring routes */}
            <Route path="/admin/symptom-dashboard" element={
              <AdminRoute>
                <ClinicSymptomDashboard />
              </AdminRoute>
            } />
            <Route path="/admin/session-review/:sessionId" element={
              <AdminRoute>
                <ClinicSessionReview />
              </AdminRoute>
            } />
            <Route path="/admin/diagnosis-review/:diagnosisId" element={
              <AdminRoute>
                <div>Admin Diagnosis Review - Coming Soon</div>
              </AdminRoute>
            } />
            
            {/* NEW: Medical Management for Admins */}
            <Route path="/admin/medical-tests" element={
              <AdminRoute>
                <MedicalTestsPage />
              </AdminRoute>
            } />
            <Route path="/patient/diagnosis/:diagnosisId/treatment-plan" element={<TreatmentPlansPage />} />
            <Route path="/admin/test-results" element={
              <AdminRoute>
                <TestResultsPage />
              </AdminRoute>
            } />
            
            {/* Catch-all admin routes */}
            <Route path="/admin/*" element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            } />
            
            {/* ================================ */}
            {/* DEFAULT AND ERROR ROUTES */}
            {/* ================================ */}
            
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

  // Redirect based on user role
  const userRole = user?.role?.name;
  
  console.log('Redirecting user with role:', userRole);
  
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
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { healthcareAPI, apiUtils } from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import UserForm from './UserForm';
import { 
  Users,
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  UserCheck,
  UserX,
  X,
  Save,
  AlertCircle,
  RefreshCw,
  Filter,
  Download,
  Heart,
  Settings,
  Building,
  BarChart3,
  FileText,
  Bug,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';

const UserManagement = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [clinicFilter, setClinicFilter] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [viewingUser, setViewingUser] = useState(null);
  const [debugMode, setDebugMode] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 10;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      console.log('🔄 Loading data...');

      // Load users, roles, and clinics with better error handling
      const [usersResponse, rolesResponse, clinicsResponse] = await Promise.allSettled([
        healthcareAPI.users.list(),
        healthcareAPI.roles.list(),
        healthcareAPI.clinics.list()
      ]);

      // Handle users response
      if (usersResponse.status === 'fulfilled') {
        const userData = usersResponse.value.data?.results || usersResponse.value.data || [];
        setUsers(userData);
        console.log(`✅ Loaded ${userData.length} users`);
      } else {
        console.error('❌ Failed to load users:', usersResponse.reason);
        setError('Failed to load users: ' + usersResponse.reason?.message);
      }

      // Handle roles response
      if (rolesResponse.status === 'fulfilled') {
        const roleData = rolesResponse.value.data?.results || rolesResponse.value.data || [];
        setRoles(roleData);
        console.log(`✅ Loaded ${roleData.length} roles`);
      } else {
        console.warn('⚠️ Failed to load roles, using fallback');
        setRoles([
          { id: 1, name: 'Admin' },
          { id: 2, name: 'Doctor' },
          { id: 3, name: 'Nurse' },
          { id: 4, name: 'Patient' }
        ]);
      }

      // Handle clinics response
      if (clinicsResponse.status === 'fulfilled') {
        const clinicData = clinicsResponse.value.data?.results || clinicsResponse.value.data || [];
        setClinics(clinicData);
        console.log(`✅ Loaded ${clinicData.length} clinics`);
      } else {
        console.warn('⚠️ Failed to load clinics');
        setClinics([]);
      }

    } catch (error) {
      console.error('❌ Data loading failed:', error);
      setError('Failed to load data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Enhanced validation function
  const validateUserData = (formData) => {
    const errors = {};
    
    // Required fields validation
    if (!formData.email?.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    if (!formData.first_name?.trim()) {
      errors.first_name = 'First name is required';
    }
    
    if (!formData.last_name?.trim()) {
      errors.last_name = 'Last name is required';
    }
    
    if (!formData.role) {
      errors.role = 'Role is required';
    }
    
    // Password validation (for new users)
    if (!editingUser && !formData.password) {
      errors.password = 'Password is required for new users';
    } else if (formData.password && formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }
    
    // Clinic validation for medical staff
    const selectedRole = roles.find(role => role.id.toString() === formData.role?.toString());
    if (selectedRole && ['Doctor', 'Nurse'].includes(selectedRole.name)) {
      if (!formData.clinic_ids || formData.clinic_ids.length === 0) {
        errors.clinic_ids = `${selectedRole.name} must be assigned to at least one clinic`;
      }
    }
    
    // Check for duplicate email (exclude current user when editing)
    const duplicateUser = users.find(user => 
      user.email.toLowerCase() === formData.email.toLowerCase() &&
      (!editingUser || user.id !== editingUser.id)
    );
    if (duplicateUser) {
      errors.email = 'A user with this email already exists';
    }
    
    return errors;
  };

  // Enhanced create user handler
  const handleCreateSubmit = async (formData) => {
    try {
      setSubmitting(true);
      setError('');
      setSuccess('');
      setValidationErrors({});

      console.log('🚀 Creating user with form data:', formData);

      // Client-side validation
      const errors = validateUserData(formData);
      if (Object.keys(errors).length > 0) {
        setValidationErrors(errors);
        setError('Please fix the validation errors below');
        return;
      }

      // Prepare user data
      const userData = {
        email: formData.email.trim(),
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        password: formData.password,
        role: parseInt(formData.role),
        is_active: formData.is_active !== false,
        is_staff: formData.is_staff || false,
        clinic_ids: formData.clinic_ids ? formData.clinic_ids.map(id => parseInt(id)) : []
      };

      console.log('📤 Sending user data:', userData);

      // Create user
      const result = await healthcareAPI.users.create(userData);
      console.log('✅ User created successfully:', result.data);

      // Show success message
      setSuccess(`User "${userData.first_name} ${userData.last_name}" created successfully!`);
      
      // Close modal and reload data
      setShowCreateModal(false);
      await loadData();
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(''), 5000);

    } catch (error) {
      console.error('❌ User creation failed:', error);
      
      // Handle specific error types
      if (error.response?.data) {
        const errorData = error.response.data;
        
        // Handle validation errors from backend
        if (typeof errorData === 'object' && !errorData.error) {
          setValidationErrors(errorData);
          setError('Please fix the validation errors highlighted below');
        } else {
          setError(apiUtils.formatErrorMessage(error));
        }
      } else {
        setError(error.message || 'Failed to create user');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Enhanced update user handler
  const handleUpdateSubmit = async (formData) => {
    try {
      setSubmitting(true);
      setError('');
      setSuccess('');
      setValidationErrors({});

      console.log('🔄 Updating user with form data:', formData);

      // Client-side validation
      const errors = validateUserData(formData);
      if (Object.keys(errors).length > 0) {
        setValidationErrors(errors);
        setError('Please fix the validation errors below');
        return;
      }

      // Prepare update data
      const updateData = {
        email: formData.email.trim(),
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        role: parseInt(formData.role),
        is_active: formData.is_active,
        is_staff: formData.is_staff,
        clinic_ids: formData.clinic_ids ? formData.clinic_ids.map(id => parseInt(id)) : []
      };

      // Only include password if provided
      if (formData.password) {
        updateData.password = formData.password;
      }

      console.log('📤 Sending update data:', updateData);

      // Update user
      const result = await healthcareAPI.users.update(editingUser.id, updateData);
      console.log('✅ User updated successfully:', result.data);

      // Show success message
      setSuccess(`User "${updateData.first_name} ${updateData.last_name}" updated successfully!`);

      // Close modal and reload data
      setShowEditModal(false);
      setEditingUser(null);
      await loadData();
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(''), 5000);

    } catch (error) {
      console.error('❌ User update failed:', error);
      
      // Handle specific error types
      if (error.response?.data) {
        const errorData = error.response.data;
        
        // Handle validation errors from backend
        if (typeof errorData === 'object' && !errorData.error) {
          setValidationErrors(errorData);
          setError('Please fix the validation errors highlighted below');
        } else {
          setError(apiUtils.formatErrorMessage(error));
        }
      } else {
        setError(error.message || 'Failed to update user');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditUser = (user) => {
    console.log('✏️ Editing user:', user);
    setEditingUser(user);
    setValidationErrors({});
    setError('');
    setShowEditModal(true);
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;

    try {
      setLoading(true);
      await healthcareAPI.users.delete(userId);
      setSuccess('User deleted successfully');
      await loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError(apiUtils.formatErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (user) => {
    try {
      setLoading(true);
      await healthcareAPI.users.update(user.id, {
        is_active: !user.is_active
      });
      setSuccess(`User ${!user.is_active ? 'activated' : 'deactivated'} successfully`);
      await loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError(apiUtils.formatErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedUsers.length === 0) {
      setError('Please select users first');
      return;
    }

    const actionMessages = {
      activate: 'activate',
      deactivate: 'deactivate', 
      delete: 'delete'
    };

    if (action === 'delete' && !confirm(`Are you sure you want to ${actionMessages[action]} ${selectedUsers.length} user(s)? This action cannot be undone.`)) {
      return;
    }

    try {
      setLoading(true);
      
      if (action === 'activate') {
        await healthcareAPI.userUtils.activateUsers(selectedUsers);
      } else if (action === 'deactivate') {
        await healthcareAPI.userUtils.deactivateUsers(selectedUsers);
      } else if (action === 'delete') {
        await healthcareAPI.userUtils.deleteUsers(selectedUsers);
      }

      setSelectedUsers([]);
      setSuccess(`Successfully ${actionMessages[action]}d ${selectedUsers.length} user(s)`);
      await loadData();
      setTimeout(() => setSuccess(''), 3000);
      
    } catch (error) {
      setError(apiUtils.formatErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  // Debug function for clinic assignment
  const handleDebugClinicAssignment = async () => {
    try {
      console.log('🔍 Running clinic assignment debug...');
      if (window.debugClinicAssignment) {
        await window.debugClinicAssignment();
      } else {
        console.log('Debug function not available. Make sure the fixed API service is loaded.');
      }
    } catch (error) {
      console.error('Debug failed:', error);
      setError('Debug failed: ' + error.message);
    }
  };

  // Fix existing medical staff without clinics
  const handleFixMedicalStaff = async () => {
    try {
      setLoading(true);
      if (window.fixMedicalStaffClinics) {
        await window.fixMedicalStaffClinics();
        setSuccess('Medical staff clinic assignments fixed!');
        // Reload data after fix
        setTimeout(async () => {
          await loadData();
        }, 1000);
      } else {
        setError('Fix function not available. Make sure the fixed API service is loaded.');
      }
    } catch (error) {
      console.error('Fix failed:', error);
      setError('Failed to fix medical staff clinic assignments: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Test user creation
  const handleTestUserCreation = async () => {
    try {
      setSubmitting(true);
      
      // Check if we have required data
      if (roles.length === 0) {
        setError('No roles available for testing');
        return;
      }
      
      if (clinics.length === 0) {
        setError('No clinics available for testing');
        return;
      }

      const testUserData = {
        email: `test.user.${Date.now()}@example.com`,
        first_name: 'Test',
        last_name: 'User',
        password: 'testpassword123',
        role: roles[0].id,
        is_active: true,
        is_staff: false,
        clinic_ids: ['Doctor', 'Nurse'].includes(roles[0].name) ? [clinics[0].id] : []
      };

      console.log('🧪 Creating test user with data:', testUserData);
      
      const result = await healthcareAPI.users.create(testUserData);
      console.log('✅ Test user created:', result.data);
      
      setSuccess('Test user created successfully! Check console for details.');
      await loadData();
      
      // Optionally delete the test user after a few seconds
      setTimeout(async () => {
        try {
          await healthcareAPI.users.delete(result.data.id);
          console.log('🧹 Test user cleaned up');
        } catch (cleanupError) {
          console.warn('Could not clean up test user:', cleanupError);
        }
      }, 5000);

    } catch (error) {
      console.error('❌ Test user creation failed:', error);
      setError('Test user creation failed: ' + apiUtils.formatErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseCreateModal = useCallback(() => {
    setShowCreateModal(false);
    setError('');
    setSuccess('');
    setValidationErrors({});
  }, []);

  const handleCloseEditModal = useCallback(() => {
    setShowEditModal(false);
    setEditingUser(null);
    setError('');
    setSuccess('');
    setValidationErrors({});
  }, []);

  // Enhanced filter logic with clinic filter
  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchTerm || 
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.last_name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = !roleFilter || user.role?.name === roleFilter;
    const matchesStatus = !statusFilter || 
      (statusFilter === 'active' && user.is_active) ||
      (statusFilter === 'inactive' && !user.is_active);
    
    const matchesClinic = !clinicFilter || 
      (user.clinics && user.clinics.some(clinic => clinic.id.toString() === clinicFilter));

    return matchesSearch && matchesRole && matchesStatus && matchesClinic;
  });

  // Count medical staff without clinics for alert
  const medicalStaffWithoutClinics = users.filter(u => 
    ['Doctor', 'Nurse'].includes(u.role?.name) && 
    (!u.clinics || u.clinics.length === 0)
  ).length;

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
  const startIndex = (currentPage - 1) * usersPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + usersPerPage);

  const Modal = ({ title, isOpen, onClose, children, size = 'md' }) => {
    if (!isOpen) return null;

    const sizeClasses = {
      sm: 'max-w-sm',
      md: 'max-w-md',
      lg: 'max-w-lg',
      xl: 'max-w-xl',
      '2xl': 'max-w-2xl'
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className={`bg-white rounded-xl shadow-xl w-full ${sizeClasses[size]} max-h-[90vh] overflow-y-auto`}>
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
            <button 
              onClick={onClose} 
              className="text-gray-400 hover:text-gray-600 transition-colors"
              disabled={submitting}
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <div className="p-6">
            {children}
          </div>
        </div>
      </div>
    );
  };

  if (loading && users.length === 0) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading users...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
            <p className="text-gray-600">Manage system users, roles, and clinic assignments</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Debug and Test buttons */}
            <button
              onClick={() => setDebugMode(!debugMode)}
              className="bg-purple-100 hover:bg-purple-200 text-purple-700 px-3 py-2 rounded-lg font-medium flex items-center justify-center transition-colors text-sm"
              title="Toggle debug mode"
            >
              <Bug className="h-4 w-4 mr-1" />
              Debug {debugMode ? 'ON' : 'OFF'}
            </button>
            
            {debugMode && (
              <>
                <button
                  onClick={handleTestUserCreation}
                  disabled={submitting}
                  className="bg-green-100 hover:bg-green-200 text-green-700 px-3 py-2 rounded-lg font-medium flex items-center justify-center transition-colors text-sm disabled:opacity-50"
                  title="Test user creation"
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Test Create
                </button>
                
                <button
                  onClick={handleDebugClinicAssignment}
                  className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-2 rounded-lg font-medium flex items-center justify-center transition-colors text-sm"
                  title="Debug clinic assignment"
                >
                  <Bug className="h-4 w-4 mr-1" />
                  Debug Clinics
                </button>
              </>
            )}
            
            {medicalStaffWithoutClinics > 0 && (
              <button
                onClick={handleFixMedicalStaff}
                disabled={loading}
                className="bg-orange-100 hover:bg-orange-200 text-orange-700 px-3 py-2 rounded-lg font-medium flex items-center justify-center transition-colors text-sm disabled:opacity-50"
                title={`Fix ${medicalStaffWithoutClinics} medical staff without clinics`}
              >
                🔧 Fix ({medicalStaffWithoutClinics})
              </button>
            )}
            
            <button
              onClick={loadData}
              disabled={loading}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium flex items-center justify-center transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              disabled={submitting || loading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center transition-colors disabled:opacity-50"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </button>
          </div>
        </div>

        {/* Success Alert */}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start">
            <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-green-700">{success}</p>
            </div>
            <button 
              onClick={() => setSuccess('')} 
              className="text-green-500 hover:text-green-700 ml-3"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Clinic Assignment Alert */}
        {medicalStaffWithoutClinics > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-start">
            <AlertCircle className="h-5 w-5 text-orange-500 mr-3 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-orange-800 font-medium">
                ⚠️ {medicalStaffWithoutClinics} medical staff without clinic assignments
              </p>
              <p className="text-orange-700 text-sm mt-1">
                Doctors and Nurses should be assigned to at least one clinic.
              </p>
              <button
                onClick={handleFixMedicalStaff}
                disabled={loading}
                className="mt-2 bg-orange-600 hover:bg-orange-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors disabled:opacity-50"
              >
                Auto-fix assignments
              </button>
            </div>
            <button 
              onClick={() => {/* This would require state for dismissing the alert */}} 
              className="text-orange-500 hover:text-orange-700 ml-3"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
            <XCircle className="h-5 w-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-red-700">{error}</p>
              {Object.keys(validationErrors).length > 0 && (
                <ul className="mt-2 text-sm text-red-600 list-disc list-inside">
                  {Object.entries(validationErrors).map(([field, message]) => (
                    <li key={field}>{field}: {Array.isArray(message) ? message.join(', ') : message}</li>
                  ))}
                </ul>
              )}
            </div>
            <button 
              onClick={() => {
                setError('');
                setValidationErrors({});
              }} 
              className="text-red-500 hover:text-red-700 ml-3"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Debug Information */}
        {debugMode && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
              <Bug className="h-5 w-5 mr-2" />
              Debug Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Users loaded:</span>
                <span className="ml-2 text-gray-900">{users.length}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Roles loaded:</span>
                <span className="ml-2 text-gray-900">{roles.length}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Clinics loaded:</span>
                <span className="ml-2 text-gray-900">{clinics.length}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">API Base URL:</span>
                <span className="ml-2 text-gray-900 font-mono text-xs">
                  {import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Auth Token:</span>
                <span className="ml-2 text-gray-900">
                  {localStorage.getItem('authToken') ? 'Present' : 'Missing'}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Current User:</span>
                <span className="ml-2 text-gray-900">{currentUser?.email || 'Not logged in'}</span>
              </div>
            </div>
          </div>
        )}

        {/* Rest of the component remains the same - Filters, Table, Pagination, Modals, etc. */}
        {/* Filters and Search */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              />
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            >
              <option value="">All Roles</option>
              {roles.map(role => (
                <option key={role.id} value={role.name}>{role.name}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            <select
              value={clinicFilter}
              onChange={(e) => setClinicFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            >
              <option value="">All Clinics</option>
              {clinics.map(clinic => (
                <option key={clinic.id} value={clinic.id}>{clinic.name}</option>
              ))}
            </select>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setRoleFilter('');
                  setStatusFilter('');
                  setClinicFilter('');
                  setCurrentPage(1);
                }}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium flex items-center justify-center transition-colors"
              >
                <Filter className="h-4 w-4 mr-2" />
                Clear
              </button>
              <button className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center transition-colors">
                <Download className="h-4 w-4 mr-2" />
                Export
              </button>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedUsers.length > 0 && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <span className="text-sm text-blue-700 font-medium">
                  {selectedUsers.length} user(s) selected
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleBulkAction('activate')}
                    disabled={loading}
                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    Activate
                  </button>
                  <button
                    onClick={() => handleBulkAction('deactivate')}
                    disabled={loading}
                    className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    Deactivate
                  </button>
                  <button
                    onClick={() => handleBulkAction('delete')}
                    disabled={loading}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Enhanced Users Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedUsers(paginatedUsers.map(u => u.id));
                        } else {
                          setSelectedUsers([]);
                        }
                      }}
                      checked={selectedUsers.length === paginatedUsers.length && paginatedUsers.length > 0}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded transition-colors"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Clinics
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedUsers([...selectedUsers, user.id]);
                          } else {
                            setSelectedUsers(selectedUsers.filter(id => id !== user.id));
                          }
                        }}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded transition-colors"
                      />
                    </td>
                    
                    {/* User Column */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-medium text-sm">
                            {user.first_name?.charAt(0)}{user.last_name?.charAt(0)}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-semibold text-gray-900">
                            {user.first_name} {user.last_name}
                          </div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                          {user.is_staff && (
                            <div className="text-xs text-indigo-600 font-medium">Staff Member</div>
                          )}
                        </div>
                      </div>
                    </td>
                    
                    {/* Role Column */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.role?.name === 'Admin' ? 'bg-red-100 text-red-800 border border-red-200' :
                        user.role?.name === 'Doctor' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                        user.role?.name === 'Nurse' ? 'bg-green-100 text-green-800 border border-green-200' :
                        user.role?.name === 'Patient' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                        'bg-gray-100 text-gray-800 border border-gray-200'
                      }`}>
                        {user.role?.name === 'Admin' && '👑 '}
                        {user.role?.name === 'Doctor' && '🩺 '}
                        {user.role?.name === 'Nurse' && '💉 '}
                        {user.role?.name === 'Patient' && '🧑‍🦽 '}
                        {user.role?.name || 'No Role'}
                      </span>
                    </td>
                    
                    {/* Enhanced Clinics Column */}
                    <td className="px-6 py-4">
                      <div className="max-w-xs">
                        {user.clinics && user.clinics.length > 0 ? (
                          <div className="space-y-1">
                            {user.clinics.slice(0, 2).map(clinic => (
                              <div key={clinic.id} className="flex items-center">
                                <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded-md border border-blue-200">
                                  <Building className="h-3 w-3 mr-1.5" />
                                  {clinic.name}
                                </span>
                              </div>
                            ))}
                            {user.clinics.length > 2 && (
                              <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-md">
                                +{user.clinics.length - 2} more
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center">
                            <span className={`text-xs font-medium px-2 py-1 rounded-md ${
                              ['Doctor', 'Nurse'].includes(user.role?.name) 
                                ? 'text-red-600 bg-red-50 border border-red-200' 
                                : 'text-gray-500 bg-gray-50 border border-gray-200'
                            }`}>
                              {['Doctor', 'Nurse'].includes(user.role?.name) 
                                ? '⚠️ No clinics assigned' 
                                : 'No clinics assigned'
                              }
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                    
                    {/* Status Column */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                        user.is_active 
                          ? 'bg-green-100 text-green-800 border-green-200' 
                          : 'bg-red-100 text-red-800 border-red-200'
                      }`}>
                        <span className={`w-2 h-2 rounded-full mr-1.5 ${
                          user.is_active ? 'bg-green-400' : 'bg-red-400'
                        }`}></span>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    
                    {/* Joined Column */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {new Date(user.date_joined).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                        <span className="text-xs text-gray-400">
                          {Math.floor((new Date() - new Date(user.date_joined)) / (1000 * 60 * 60 * 24))} days ago
                        </span>
                      </div>
                    </td>
                    
                    {/* Actions Column */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => {
                            setViewingUser(user);
                            setShowViewModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900 hover:bg-blue-50 p-1 rounded transition-colors"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEditUser(user)}
                          className="text-green-600 hover:text-green-900 hover:bg-green-50 p-1 rounded transition-colors"
                          title="Edit User"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(user)}
                          disabled={loading}
                          className={`hover:bg-gray-50 p-1 rounded transition-colors disabled:opacity-50 ${
                            user.is_active 
                              ? 'text-yellow-600 hover:text-yellow-900' 
                              : 'text-green-600 hover:text-green-900'
                          }`}
                          title={user.is_active ? 'Deactivate User' : 'Activate User'}
                        >
                          {user.is_active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          disabled={loading}
                          className="text-red-600 hover:text-red-900 hover:bg-red-50 p-1 rounded transition-colors disabled:opacity-50"
                          title="Delete User"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Empty State */}
          {filteredUsers.length === 0 && !loading && (
            <div className="text-center py-16">
              <div className="mx-auto h-24 w-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Users className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
              <p className="text-gray-600 mb-6 max-w-sm mx-auto">
                {searchTerm || roleFilter || statusFilter || clinicFilter
                  ? 'Try adjusting your search filters to find the users you\'re looking for.' 
                  : 'Get started by creating your first user account.'}
              </p>
              {!searchTerm && !roleFilter && !statusFilter && !clinicFilter && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors inline-flex items-center"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create First User
                </button>
              )}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="text-sm text-gray-700">
                Showing {startIndex + 1} to {Math.min(startIndex + usersPerPage, filteredUsers.length)} of {filteredUsers.length} users
              </div>
              <div className="flex items-center justify-center space-x-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let page;
                  if (totalPages <= 5) {
                    page = i + 1;
                  } else if (currentPage <= 3) {
                    page = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    page = totalPages - 4 + i;
                  } else {
                    page = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                        currentPage === page
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-gray-600">Total Users</div>
                <div className="text-2xl font-bold text-gray-900">{users.length}</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <UserCheck className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-gray-600">Active Users</div>
                <div className="text-2xl font-bold text-gray-900">
                  {users.filter(u => u.is_active).length}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Heart className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-gray-600">Patients</div>
                <div className="text-2xl font-bold text-gray-900">
                  {users.filter(u => u.role?.name === 'Patient').length}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center">
              <div className={`p-2 rounded-lg ${
                medicalStaffWithoutClinics > 0 ? 'bg-orange-100' : 'bg-orange-100'
              }`}>
                <Building className={`h-6 w-6 ${
                  medicalStaffWithoutClinics > 0 ? 'text-orange-600' : 'text-orange-600'
                }`} />
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-gray-600">Medical Staff</div>
                <div className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  {users.filter(u => ['Doctor', 'Nurse'].includes(u.role?.name)).length}
                  {medicalStaffWithoutClinics > 0 && (
                    <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
                      {medicalStaffWithoutClinics} unassigned
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Settings className="h-6 w-6 text-indigo-600" />
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-gray-600">Total Clinics</div>
                <div className="text-2xl font-bold text-gray-900">{clinics.length}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create User Modal */}
      <Modal 
        title="Create New User" 
        isOpen={showCreateModal} 
        onClose={handleCloseCreateModal}
        size="xl"
      >
        <UserForm
          roles={roles}
          clinics={clinics}
          onSubmit={handleCreateSubmit}
          onCancel={handleCloseCreateModal}
          loading={submitting}
          isEdit={false}
          initialData={null}
          validationErrors={validationErrors}
        />
      </Modal>

      {/* Edit User Modal */}
      <Modal 
        title="Edit User" 
        isOpen={showEditModal} 
        onClose={handleCloseEditModal}
        size="xl"
      >
        <UserForm
          initialData={editingUser}
          roles={roles}
          clinics={clinics}
          onSubmit={handleUpdateSubmit}
          onCancel={handleCloseEditModal}
          loading={submitting}
          isEdit={true}
          validationErrors={validationErrors}
        />
      </Modal>

      {/* View User Modal - Complete user details */}
      <Modal 
        title="User Details" 
        isOpen={showViewModal} 
        onClose={() => { 
          setShowViewModal(false); 
          setViewingUser(null); 
        }}
        size="2xl"
      >
        {viewingUser && (
          <div className="space-y-6">
            {/* Header Section */}
            <div className="flex items-center space-x-4 pb-6 border-b border-gray-200">
              <div className="h-16 w-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white font-medium text-lg">
                  {viewingUser.first_name?.charAt(0)}{viewingUser.last_name?.charAt(0)}
                </span>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-gray-900">
                  {viewingUser.first_name} {viewingUser.last_name}
                </h3>
                <p className="text-gray-600">{viewingUser.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    viewingUser.role?.name === 'Admin' ? 'bg-red-100 text-red-800' :
                    viewingUser.role?.name === 'Doctor' ? 'bg-blue-100 text-blue-800' :
                    viewingUser.role?.name === 'Nurse' ? 'bg-green-100 text-green-800' :
                    viewingUser.role?.name === 'Patient' ? 'bg-purple-100 text-purple-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {viewingUser.role?.name === 'Admin' && '👑 '}
                    {viewingUser.role?.name === 'Doctor' && '🩺 '}
                    {viewingUser.role?.name === 'Nurse' && '💉 '}
                    {viewingUser.role?.name === 'Patient' && '🧑‍🦽 '}
                    {viewingUser.role?.name || 'No Role'}
                  </span>
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    viewingUser.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {viewingUser.is_active ? 'Active' : 'Inactive'}
                  </span>
                  {viewingUser.is_staff && (
                    <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-800">
                      Staff Member
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Basic Information */}
              <div className="space-y-6">
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <FileText className="h-5 w-5 mr-2" />
                    Basic Information
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <span className="font-medium text-gray-600">Full Name:</span>
                      <span className="col-span-2 text-gray-900">{viewingUser.first_name} {viewingUser.last_name}</span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <span className="font-medium text-gray-600">Email:</span>
                      <span className="col-span-2 text-gray-900 break-all">{viewingUser.email}</span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <span className="font-medium text-gray-600">Role:</span>
                      <span className="col-span-2 text-gray-900">{viewingUser.role?.name || 'No Role Assigned'}</span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <span className="font-medium text-gray-600">Status:</span>
                      <span className="col-span-2">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                          viewingUser.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {viewingUser.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <span className="font-medium text-gray-600">Staff Access:</span>
                      <span className="col-span-2 text-gray-900">{viewingUser.is_staff ? 'Yes' : 'No'}</span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <span className="font-medium text-gray-600">User ID:</span>
                      <span className="col-span-2 text-gray-900 font-mono text-xs">{viewingUser.id}</span>
                    </div>
                  </div>
                </div>

                {/* Account Information */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Settings className="h-5 w-5 mr-2" />
                    Account Information
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <span className="font-medium text-gray-600">Date Joined:</span>
                      <span className="col-span-2 text-gray-900">
                        {new Date(viewingUser.date_joined).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    
                    {viewingUser.last_login && (
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <span className="font-medium text-gray-600">Last Login:</span>
                        <span className="col-span-2 text-gray-900">
                          {new Date(viewingUser.last_login).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <span className="font-medium text-gray-600">Account Age:</span>
                      <span className="col-span-2 text-gray-900">
                        {Math.floor((new Date() - new Date(viewingUser.date_joined)) / (1000 * 60 * 60 * 24))} days
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Clinic Assignments and Additional Info */}
              <div className="space-y-6">
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Building className="h-5 w-5 mr-2" />
                    Clinic Assignments
                    {viewingUser.clinics && viewingUser.clinics.length > 0 && (
                      <span className="ml-2 bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                        {viewingUser.clinics.length} clinic{viewingUser.clinics.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </h4>
                  
                  {viewingUser.clinics && viewingUser.clinics.length > 0 ? (
                    <div className="space-y-3">
                      {viewingUser.clinics.map(clinic => (
                        <div key={clinic.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                              <Building className="h-4 w-4 text-blue-600" />
                            </div>
                            <div className="flex-1">
                              <h5 className="font-semibold text-gray-900">{clinic.name}</h5>
                              <p className="text-sm text-gray-600 mt-1">{clinic.address}</p>
                              {clinic.phone_number && (
                                <p className="text-sm text-gray-500 mt-1 flex items-center">
                                  <span className="mr-1">📞</span>
                                  {clinic.phone_number}
                                </p>
                              )}
                              {clinic.email && (
                                <p className="text-sm text-gray-500 mt-1 flex items-center">
                                  <span className="mr-1">✉️</span>
                                  {clinic.email}
                                </p>
                              )}
                              {clinic.services && clinic.services.length > 0 && (
                                <div className="mt-2">
                                  <span className="text-xs font-medium text-gray-600">Services: </span>
                                  <span className="text-xs text-gray-500">
                                    {Array.isArray(clinic.services) 
                                      ? clinic.services.join(', ') 
                                      : clinic.services}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-6 text-center">
                      <Building className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No clinic assignments</p>
                      {['Doctor', 'Nurse'].includes(viewingUser.role?.name) && (
                        <p className="text-xs text-red-500 mt-1">
                          This {viewingUser.role.name.toLowerCase()} should be assigned to at least one clinic
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Role-specific Information */}
                {viewingUser.role?.name && (
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <UserCheck className="h-5 w-5 mr-2" />
                      Role Information
                    </h4>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm space-y-2">
                        <div className="flex justify-between">
                          <span className="font-medium text-gray-600">Current Role:</span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            viewingUser.role?.name === 'Admin' ? 'bg-red-100 text-red-800' :
                            viewingUser.role?.name === 'Doctor' ? 'bg-blue-100 text-blue-800' :
                            viewingUser.role?.name === 'Nurse' ? 'bg-green-100 text-green-800' :
                            viewingUser.role?.name === 'Patient' ? 'bg-purple-100 text-purple-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {viewingUser.role.name}
                          </span>
                        </div>
                        
                        <div className="flex justify-between">
                          <span className="font-medium text-gray-600">Role ID:</span>
                          <span className="text-gray-900 font-mono text-xs">{viewingUser.role.id}</span>
                        </div>
                        
                        {['Doctor', 'Nurse'].includes(viewingUser.role.name) && (
                          <div className="flex justify-between">
                            <span className="font-medium text-gray-600">Medical Staff:</span>
                            <span className="text-green-600 font-medium">Yes</span>
                          </div>
                        )}
                        
                        {viewingUser.role.name === 'Patient' && (
                          <div className="flex justify-between">
                            <span className="font-medium text-gray-600">Patient:</span>
                            <span className="text-purple-600 font-medium">Yes</span>
                          </div>
                        )}
                        
                        {viewingUser.role.name === 'Admin' && (
                          <div className="flex justify-between">
                            <span className="font-medium text-gray-600">Administrator:</span>
                            <span className="text-red-600 font-medium">Yes</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between items-center pt-6 border-t border-gray-200">
              <div className="text-sm text-gray-500">
                Last updated: {new Date().toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    setViewingUser(null);
                  }}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    handleEditUser(viewingUser);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center transition-colors"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit User
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
};

export default UserManagement;
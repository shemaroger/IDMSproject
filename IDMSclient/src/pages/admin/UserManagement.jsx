import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { healthcareAPI, apiUtils } from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import UserForm from './UserForm'; // Import the updated form component
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
  FileText
} from 'lucide-react';

const UserManagement = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [clinics, setClinics] = useState([]); // Add clinics state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [clinicFilter, setClinicFilter] = useState(''); // Add clinic filter
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [viewingUser, setViewingUser] = useState(null);

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

      // Load users, roles, and clinics
      const [usersResponse, rolesResponse, clinicsResponse] = await Promise.allSettled([
        healthcareAPI.users.list(),
        healthcareAPI.roles.list(),
        healthcareAPI.clinics.list()
      ]);

      if (usersResponse.status === 'fulfilled') {
        const userData = usersResponse.value.data?.results || usersResponse.value.data || [];
        setUsers(userData);
      } else {
        setError('Failed to load users');
      }

      if (rolesResponse.status === 'fulfilled') {
        const roleData = rolesResponse.value.data?.results || rolesResponse.value.data || [];
        setRoles(roleData);
      } else {
        // Fallback roles
        setRoles([
          { id: 1, name: 'Admin' },
          { id: 2, name: 'Doctor' },
          { id: 3, name: 'Nurse' },
          { id: 4, name: 'Patient' }
        ]);
      }

      if (clinicsResponse.status === 'fulfilled') {
        const clinicData = clinicsResponse.value.data?.results || clinicsResponse.value.data || [];
        setClinics(clinicData);
      } else {
        console.warn('Failed to load clinics');
        setClinics([]);
      }

    } catch (error) {
      setError('Failed to load data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Create user handler for the isolated form
  const handleCreateSubmit = async (formData) => {
    if (!formData.email || !formData.first_name || !formData.last_name || !formData.password || !formData.role) {
      setError('Please fill in all required fields');
      return;
    }

    // Validate clinic assignment for medical staff
    const selectedRole = roles.find(role => role.id.toString() === formData.role.toString());
    if (selectedRole && ['Doctor', 'Nurse'].includes(selectedRole.name)) {
      if (!formData.clinic_ids || formData.clinic_ids.length === 0) {
        setError(`${selectedRole.name} must be assigned to at least one clinic`);
        return;
      }
    }

    try {
      setLoading(true);

      const userData = {
        email: formData.email,
        first_name: formData.first_name,
        last_name: formData.last_name,
        password: formData.password,
        role: parseInt(formData.role),
        is_active: formData.is_active,
        is_staff: formData.is_staff,
        clinic_ids: formData.clinic_ids || [] // Include clinic assignments
      };

      await healthcareAPI.userUtils.createCompleteUser(userData);

      setShowCreateModal(false);
      await loadData();
      
    } catch (error) {
      setError(apiUtils.formatErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  // Update user handler for the isolated form
  const handleUpdateSubmit = async (formData) => {
    if (!formData.email || !formData.first_name || !formData.last_name || !formData.role) {
      setError('Please fill in all required fields');
      return;
    }

    // Validate clinic assignment for medical staff
    const selectedRole = roles.find(role => role.id.toString() === formData.role.toString());
    if (selectedRole && ['Doctor', 'Nurse'].includes(selectedRole.name)) {
      if (!formData.clinic_ids || formData.clinic_ids.length === 0) {
        setError(`${selectedRole.name} must be assigned to at least one clinic`);
        return;
      }
    }

    try {
      setLoading(true);

      const updateData = {
        email: formData.email,
        first_name: formData.first_name,
        last_name: formData.last_name,
        role: parseInt(formData.role),
        roleObject: selectedRole, // Pass role object for validation
        is_active: formData.is_active,
        is_staff: formData.is_staff,
        clinic_ids: formData.clinic_ids || []
      };

      // Only include password if provided
      if (formData.password) {
        updateData.password = formData.password;
      }

      await healthcareAPI.userUtils.updateCompleteUser(editingUser.id, updateData);

      setShowEditModal(false);
      setEditingUser(null);
      await loadData();
      
    } catch (error) {
      setError(apiUtils.formatErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setShowEditModal(true);
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;

    try {
      setLoading(true);
      await healthcareAPI.users.delete(userId);
      await loadData();
    } catch (error) {
      setError(apiUtils.formatErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (user) => {
    try {
      await healthcareAPI.users.update(user.id, {
        is_active: !user.is_active
      });
      await loadData();
    } catch (error) {
      setError(apiUtils.formatErrorMessage(error));
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
      await loadData();
      
    } catch (error) {
      setError(apiUtils.formatErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleCloseCreateModal = useCallback(() => {
    setShowCreateModal(false);
    setError('');
  }, []);

  const handleCloseEditModal = useCallback(() => {
    setShowEditModal(false);
    setEditingUser(null);
    setError('');
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
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
            <AlertCircle className="h-5 w-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-red-700">{error}</p>
            </div>
            <button 
              onClick={() => setError('')} 
              className="text-red-500 hover:text-red-700 ml-3"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

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
                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                  >
                    Activate
                  </button>
                  <button
                    onClick={() => handleBulkAction('deactivate')}
                    className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                  >
                    Deactivate
                  </button>
                  <button
                    onClick={() => handleBulkAction('delete')}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Users Table */}
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
                    <td className="px-6 py-4">
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
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Users className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {user.first_name} {user.last_name}
                          </div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        user.role?.name === 'Admin' ? 'bg-red-100 text-red-800' :
                        user.role?.name === 'Doctor' ? 'bg-blue-100 text-blue-800' :
                        user.role?.name === 'Nurse' ? 'bg-green-100 text-green-800' :
                        user.role?.name === 'Patient' ? 'bg-purple-100 text-purple-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {user.role?.name || 'No Role'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {user.clinics && user.clinics.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {user.clinics.slice(0, 2).map(clinic => (
                            <span key={clinic.id} className="inline-flex items-center px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">
                              <Building className="h-3 w-3 mr-1" />
                              {clinic.name}
                            </span>
                          ))}
                          {user.clinics.length > 2 && (
                            <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                              +{user.clinics.length - 2} more
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-500">No clinics assigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(user.date_joined).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            setViewingUser(user);
                            setShowViewModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900 transition-colors"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEditUser(user)}
                          className="text-green-600 hover:text-green-900 transition-colors"
                          title="Edit User"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(user)}
                          className={`transition-colors ${
                            user.is_active 
                              ? 'text-yellow-600 hover:text-yellow-900' 
                              : 'text-green-600 hover:text-green-900'
                          }`}
                          title={user.is_active ? 'Deactivate' : 'Activate'}
                        >
                          {user.is_active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="text-red-600 hover:text-red-900 transition-colors"
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
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || roleFilter || statusFilter || clinicFilter
                  ? 'Try adjusting your search filters' 
                  : 'Get started by creating your first user'}
              </p>
              {!searchTerm && !roleFilter && !statusFilter && !clinicFilter && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Add First User
                </button>
              )}
            </div>
          )}
        </div>

        {/* Pagination - same as before */}
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
              <div className="p-2 bg-orange-100 rounded-lg">
                <Building className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-gray-600">Medical Staff</div>
                <div className="text-2xl font-bold text-gray-900">
                  {users.filter(u => ['Doctor', 'Nurse'].includes(u.role?.name)).length}
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
        size="lg"
      >
        <UserForm
          roles={roles}
          clinics={clinics}
          onSubmit={handleCreateSubmit}
          onCancel={handleCloseCreateModal}
          loading={loading}
          isEdit={false}
        />
      </Modal>

      {/* Edit User Modal */}
      <Modal 
        title="Edit User" 
        isOpen={showEditModal} 
        onClose={handleCloseEditModal}
        size="lg"
      >
        <UserForm
          initialData={editingUser}
          roles={roles}
          clinics={clinics}
          onSubmit={handleUpdateSubmit}
          onCancel={handleCloseEditModal}
          loading={loading}
          isEdit={true}
        />
      </Modal>

      {/* View User Modal - Enhanced with clinic information */}
      <Modal 
        title="User Details" 
        isOpen={showViewModal} 
        onClose={() => { 
          setShowViewModal(false); 
          setViewingUser(null); 
        }}
        size="xl"
      >
        {viewingUser && (
          <div className="space-y-6">
            <div className="flex items-center space-x-4 pb-6 border-b border-gray-200">
              <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center">
                <Users className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  {viewingUser.first_name} {viewingUser.last_name}
                </h3>
                <p className="text-gray-600">{viewingUser.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    viewingUser.role?.name === 'Admin' ? 'bg-red-100 text-red-800' :
                    viewingUser.role?.name === 'Doctor' ? 'bg-blue-100 text-blue-800' :
                    viewingUser.role?.name === 'Nurse' ? 'bg-green-100 text-green-800' :
                    viewingUser.role?.name === 'Patient' ? 'bg-purple-100 text-purple-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {viewingUser.role?.name || 'No Role'}
                  </span>
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    viewingUser.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {viewingUser.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="text-lg font-medium text-gray-900">Basic Information</h4>
                
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Name:</span>
                    <span className="text-gray-900">{viewingUser.first_name} {viewingUser.last_name}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Email:</span>
                    <span className="text-gray-900">{viewingUser.email}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Staff Member:</span>
                    <span className="text-gray-900">{viewingUser.is_staff ? 'Yes' : 'No'}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Date Joined:</span>
                    <span className="text-gray-900">
                      {new Date(viewingUser.date_joined).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">User ID:</span>
                    <span className="text-gray-900 font-mono text-xs">{viewingUser.id}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-lg font-medium text-gray-900">Clinic Assignments</h4>
                
                {viewingUser.clinics && viewingUser.clinics.length > 0 ? (
                  <div className="space-y-3">
                    {viewingUser.clinics.map(clinic => (
                      <div key={clinic.id} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-start gap-3">
                          <Building className="h-5 w-5 text-gray-600 mt-0.5" />
                          <div>
                            <h5 className="font-medium text-gray-900">{clinic.name}</h5>
                            <p className="text-sm text-gray-600">{clinic.address}</p>
                            {clinic.phone_number && (
                              <p className="text-sm text-gray-500">📞 {clinic.phone_number}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No clinic assignments</p>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-6 border-t border-gray-200">
              <button
                onClick={() => handleEditUser(viewingUser)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center transition-colors"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit User
              </button>
            </div>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
};

export default UserManagement;
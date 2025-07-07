import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  Shield, 
  Settings,
  X,
  Save,
  AlertCircle,
  CheckCircle,
  Key,
  UserCheck,
  Clock,
  Search,
  Filter
} from 'lucide-react';
import { healthcareAPI } from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';

const RoleManagement = () => {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [notification, setNotification] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissions: [],
    can_self_register: false
  });

  // Available permissions for the system
  const availablePermissions = [
    { id: 'user_management', label: 'User Management', description: 'Create, edit, and delete users' },
    { id: 'appointment_management', label: 'Appointment Management', description: 'Manage patient appointments' },
    { id: 'clinic_management', label: 'Clinic Management', description: 'Manage clinic information and staff' },
    { id: 'emergency_requests', label: 'Emergency Requests', description: 'Handle emergency ambulance requests' },
    { id: 'prevention_tips', label: 'Prevention Tips', description: 'Create and manage health prevention tips' },
    { id: 'system_analytics', label: 'System Analytics', description: 'View system analytics and reports' },
    { id: 'role_management', label: 'Role Management', description: 'Manage user roles and permissions' },
    { id: 'patient_records', label: 'Patient Records', description: 'Access and manage patient medical records' },
    { id: 'symptom_checker', label: 'Symptom Checker', description: 'Use symptom checking tools' },
    { id: 'notifications', label: 'Notifications', description: 'Send and manage system notifications' }
  ];

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const response = await healthcareAPI.roles.list();
      setRoles(response.data?.results || response.data || []);
    } catch (error) {
      showNotification('Error fetching roles: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      showNotification('Role name is required', 'error');
      return;
    }

    try {
      if (editingRole) {
        await healthcareAPI.roles.update(editingRole.id, formData);
        showNotification('Role updated successfully!');
      } else {
        await healthcareAPI.roles.create(formData);
        showNotification('Role created successfully!');
      }
      setShowModal(false);
      setEditingRole(null);
      resetForm();
      fetchRoles();
    } catch (error) {
      showNotification('Error saving role: ' + error.message, 'error');
    }
  };

  const handleEdit = (role) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      description: role.description || '',
      permissions: role.permissions || [],
      can_self_register: role.can_self_register || false
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    try {
      await healthcareAPI.roles.delete(id);
      showNotification('Role deleted successfully!');
      setDeleteConfirm(null);
      fetchRoles();
    } catch (error) {
      showNotification('Error deleting role: ' + error.message, 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      permissions: [],
      can_self_register: false
    });
  };

  const openCreateModal = () => {
    resetForm();
    setEditingRole(null);
    setShowModal(true);
  };

  const togglePermission = (permissionId) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter(p => p !== permissionId)
        : [...prev.permissions, permissionId]
    }));
  };

  const filteredRoles = roles.filter(role =>
    role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleColor = (roleName) => {
    switch (roleName?.toLowerCase()) {
      case 'admin': return 'bg-red-100 text-red-800 border-red-200';
      case 'doctor': return 'bg-green-100 text-green-800 border-green-200';
      case 'nurse': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'patient': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-100">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <Shield className="w-8 h-8 mr-3 text-indigo-600" />
                Role Management
              </h1>
              <p className="text-gray-600 mt-2">Manage user roles and permissions for the healthcare system</p>
              <div className="flex items-center space-x-4 mt-4">
                <div className="bg-white px-3 py-1 rounded-lg border">
                  <span className="text-sm font-medium text-gray-600">Total Roles: </span>
                  <span className="text-sm font-bold text-indigo-600">{roles.length}</span>
                </div>
                <div className="bg-white px-3 py-1 rounded-lg border">
                  <span className="text-sm font-medium text-gray-600">Self-Register: </span>
                  <span className="text-sm font-bold text-green-600">
                    {roles.filter(role => role.can_self_register).length}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={openCreateModal}
              className="bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-700 transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl"
            >
              <Plus className="w-5 h-5" />
              <span className="font-medium">Create Role</span>
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search roles by name or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Roles Grid */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          {loading ? (
            <div className="p-16 text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-6 text-gray-600 font-medium text-lg">Loading roles...</p>
            </div>
          ) : (
            <>
              {filteredRoles.length > 0 ? (
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredRoles.map((role) => (
                      <div key={role.id} className="border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all duration-300 bg-gray-50 hover:bg-white group">
                        {/* Role Header */}
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center space-x-3">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${getRoleColor(role.name)}`}>
                              <Users className="w-6 h-6" />
                            </div>
                            <div>
                              <h3 className="font-bold text-gray-900 text-lg">{role.name}</h3>
                              <div className="flex items-center space-x-2 mt-1">
                                {role.can_self_register && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    <UserCheck className="w-3 h-3 mr-1" />
                                    Self-Register
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <button
                              onClick={() => handleEdit(role)}
                              className="p-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-all duration-200"
                              title="Edit role"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(role.id)}
                              className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-all duration-200"
                              title="Delete role"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Role Description */}
                        <div className="mb-4">
                          <p className="text-gray-600 text-sm leading-relaxed">
                            {role.description || 'No description provided'}
                          </p>
                        </div>

                        {/* Permissions */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700 flex items-center">
                              <Key className="w-4 h-4 mr-1" />
                              Permissions
                            </span>
                            <span className="text-sm font-bold text-indigo-600">
                              {role.permissions?.length || 0}
                            </span>
                          </div>
                          
                          {role.permissions?.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {role.permissions.slice(0, 3).map((permission) => (
                                <span key={permission} className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                                  {availablePermissions.find(p => p.id === permission)?.label || permission}
                                </span>
                              ))}
                              {role.permissions.length > 3 && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-600">
                                  +{role.permissions.length - 3} more
                                </span>
                              )}
                            </div>
                          ) : (
                            <p className="text-xs text-gray-500">No permissions assigned</p>
                          )}
                        </div>

                        {/* Timestamps */}
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <div className="flex items-center text-xs text-gray-500">
                            <Clock className="w-3 h-3 mr-1" />
                            Created: {new Date(role.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Shield className="w-12 h-12 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No roles found</h3>
                  <p className="text-gray-500 mb-8">
                    {searchTerm ? "No roles match your search criteria." : "Get started by creating your first role."}
                  </p>
                  <button
                    onClick={openCreateModal}
                    className="bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-700 transition-all duration-200"
                  >
                    Create First Role
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Create/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[95vh] overflow-y-auto shadow-2xl">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 border-b border-gray-200 rounded-t-2xl">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {editingRole ? 'Edit Role' : 'Create New Role'}
                    </h2>
                    <p className="text-gray-600 mt-1">
                      {editingRole ? 'Update role information and permissions' : 'Add a new role to the system'}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg p-2 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-6">
                {/* Basic Information */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Users className="w-5 h-5 mr-2 text-indigo-600" />
                    Basic Information
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Role Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        placeholder="e.g., Doctor, Nurse, Patient"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>

                    <div className="flex items-center">
                      <div className="flex items-center">
                        <input
                          id="can_self_register"
                          type="checkbox"
                          checked={formData.can_self_register}
                          onChange={(e) => setFormData({...formData, can_self_register: e.target.checked})}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <label htmlFor="can_self_register" className="ml-2 block text-sm text-gray-900">
                          Allow self-registration
                        </label>
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        rows={3}
                        placeholder="Describe the role's purpose and responsibilities"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Permissions */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Key className="w-5 h-5 mr-2 text-green-600" />
                    Permissions
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {availablePermissions.map((permission) => (
                      <div key={permission.id} className="flex items-start space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-white transition-colors">
                        <input
                          id={permission.id}
                          type="checkbox"
                          checked={formData.permissions.includes(permission.id)}
                          onChange={() => togglePermission(permission.id)}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded mt-1"
                        />
                        <div className="flex-1">
                          <label htmlFor={permission.id} className="block text-sm font-medium text-gray-900 cursor-pointer">
                            {permission.label}
                          </label>
                          <p className="text-xs text-gray-500 mt-1">{permission.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Modal Actions */}
                <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                  <button
                    onClick={() => setShowModal(false)}
                    className="px-6 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    className="px-8 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2 font-medium shadow-lg hover:shadow-xl"
                  >
                    <Save className="w-5 h-5" />
                    <span>{editingRole ? 'Update Role' : 'Create Role'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
              <div className="flex items-center space-x-4 mb-6">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-red-600" />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Delete Role</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Are you sure you want to delete this role? This action cannot be undone.
                  </p>
                </div>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Notification Toast */}
        {notification && (
          <div className={`fixed top-4 right-4 p-4 rounded-xl shadow-lg z-50 transition-all duration-300 max-w-md ${
            notification.type === 'success' 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex items-center space-x-3">
              {notification.type === 'success' ? (
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              )}
              <span className={`font-medium ${
                notification.type === 'success' ? 'text-green-800' : 'text-red-800'
              }`}>
                {notification.message}
              </span>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default RoleManagement;
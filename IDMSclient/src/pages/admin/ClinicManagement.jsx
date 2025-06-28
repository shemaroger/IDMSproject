import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { healthcareAPI, apiUtils } from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { 
  Building,
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  X,
  Save,
  AlertCircle,
  RefreshCw,
  Filter,
  Download,
  Users,
  MapPin,
  Phone,
  Mail,
  Settings,
  BarChart3,
  UserPlus,
  UserMinus,
  Globe,
  Lock
} from 'lucide-react';

const ClinicManagement = () => {
  const { user: currentUser } = useAuth();
  const [clinics, setClinics] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedClinics, setSelectedClinics] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [editingClinic, setEditingClinic] = useState(null);
  const [viewingClinic, setViewingClinic] = useState(null);
  const [managingStaffClinic, setManagingStaffClinic] = useState(null);
  const [clinicStaff, setClinicStaff] = useState([]);
  const [availableStaff, setAvailableStaff] = useState([]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const clinicsPerPage = 10;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      console.log('Loading clinics and users...');

      const [clinicsResponse, usersResponse] = await Promise.allSettled([
        healthcareAPI.clinics.list(),
        healthcareAPI.users.list()
      ]);

      if (clinicsResponse.status === 'fulfilled') {
        const clinicData = clinicsResponse.value.data?.results || clinicsResponse.value.data || [];
        setClinics(clinicData);
        console.log(`Loaded ${clinicData.length} clinics`);
      } else {
        console.error('Failed to load clinics:', clinicsResponse.reason);
        setError('Failed to load clinics');
      }

      if (usersResponse.status === 'fulfilled') {
        const userData = usersResponse.value.data?.results || usersResponse.value.data || [];
        setUsers(userData);
        console.log(`Loaded ${userData.length} users`);
      } else {
        console.warn('Failed to load users:', usersResponse.reason);
        setUsers([]);
      }

    } catch (error) {
      console.error('Error in loadData:', error);
      setError('Failed to load data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubmit = async (formData) => {
    if (!formData.name || !formData.address || !formData.phone_number) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      await healthcareAPI.clinics.create(formData);
      setShowCreateModal(false);
      await loadData();
    } catch (error) {
      setError(apiUtils.formatErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSubmit = async (formData) => {
    if (!formData.name || !formData.address || !formData.phone_number) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      await healthcareAPI.clinics.update(editingClinic.id, formData);
      setShowEditModal(false);
      setEditingClinic(null);
      await loadData();
    } catch (error) {
      setError(apiUtils.formatErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleEditClinic = (clinic) => {
    setEditingClinic(clinic);
    setShowEditModal(true);
  };

  const handleDeleteClinic = async (clinicId) => {
    if (!confirm('Are you sure you want to delete this clinic? This action cannot be undone.')) return;

    try {
      setLoading(true);
      await healthcareAPI.clinics.delete(clinicId);
      await loadData();
    } catch (error) {
      setError(apiUtils.formatErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleViewClinic = async (clinic) => {
    setViewingClinic(clinic);
    setShowViewModal(true);
  };

  const handleManageStaff = async (clinic) => {
    try {
      setLoading(true);
      setManagingStaffClinic(clinic);
      
      // Load current staff for this clinic
      const staffResponse = await healthcareAPI.clinics.getStaff(clinic.id);
      setClinicStaff(staffResponse.data || []);
      
      // Load available medical staff
      const medicalStaff = users.filter(user => 
        ['Doctor', 'Nurse'].includes(user.role?.name)
      );
      setAvailableStaff(medicalStaff);
      
      setShowStaffModal(true);
    } catch (error) {
      setError(apiUtils.formatErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleAssignStaff = async (userIds) => {
    try {
      setLoading(true);
      await healthcareAPI.clinics.assignStaff(managingStaffClinic.id, userIds);
      
      // Reload staff data
      const staffResponse = await healthcareAPI.clinics.getStaff(managingStaffClinic.id);
      setClinicStaff(staffResponse.data || []);
      
      await loadData(); // Reload main data
    } catch (error) {
      setError(apiUtils.formatErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveStaff = async (userIds) => {
    try {
      setLoading(true);
      await healthcareAPI.clinics.removeStaff(managingStaffClinic.id, userIds);
      
      // Reload staff data
      const staffResponse = await healthcareAPI.clinics.getStaff(managingStaffClinic.id);
      setClinicStaff(staffResponse.data || []);
      
      await loadData(); // Reload main data
    } catch (error) {
      setError(apiUtils.formatErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedClinics.length === 0) {
      setError('Please select clinics first');
      return;
    }

    if (action === 'delete' && !confirm(`Are you sure you want to delete ${selectedClinics.length} clinic(s)? This action cannot be undone.`)) {
      return;
    }

    try {
      setLoading(true);
      
      if (action === 'delete') {
        await healthcareAPI.clinics.bulkDelete(selectedClinics);
      }

      setSelectedClinics([]);
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
    setEditingClinic(null);
    setError('');
  }, []);

  const handleCloseStaffModal = useCallback(() => {
    setShowStaffModal(false);
    setManagingStaffClinic(null);
    setClinicStaff([]);
    setAvailableStaff([]);
    setError('');
  }, []);

  // Filter logic
  const filteredClinics = clinics.filter(clinic => {
    const matchesSearch = !searchTerm || 
      clinic.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      clinic.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      clinic.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = !statusFilter || 
      (statusFilter === 'public' && clinic.is_public) ||
      (statusFilter === 'private' && !clinic.is_public);

    return matchesSearch && matchesStatus;
  });

  // Pagination
  const totalPages = Math.ceil(filteredClinics.length / clinicsPerPage);
  const startIndex = (currentPage - 1) * clinicsPerPage;
  const paginatedClinics = filteredClinics.slice(startIndex, startIndex + clinicsPerPage);

  // Modal Component
  const Modal = ({ title, isOpen, onClose, children, size = 'md' }) => {
    if (!isOpen) return null;

    const sizeClasses = {
      sm: 'max-w-sm',
      md: 'max-w-md',
      lg: 'max-w-lg',
      xl: 'max-w-xl',
      '2xl': 'max-w-2xl',
      '4xl': 'max-w-4xl'
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

  // Clinic Form Component
  const ClinicForm = ({ initialData = {}, onSubmit, onCancel, loading, isEdit = false }) => {
    const [formData, setFormData] = useState({
      name: '',
      address: '',
      phone_number: '',
      email: '',
      gps_coordinates: '',
      is_public: true,
      services: [],
      ...initialData
    });

    const [serviceInput, setServiceInput] = useState('');

    const handleChange = (e) => {
      const { name, value, type, checked } = e.target;
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    };

    const handleAddService = () => {
      if (serviceInput.trim()) {
        setFormData(prev => ({
          ...prev,
          services: [...prev.services, serviceInput.trim()]
        }));
        setServiceInput('');
      }
    };

    const handleRemoveService = (index) => {
      setFormData(prev => ({
        ...prev,
        services: prev.services.filter((_, i) => i !== index)
      }));
    };

    const handleSubmit = (e) => {
      e.preventDefault();
      onSubmit(formData);
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Clinic Name *
            </label>
            <input
              type="text"
              name="name"
              required
              value={formData.name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="Central Hospital"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number *
            </label>
            <input
              type="tel"
              name="phone_number"
              required
              value={formData.phone_number}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="+1-555-0100"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Address *
          </label>
          <textarea
            name="address"
            required
            rows={3}
            value={formData.address}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            placeholder="123 Main Street, City, State, ZIP"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="info@clinic.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              GPS Coordinates
            </label>
            <input
              type="text"
              name="gps_coordinates"
              value={formData.gps_coordinates}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="40.7128,-74.0060"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Services Offered
          </label>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={serviceInput}
              onChange={(e) => setServiceInput(e.target.value)}
              placeholder="Add a service"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddService())}
            />
            <button
              type="button"
              onClick={handleAddService}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.services.map((service, index) => (
              <span
                key={index}
                className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
              >
                {service}
                <button
                  type="button"
                  onClick={() => handleRemoveService(index)}
                  className="ml-2 text-blue-600 hover:text-blue-800"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        </div>

        <div>
          <label className="flex items-center">
            <input
              type="checkbox"
              name="is_public"
              checked={formData.is_public}
              onChange={handleChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded transition-colors"
            />
            <span className="ml-2 text-sm text-gray-700">Public Clinic</span>
          </label>
          <p className="text-xs text-gray-500 mt-1">
            Public clinics are visible to all users and patients
          </p>
        </div>

        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="h-4 w-4 mr-2" />
            {loading ? (isEdit ? 'Updating...' : 'Creating...') : (isEdit ? 'Update Clinic' : 'Create Clinic')}
          </button>
        </div>
      </form>
    );
  };

  // Staff Management Component
  const StaffManagement = ({ clinic, currentStaff, availableStaff, onAssign, onRemove, loading }) => {
    const [selectedAvailable, setSelectedAvailable] = useState([]);
    const [selectedCurrent, setSelectedCurrent] = useState([]);

    const currentStaffIds = currentStaff.map(staff => staff.id);
    const unassignedStaff = availableStaff.filter(staff => !currentStaffIds.includes(staff.id));

    return (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900">Managing Staff for {clinic.name}</h3>
          <p className="text-gray-600">Assign or remove medical staff from this clinic</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Available Staff */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-3">Available Staff</h4>
            <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
              {unassignedStaff.length > 0 ? (
                unassignedStaff.map(staff => (
                  <label key={staff.id} className="flex items-center p-3 hover:bg-gray-50 border-b last:border-b-0">
                    <input
                      type="checkbox"
                      checked={selectedAvailable.includes(staff.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedAvailable([...selectedAvailable, staff.id]);
                        } else {
                          setSelectedAvailable(selectedAvailable.filter(id => id !== staff.id));
                        }
                      }}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <div className="ml-3">
                      <div className="text-sm font-medium text-gray-900">
                        {staff.first_name} {staff.last_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {staff.role?.name} • {staff.email}
                      </div>
                    </div>
                  </label>
                ))
              ) : (
                <div className="p-4 text-center text-gray-500">
                  No available staff to assign
                </div>
              )}
            </div>
            {selectedAvailable.length > 0 && (
              <button
                onClick={() => {
                  onAssign(selectedAvailable);
                  setSelectedAvailable([]);
                }}
                disabled={loading}
                className="mt-3 w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center disabled:opacity-50 transition-colors"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Assign Selected ({selectedAvailable.length})
              </button>
            )}
          </div>

          {/* Current Staff */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-3">Current Staff</h4>
            <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
              {currentStaff.length > 0 ? (
                currentStaff.map(staff => (
                  <label key={staff.id} className="flex items-center p-3 hover:bg-gray-50 border-b last:border-b-0">
                    <input
                      type="checkbox"
                      checked={selectedCurrent.includes(staff.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedCurrent([...selectedCurrent, staff.id]);
                        } else {
                          setSelectedCurrent(selectedCurrent.filter(id => id !== staff.id));
                        }
                      }}
                      className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                    />
                    <div className="ml-3">
                      <div className="text-sm font-medium text-gray-900">
                        {staff.first_name} {staff.last_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {staff.role?.name} • {staff.email}
                      </div>
                    </div>
                  </label>
                ))
              ) : (
                <div className="p-4 text-center text-gray-500">
                  No staff currently assigned
                </div>
              )}
            </div>
            {selectedCurrent.length > 0 && (
              <button
                onClick={() => {
                  onRemove(selectedCurrent);
                  setSelectedCurrent([]);
                }}
                disabled={loading}
                className="mt-3 w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center disabled:opacity-50 transition-colors"
              >
                <UserMinus className="h-4 w-4 mr-2" />
                Remove Selected ({selectedCurrent.length})
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading && clinics.length === 0) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading clinics...</p>
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
            <h1 className="text-2xl font-bold text-gray-900">Clinic Management</h1>
            <p className="text-gray-600">Manage healthcare facilities and their staff assignments</p>
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
              Add Clinic
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search clinics..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            >
              <option value="">All Types</option>
              <option value="public">Public Clinics</option>
              <option value="private">Private Clinics</option>
            </select>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('');
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
          {selectedClinics.length > 0 && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <span className="text-sm text-blue-700 font-medium">
                  {selectedClinics.length} clinic(s) selected
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleBulkAction('delete')}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                  >
                    Delete Selected
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Clinics Table */}
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
                          setSelectedClinics(paginatedClinics.map(c => c.id));
                        } else {
                          setSelectedClinics([]);
                        }
                      }}
                      checked={selectedClinics.length === paginatedClinics.length && paginatedClinics.length > 0}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded transition-colors"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Clinic
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Staff
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Services
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedClinics.map((clinic) => (
                  <tr key={clinic.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedClinics.includes(clinic.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedClinics([...selectedClinics, clinic.id]);
                          } else {
                            setSelectedClinics(selectedClinics.filter(id => id !== clinic.id));
                          }
                        }}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded transition-colors"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Building className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {clinic.name}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center">
                            <MapPin className="h-3 w-3 mr-1" />
                            {clinic.address.length > 50 ? `${clinic.address.substring(0, 50)}...` : clinic.address}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 flex items-center">
                        <Phone className="h-3 w-3 mr-1" />
                        {clinic.phone_number}
                      </div>
                      {clinic.email && (
                        <div className="text-sm text-gray-500 flex items-center">
                          <Mail className="h-3 w-3 mr-1" />
                          {clinic.email}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-900">
                          {clinic.staff_count || 0}
                        </span>
                        <span className="text-xs text-gray-500">total</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {clinic.doctors_count || 0} doctors, {clinic.nurses_count || 0} nurses
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                        clinic.is_public ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {clinic.is_public ? (
                          <>
                            <Globe className="h-3 w-3 mr-1" />
                            Public
                          </>
                        ) : (
                          <>
                            <Lock className="h-3 w-3 mr-1" />
                            Private
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {clinic.services && clinic.services.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {clinic.services.slice(0, 2).map((service, index) => (
                            <span key={index} className="inline-flex px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">
                              {service}
                            </span>
                          ))}
                          {clinic.services.length > 2 && (
                            <span className="inline-flex px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                              +{clinic.services.length - 2} more
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-500">No services listed</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleViewClinic(clinic)}
                          className="text-blue-600 hover:text-blue-900 transition-colors"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEditClinic(clinic)}
                          className="text-green-600 hover:text-green-900 transition-colors"
                          title="Edit Clinic"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleManageStaff(clinic)}
                          className="text-purple-600 hover:text-purple-900 transition-colors"
                          title="Manage Staff"
                        >
                          <Users className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClinic(clinic.id)}
                          className="text-red-600 hover:text-red-900 transition-colors"
                          title="Delete Clinic"
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
          {filteredClinics.length === 0 && !loading && (
            <div className="text-center py-12">
              <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No clinics found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || statusFilter
                  ? 'Try adjusting your search filters' 
                  : 'Get started by creating your first clinic'}
              </p>
              {!searchTerm && !statusFilter && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Add First Clinic
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
                Showing {startIndex + 1} to {Math.min(startIndex + clinicsPerPage, filteredClinics.length)} of {filteredClinics.length} clinics
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

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Building className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-gray-600">Total Clinics</div>
                <div className="text-2xl font-bold text-gray-900">{clinics.length}</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Globe className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-gray-600">Public Clinics</div>
                <div className="text-2xl font-bold text-gray-900">
                  {clinics.filter(c => c.is_public).length}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-gray-600">Total Staff</div>
                <div className="text-2xl font-bold text-gray-900">
                  {clinics.reduce((sum, clinic) => sum + (clinic.staff_count || 0), 0)}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <BarChart3 className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-gray-600">Avg Staff/Clinic</div>
                <div className="text-2xl font-bold text-gray-900">
                  {clinics.length > 0 ? Math.round(clinics.reduce((sum, clinic) => sum + (clinic.staff_count || 0), 0) / clinics.length) : 0}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create Clinic Modal */}
      <Modal 
        title="Create New Clinic" 
        isOpen={showCreateModal} 
        onClose={handleCloseCreateModal}
        size="lg"
      >
        <ClinicForm
          onSubmit={handleCreateSubmit}
          onCancel={handleCloseCreateModal}
          loading={loading}
          isEdit={false}
        />
      </Modal>

      {/* Edit Clinic Modal */}
      <Modal 
        title="Edit Clinic" 
        isOpen={showEditModal} 
        onClose={handleCloseEditModal}
        size="lg"
      >
        <ClinicForm
          initialData={editingClinic}
          onSubmit={handleUpdateSubmit}
          onCancel={handleCloseEditModal}
          loading={loading}
          isEdit={true}
        />
      </Modal>

      {/* View Clinic Modal */}
      <Modal 
        title="Clinic Details" 
        isOpen={showViewModal} 
        onClose={() => { 
          setShowViewModal(false); 
          setViewingClinic(null); 
        }}
        size="xl"
      >
        {viewingClinic && (
          <div className="space-y-6">
            <div className="flex items-center space-x-4 pb-6 border-b border-gray-200">
              <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center">
                <Building className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  {viewingClinic.name}
                </h3>
                <p className="text-gray-600 flex items-center">
                  <MapPin className="h-4 w-4 mr-1" />
                  {viewingClinic.address}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                    viewingClinic.is_public ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {viewingClinic.is_public ? (
                      <>
                        <Globe className="h-3 w-3 mr-1" />
                        Public
                      </>
                    ) : (
                      <>
                        <Lock className="h-3 w-3 mr-1" />
                        Private
                      </>
                    )}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="text-lg font-medium text-gray-900">Contact Information</h4>
                
                <div className="space-y-3 text-sm">
                  <div className="flex items-center">
                    <Phone className="h-4 w-4 text-gray-400 mr-3" />
                    <span className="text-gray-900">{viewingClinic.phone_number}</span>
                  </div>
                  
                  {viewingClinic.email && (
                    <div className="flex items-center">
                      <Mail className="h-4 w-4 text-gray-400 mr-3" />
                      <span className="text-gray-900">{viewingClinic.email}</span>
                    </div>
                  )}
                  
                  <div className="flex items-start">
                    <MapPin className="h-4 w-4 text-gray-400 mr-3 mt-0.5" />
                    <span className="text-gray-900">{viewingClinic.address}</span>
                  </div>
                  
                  {viewingClinic.gps_coordinates && (
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 text-gray-400 mr-3" />
                      <span className="text-gray-900 font-mono text-xs">{viewingClinic.gps_coordinates}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-lg font-medium text-gray-900">Staff & Services</h4>
                
                <div className="space-y-3">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-sm font-medium text-gray-700">Staff Count</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {viewingClinic.staff_count || 0} total
                    </div>
                    <div className="text-xs text-gray-500">
                      {viewingClinic.doctors_count || 0} doctors, {viewingClinic.nurses_count || 0} nurses
                    </div>
                  </div>
                  
                  {viewingClinic.services && viewingClinic.services.length > 0 && (
                    <div>
                      <div className="text-sm font-medium text-gray-700 mb-2">Services Offered</div>
                      <div className="flex flex-wrap gap-2">
                        {viewingClinic.services.map((service, index) => (
                          <span key={index} className="inline-flex px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                            {service}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-6 border-t border-gray-200 space-x-3">
              <button
                onClick={() => handleManageStaff(viewingClinic)}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium flex items-center transition-colors"
              >
                <Users className="h-4 w-4 mr-2" />
                Manage Staff
              </button>
              <button
                onClick={() => handleEditClinic(viewingClinic)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center transition-colors"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Clinic
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Staff Management Modal */}
      <Modal 
        title="Staff Management" 
        isOpen={showStaffModal} 
        onClose={handleCloseStaffModal}
        size="4xl"
      >
        {managingStaffClinic && (
          <StaffManagement
            clinic={managingStaffClinic}
            currentStaff={clinicStaff}
            availableStaff={availableStaff}
            onAssign={handleAssignStaff}
            onRemove={handleRemoveStaff}
            loading={loading}
          />
        )}
      </Modal>
    </DashboardLayout>
  );
};

export default ClinicManagement;
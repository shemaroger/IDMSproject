import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { healthcareAPI, authAPI } from '../../services/api';
import api from '../../services/api';
import { 
  Plus, 
  Clock, 
  MapPin, 
  AlertTriangle, 
  Phone, 
  CheckCircle, 
  Navigation, 
  Eye, 
  X, 
  RefreshCw,
  Calendar,
  User,
  Building,
  Activity,
  ChevronDown,
  ChevronUp,
  Search,
  Filter
} from 'lucide-react';

const PatientEmergencyPage = () => {
  const [emergencyRequests, setEmergencyRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'request_time', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  const [filters, setFilters] = useState({
    status: 'all',
    urgency: 'all',
    approval: 'all',
    search: ''
  });

  const [formData, setFormData] = useState({
    clinic: '',
    location: '',
    gps_coordinates: '',
    condition_description: '',
    suspected_disease: '',
    urgency_level: 'standard',
    additional_notes: ''
  });

  useEffect(() => {
    fetchEmergencyRequests();
    fetchClinics();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [emergencyRequests, filters]);

  const fetchClinics = async () => {
    try {
      const response = await healthcareAPI.clinics.list();
      setClinics(response.data.results || response.data || []);
    } catch (error) {
      console.error('Error fetching clinics:', error);
    }
  };

  const fetchEmergencyRequests = async () => {
    try {
      setError('');
      let response;
      try {
        response = await api.get('/emergency-requests/');
      } catch (err) {
        response = await api.get('/emergency-ambulance-requests/');
      }
      setEmergencyRequests(response.data.results || response.data || []);
    } catch (error) {
      console.error('Error fetching emergency requests:', error);
      setError('Unable to load emergency requests. The service may be temporarily unavailable.');
      setEmergencyRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...emergencyRequests];

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(request => request.status === filters.status);
    }

    // Urgency filter
    if (filters.urgency !== 'all') {
      filtered = filtered.filter(request => request.urgency_level === filters.urgency);
    }

    // Approval filter
    if (filters.approval !== 'all') {
      filtered = filtered.filter(request => request.approval_status === filters.approval);
    }

    // Search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(request =>
        request.location?.toLowerCase().includes(searchTerm) ||
        request.condition_description?.toLowerCase().includes(searchTerm) ||
        request.suspected_disease?.toLowerCase().includes(searchTerm) ||
        request.clinic_name?.toLowerCase().includes(searchTerm) ||
        request.id.toString().includes(searchTerm)
      );
    }

    setFilteredRequests(filtered);
    setCurrentPage(1);
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });

    const sorted = [...filteredRequests].sort((a, b) => {
      let aValue = a[key];
      let bValue = b[key];

      if (key === 'request_time') {
        aValue = new Date(a.request_time);
        bValue = new Date(b.request_time);
      }

      if (aValue < bValue) return direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return direction === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredRequests(sorted);
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser');
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setFormData(prev => ({
          ...prev,
          gps_coordinates: `${latitude},${longitude}`
        }));
        setGettingLocation(false);
        alert('Location captured successfully!');
      },
      (error) => {
        setGettingLocation(false);
        alert('Unable to get your location. Please enter it manually.');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const handleSubmit = async () => {
    if (!formData.location.trim() || !formData.condition_description.trim()) {
      alert('Please fill in location and medical condition fields');
      return;
    }
    
    setCreating(true);
    
    try {
      const currentUser = authAPI.getCurrentUser();
      let patientId = currentUser?.patient_id || currentUser?.id;
      
      const requestData = {
        patient: patientId,
        location: formData.location.trim(),
        condition_description: formData.condition_description.trim(),
        suspected_disease: formData.suspected_disease?.trim() || '',
        urgency_level: formData.urgency_level || 'standard',
        additional_notes: formData.additional_notes?.trim() || '',
        ...(formData.clinic && { clinic: parseInt(formData.clinic) }),
        ...(formData.gps_coordinates && { gps_coordinates: formData.gps_coordinates.trim() })
      };
      
      try {
        await api.post('/emergency-requests/', requestData);
      } catch (err) {
        await api.post('/emergency-ambulance-requests/', requestData);
      }
      
      setShowCreateForm(false);
      setFormData({
        clinic: '',
        location: '',
        gps_coordinates: '',
        condition_description: '',
        suspected_disease: '',
        urgency_level: 'standard',
        additional_notes: ''
      });
      fetchEmergencyRequests();
      alert('Emergency request submitted successfully!');
      
    } catch (error) {
      console.error('Error submitting emergency request:', error);
      alert('Failed to submit emergency request. Please try again or call 911 directly.');
    } finally {
      setCreating(false);
    }
  };

  const viewRequestDetails = (request) => {
    setSelectedRequest(request);
    setShowDetailModal(true);
  };

  const getStatusBadge = (status, approvalStatus) => {
    if (approvalStatus === 'rejected') {
      return <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full border border-red-200">Rejected</span>;
    }
    
    const statusMap = {
      'P': { text: 'Pending Review', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
      'D': { text: 'Dispatched', color: 'bg-blue-100 text-blue-800 border-blue-200' },
      'A': { text: 'Arrived', color: 'bg-purple-100 text-purple-800 border-purple-200' },
      'T': { text: 'In Transit', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
      'C': { text: 'Completed', color: 'bg-green-100 text-green-800 border-green-200' }
    };
    
    const statusInfo = statusMap[status] || { text: 'Unknown', color: 'bg-gray-100 text-gray-800 border-gray-200' };
    
    return (
      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full border ${statusInfo.color}`}>
        {statusInfo.text}
      </span>
    );
  };

  const getUrgencyBadge = (urgency) => {
    const urgencyMap = {
      'immediate': { text: 'IMMEDIATE', color: 'bg-red-100 text-red-800 border-red-200' },
      'urgent': { text: 'URGENT', color: 'bg-orange-100 text-orange-800 border-orange-200' },
      'standard': { text: 'STANDARD', color: 'bg-blue-100 text-blue-800 border-blue-200' },
      'non_urgent': { text: 'LOW', color: 'bg-green-100 text-green-800 border-green-200' }
    };
    
    const urgencyInfo = urgencyMap[urgency] || urgencyMap['standard'];
    
    return (
      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full border ${urgencyInfo.color}`}>
        {urgencyInfo.text}
      </span>
    );
  };

  const getStatistics = () => {
    const total = emergencyRequests.length;
    const pending = emergencyRequests.filter(r => r.approval_status === 'pending').length;
    const active = emergencyRequests.filter(r => ['D', 'A', 'T'].includes(r.status)).length;
    const completed = emergencyRequests.filter(r => r.status === 'C').length;
    
    return { total, pending, active, completed };
  };

  // Pagination
  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentRequests = filteredRequests.slice(startIndex, endIndex);

  const stats = getStatistics();

  const SortableHeader = ({ column, children, className = "" }) => (
    <th 
      className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 ${className}`}
      onClick={() => handleSort(column)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortConfig.key === column && (
          sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
        )}
      </div>
    </th>
  );

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading emergency requests...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Emergency Ambulance Requests</h1>
            <p className="text-gray-600">Request emergency medical assistance and track your requests</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={fetchEmergencyRequests}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Request Emergency Ambulance
            </button>
          </div>
        </div>

        {/* Emergency Notice */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-800">🚨 Life-Threatening Emergency?</h3>
              <p className="text-red-700 text-sm mt-1">
                If this is a life-threatening emergency, call <strong>911</strong> immediately. 
                This system is for requesting ambulance services and tracking existing requests.
              </p>
              <button
                onClick={() => window.open('tel:911', '_self')}
                className="mt-2 flex items-center gap-1 bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
              >
                <Phone className="w-4 h-4" />
                Call 911 Now
              </button>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Requests</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Activity className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Review</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active</p>
                <p className="text-2xl font-bold text-blue-600">{stats.active}</p>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              <div>
                <p className="text-yellow-800">{error}</p>
                <button
                  onClick={fetchEmergencyRequests}
                  className="mt-2 flex items-center gap-1 text-yellow-700 hover:text-yellow-900 text-sm"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-gray-600" />
            <h3 className="font-medium text-gray-900">Filters</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({...filters, status: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="all">All Status</option>
                <option value="P">Pending Review</option>
                <option value="D">Dispatched</option>
                <option value="A">Arrived</option>
                <option value="T">In Transit</option>
                <option value="C">Completed</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Urgency</label>
              <select
                value={filters.urgency}
                onChange={(e) => setFilters({...filters, urgency: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="all">All Urgency</option>
                <option value="immediate">Immediate</option>
                <option value="urgent">Urgent</option>
                <option value="standard">Standard</option>
                <option value="non_urgent">Low Priority</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Approval</label>
              <select
                value={filters.approval}
                onChange={(e) => setFilters({...filters, approval: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="all">All Approval</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Per Page</label>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value={5}>5 requests</option>
                <option value={10}>10 requests</option>
                <option value={25}>25 requests</option>
                <option value={50}>50 requests</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search requests..."
                  value={filters.search}
                  onChange={(e) => setFilters({...filters, search: e.target.value})}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {filteredRequests.length === 0 ? (
            <div className="text-center py-12">
              <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {emergencyRequests.length === 0 ? 'No Emergency Requests' : 'No Results Found'}
              </h3>
              <p className="text-gray-600 mb-4">
                {emergencyRequests.length === 0 
                  ? "You haven't submitted any emergency ambulance requests yet."
                  : "No requests match your current filters."
                }
              </p>
              {emergencyRequests.length === 0 && (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Request Emergency Assistance
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <SortableHeader column="id">ID</SortableHeader>
                      <SortableHeader column="request_time">Date/Time</SortableHeader>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Condition
                      </th>
                      <SortableHeader column="urgency_level">Urgency</SortableHeader>
                      <SortableHeader column="status">Status</SortableHeader>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ambulance
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {currentRequests.map((request) => (
                      <tr key={request.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">#{request.id}</div>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {new Date(request.request_time).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(request.request_time).toLocaleTimeString()}
                          </div>
                        </td>
                        
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 max-w-xs truncate" title={request.location}>
                            {request.location}
                          </div>
                          {request.clinic_name && (
                            <div className="text-xs text-blue-600 truncate">
                              {request.clinic_name}
                            </div>
                          )}
                        </td>
                        
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 max-w-xs truncate" title={request.condition_description}>
                            {request.condition_description}
                          </div>
                          {request.suspected_disease && (
                            <div className="text-xs text-gray-500 truncate">
                              Suspected: {request.suspected_disease}
                            </div>
                          )}
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getUrgencyBadge(request.urgency_level)}
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(request.status, request.approval_status)}
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          {request.assigned_ambulance ? (
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {request.assigned_ambulance}
                              </div>
                              {request.hospital_destination && (
                                <div className="text-xs text-gray-500 truncate max-w-32">
                                  → {request.hospital_destination}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500">Not assigned</span>
                          )}
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => viewRequestDetails(request)}
                            className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                        <span className="font-medium">{Math.min(endIndex, filteredRequests.length)}</span> of{' '}
                        <span className="font-medium">{filteredRequests.length}</span> results
                      </p>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                        <button
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          disabled={currentPage === 1}
                          className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                        >
                          Previous
                        </button>
                        
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNumber;
                          if (totalPages <= 5) {
                            pageNumber = i + 1;
                          } else if (currentPage <= 3) {
                            pageNumber = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNumber = totalPages - 4 + i;
                          } else {
                            pageNumber = currentPage - 2 + i;
                          }
                          
                          return (
                            <button
                              key={pageNumber}
                              onClick={() => setCurrentPage(pageNumber)}
                              className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                currentPage === pageNumber
                                  ? 'z-10 bg-red-50 border-red-500 text-red-600'
                                  : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                              }`}
                            >
                              {pageNumber}
                            </button>
                          );
                        })}
                        
                        <button
                          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                          disabled={currentPage === totalPages}
                          className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                        >
                          Next
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Create Form Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-2xl max-h-screen overflow-y-auto">
              <div className="p-6">
                <h2 className="text-xl font-bold mb-4">Request Emergency Ambulance</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Preferred Clinic (Optional)
                    </label>
                    <select
                      value={formData.clinic}
                      onChange={(e) => setFormData({...formData, clinic: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="">Select a clinic (optional)</option>
                      {clinics.map((clinic) => (
                        <option key={clinic.id} value={clinic.id}>
                          {clinic.name} - {clinic.address}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Current Location *
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        required
                        value={formData.location}
                        onChange={(e) => setFormData({...formData, location: e.target.value})}
                        placeholder="Enter your exact location"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                      <button
                        onClick={getCurrentLocation}
                        disabled={gettingLocation}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
                      >
                        <Navigation className="w-4 h-4" />
                        {gettingLocation ? 'Getting...' : 'GPS'}
                      </button>
                    </div>
                    {formData.gps_coordinates && (
                      <p className="text-xs text-green-600 mt-1">GPS: {formData.gps_coordinates}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Medical Condition/Emergency *
                    </label>
                    <textarea
                      required
                      value={formData.condition_description}
                      onChange={(e) => setFormData({...formData, condition_description: e.target.value})}
                      placeholder="Describe your symptoms or medical emergency"
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Suspected Condition (Optional)
                    </label>
                    <input
                      type="text"
                      value={formData.suspected_disease}
                      onChange={(e) => setFormData({...formData, suspected_disease: e.target.value})}
                      placeholder="If you know or suspect a specific condition"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Urgency Level
                    </label>
                    <select
                      value={formData.urgency_level}
                      onChange={(e) => setFormData({...formData, urgency_level: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="immediate">Immediate (Life-threatening)</option>
                      <option value="urgent">Urgent (Serious but not life-threatening)</option>
                      <option value="standard">Standard (Medical attention needed)</option>
                      <option value="non_urgent">Non-urgent (Can wait)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Additional Notes
                    </label>
                    <textarea
                      value={formData.additional_notes}
                      onChange={(e) => setFormData({...formData, additional_notes: e.target.value})}
                      placeholder="Any additional information for emergency responders"
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                    <p className="text-sm text-yellow-800">
                      <strong>Important:</strong> This request will be reviewed by medical staff before dispatch. 
                      For immediate life-threatening emergencies, call 911 directly.
                    </p>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={handleSubmit}
                      disabled={creating || !formData.location.trim() || !formData.condition_description.trim()}
                      className="flex-1 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50"
                    >
                      {creating ? 'Submitting...' : 'Submit Emergency Request'}
                    </button>
                    <button
                      onClick={() => setShowCreateForm(false)}
                      disabled={creating}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Detail Modal */}
        {showDetailModal && selectedRequest && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-5xl max-h-screen overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">Emergency Request #{selectedRequest.id}</h2>
                      <p className="text-gray-600">Submitted {new Date(selectedRequest.request_time).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="text-gray-500 hover:text-gray-700 p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200">
                      <h3 className="flex items-center gap-2 font-semibold text-blue-800 mb-4">
                        <Activity className="w-5 h-5" />
                        Request Information
                      </h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-blue-700">Request ID:</span>
                          <span className="text-blue-900 font-mono">#{selectedRequest.id}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-blue-700">Submitted:</span>
                          <span className="text-blue-900 text-sm">
                            {new Date(selectedRequest.request_time).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-blue-700">Status:</span>
                          {getStatusBadge(selectedRequest.status, selectedRequest.approval_status)}
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-blue-700">Urgency:</span>
                          {getUrgencyBadge(selectedRequest.urgency_level)}
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg border border-green-200">
                      <h3 className="flex items-center gap-2 font-semibold text-green-800 mb-4">
                        <MapPin className="w-5 h-5" />
                        Location Details
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <span className="font-medium text-green-700 block mb-2">Address:</span>
                          <p className="text-green-900 bg-white bg-opacity-60 p-3 rounded border">
                            {selectedRequest.location}
                          </p>
                        </div>
                        
                        {selectedRequest.gps_coordinates && (
                          <div>
                            <span className="font-medium text-green-700 block mb-2">GPS Coordinates:</span>
                            <div className="bg-white bg-opacity-60 p-3 rounded border">
                              <p className="text-green-900 font-mono text-sm mb-2">
                                {selectedRequest.gps_coordinates}
                              </p>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    const [lat, lng] = selectedRequest.gps_coordinates.split(',');
                                    const googleMapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
                                    window.open(googleMapsUrl, '_blank');
                                  }}
                                  className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                                >
                                  <MapPin className="w-3 h-3" />
                                  Google Maps
                                </button>
                                <button
                                  onClick={() => {
                                    const [lat, lng] = selectedRequest.gps_coordinates.split(',');
                                    const appleMapsUrl = `https://maps.apple.com/?q=${lat},${lng}`;
                                    window.open(appleMapsUrl, '_blank');
                                  }}
                                  className="flex items-center gap-1 px-3 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700 transition-colors"
                                >
                                  <MapPin className="w-3 h-3" />
                                  Apple Maps
                                </button>
                                <button
                                  onClick={() => {
                                    const [lat, lng] = selectedRequest.gps_coordinates.split(',');
                                    const wazeUrl = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
                                    window.open(wazeUrl, '_blank');
                                  }}
                                  className="flex items-center gap-1 px-3 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700 transition-colors"
                                >
                                  <Navigation className="w-3 h-3" />
                                  Waze
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {!selectedRequest.gps_coordinates && (
                          <div>
                            <span className="font-medium text-green-700 block mb-2">Map Search:</span>
                            <button
                              onClick={() => {
                                const searchQuery = encodeURIComponent(selectedRequest.location);
                                const googleMapsUrl = `https://www.google.com/maps/search/${searchQuery}`;
                                window.open(googleMapsUrl, '_blank');
                              }}
                              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                            >
                              <MapPin className="w-4 h-4" />
                              Search on Google Maps
                            </button>
                          </div>
                        )}
                        
                        {selectedRequest.clinic_name && (
                          <div>
                            <span className="font-medium text-green-700 block mb-1">Preferred Clinic:</span>
                            <p className="text-green-900 bg-white bg-opacity-60 p-2 rounded border text-sm">
                              {selectedRequest.clinic_name}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg border border-purple-200">
                      <h3 className="flex items-center gap-2 font-semibold text-purple-800 mb-4">
                        <Activity className="w-5 h-5" />
                        Medical Information
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <span className="font-medium text-purple-700 block mb-2">Condition Description:</span>
                          <div className="bg-white bg-opacity-60 p-3 rounded border">
                            <p className="text-purple-900">{selectedRequest.condition_description}</p>
                          </div>
                        </div>
                        {selectedRequest.suspected_disease && (
                          <div>
                            <span className="font-medium text-purple-700 block mb-2">Suspected Condition:</span>
                            <div className="bg-white bg-opacity-60 p-3 rounded border">
                              <p className="text-purple-900">{selectedRequest.suspected_disease}</p>
                            </div>
                          </div>
                        )}
                        {selectedRequest.additional_notes && (
                          <div>
                            <span className="font-medium text-purple-700 block mb-2">Additional Notes:</span>
                            <div className="bg-white bg-opacity-60 p-3 rounded border">
                              <p className="text-purple-900">{selectedRequest.additional_notes}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-6 rounded-lg border border-gray-200">
                      <h3 className="flex items-center gap-2 font-semibold text-gray-800 mb-4">
                        <Clock className="w-5 h-5" />
                        Status Timeline
                      </h3>
                      <div className="space-y-4">
                        <div className="flex items-start gap-3">
                          <div className="w-4 h-4 bg-yellow-500 rounded-full flex-shrink-0 mt-1"></div>
                          <div>
                            <p className="font-medium text-gray-900">Request Submitted</p>
                            <p className="text-sm text-gray-600">
                              {new Date(selectedRequest.request_time).toLocaleString()}
                            </p>
                          </div>
                        </div>

                        {selectedRequest.approved_at && (
                          <div className="flex items-start gap-3">
                            <div className="w-4 h-4 bg-green-500 rounded-full flex-shrink-0 mt-1"></div>
                            <div>
                              <p className="font-medium text-gray-900">Request Approved</p>
                              <p className="text-sm text-gray-600">
                                {new Date(selectedRequest.approved_at).toLocaleString()}
                              </p>
                              {selectedRequest.approved_by_name && (
                                <p className="text-xs text-gray-500">By: {selectedRequest.approved_by_name}</p>
                              )}
                            </div>
                          </div>
                        )}

                        {selectedRequest.dispatched_at && (
                          <div className="flex items-start gap-3">
                            <div className="w-4 h-4 bg-blue-500 rounded-full flex-shrink-0 mt-1"></div>
                            <div>
                              <p className="font-medium text-gray-900">Ambulance Dispatched</p>
                              <p className="text-sm text-gray-600">
                                {new Date(selectedRequest.dispatched_at).toLocaleString()}
                              </p>
                              {selectedRequest.dispatched_by_name && (
                                <p className="text-xs text-gray-500">By: {selectedRequest.dispatched_by_name}</p>
                              )}
                            </div>
                          </div>
                        )}

                        {selectedRequest.arrived_at && (
                          <div className="flex items-start gap-3">
                            <div className="w-4 h-4 bg-purple-500 rounded-full flex-shrink-0 mt-1"></div>
                            <div>
                              <p className="font-medium text-gray-900">Ambulance Arrived</p>
                              <p className="text-sm text-gray-600">
                                {new Date(selectedRequest.arrived_at).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        )}

                        {selectedRequest.in_transit_at && (
                          <div className="flex items-start gap-3">
                            <div className="w-4 h-4 bg-indigo-500 rounded-full flex-shrink-0 mt-1"></div>
                            <div>
                              <p className="font-medium text-gray-900">In Transit to Hospital</p>
                              <p className="text-sm text-gray-600">
                                {new Date(selectedRequest.in_transit_at).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        )}

                        {selectedRequest.completed_at && (
                          <div className="flex items-start gap-3">
                            <div className="w-4 h-4 bg-green-600 rounded-full flex-shrink-0 mt-1"></div>
                            <div>
                              <p className="font-medium text-gray-900">Request Completed</p>
                              <p className="text-sm text-gray-600">
                                {new Date(selectedRequest.completed_at).toLocaleString()}
                              </p>
                              {selectedRequest.completed_by_name && (
                                <p className="text-xs text-gray-500">By: {selectedRequest.completed_by_name}</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {selectedRequest.assigned_ambulance && (
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-100 p-6 rounded-lg border border-blue-200">
                        <h3 className="flex items-center gap-2 font-semibold text-blue-800 mb-4">
                          <AlertTriangle className="w-5 h-5" />
                          Ambulance Information
                        </h3>
                        <div className="space-y-3">
                          <div>
                            <span className="font-medium text-blue-700 block mb-1">Ambulance ID:</span>
                            <p className="text-blue-900 font-mono bg-white bg-opacity-60 p-2 rounded border">
                              {selectedRequest.assigned_ambulance}
                            </p>
                          </div>
                          {selectedRequest.hospital_destination && (
                            <div>
                              <span className="font-medium text-blue-700 block mb-1">Hospital Destination:</span>
                              <div className="bg-white bg-opacity-60 p-3 rounded border">
                                <p className="text-blue-900 mb-2">{selectedRequest.hospital_destination}</p>
                                <button
                                  onClick={() => {
                                    const searchQuery = encodeURIComponent(selectedRequest.hospital_destination);
                                    const googleMapsUrl = `https://www.google.com/maps/search/${searchQuery}`;
                                    window.open(googleMapsUrl, '_blank');
                                  }}
                                  className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                                >
                                  <MapPin className="w-3 h-3" />
                                  Find Hospital on Map
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {selectedRequest.approval_status === 'rejected' && (
                      <div className="bg-gradient-to-br from-red-50 to-red-100 p-6 rounded-lg border border-red-200">
                        <h3 className="flex items-center gap-2 font-semibold text-red-800 mb-4">
                          <X className="w-5 h-5" />
                          Rejection Information
                        </h3>
                        <div className="space-y-3">
                          {selectedRequest.rejection_reason && (
                            <div>
                              <span className="font-medium text-red-700 block mb-1">Reason:</span>
                              <div className="bg-white bg-opacity-60 p-3 rounded border">
                                <p className="text-red-900">{selectedRequest.rejection_reason}</p>
                              </div>
                            </div>
                          )}
                          {selectedRequest.approval_comments && (
                            <div>
                              <span className="font-medium text-red-700 block mb-1">Comments:</span>
                              <div className="bg-white bg-opacity-60 p-3 rounded border">
                                <p className="text-red-900">{selectedRequest.approval_comments}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Quick Actions */}
                    <div className="bg-gradient-to-br from-yellow-50 to-orange-100 p-6 rounded-lg border border-yellow-200">
                      <h3 className="flex items-center gap-2 font-semibold text-yellow-800 mb-4">
                        <Phone className="w-5 h-5" />
                        Quick Actions
                      </h3>
                      <div className="space-y-3">
                        <button
                          onClick={() => window.open('tel:911', '_self')}
                          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                        >
                          <Phone className="w-4 h-4" />
                          Call 911 Emergency
                        </button>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => {
                              const coords = selectedRequest.gps_coordinates || selectedRequest.location;
                              const message = `Emergency at: ${selectedRequest.location}. Condition: ${selectedRequest.condition_description}`;
                              const smsUrl = `sms:?body=${encodeURIComponent(message)}`;
                              window.open(smsUrl, '_self');
                            }}
                            className="flex items-center justify-center gap-1 px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                          >
                            <User className="w-3 h-3" />
                            Share via SMS
                          </button>
                          <button
                            onClick={() => {
                              const subject = `Emergency Request #${selectedRequest.id}`;
                              const body = `Location: ${selectedRequest.location}\nCondition: ${selectedRequest.condition_description}\nUrgency: ${selectedRequest.urgency_level}\nTime: ${new Date(selectedRequest.request_time).toLocaleString()}`;
                              const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                              window.open(mailtoUrl, '_self');
                            }}
                            className="flex items-center justify-center gap-1 px-3 py-2 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 transition-colors"
                          >
                            <Calendar className="w-3 h-3" />
                            Share via Email
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end mt-8 pt-6 border-t border-gray-200">
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
                  >
                    Close Details
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default PatientEmergencyPage;
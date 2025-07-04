// src/pages/emergency/EmergencyManagement.jsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import emergencyAmbulanceService from '../../services/emergencyAmbulanceService';
import { authAPI } from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import {
  Ambulance,
  MapPin,
  Clock,
  Phone,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Activity,
  Navigation,
  Hospital,
  User,
  Calendar,
  Search,
  Filter,
  RefreshCw,
  Loader2,
  Eye,
  Edit3,
  Truck,
  Target,
  Route,
  Flag,
  Info,
  Bell,
  Zap,
  Heart,
  X,
  Plus,
  Send,
  Map,
  Crosshair
} from 'lucide-react';

const EmergencyManagement = () => {
  // =========================== STATE MANAGEMENT ===========================
  
  // Data states
  const [emergencyRequests, setEmergencyRequests] = useState([]);
  const [nearestHospitals, setNearestHospitals] = useState([]);
  const [stats, setStats] = useState({});
  const [lastRefresh, setLastRefresh] = useState(new Date());
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  
  // Message states
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Modal states
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  
  // Form states
  const [createForm, setCreateForm] = useState({
    location: '',
    gps_coordinates: '',
    condition_description: '',
    suspected_disease: ''
  });
  
  const [dispatchForm, setDispatchForm] = useState({
    ambulanceId: '',
    hospitalDestination: '',
    estimatedArrival: ''
  });
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [diseaseFilter, setDiseaseFilter] = useState('all');
  
  // User context
  const currentUser = authAPI.getCurrentUser();
  const canManage = emergencyAmbulanceService.canManageEmergencies();

  // =========================== COMPUTED VALUES ===========================
  
  const filteredRequests = useMemo(() => {
    return emergencyRequests.filter(request => {
      const formatted = emergencyAmbulanceService.formatEmergencyRequest(request);
      
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = 
          formatted.patient.toLowerCase().includes(searchLower) ||
          formatted.location.toLowerCase().includes(searchLower) ||
          formatted.condition.toLowerCase().includes(searchLower) ||
          formatted.suspectedDisease?.toLowerCase().includes(searchLower) ||
          formatted.assignedAmbulance?.toLowerCase().includes(searchLower);
        
        if (!matchesSearch) return false;
      }
      
      // Status filter
      if (statusFilter !== 'all' && request.status !== statusFilter) {
        return false;
      }
      
      // Priority filter
      if (priorityFilter !== 'all' && formatted.priority !== priorityFilter) {
        return false;
      }
      
      // Disease filter
      if (diseaseFilter !== 'all' && request.suspected_disease !== diseaseFilter) {
        return false;
      }
      
      return true;
    });
  }, [emergencyRequests, searchTerm, statusFilter, priorityFilter, diseaseFilter]);

  const dashboardStats = useMemo(() => {
    const formatted = emergencyRequests.map(req => 
      emergencyAmbulanceService.formatEmergencyRequest(req)
    );
    
    return {
      total: formatted.length,
      pending: formatted.filter(req => req.status === 'P').length,
      dispatched: formatted.filter(req => req.status === 'D').length,
      arrived: formatted.filter(req => req.status === 'A').length,
      inTransit: formatted.filter(req => req.status === 'T').length,
      completed: formatted.filter(req => req.status === 'C').length,
      critical: formatted.filter(req => req.priority === 'critical').length,
      urgent: formatted.filter(req => req.priority === 'urgent').length
    };
  }, [emergencyRequests]);

  // =========================== DATA FETCHING ===========================
  
  const fetchEmergencyRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await emergencyAmbulanceService.getEmergencyRequests({
        ordering: '-request_time'
      });
      
      if (response.success) {
        setEmergencyRequests(response.requests);
        setLastRefresh(new Date());
      } else {
        setError('Failed to fetch emergency requests');
      }
    } catch (err) {
      console.error('Error fetching emergency requests:', err);
      setError('Failed to fetch emergency requests');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const response = await emergencyAmbulanceService.getEmergencyStats();
      if (response.success) {
        setStats(response.stats);
      }
    } catch (err) {
      console.error('Error fetching emergency stats:', err);
    }
  }, []);

  const fetchNearestHospitals = useCallback(async () => {
    try {
      const location = await emergencyAmbulanceService.getCurrentLocation();
      const hospitals = await emergencyAmbulanceService.findNearestHospitals(
        location.latitude,
        location.longitude
      );
      if (hospitals.success) {
        setNearestHospitals(hospitals.hospitals);
      }
    } catch (err) {
      console.error('Error fetching nearest hospitals:', err);
    }
  }, []);

  // =========================== FORM HANDLERS ===========================
  
  const handleCreateRequest = async () => {
    try {
      setActionLoading(prev => ({ ...prev, create: true }));
      
      // Get current location if not provided
      let requestData = { ...createForm };
      if (!requestData.gps_coordinates) {
        try {
          const location = await emergencyAmbulanceService.getCurrentLocation();
          requestData.gps_coordinates = location.gps_coordinates;
          if (!requestData.location) {
            requestData.location = 'Current location';
          }
        } catch (locationError) {
          console.warn('Could not get location:', locationError);
        }
      }
      
      const response = await emergencyAmbulanceService.createEmergencyRequest(requestData);
      
      if (response.success) {
        setSuccess('Emergency request created successfully');
        setShowCreateModal(false);
        resetCreateForm();
        fetchEmergencyRequests();
      } else {
        setError('Failed to create emergency request');
      }
    } catch (err) {
      console.error('Error creating emergency request:', err);
      setError(err.message || 'Failed to create emergency request');
    } finally {
      setActionLoading(prev => ({ ...prev, create: false }));
    }
  };

  const handleDispatchAmbulance = async () => {
    if (!selectedRequest) return;
    
    try {
      setActionLoading(prev => ({ ...prev, dispatch: true }));
      
      const response = await emergencyAmbulanceService.dispatchAmbulance(
        selectedRequest.id,
        dispatchForm
      );
      
      if (response.success) {
        setSuccess('Ambulance dispatched successfully');
        setShowDispatchModal(false);
        resetDispatchForm();
        fetchEmergencyRequests();
      } else {
        setError('Failed to dispatch ambulance');
      }
    } catch (err) {
      console.error('Error dispatching ambulance:', err);
      setError(err.message || 'Failed to dispatch ambulance');
    } finally {
      setActionLoading(prev => ({ ...prev, dispatch: false }));
    }
  };

  const handleStatusUpdate = async (requestId, newStatus) => {
    try {
      setActionLoading(prev => ({ ...prev, [requestId]: true }));
      
      const response = await emergencyAmbulanceService.updateEmergencyStatus(requestId, newStatus);
      
      if (response.success) {
        setSuccess(response.message);
        fetchEmergencyRequests();
      } else {
        setError('Failed to update status');
      }
    } catch (err) {
      console.error('Error updating status:', err);
      setError(err.message || 'Failed to update status');
    } finally {
      setActionLoading(prev => ({ ...prev, [requestId]: false }));
    }
  };

  const handleGetCurrentLocation = async () => {
    try {
      setActionLoading(prev => ({ ...prev, location: true }));
      
      const location = await emergencyAmbulanceService.getCurrentLocation();
      
      setCreateForm(prev => ({
        ...prev,
        gps_coordinates: location.gps_coordinates,
        location: prev.location || 'Current location'
      }));
      
      setSuccess('Location obtained successfully');
    } catch (err) {
      console.error('Error getting location:', err);
      setError(err.message || 'Failed to get current location');
    } finally {
      setActionLoading(prev => ({ ...prev, location: false }));
    }
  };

  // =========================== UTILITY FUNCTIONS ===========================
  
  const resetCreateForm = () => {
    setCreateForm({
      location: '',
      gps_coordinates: '',
      condition_description: '',
      suspected_disease: ''
    });
  };

  const resetDispatchForm = () => {
    setDispatchForm({
      ambulanceId: '',
      hospitalDestination: '',
      estimatedArrival: ''
    });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'P': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'D': return <Truck className="h-4 w-4 text-blue-500" />;
      case 'A': return <Target className="h-4 w-4 text-green-500" />;
      case 'T': return <Route className="h-4 w-4 text-orange-500" />;
      case 'C': return <CheckCircle className="h-4 w-4 text-gray-500" />;
      default: return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'critical': return <Zap className="h-4 w-4 text-red-500" />;
      case 'urgent': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'normal': return <Info className="h-4 w-4 text-blue-500" />;
      default: return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-300';
      case 'urgent': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'normal': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'P': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'D': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'A': return 'bg-green-100 text-green-800 border-green-300';
      case 'T': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'C': return 'bg-gray-100 text-gray-800 border-gray-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  // =========================== EFFECTS ===========================
  
  useEffect(() => {
    fetchEmergencyRequests();
    fetchStats();
    fetchNearestHospitals();
    
    // Auto-refresh every 30 seconds for real-time updates
    const interval = setInterval(fetchEmergencyRequests, 30000);
    return () => clearInterval(interval);
  }, [fetchEmergencyRequests, fetchStats, fetchNearestHospitals]);

  // Auto-clear messages
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 8000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // =========================== RENDER COMPONENTS ===========================
  
  const AlertMessage = ({ type, message, onClose }) => (
    <div className={`${type === 'error' ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'} border rounded-lg p-4 mb-6`}>
      <div className="flex items-start gap-3">
        {type === 'error' ? (
          <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
        ) : (
          <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
        )}
        <div className="flex-1">
          <h3 className={`text-sm font-medium ${type === 'error' ? 'text-red-800' : 'text-green-800'} mb-1`}>
            {type === 'error' ? 'Error' : 'Success'}
          </h3>
          <p className={`${type === 'error' ? 'text-red-700' : 'text-green-700'} text-sm`}>
            {message}
          </p>
        </div>
        <button
          onClick={onClose}
          className={`${type === 'error' ? 'text-red-500 hover:text-red-700' : 'text-green-500 hover:text-green-700'} p-1`}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );

  const StatCard = ({ icon: Icon, title, value, color, onClick }) => (
    <div 
      className={`bg-white rounded-lg shadow-sm p-4 ${onClick ? 'cursor-pointer hover:bg-gray-50' : ''} transition-colors`}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <div className={`bg-${color}-100 p-2 rounded-lg`}>
          <Icon className={`h-5 w-5 text-${color}-600`} />
        </div>
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-xl font-semibold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );

  const FilterControls = () => (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by patient, location, condition, or ambulance..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="P">Pending</option>
            <option value="D">Dispatched</option>
            <option value="A">Arrived</option>
            <option value="T">In Transit</option>
            <option value="C">Completed</option>
          </select>
          
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Priority</option>
            <option value="critical">Critical</option>
            <option value="urgent">Urgent</option>
            <option value="normal">Normal</option>
          </select>
        </div>
      </div>
    </div>
  );

  const EmergencyRequestCard = ({ request }) => {
    const formatted = emergencyAmbulanceService.formatEmergencyRequest(request);
    const isLoading = actionLoading[request.id];
    
    return (
      <div className="p-6 hover:bg-gray-50 transition-colors">
        <div className="flex items-start gap-4">
          {/* Priority Indicator */}
          <div className="flex-shrink-0 mt-1">
            {getPriorityIcon(formatted.priority)}
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                {/* Status and Priority */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(request.status)}
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(request.status)}`}>
                      {formatted.statusText}
                    </span>
                  </div>
                  
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(formatted.priority)}`}>
                    {formatted.priority.toUpperCase()}
                  </span>
                </div>

                {/* Patient and Time */}
                <div className="flex items-center gap-4 mb-3">
                  <div className="flex items-center gap-2 text-gray-600">
                    <User className="h-4 w-4" />
                    <span className="font-medium">{formatted.patient}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Clock className="h-4 w-4" />
                    <span className="font-medium">{formatted.timeAgo}</span>
                  </div>
                </div>

                {/* Location */}
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-700">{formatted.location}</span>
                  {formatted.gpsCoordinates && (
                    <a
                      href={`https://maps.google.com/?q=${formatted.gpsCoordinates}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      View on Map
                    </a>
                  )}
                </div>

                {/* Condition */}
                <div className="flex items-start gap-2 mb-3">
                  <Heart className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">{formatted.condition}</span>
                </div>

                {/* Suspected Disease */}
                {formatted.suspectedDisease && (
                  <div className="flex items-center gap-2 mb-3">
                    <Activity className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-700">
                      <strong>Suspected:</strong> {formatted.suspectedDisease}
                    </span>
                    {formatted.diseaseInfo?.is_contagious && (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-300">
                        Contagious
                      </span>
                    )}
                  </div>
                )}

                {/* Ambulance and Hospital */}
                {formatted.assignedAmbulance && (
                  <div className="flex items-center gap-2 mb-2">
                    <Truck className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-700">
                      <strong>Ambulance:</strong> {formatted.assignedAmbulance}
                    </span>
                  </div>
                )}

                {formatted.hospitalDestination && (
                  <div className="flex items-center gap-2 mb-2">
                    <Hospital className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-700">
                      <strong>Hospital:</strong> {formatted.hospitalDestination}
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={() => {
                    setSelectedRequest(request);
                    setShowDetailsModal(true);
                  }}
                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="View Details"
                >
                  <Eye className="h-4 w-4" />
                </button>

                {canManage && (
                  <>
                    {request.status === 'P' && (
                      <button
                        onClick={() => {
                          setSelectedRequest(request);
                          setShowDispatchModal(true);
                        }}
                        disabled={isLoading}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Dispatch Ambulance"
                      >
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </button>
                    )}

                    {request.status === 'D' && (
                      <button
                        onClick={() => handleStatusUpdate(request.id, 'A')}
                        disabled={isLoading}
                        className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Mark as Arrived"
                      >
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Target className="h-4 w-4" />
                        )}
                      </button>
                    )}

                    {request.status === 'A' && (
                      <button
                        onClick={() => handleStatusUpdate(request.id, 'T')}
                        disabled={isLoading}
                        className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Mark as In Transit"
                      >
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Route className="h-4 w-4" />
                        )}
                      </button>
                    )}

                    {request.status === 'T' && (
                      <button
                        onClick={() => handleStatusUpdate(request.id, 'C')}
                        disabled={isLoading}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Mark as Completed"
                      >
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle className="h-4 w-4" />
                        )}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // =========================== MAIN RENDER ===========================
  
  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50 p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          
          {/* Header */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                  <Ambulance className="h-8 w-8 text-red-600" />
                  Emergency Management
                </h1>
                <p className="text-gray-600">
                  Monitor and manage emergency ambulance requests • Last updated: {lastRefresh.toLocaleTimeString()}
                </p>
              </div>
              <div className="mt-4 lg:mt-0 flex gap-3">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  New Emergency
                </button>
                <button
                  onClick={fetchEmergencyRequests}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
            </div>
          </div>

          {/* Alert Messages */}
          {error && (
            <AlertMessage 
              type="error" 
              message={error} 
              onClose={() => setError('')} 
            />
          )}

          {success && (
            <AlertMessage 
              type="success" 
              message={success} 
              onClose={() => setSuccess('')} 
            />
          )}

          {/* Dashboard Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 mb-6">
            <StatCard 
              icon={Activity} 
              title="Total" 
              value={dashboardStats.total} 
              color="blue" 
            />
            <StatCard 
              icon={Clock} 
              title="Pending" 
              value={dashboardStats.pending} 
              color="yellow" 
            />
            <StatCard 
              icon={Truck} 
              title="Dispatched" 
              value={dashboardStats.dispatched} 
              color="blue" 
            />
            <StatCard 
              icon={Route} 
              title="In Transit" 
              value={dashboardStats.inTransit} 
              color="orange" 
            />
            <StatCard 
              icon={Zap} 
              title="Critical" 
              value={dashboardStats.critical} 
              color="red" 
            />
            <StatCard 
              icon={CheckCircle} 
              title="Completed" 
              value={dashboardStats.completed} 
              color="green" 
            />
          </div>

          {/* Filter Controls */}
          <FilterControls />

          {/* Emergency Requests List */}
          <div className="bg-white rounded-lg shadow-sm">
            {loading ? (
              <div className="p-12 text-center">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
                <p className="text-gray-600">Loading emergency requests...</p>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="p-12 text-center">
                <Ambulance className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No emergency requests found</h3>
                <p className="text-gray-600">
                  {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'No emergency requests at this time'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredRequests.map((request) => (
                  <EmergencyRequestCard key={request.id} request={request} />
                ))}
              </div>
            )}
          </div>

          {/* =========================== MODALS =========================== */}
          
          {/* Create Emergency Modal */}
          {showCreateModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Create Emergency Request</h2>
                </div>
                
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Location *
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={createForm.location}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, location: e.target.value }))}
                        placeholder="Enter location description"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <button
                        onClick={handleGetCurrentLocation}
                        disabled={actionLoading.location}
                        className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        {actionLoading.location ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Crosshair className="h-4 w-4" />
                        )}
                        GPS
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      GPS Coordinates
                    </label>
                    <input
                      type="text"
                      value={createForm.gps_coordinates}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, gps_coordinates: e.target.value }))}
                      placeholder="Latitude, Longitude (e.g., 40.7128,-74.0060)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Condition Description *
                    </label>
                    <textarea
                      rows={4}
                      value={createForm.condition_description}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, condition_description: e.target.value }))}
                      placeholder="Describe the emergency condition in detail..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Suspected Disease (Optional)
                    </label>
                    <input
                      type="text"
                      value={createForm.suspected_disease}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, suspected_disease: e.target.value }))}
                      placeholder="e.g., Malaria, Pneumonia, COVID-19"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                
                <div className="p-6 border-t border-gray-200">
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowCreateModal(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateRequest}
                      disabled={actionLoading.create || !createForm.location || !createForm.condition_description}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {actionLoading.create ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Ambulance className="h-4 w-4" />
                      )}
                      Create Emergency Request
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Dispatch Modal */}
          {showDispatchModal && selectedRequest && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg max-w-md w-full">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Dispatch Ambulance</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Assign ambulance to emergency request
                  </p>
                </div>
                
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ambulance ID *
                    </label>
                    <input
                      type="text"
                      value={dispatchForm.ambulanceId}
                      onChange={(e) => setDispatchForm(prev => ({ ...prev, ambulanceId: e.target.value }))}
                      placeholder="e.g., AMB-001"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Hospital Destination *
                    </label>
                    <select
                      value={dispatchForm.hospitalDestination}
                      onChange={(e) => setDispatchForm(prev => ({ ...prev, hospitalDestination: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select hospital</option>
                      {nearestHospitals.map(hospital => (
                        <option key={hospital.id} value={hospital.name}>
                          {hospital.name} ({hospital.distance} km away)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Estimated Arrival (Optional)
                    </label>
                    <input
                      type="time"
                      value={dispatchForm.estimatedArrival}
                      onChange={(e) => setDispatchForm(prev => ({ ...prev, estimatedArrival: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                
                <div className="p-6 border-t border-gray-200">
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowDispatchModal(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDispatchAmbulance}
                      disabled={actionLoading.dispatch || !dispatchForm.ambulanceId || !dispatchForm.hospitalDestination}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {actionLoading.dispatch ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      Dispatch Ambulance
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Details Modal */}
          {showDetailsModal && selectedRequest && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">Emergency Request Details</h2>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(selectedRequest.status)}
                      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(selectedRequest.status)}`}>
                        {emergencyAmbulanceService.getStatusText(selectedRequest.status)}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="p-6 space-y-6">
                  {(() => {
                    const formatted = emergencyAmbulanceService.formatEmergencyRequest(selectedRequest);
                    
                    return (
                      <>
                        {/* Priority Level */}
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          {getPriorityIcon(formatted.priority)}
                          <div>
                            <h3 className="font-medium text-gray-900">Priority Level</h3>
                            <p className={`text-sm font-medium ${
                              formatted.priority === 'critical' ? 'text-red-600' :
                              formatted.priority === 'urgent' ? 'text-orange-600' :
                              'text-blue-600'
                            }`}>
                              {formatted.priority.toUpperCase()}
                            </p>
                          </div>
                        </div>

                        {/* Patient Information */}
                        <div>
                          <label className="block text-sm font-medium text-gray-500 mb-2">Patient</label>
                          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                            <div className="bg-blue-100 p-2 rounded-lg">
                              <User className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{formatted.patient}</p>
                              <p className="text-sm text-gray-600">Request ID: {selectedRequest.id}</p>
                            </div>
                          </div>
                        </div>

                        {/* Time Information */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-500 mb-1">Request Time</label>
                            <p className="text-gray-900 font-medium">{formatted.formattedTime}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-500 mb-1">Time Elapsed</label>
                            <p className="text-gray-900 font-medium">{formatted.timeAgo}</p>
                          </div>
                        </div>

                        {/* Location */}
                        <div>
                          <label className="block text-sm font-medium text-gray-500 mb-2">Location</label>
                          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                            <div className="bg-green-100 p-2 rounded-lg">
                              <MapPin className="h-5 w-5 text-green-600" />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">{formatted.location}</p>
                              {formatted.gpsCoordinates && (
                                <p className="text-sm text-gray-600">GPS: {formatted.gpsCoordinates}</p>
                              )}
                            </div>
                            {formatted.gpsCoordinates && (
                              <a
                                href={`https://maps.google.com/?q=${formatted.gpsCoordinates}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                              >
                                <Map className="h-4 w-4" />
                                View Map
                              </a>
                            )}
                          </div>
                        </div>

                        {/* Condition Description */}
                        <div>
                          <label className="block text-sm font-medium text-gray-500 mb-2">Condition Description</label>
                          <div className="p-3 bg-gray-50 rounded-lg">
                            <p className="text-gray-900 whitespace-pre-wrap">{formatted.condition}</p>
                          </div>
                        </div>

                        {/* Suspected Disease */}
                        {formatted.suspectedDisease && (
                          <div>
                            <label className="block text-sm font-medium text-gray-500 mb-2">Suspected Disease</label>
                            <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                              <div className="flex items-center gap-2 mb-2">
                                <Activity className="h-4 w-4 text-yellow-600" />
                                <p className="font-medium text-yellow-800">{formatted.suspectedDisease}</p>
                              </div>
                              {formatted.diseaseInfo && (
                                <div className="text-sm text-yellow-700 space-y-1">
                                  <p>Type: {formatted.diseaseInfo.type}</p>
                                  <p>Contagious: {formatted.diseaseInfo.is_contagious ? 'Yes' : 'No'}</p>
                                  <p>Emergency Threshold: {formatted.diseaseInfo.emergency_threshold}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Ambulance Information */}
                        {formatted.assignedAmbulance && (
                          <div>
                            <label className="block text-sm font-medium text-gray-500 mb-2">Assigned Ambulance</label>
                            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                              <div className="bg-blue-100 p-2 rounded-lg">
                                <Truck className="h-5 w-5 text-blue-600" />
                              </div>
                              <div>
                                <p className="font-medium text-blue-900">{formatted.assignedAmbulance}</p>
                                <p className="text-sm text-blue-700">Ambulance Unit</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Hospital Destination */}
                        {formatted.hospitalDestination && (
                          <div>
                            <label className="block text-sm font-medium text-gray-500 mb-2">Hospital Destination</label>
                            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                              <div className="bg-green-100 p-2 rounded-lg">
                                <Hospital className="h-5 w-5 text-green-600" />
                              </div>
                              <div>
                                <p className="font-medium text-green-900">{formatted.hospitalDestination}</p>
                                <p className="text-sm text-green-700">Destination Hospital</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Status Timeline */}
                        <div>
                          <label className="block text-sm font-medium text-gray-500 mb-2">Status Timeline</label>
                          <div className="space-y-2">
                            {[
                              { status: 'P', label: 'Request Submitted', active: true },
                              { status: 'D', label: 'Ambulance Dispatched', active: ['D', 'A', 'T', 'C'].includes(selectedRequest.status) },
                              { status: 'A', label: 'Ambulance Arrived', active: ['A', 'T', 'C'].includes(selectedRequest.status) },
                              { status: 'T', label: 'In Transit to Hospital', active: ['T', 'C'].includes(selectedRequest.status) },
                              { status: 'C', label: 'Emergency Completed', active: selectedRequest.status === 'C' }
                            ].map((step, index) => (
                              <div key={step.status} className="flex items-center gap-3">
                                <div className={`w-4 h-4 rounded-full border-2 ${
                                  step.active 
                                    ? 'bg-green-500 border-green-500' 
                                    : 'bg-gray-200 border-gray-300'
                                }`} />
                                <div className="flex-1">
                                  <p className={`text-sm font-medium ${
                                    step.active ? 'text-green-900' : 'text-gray-500'
                                  }`}>
                                    {step.label}
                                  </p>
                                  {step.active && step.status === selectedRequest.status && (
                                    <p className="text-xs text-green-600">Current Status</p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
                
                <div className="p-6 border-t border-gray-200">
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowDetailsModal(false)}
                      className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Close
                    </button>
                    
                    {canManage && selectedRequest.status !== 'C' && (
                      <button
                        onClick={() => {
                          setShowDetailsModal(false);
                          if (selectedRequest.status === 'P') {
                            setShowDispatchModal(true);
                          }
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                      >
                        {selectedRequest.status === 'P' ? (
                          <>
                            <Send className="h-4 w-4" />
                            Dispatch Ambulance
                          </>
                        ) : (
                          <>
                            <Edit3 className="h-4 w-4" />
                            Update Status
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default EmergencyManagement;
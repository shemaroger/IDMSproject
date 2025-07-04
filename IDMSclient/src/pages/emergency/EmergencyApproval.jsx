// src/pages/emergency/EmergencyApproval.jsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import emergencyAmbulanceService from '../../services/emergencyAmbulanceService';
import { authAPI, healthcareAPI } from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  User,
  MapPin,
  Heart,
  Activity,
  Building,
  Phone,
  Calendar,
  Search,
  Filter,
  RefreshCw,
  Loader2,
  Eye,
  FileText,
  Zap,
  Info,
  Shield,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Flag,
  Hospital,
  Truck,
  Send,
  X,
  Plus,
  Edit3,
  AlertCircle,
  UserCheck,
  ClipboardList
} from 'lucide-react';

const EmergencyApproval = () => {
  // =========================== STATE MANAGEMENT ===========================
  
  // Data states
  const [pendingRequests, setPendingRequests] = useState([]);
  const [approvedRequests, setApprovedRequests] = useState([]);
  const [rejectedRequests, setRejectedRequests] = useState([]);
  const [clinics, setClinics] = useState([]);
  const [stats, setStats] = useState({});
  const [lastRefresh, setLastRefresh] = useState(new Date());
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  
  // Message states
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Modal states
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [approvalAction, setApprovalAction] = useState(''); // 'approve' or 'reject'
  
  // Form states
  const [approvalForm, setApprovalForm] = useState({
    comments: '',
    priority: '',
    recommendedHospital: '',
    urgencyLevel: '',
    additionalNotes: ''
  });
  
  // Filter states
  const [activeTab, setActiveTab] = useState('pending'); // 'pending', 'approved', 'rejected'
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [clinicFilter, setClinicFilter] = useState('all');
  
  // User context
  const currentUser = authAPI.getCurrentUser();
  const canApprove = ['Admin', 'Doctor', 'Nurse', 'Emergency_Coordinator'].includes(currentUser?.role?.name);

  // =========================== COMPUTED VALUES ===========================
  
  const getCurrentRequests = () => {
    switch (activeTab) {
      case 'approved': return approvedRequests;
      case 'rejected': return rejectedRequests;
      default: return pendingRequests;
    }
  };

  const filteredRequests = useMemo(() => {
    const currentRequests = getCurrentRequests();
    
    return currentRequests.filter(request => {
      const formatted = emergencyAmbulanceService.formatEmergencyRequest(request);
      
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = 
          formatted.patient.toLowerCase().includes(searchLower) ||
          formatted.location.toLowerCase().includes(searchLower) ||
          formatted.condition.toLowerCase().includes(searchLower) ||
          formatted.suspectedDisease?.toLowerCase().includes(searchLower) ||
          request.clinic_name?.toLowerCase().includes(searchLower);
        
        if (!matchesSearch) return false;
      }
      
      // Priority filter
      if (priorityFilter !== 'all' && formatted.priority !== priorityFilter) {
        return false;
      }
      
      // Clinic filter
      if (clinicFilter !== 'all' && request.clinic !== parseInt(clinicFilter)) {
        return false;
      }
      
      return true;
    });
  }, [activeTab, pendingRequests, approvedRequests, rejectedRequests, searchTerm, priorityFilter, clinicFilter]);

  const dashboardStats = useMemo(() => {
    return {
      pending: pendingRequests.length,
      approved: approvedRequests.length,
      rejected: rejectedRequests.length,
      total: pendingRequests.length + approvedRequests.length + rejectedRequests.length,
      critical: [...pendingRequests, ...approvedRequests, ...rejectedRequests]
        .filter(req => emergencyAmbulanceService.formatEmergencyRequest(req).priority === 'critical').length
    };
  }, [pendingRequests, approvedRequests, rejectedRequests]);

  // =========================== DATA FETCHING ===========================
  
  const fetchClinics = useCallback(async () => {
    try {
      const response = await healthcareAPI.clinics.list();
      if (response.data) {
        const clinicData = response.data.results || response.data;
        setClinics(clinicData);
      }
    } catch (err) {
      console.error('Error fetching clinics:', err);
    }
  }, []);
  
  const fetchEmergencyRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('🔍 Starting to fetch emergency requests...');
      
      // Fetch all requests and categorize them
      const response = await emergencyAmbulanceService.getEmergencyRequests({
        ordering: '-request_time'
      });
      
      console.log('📊 API Response:', response);
      
      if (response.success) {
        const requests = response.requests;
        console.log('📋 Total requests received:', requests.length);
        console.log('🔍 Raw requests data:', requests);
        
        // Log each request for debugging
        requests.forEach((req, index) => {
          console.log(`📄 Request ${index + 1}:`, {
            id: req.id,
            status: req.status,
            approval_status: req.approval_status,
            patient_name: req.patient_name,
            location: req.location,
            condition: req.condition_description,
            request_time: req.request_time
          });
        });
        
        // Categorize requests based on status and approval fields
        const pending = requests.filter(req => {
          // Pending: Status 'P' and (no approval_status or approval_status is 'pending')
          const isPending = req.status === 'P' && (!req.approval_status || req.approval_status === 'pending');
          if (isPending) {
            console.log('✅ Found pending request:', req.id);
          }
          return isPending;
        });
        
        const approved = requests.filter(req => {
          // Approved: approval_status is 'approved' OR status is beyond 'P' (D, A, T, C)
          const isApproved = req.approval_status === 'approved' || ['D', 'A', 'T', 'C'].includes(req.status);
          if (isApproved) {
            console.log('✅ Found approved request:', req.id);
          }
          return isApproved;
        });
        
        const rejected = requests.filter(req => {
          // Rejected: approval_status is 'rejected'
          const isRejected = req.approval_status === 'rejected';
          if (isRejected) {
            console.log('✅ Found rejected request:', req.id);
          }
          return isRejected;
        });
        
        console.log('📊 Categorized results:', {
          pending: pending.length,
          approved: approved.length,
          rejected: rejected.length
        });
        
        setPendingRequests(pending);
        setApprovedRequests(approved);
        setRejectedRequests(rejected);
        setLastRefresh(new Date());
      } else {
        console.error('❌ API call failed:', response);
        setError('Failed to fetch emergency requests');
      }
    } catch (err) {
      console.error('❌ Error fetching emergency requests:', err);
      console.error('❌ Error details:', {
        message: err.message,
        stack: err.stack,
        response: err.response
      });
      setError('Failed to fetch emergency requests: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // =========================== APPROVAL HANDLERS ===========================
  
  const handleApprovalAction = (request, action) => {
    setSelectedRequest(request);
    setApprovalAction(action);
    setShowApprovalModal(true);
    
    // Pre-fill form based on request data
    const formatted = emergencyAmbulanceService.formatEmergencyRequest(request);
    setApprovalForm({
      comments: '',
      priority: formatted.priority,
      recommendedHospital: '',
      urgencyLevel: formatted.priority === 'critical' ? 'high' : 'medium',
      additionalNotes: ''
    });
  };

  const handleSubmitApproval = async () => {
    if (!selectedRequest || !approvalAction) return;
    
    try {
      setActionLoading(prev => ({ ...prev, approval: true }));
      
      const currentUser = authAPI.getCurrentUser();
      let response;
      
      if (approvalAction === 'approve') {
        // Use the service's approve method
        response = await emergencyAmbulanceService.approveEmergencyRequest(selectedRequest.id, {
          comments: approvalForm.comments,
          priority: approvalForm.priority,
          recommendedHospital: approvalForm.recommendedHospital,
          urgencyLevel: approvalForm.urgencyLevel,
          additionalNotes: approvalForm.additionalNotes
        });
      } else {
        // Use the service's reject method
        response = await emergencyAmbulanceService.rejectEmergencyRequest(selectedRequest.id, {
          comments: approvalForm.comments,
          reason: 'Manual rejection',
          additionalNotes: approvalForm.additionalNotes
        });
      }
      
      if (response.success) {
        setSuccess(`Emergency request ${approvalAction === 'approve' ? 'approved' : 'rejected'} successfully`);
        setShowApprovalModal(false);
        resetApprovalForm();
        fetchEmergencyRequests();
      } else {
        setError(`Failed to ${approvalAction} emergency request`);
      }
    } catch (err) {
      console.error(`Error ${approvalAction}ing emergency request:`, err);
      setError(err.message || `Failed to ${approvalAction} emergency request`);
    } finally {
      setActionLoading(prev => ({ ...prev, approval: false }));
    }
  };

  const handleBulkApproval = async (requests, action) => {
    try {
      setActionLoading(prev => ({ ...prev, bulk: true }));
      
      const requestIds = requests.map(req => req.id);
      let response;
      
      if (action === 'approve') {
        response = await emergencyAmbulanceService.bulkApproveRequests(requestIds, {
          comments: `Bulk approved by ${currentUser.name || currentUser.email}`,
          priority: 'normal',
          urgencyLevel: 'medium'
        });
      } else {
        response = await emergencyAmbulanceService.bulkRejectRequests(requestIds, {
          comments: `Bulk rejected by ${currentUser.name || currentUser.email}`,
          reason: 'Bulk operation'
        });
      }
      
      if (response.success) {
        setSuccess(`${requests.length} requests ${action}d successfully`);
        fetchEmergencyRequests();
      } else {
        setError(`Failed to ${action} requests in bulk`);
      }
    } catch (err) {
      console.error(`Error in bulk ${action}:`, err);
      setError(`Failed to ${action} requests in bulk`);
    } finally {
      setActionLoading(prev => ({ ...prev, bulk: false }));
    }
  };

  // =========================== UTILITY FUNCTIONS ===========================
  
  const resetApprovalForm = () => {
    setApprovalForm({
      comments: '',
      priority: '',
      recommendedHospital: '',
      urgencyLevel: '',
      additionalNotes: ''
    });
  };

  const getApprovalStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800 border-green-300';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    }
  };

  const getApprovalStatusIcon = (status) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-yellow-500" />;
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

  // =========================== EFFECTS ===========================
  
  useEffect(() => {
    fetchEmergencyRequests();
    fetchClinics();
    
    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchEmergencyRequests, 60000);
    return () => clearInterval(interval);
  }, [fetchEmergencyRequests, fetchClinics]);

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

  const TabButton = ({ id, label, count, isActive, onClick }) => (
    <button
      onClick={() => onClick(id)}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
        isActive
          ? 'bg-blue-100 text-blue-700 border border-blue-300'
          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
      }`}
    >
      {label}
      <span className={`px-2 py-1 rounded-full text-xs ${
        isActive
          ? 'bg-blue-200 text-blue-800'
          : 'bg-gray-200 text-gray-600'
      }`}>
        {count}
      </span>
    </button>
  );

  const FilterControls = () => (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by patient, location, condition, or clinic..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
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
          
          <select
            value={clinicFilter}
            onChange={(e) => setClinicFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Clinics</option>
            {clinics.map(clinic => (
              <option key={clinic.id} value={clinic.id}>
                {clinic.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );

  const EmergencyRequestCard = ({ request }) => {
    const formatted = emergencyAmbulanceService.formatEmergencyRequest(request);
    
    // Determine approval status from the request data
    const approvalStatus = request.approval_status || 'pending';
    const isApproved = approvalStatus === 'approved' || ['D', 'A', 'T', 'C'].includes(request.status);
    const isRejected = approvalStatus === 'rejected';
    const isPending = approvalStatus === 'pending' && request.status === 'P';
    
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
                    {getApprovalStatusIcon(approvalStatus)}
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getApprovalStatusColor(approvalStatus)}`}>
                      {approvalStatus.toUpperCase()}
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
                </div>

                {/* Condition */}
                <div className="flex items-start gap-2 mb-3">
                  <Heart className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">{formatted.condition}</span>
                </div>

                {/* Clinic Information */}
                {request.clinic_name && (
                  <div className="flex items-center gap-2 mb-3">
                    <Building className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-700">
                      <strong>Clinic:</strong> {request.clinic_name}
                    </span>
                  </div>
                )}

                {/* Suspected Disease */}
                {formatted.suspectedDisease && (
                  <div className="flex items-center gap-2 mb-3">
                    <Activity className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-700">
                      <strong>Suspected:</strong> {formatted.suspectedDisease}
                    </span>
                  </div>
                )}

                {/* Approval Information */}
                {request.approved_by_name && (
                  <div className="flex items-center gap-2 mb-2">
                    <UserCheck className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-700">
                      <strong>Approved by:</strong> {request.approved_by_name}
                    </span>
                  </div>
                )}

                {request.approval_comments && (
                  <div className="flex items-start gap-2 mb-2">
                    <MessageSquare className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">
                      <strong>Comments:</strong> {request.approval_comments}
                    </span>
                  </div>
                )}

                {/* Recommended Hospital */}
                {request.recommended_hospital && (
                  <div className="flex items-center gap-2 mb-2">
                    <Building className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-700">
                      <strong>Recommended Hospital:</strong> {request.recommended_hospital}
                    </span>
                  </div>
                )}

                {/* Show rejection info if rejected */}
                {isRejected && (
                  <div className="flex items-start gap-2 mb-2">
                    <XCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                    <span className="text-red-700">
                      <strong>Status:</strong> This request has been rejected
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

                {canApprove && isPending && (
                  <>
                    <button
                      onClick={() => handleApprovalAction(request, 'approve')}
                      disabled={isLoading}
                      className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Approve Request"
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ThumbsUp className="h-4 w-4" />
                      )}
                    </button>
                    
                    <button
                      onClick={() => handleApprovalAction(request, 'reject')}
                      disabled={isLoading}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Reject Request"
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ThumbsDown className="h-4 w-4" />
                      )}
                    </button>
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
  
  if (!canApprove) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-gray-50 p-4 md:p-6">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <Shield className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
              <p className="text-gray-600 mb-6">
                You don't have permission to access the Emergency Approval system.
              </p>
              <p className="text-sm text-gray-500">
                This feature is restricted to Administrators, Doctors, Nurses, and Emergency Coordinators.
              </p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50 p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          
          {/* Header */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                  <ClipboardList className="h-8 w-8 text-blue-600" />
                  Emergency Request Approval
                </h1>
                <p className="text-gray-600">
                  Review and approve emergency ambulance requests • Last updated: {lastRefresh.toLocaleTimeString()}
                </p>
              </div>
              <div className="mt-4 lg:mt-0 flex gap-3">
                {activeTab === 'pending' && pendingRequests.length > 0 && (
                  <>
                    <button
                      onClick={() => handleBulkApproval(pendingRequests, 'approve')}
                      disabled={actionLoading.bulk}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      {actionLoading.bulk ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle className="h-4 w-4" />
                      )}
                      Approve All
                    </button>
                    <button
                      onClick={() => handleBulkApproval(pendingRequests, 'reject')}
                      disabled={actionLoading.bulk}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      {actionLoading.bulk ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <XCircle className="h-4 w-4" />
                      )}
                      Reject All
                    </button>
                  </>
                )}
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <StatCard 
              icon={Clock} 
              title="Pending Approval" 
              value={dashboardStats.pending} 
              color="yellow"
              onClick={() => setActiveTab('pending')}
            />
            <StatCard 
              icon={CheckCircle} 
              title="Approved" 
              value={dashboardStats.approved} 
              color="green"
              onClick={() => setActiveTab('approved')}
            />
            <StatCard 
              icon={XCircle} 
              title="Rejected" 
              value={dashboardStats.rejected} 
              color="red"
              onClick={() => setActiveTab('rejected')}
            />
            <StatCard 
              icon={AlertTriangle} 
              title="Critical Cases" 
              value={dashboardStats.critical} 
              color="red"
            />
            <StatCard 
              icon={FileText} 
              title="Total Requests" 
              value={dashboardStats.total} 
              color="blue"
            />
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex gap-2 mb-4">
              <TabButton
                id="pending"
                label="Pending Approval"
                count={dashboardStats.pending}
                isActive={activeTab === 'pending'}
                onClick={setActiveTab}
              />
              <TabButton
                id="approved"
                label="Approved"
                count={dashboardStats.approved}
                isActive={activeTab === 'approved'}
                onClick={setActiveTab}
              />
              <TabButton
                id="rejected"
                label="Rejected"
                count={dashboardStats.rejected}
                isActive={activeTab === 'rejected'}
                onClick={setActiveTab}
              />
            </div>
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
                <ClipboardList className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No {activeTab} requests found
                </h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm || priorityFilter !== 'all' || clinicFilter !== 'all'
                    ? 'Try adjusting your filters to see more requests'
                    : `No ${activeTab} emergency requests at this time`}
                </p>
                {(searchTerm || priorityFilter !== 'all' || clinicFilter !== 'all') && (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setPriorityFilter('all');
                      setClinicFilter('all');
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Clear All Filters
                  </button>
                )}
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
          
          {/* Approval Modal */}
          {showApprovalModal && selectedRequest && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">
                      {approvalAction === 'approve' ? 'Approve' : 'Reject'} Emergency Request
                    </h2>
                    <div className="flex items-center gap-2">
                      {approvalAction === 'approve' ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Review the request details and provide your {approvalAction === 'approve' ? 'approval' : 'rejection'} comments
                  </p>
                </div>
                
                <div className="p-6">
                  {(() => {
                    const formatted = emergencyAmbulanceService.formatEmergencyRequest(selectedRequest);
                    
                    return (
                      <div className="space-y-4">
                        {/* Request Summary */}
                        <div className="bg-gray-50 rounded-lg p-4">
                          <h3 className="font-medium text-gray-900 mb-3">Request Summary</h3>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">Patient:</span>
                              <span className="font-medium text-gray-900 ml-2">{formatted.patient}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Priority:</span>
                              <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(formatted.priority)}`}>
                                {formatted.priority.toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600">Location:</span>
                              <span className="font-medium text-gray-900 ml-2">{formatted.location}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Time:</span>
                              <span className="font-medium text-gray-900 ml-2">{formatted.timeAgo}</span>
                            </div>
                          </div>
                          <div className="mt-3">
                            <span className="text-gray-600">Condition:</span>
                            <p className="text-gray-900 mt-1">{formatted.condition}</p>
                          </div>
                        </div>

                        {/* Approval Form */}
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              {approvalAction === 'approve' ? 'Approval' : 'Rejection'} Comments *
                            </label>
                            <textarea
                              rows={4}
                              value={approvalForm.comments}
                              onChange={(e) => setApprovalForm(prev => ({ ...prev, comments: e.target.value }))}
                              placeholder={`Provide detailed comments for ${approvalAction}ing this request...`}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>

                          {approvalAction === 'approve' && (
                            <>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Priority Override
                                </label>
                                <select
                                  value={approvalForm.priority}
                                  onChange={(e) => setApprovalForm(prev => ({ ...prev, priority: e.target.value }))}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                  <option value="normal">Normal</option>
                                  <option value="urgent">Urgent</option>
                                  <option value="critical">Critical</option>
                                </select>
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Recommended Hospital
                                </label>
                                <input
                                  type="text"
                                  value={approvalForm.recommendedHospital}
                                  onChange={(e) => setApprovalForm(prev => ({ ...prev, recommendedHospital: e.target.value }))}
                                  placeholder="e.g., Central Hospital, Regional Medical Center"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Urgency Level
                                </label>
                                <select
                                  value={approvalForm.urgencyLevel}
                                  onChange={(e) => setApprovalForm(prev => ({ ...prev, urgencyLevel: e.target.value }))}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                  <option value="low">Low</option>
                                  <option value="medium">Medium</option>
                                  <option value="high">High</option>
                                  <option value="critical">Critical</option>
                                </select>
                              </div>
                            </>
                          )}

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Additional Notes
                            </label>
                            <textarea
                              rows={3}
                              value={approvalForm.additionalNotes}
                              onChange={(e) => setApprovalForm(prev => ({ ...prev, additionalNotes: e.target.value }))}
                              placeholder="Any additional notes or instructions..."
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
                
                <div className="p-6 border-t border-gray-200">
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowApprovalModal(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSubmitApproval}
                      disabled={actionLoading.approval || !approvalForm.comments}
                      className={`flex-1 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${
                        approvalAction === 'approve'
                          ? 'bg-green-600 text-white hover:bg-green-700'
                          : 'bg-red-600 text-white hover:bg-red-700'
                      }`}
                    >
                      {actionLoading.approval ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : approvalAction === 'approve' ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <XCircle className="h-4 w-4" />
                      )}
                      {approvalAction === 'approve' ? 'Approve Request' : 'Reject Request'}
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
                      {getApprovalStatusIcon(selectedRequest.approval_status || 'pending')}
                      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getApprovalStatusColor(selectedRequest.approval_status || 'pending')}`}>
                        {(selectedRequest.approval_status || 'pending').toUpperCase()}
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
                          </div>
                        </div>

                        {/* Clinic Information */}
                        {selectedRequest.clinic_name && (
                          <div>
                            <label className="block text-sm font-medium text-gray-500 mb-2">Clinic</label>
                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                              <div className="bg-purple-100 p-2 rounded-lg">
                                <Building className="h-5 w-5 text-purple-600" />
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{selectedRequest.clinic_name}</p>
                                <p className="text-sm text-gray-600">Associated Clinic</p>
                              </div>
                            </div>
                          </div>
                        )}

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

                        {/* Approval Information */}
                        {selectedRequest.approval_status && selectedRequest.approval_status !== 'pending' ? (
                          <div>
                            <label className="block text-sm font-medium text-gray-500 mb-2">Approval Information</label>
                            <div className={`p-3 rounded-lg border ${
                              selectedRequest.approval_status === 'approved' 
                                ? 'bg-green-50 border-green-200' 
                                : 'bg-red-50 border-red-200'
                            }`}>
                              <div className="flex items-center gap-2 mb-2">
                                {selectedRequest.approval_status === 'approved' ? (
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-red-500" />
                                )}
                                <p className={`font-medium ${
                                  selectedRequest.approval_status === 'approved' ? 'text-green-800' : 'text-red-800'
                                }`}>
                                  {selectedRequest.approval_status.toUpperCase()}
                                </p>
                              </div>
                              
                              {selectedRequest.approved_by_name && (
                                <p className={`text-sm ${
                                  selectedRequest.approval_status === 'approved' ? 'text-green-700' : 'text-red-700'
                                } mb-1`}>
                                  <strong>Reviewed by:</strong> {selectedRequest.approved_by_name}
                                </p>
                              )}
                              
                              {selectedRequest.approved_at && (
                                <p className={`text-sm ${
                                  selectedRequest.approval_status === 'approved' ? 'text-green-700' : 'text-red-700'
                                } mb-1`}>
                                  <strong>Date:</strong> {new Date(selectedRequest.approved_at).toLocaleString()}
                                </p>
                              )}
                              
                              {selectedRequest.approval_comments && (
                                <p className={`text-sm ${
                                  selectedRequest.approval_status === 'approved' ? 'text-green-700' : 'text-red-700'
                                }`}>
                                  <strong>Comments:</strong> {selectedRequest.approval_comments}
                                </p>
                              )}

                              {selectedRequest.recommended_hospital && (
                                <p className="text-sm text-green-700 mt-1">
                                  <strong>Recommended Hospital:</strong> {selectedRequest.recommended_hospital}
                                </p>
                              )}
                            </div>
                          </div>
                        ) : null}
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
                    
                    {canApprove && selectedRequest.approval_status === 'pending' && (
                      <>
                        <button
                          onClick={() => {
                            setShowDetailsModal(false);
                            handleApprovalAction(selectedRequest, 'approve');
                          }}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                        >
                          <CheckCircle className="h-4 w-4" />
                          Approve
                        </button>
                        <button
                          onClick={() => {
                            setShowDetailsModal(false);
                            handleApprovalAction(selectedRequest, 'reject');
                          }}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                        >
                          <XCircle className="h-4 w-4" />
                          Reject
                        </button>
                      </>
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

export default EmergencyApproval;
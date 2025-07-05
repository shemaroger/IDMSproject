import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { healthcareAPI, authAPI } from '../../services/api';
import { 
  AlertTriangle, 
  Clock, 
  MapPin, 
  Phone, 
  User, 
  CheckCircle, 
  X, 
  Eye, 
  Car, 
  Hospital,
  FileText,
  Filter,
  Search,
  Calendar,
  Activity
} from 'lucide-react';

const EmergencyManagementPage = () => {
  const [emergencyRequests, setEmergencyRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [statistics, setStatistics] = useState({});

  // Filter states
  const [filters, setFilters] = useState({
    status: 'all',
    approvalStatus: 'all',
    urgency: 'all',
    search: '',
    dateRange: 'all'
  });

  // Form states
  const [approvalData, setApprovalData] = useState({
    comments: '',
    priority: '',
    urgency_level: ''
  });

  const [rejectionData, setRejectionData] = useState({
    reason: '',
    comments: ''
  });

  const [dispatchData, setDispatchData] = useState({
    ambulance_id: '',
    hospital_destination: ''
  });

  useEffect(() => {
    fetchEmergencyRequests();
    fetchStatistics();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [emergencyRequests, filters]);

  const fetchEmergencyRequests = async () => {
    try {
      // Use the correct endpoint that matches the Django ViewSet
      const response = await healthcareAPI.emergencies.list();
      setEmergencyRequests(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching emergency requests:', error);
      alert('Error loading emergency requests');
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      // Use the correct statistics endpoint
      const response = await healthcareAPI.emergencies.getStatistics();
      setStatistics(response.data);
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...emergencyRequests];

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(req => req.status === filters.status);
    }

    // Approval status filter
    if (filters.approvalStatus !== 'all') {
      filtered = filtered.filter(req => req.approval_status === filters.approvalStatus);
    }

    // Urgency filter
    if (filters.urgency !== 'all') {
      filtered = filtered.filter(req => req.urgency_level === filters.urgency);
    }

    // Search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(req => 
        req.location.toLowerCase().includes(searchTerm) ||
        req.condition_description.toLowerCase().includes(searchTerm) ||
        req.suspected_disease?.toLowerCase().includes(searchTerm) ||
        req.patient_name?.toLowerCase().includes(searchTerm) ||
        req.id.toString().includes(searchTerm)
      );
    }

    // Date range filter
    if (filters.dateRange !== 'all') {
      const now = new Date();
      let filterDate = null;
      
      switch (filters.dateRange) {
        case 'today':
          filterDate = new Date();
          filterDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          filterDate = new Date();
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterDate = new Date();
          filterDate.setMonth(now.getMonth() - 1);
          break;
        default:
          filterDate = null;
      }
      
      if (filterDate) {
        filtered = filtered.filter(req => new Date(req.request_time) >= filterDate);
      }
    }

    // Sort by urgency and time
    filtered.sort((a, b) => {
      const urgencyOrder = { immediate: 4, urgent: 3, standard: 2, non_urgent: 1 };
      const urgencyA = urgencyOrder[a.urgency_level] || 2;
      const urgencyB = urgencyOrder[b.urgency_level] || 2;
      
      if (urgencyA !== urgencyB) {
        return urgencyB - urgencyA; // Higher urgency first
      }
      
      return new Date(b.request_time) - new Date(a.request_time); // Newer first
    });

    setFilteredRequests(filtered);
  };

  const handleApproval = async () => {
    if (!selectedRequest) return;
    
    setActionLoading(true);
    try {
      await healthcareAPI.emergencies.approve(selectedRequest.id, approvalData);
      setShowApprovalModal(false);
      setApprovalData({ comments: '', priority: '', urgency_level: '' });
      fetchEmergencyRequests();
      fetchStatistics();
      alert('Emergency request approved successfully');
    } catch (error) {
      console.error('Error approving request:', error);
      alert('Error approving request: ' + (error.response?.data?.error || error.message));
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejection = async () => {
    if (!selectedRequest || !rejectionData.reason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }
    
    setActionLoading(true);
    try {
      await healthcareAPI.emergencies.reject(selectedRequest.id, rejectionData);
      setShowRejectionModal(false);
      setRejectionData({ reason: '', comments: '' });
      fetchEmergencyRequests();
      fetchStatistics();
      alert('Emergency request rejected');
    } catch (error) {
      console.error('Error rejecting request:', error);
      alert('Error rejecting request: ' + (error.response?.data?.error || error.message));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDispatch = async () => {
    if (!selectedRequest || !dispatchData.ambulance_id.trim()) {
      alert('Please provide an ambulance ID');
      return;
    }
    
    setActionLoading(true);
    try {
      await healthcareAPI.emergencies.dispatch(selectedRequest.id, dispatchData);
      setShowDispatchModal(false);
      setDispatchData({ ambulance_id: '', hospital_destination: '' });
      fetchEmergencyRequests();
      fetchStatistics();
      alert('Ambulance dispatched successfully');
    } catch (error) {
      console.error('Error dispatching ambulance:', error);
      alert('Error dispatching ambulance: ' + (error.response?.data?.error || error.message));
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusUpdate = async (requestId, newStatus) => {
    setActionLoading(true);
    try {
      await healthcareAPI.emergencies.updateStatus(requestId, { status: newStatus });
      fetchEmergencyRequests();
      fetchStatistics();
      alert('Status updated successfully');
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Error updating status: ' + (error.response?.data?.error || error.message));
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status, approvalStatus) => {
    if (approvalStatus === 'rejected') {
      return <span className="px-2 py-1 text-xs font-semibold bg-red-100 text-red-800 rounded-full">Rejected</span>;
    }
    
    const statusMap = {
      'P': { text: 'Pending Review', color: 'bg-yellow-100 text-yellow-800' },
      'D': { text: 'Dispatched', color: 'bg-blue-100 text-blue-800' },
      'A': { text: 'Ambulance Arrived', color: 'bg-purple-100 text-purple-800' },
      'T': { text: 'In Transit', color: 'bg-indigo-100 text-indigo-800' },
      'C': { text: 'Completed', color: 'bg-green-100 text-green-800' }
    };
    
    const statusInfo = statusMap[status] || { text: 'Unknown', color: 'bg-gray-100 text-gray-800' };
    
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusInfo.color}`}>
        {statusInfo.text}
      </span>
    );
  };

  const getUrgencyColor = (urgency) => {
    const colorMap = {
      'immediate': 'text-red-600 bg-red-50',
      'urgent': 'text-orange-600 bg-orange-50',
      'standard': 'text-green-600 bg-green-50',
      'non_urgent': 'text-gray-600 bg-gray-50'
    };
    return colorMap[urgency] || 'text-gray-600 bg-gray-50';
  };

  const getUrgencyIcon = (urgency) => {
    switch (urgency) {
      case 'immediate':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'urgent':
        return <Clock className="w-4 h-4 text-orange-600" />;
      case 'standard':
        return <Activity className="w-4 h-4 text-green-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const openApprovalModal = (request) => {
    setSelectedRequest(request);
    setShowApprovalModal(true);
  };

  const openRejectionModal = (request) => {
    setSelectedRequest(request);
    setShowRejectionModal(true);
  };

  const openDispatchModal = (request) => {
    setSelectedRequest(request);
    setShowDispatchModal(true);
  };

  const viewRequestDetails = (request) => {
    setSelectedRequest(request);
    setShowDetailModal(true);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
            <h1 className="text-2xl font-bold text-gray-900">Emergency Request Management</h1>
            <p className="text-gray-600">Review, approve, and manage emergency ambulance requests</p>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Requests</p>
                <p className="text-2xl font-bold text-gray-900">{statistics.total || 0}</p>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Approval</p>
                <p className="text-2xl font-bold text-yellow-600">{statistics.pending || 0}</p>
              </div>
              <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Critical Pending</p>
                <p className="text-2xl font-bold text-red-600">{statistics.critical_pending || 0}</p>
              </div>
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Approved</p>
                <p className="text-2xl font-bold text-green-600">{statistics.approved || 0}</p>
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </div>
        </div>

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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Approval</label>
              <select
                value={filters.approvalStatus}
                onChange={(e) => setFilters({...filters, approvalStatus: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Approval</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Urgency</label>
              <select
                value={filters.urgency}
                onChange={(e) => setFilters({...filters, urgency: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Urgency</option>
                <option value="immediate">Immediate</option>
                <option value="urgent">Urgent</option>
                <option value="standard">Standard</option>
                <option value="non_urgent">Non-urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
              <select
                value={filters.dateRange}
                onChange={(e) => setFilters({...filters, dateRange: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">Last Week</option>
                <option value="month">Last Month</option>
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
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Emergency Requests List */}
        <div className="space-y-4">
          {filteredRequests.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Emergency Requests</h3>
              <p className="text-gray-600">No requests match your current filters.</p>
            </div>
          ) : (
            filteredRequests.map((request) => (
              <div key={request.id} className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getUrgencyColor(request.urgency_level)}`}>
                      {getUrgencyIcon(request.urgency_level)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Request #{request.id}</h3>
                      <p className="text-sm text-gray-500">
                        {new Date(request.request_time).toLocaleString()}
                      </p>
                      {request.patient_name && (
                        <p className="text-sm text-blue-600">Patient: {request.patient_name}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getUrgencyColor(request.urgency_level)}`}>
                      {request.urgency_level?.replace('_', ' ').toUpperCase() || 'STANDARD'}
                    </span>
                    {getStatusBadge(request.status, request.approval_status)}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-gray-400 mt-1" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Location</p>
                      <p className="text-sm text-gray-600">{request.location}</p>
                      {request.clinic_name && (
                        <p className="text-xs text-blue-600 mt-1">Clinic: {request.clinic_name}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <User className="w-4 h-4 text-gray-400 mt-1" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Medical Condition</p>
                      <p className="text-sm text-gray-600">{request.condition_description}</p>
                      {request.suspected_disease && (
                        <p className="text-xs text-orange-600 mt-1">Suspected: {request.suspected_disease}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2 pt-4 border-t">
                  <button
                    onClick={() => viewRequestDetails(request)}
                    className="flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    View Details
                  </button>

                  {request.approval_status === 'pending' && (
                    <>
                      <button
                        onClick={() => openApprovalModal(request)}
                        className="flex items-center gap-1 px-3 py-1 text-sm text-green-600 hover:text-green-800 hover:bg-green-50 rounded-md transition-colors"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Approve
                      </button>
                      <button
                        onClick={() => openRejectionModal(request)}
                        className="flex items-center gap-1 px-3 py-1 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors"
                      >
                        <X className="w-4 h-4" />
                        Reject
                      </button>
                    </>
                  )}

                  {request.approval_status === 'approved' && request.status === 'P' && (
                    <button
                      onClick={() => openDispatchModal(request)}
                      className="flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
                    >
                      <Car className="w-4 h-4" />
                      Dispatch
                    </button>
                  )}

                  {request.status === 'D' && (
                    <button
                      onClick={() => handleStatusUpdate(request.id, 'A')}
                      className="flex items-center gap-1 px-3 py-1 text-sm text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-md transition-colors"
                    >
                      <MapPin className="w-4 h-4" />
                      Mark Arrived
                    </button>
                  )}

                  {request.status === 'A' && (
                    <button
                      onClick={() => handleStatusUpdate(request.id, 'T')}
                      className="flex items-center gap-1 px-3 py-1 text-sm text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-md transition-colors"
                    >
                      <Car className="w-4 h-4" />
                      In Transit
                    </button>
                  )}

                  {request.status === 'T' && (
                    <button
                      onClick={() => handleStatusUpdate(request.id, 'C')}
                      className="flex items-center gap-1 px-3 py-1 text-sm text-green-600 hover:text-green-800 hover:bg-green-50 rounded-md transition-colors"
                    >
                      <Hospital className="w-4 h-4" />
                      Complete
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Approval Modal */}
        {showApprovalModal && selectedRequest && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <h2 className="text-xl font-bold mb-4">Approve Emergency Request</h2>
              <p className="text-gray-600 mb-4">
                Approve emergency request #{selectedRequest.id}?
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority Override (Optional)
                  </label>
                  <select
                    value={approvalData.priority}
                    onChange={(e) => setApprovalData({...approvalData, priority: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">No change</option>
                    <option value="immediate">Immediate</option>
                    <option value="urgent">Urgent</option>
                    <option value="standard">Standard</option>
                    <option value="non_urgent">Non-urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Urgency Level Override (Optional)
                  </label>
                  <select
                    value={approvalData.urgency_level}
                    onChange={(e) => setApprovalData({...approvalData, urgency_level: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">No change</option>
                    <option value="immediate">Immediate</option>
                    <option value="urgent">Urgent</option>
                    <option value="standard">Standard</option>
                    <option value="non_urgent">Non-urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Comments (Optional)
                  </label>
                  <textarea
                    value={approvalData.comments}
                    onChange={(e) => setApprovalData({...approvalData, comments: e.target.value})}
                    placeholder="Add any comments or notes..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleApproval}
                  disabled={actionLoading}
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {actionLoading ? 'Approving...' : 'Approve Request'}
                </button>
                <button
                  onClick={() => setShowApprovalModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Rejection Modal */}
        {showRejectionModal && selectedRequest && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <h2 className="text-xl font-bold mb-4">Reject Emergency Request</h2>
              <p className="text-gray-600 mb-4">
                Reject emergency request #{selectedRequest.id}?
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reason for Rejection *
                  </label>
                  <textarea
                    value={rejectionData.reason}
                    onChange={(e) => setRejectionData({...rejectionData, reason: e.target.value})}
                    placeholder="Provide a reason for rejection..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Additional Comments (Optional)
                  </label>
                  <textarea
                    value={rejectionData.comments}
                    onChange={(e) => setRejectionData({...rejectionData, comments: e.target.value})}
                    placeholder="Add any additional comments..."
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleRejection}
                  disabled={actionLoading || !rejectionData.reason.trim()}
                  className="flex-1 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {actionLoading ? 'Rejecting...' : 'Reject Request'}
                </button>
                <button
                  onClick={() => setShowRejectionModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Dispatch Modal */}
        {showDispatchModal && selectedRequest && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <h2 className="text-xl font-bold mb-4">Dispatch Ambulance</h2>
              <p className="text-gray-600 mb-4">
                Dispatch ambulance for request #{selectedRequest.id}
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ambulance ID *
                  </label>
                  <input
                    type="text"
                    value={dispatchData.ambulance_id}
                    onChange={(e) => setDispatchData({...dispatchData, ambulance_id: e.target.value})}
                    placeholder="Enter ambulance identifier (e.g., AMB-001)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hospital Destination (Optional)
                  </label>
                  <input
                    type="text"
                    value={dispatchData.hospital_destination}
                    onChange={(e) => setDispatchData({...dispatchData, hospital_destination: e.target.value})}
                    placeholder="Destination hospital name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="bg-blue-50 p-3 rounded-md">
                  <h4 className="font-medium text-blue-800 mb-2">Request Details</h4>
                  <p className="text-sm text-blue-700">
                    <strong>Location:</strong> {selectedRequest.location}
                  </p>
                  <p className="text-sm text-blue-700">
                    <strong>Condition:</strong> {selectedRequest.condition_description}
                  </p>
                  <p className="text-sm text-blue-700">
                    <strong>Urgency:</strong> {selectedRequest.urgency_level?.replace('_', ' ').toUpperCase()}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleDispatch}
                  disabled={actionLoading || !dispatchData.ambulance_id.trim()}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {actionLoading ? 'Dispatching...' : 'Dispatch Ambulance'}
                </button>
                <button
                  onClick={() => setShowDispatchModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Detail Modal */}
        {showDetailModal && selectedRequest && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-screen overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Emergency Request Details</h2>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Left Column - Basic Info */}
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-gray-900 mb-3">Request Information</h3>
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm font-medium text-gray-700">Request ID:</span>
                        <span className="ml-2 text-sm text-gray-600">#{selectedRequest.id}</span>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-700">Submitted:</span>
                        <span className="ml-2 text-sm text-gray-600">
                          {new Date(selectedRequest.request_time).toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-700">Status:</span>
                        <span className="ml-2">{getStatusBadge(selectedRequest.status, selectedRequest.approval_status)}</span>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-700">Urgency:</span>
                        <span className={`ml-2 text-sm font-medium px-2 py-1 rounded-full ${getUrgencyColor(selectedRequest.urgency_level)}`}>
                          {selectedRequest.urgency_level?.replace('_', ' ').toUpperCase() || 'STANDARD'}
                        </span>
                      </div>
                      {selectedRequest.patient_name && (
                        <div>
                          <span className="text-sm font-medium text-gray-700">Patient:</span>
                          <span className="ml-2 text-sm text-blue-600">{selectedRequest.patient_name}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-gray-900 mb-3">Location Details</h3>
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm font-medium text-gray-700">Address:</span>
                        <p className="text-sm text-gray-600 mt-1">{selectedRequest.location}</p>
                      </div>
                      {selectedRequest.gps_coordinates && (
                        <div>
                          <span className="text-sm font-medium text-gray-700">GPS Coordinates:</span>
                          <p className="text-sm text-gray-600 mt-1">{selectedRequest.gps_coordinates}</p>
                        </div>
                      )}
                      {selectedRequest.clinic_name && (
                        <div>
                          <span className="text-sm font-medium text-gray-700">Preferred Clinic:</span>
                          <p className="text-sm text-blue-600 mt-1">{selectedRequest.clinic_name}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-gray-900 mb-3">Medical Information</h3>
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm font-medium text-gray-700">Condition Description:</span>
                        <p className="text-sm text-gray-600 mt-1">{selectedRequest.condition_description}</p>
                      </div>
                      {selectedRequest.suspected_disease && (
                        <div>
                          <span className="text-sm font-medium text-gray-700">Suspected Condition:</span>
                          <p className="text-sm text-gray-600 mt-1">{selectedRequest.suspected_disease}</p>
                        </div>
                      )}
                      {selectedRequest.additional_notes && (
                        <div>
                          <span className="text-sm font-medium text-gray-700">Additional Notes:</span>
                          <p className="text-sm text-gray-600 mt-1">{selectedRequest.additional_notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column - Timeline & Status */}
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-gray-900 mb-3">Status Timeline</h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Request Submitted</p>
                          <p className="text-xs text-gray-600">
                            {new Date(selectedRequest.request_time).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {selectedRequest.approved_at && (
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">Request Approved</p>
                            <p className="text-xs text-gray-600">
                              {new Date(selectedRequest.approved_at).toLocaleString()}
                            </p>
                            {selectedRequest.approved_by_name && (
                              <p className="text-xs text-gray-500">By: {selectedRequest.approved_by_name}</p>
                            )}
                          </div>
                        </div>
                      )}

                      {selectedRequest.dispatched_at && (
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">Ambulance Dispatched</p>
                            <p className="text-xs text-gray-600">
                              {new Date(selectedRequest.dispatched_at).toLocaleString()}
                            </p>
                            {selectedRequest.dispatched_by_name && (
                              <p className="text-xs text-gray-500">By: {selectedRequest.dispatched_by_name}</p>
                            )}
                          </div>
                        </div>
                      )}

                      {selectedRequest.arrived_at && (
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">Ambulance Arrived</p>
                            <p className="text-xs text-gray-600">
                              {new Date(selectedRequest.arrived_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      )}

                      {selectedRequest.in_transit_at && (
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">In Transit to Hospital</p>
                            <p className="text-xs text-gray-600">
                              {new Date(selectedRequest.in_transit_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      )}

                      {selectedRequest.completed_at && (
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 bg-green-600 rounded-full"></div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">Request Completed</p>
                            <p className="text-xs text-gray-600">
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
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-blue-800 mb-3">Ambulance Information</h3>
                      <div className="space-y-2">
                        <div>
                          <span className="text-sm font-medium text-blue-700">Ambulance ID:</span>
                          <p className="text-sm text-blue-600 mt-1">{selectedRequest.assigned_ambulance}</p>
                        </div>
                        {selectedRequest.hospital_destination && (
                          <div>
                            <span className="text-sm font-medium text-blue-700">Hospital Destination:</span>
                            <p className="text-sm text-blue-600 mt-1">{selectedRequest.hospital_destination}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedRequest.approval_status === 'rejected' && (
                    <div className="bg-red-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-red-800 mb-3">Rejection Information</h3>
                      <div className="space-y-2">
                        {selectedRequest.rejection_reason && (
                          <div>
                            <span className="text-sm font-medium text-red-700">Reason:</span>
                            <p className="text-sm text-red-600 mt-1">{selectedRequest.rejection_reason}</p>
                          </div>
                        )}
                        {selectedRequest.approval_comments && (
                          <div>
                            <span className="text-sm font-medium text-red-700">Comments:</span>
                            <p className="text-sm text-red-600 mt-1">{selectedRequest.approval_comments}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedRequest.patient_details && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-gray-900 mb-3">Patient Information</h3>
                      <div className="space-y-2">
                        {selectedRequest.patient_details.emergency_contact_name && (
                          <div>
                            <span className="text-sm font-medium text-gray-700">Emergency Contact:</span>
                            <p className="text-sm text-gray-600 mt-1">{selectedRequest.patient_details.emergency_contact_name}</p>
                          </div>
                        )}
                        {selectedRequest.patient_details.emergency_contact_phone && (
                          <div>
                            <span className="text-sm font-medium text-gray-700">Contact Phone:</span>
                            <p className="text-sm text-gray-600 mt-1">{selectedRequest.patient_details.emergency_contact_phone}</p>
                          </div>
                        )}
                        {selectedRequest.patient_details.insurance_provider && (
                          <div>
                            <span className="text-sm font-medium text-gray-700">Insurance:</span>
                            <p className="text-sm text-gray-600 mt-1">{selectedRequest.patient_details.insurance_provider}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons in Detail Modal */}
              <div className="flex justify-between mt-6 pt-4 border-t">
                <div className="flex gap-2">
                  {selectedRequest.approval_status === 'pending' && (
                    <>
                      <button
                        onClick={() => {
                          setShowDetailModal(false);
                          openApprovalModal(selectedRequest);
                        }}
                        className="flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Approve
                      </button>
                      <button
                        onClick={() => {
                          setShowDetailModal(false);
                          openRejectionModal(selectedRequest);
                        }}
                        className="flex items-center gap-1 px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                      >
                        <X className="w-4 h-4" />
                        Reject
                      </button>
                    </>
                  )}

                  {selectedRequest.approval_status === 'approved' && selectedRequest.status === 'P' && (
                    <button
                      onClick={() => {
                        setShowDetailModal(false);
                        openDispatchModal(selectedRequest);
                      }}
                      className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      <Car className="w-4 h-4" />
                      Dispatch
                    </button>
                  )}
                </div>

                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default EmergencyManagementPage;
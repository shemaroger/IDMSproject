import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { healthcareAPI } from '../../services/api';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Eye,
  Filter,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  MapPin,
  User,
  Activity,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const EmergencyApprovalPage = () => {
  // State management
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [approvalNote, setApprovalNote] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  
  // Pagination and sorting state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({ key: 'request_time', direction: 'desc' });
  
  // Filter state
  const [filters, setFilters] = useState({
    status: 'pending',
    urgency: 'all',
    search: ''
  });

  // Fetch pending requests on component mount
  useEffect(() => {
    fetchPendingRequests();
  }, []);

  // Apply filters when requests or filters change
  useEffect(() => {
    applyFilters();
  }, [requests, filters]);

  // API call to fetch pending emergency requests
  const fetchPendingRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await healthcareAPI.emergencies.list({ 
        approval_status: 'pending',
        include_patient: true,
        expand: 'patient'
      });
      
      // Handle different response structures
      let requestsData = [];
      if (Array.isArray(response)) {
        requestsData = response;
      } else if (response?.data) {
        requestsData = response.data;
      } else if (response?.results) {
        requestsData = response.results;
      } else {
        requestsData = [];
      }
      
      // Filter for pending requests
      const pendingRequests = requestsData.filter(req => 
        req.status === 'P' || 
        req.status === 'pending' ||
        req.approval_status === 'pending'
      );
      
      setRequests(pendingRequests);
    } catch (error) {
      setError('Failed to load emergency requests. Please try again.');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter requests based on current filter settings
  const applyFilters = () => {
    let filtered = [...requests];
    
    if (filters.urgency !== 'all') {
      filtered = filtered.filter(req => req.urgency_level === filters.urgency);
    }
    
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(req =>
        (req.patient?.name?.toLowerCase().includes(searchTerm)) ||
        (req.patient_name?.toLowerCase().includes(searchTerm)) ||
        (req.location?.toLowerCase().includes(searchTerm)) ||
        (req.condition_description?.toLowerCase().includes(searchTerm)) ||
        (req.id?.toString().includes(searchTerm))
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      
      if (sortConfig.key === 'request_time') {
        return sortConfig.direction === 'asc' 
          ? new Date(aValue) - new Date(bValue)
          : new Date(bValue) - new Date(aValue);
      }
      
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    
    setFilteredRequests(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  };

  // Handle sorting
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Approve an emergency request
  const approveRequest = async (requestId) => {
    if (!approvalNote.trim()) {
      setError('Please enter an approval note');
      return;
    }
    
    try {
      setLoading(true);
      
      // Try the API approve method first
      try {
        await healthcareAPI.emergencies.approve(requestId, approvalNote);
        
        // Success - remove from requests list
        setRequests(requests.filter(req => req.id !== requestId));
        setShowDetailModal(false);
        setApprovalNote('');
        setError(null);
        
        // Show success message
        setTimeout(() => {
          setError(null);
        }, 3000);
        
      } catch (approveError) {
        // Handle specific error cases
        if (approveError.message.includes('404') || approveError.message.includes('Not found')) {
          // Try updateStatus as fallback
          try {
            await healthcareAPI.emergencies.updateStatus(requestId, 'D', {
              comment: approvalNote,
              notes: `Approved: ${approvalNote}`
            });
            
            // Success with fallback method
            setRequests(requests.filter(req => req.id !== requestId));
            setShowDetailModal(false);
            setApprovalNote('');
            setError(null);
            
          } catch (statusError) {
            if (statusError.message.includes('403') || statusError.message.includes('Forbidden')) {
              setError('Permission denied: You need administrator privileges to approve emergency requests. Please contact your system administrator to grant approval permissions.');
            } else {
              setError(`Failed to approve request: ${statusError.message}`);
            }
          }
        } else if (approveError.message.includes('403') || approveError.message.includes('Forbidden')) {
          setError('Permission denied: You need administrator privileges to approve emergency requests. Please contact your system administrator to grant approval permissions.');
        } else {
          setError(`Failed to approve request: ${approveError.message}`);
        }
      }
      
    } catch (error) {
      setError('An unexpected error occurred while approving the request. Please try again or contact support.');
    } finally {
      setLoading(false);
    }
  };

  // Reject an emergency request
  const rejectRequest = async (requestId) => {
    if (!rejectionReason.trim()) {
      setError('Please enter a rejection reason');
      return;
    }
    
    try {
      setLoading(true);
      
      // Try the API reject method first
      try {
        await healthcareAPI.emergencies.reject(requestId, rejectionReason);
        
        // Success - remove from requests list
        setRequests(requests.filter(req => req.id !== requestId));
        setShowDetailModal(false);
        setRejectionReason('');
        setError(null);
        
      } catch (rejectError) {
        // Handle specific error cases
        if (rejectError.message.includes('404') || rejectError.message.includes('Not found')) {
          // Try updateStatus as fallback
          try {
            await healthcareAPI.emergencies.updateStatus(requestId, 'R', {
              reason: rejectionReason,
              notes: `Rejected: ${rejectionReason}`
            });
            
            // Success with fallback method
            setRequests(requests.filter(req => req.id !== requestId));
            setShowDetailModal(false);
            setRejectionReason('');
            setError(null);
            
          } catch (statusError) {
            if (statusError.message.includes('403') || statusError.message.includes('Forbidden')) {
              setError('Permission denied: You need administrator privileges to reject emergency requests. Please contact your system administrator to grant approval permissions.');
            } else {
              setError(`Failed to reject request: ${statusError.message}`);
            }
          }
        } else if (rejectError.message.includes('403') || rejectError.message.includes('Forbidden')) {
          setError('Permission denied: You need administrator privileges to reject emergency requests. Please contact your system administrator to grant approval permissions.');
        } else {
          setError(`Failed to reject request: ${rejectError.message}`);
        }
      }
      
    } catch (error) {
      setError('An unexpected error occurred while rejecting the request. Please try again or contact support.');
    } finally {
      setLoading(false);
    }
  };

  // View details of a specific request
  const viewRequestDetails = (request) => {
    setSelectedRequest(request);
    setShowDetailModal(true);
    setError(null);
  };

  // Get urgency level badge with appropriate styling
  const getUrgencyBadge = (urgency) => {
    const urgencyMap = {
      'immediate': { bg: 'bg-red-100', text: 'text-red-800', label: 'IMMEDIATE' },
      'urgent': { bg: 'bg-orange-100', text: 'text-orange-800', label: 'URGENT' },
      'standard': { bg: 'bg-blue-100', text: 'text-blue-800', label: 'STANDARD' },
      'non_urgent': { bg: 'bg-green-100', text: 'text-green-800', label: 'LOW' }
    };
    
    const urgencyInfo = urgencyMap[urgency] || { bg: 'bg-gray-100', text: 'text-gray-800', label: 'UNKNOWN' };
    
    return (
      <span className={`px-3 py-1 text-xs font-medium rounded-full ${urgencyInfo.bg} ${urgencyInfo.text}`}>
        {urgencyInfo.label}
      </span>
    );
  };

  // Loading state
  if (loading && requests.length === 0) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading emergency requests...</p>
        </div>
      </DashboardLayout>
    );
  }

  // Calculate pagination variables
  const itemsPerPageOptions = [5, 10, 25];
  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentRequests = filteredRequests.slice(startIndex, endIndex);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Emergency Request Approvals</h1>
            <p className="text-gray-600">Review and manage pending emergency ambulance requests</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={fetchPendingRequests}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-red-800">
                  {error.includes('Permission denied') ? 'Permission Required' : 'Error'}
                </h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
                {error.includes('Permission denied') && (
                  <div className="mt-3">
                    <p className="text-xs text-red-600">
                      <strong>What you can do:</strong>
                    </p>
                    <ul className="text-xs text-red-600 mt-1 ml-4 list-disc">
                      <li>Contact your system administrator</li>
                      <li>Request approval permissions for your account</li>
                      <li>Ask an administrator to process this request</li>
                    </ul>
                  </div>
                )}
              </div>
              <button
                onClick={() => setError(null)}
                className="text-red-500 hover:text-red-700"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Filter Controls */}
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Urgency Level</label>
              <select
                value={filters.urgency}
                onChange={(e) => setFilters({...filters, urgency: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Urgency Levels</option>
                <option value="immediate">Immediate</option>
                <option value="urgent">Urgent</option>
                <option value="standard">Standard</option>
                <option value="non_urgent">Low Priority</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Search Requests</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search by patient, location, or condition..."
                  value={filters.search}
                  onChange={(e) => setFilters({...filters, search: e.target.value})}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Items Per Page</label>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {itemsPerPageOptions.map(option => (
                  <option key={option} value={option}>{option} per page</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
              <div className="ml-4">
                <dt className="text-sm font-medium text-gray-500">Total Pending</dt>
                <dd className="text-2xl font-bold text-gray-900">{requests.length}</dd>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
              <div className="ml-4">
                <dt className="text-sm font-medium text-gray-500">Urgent/Immediate</dt>
                <dd className="text-2xl font-bold text-gray-900">
                  {requests.filter(r => r.urgency_level === 'urgent' || r.urgency_level === 'immediate').length}
                </dd>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Search className="h-8 w-8 text-blue-500" />
              </div>
              <div className="ml-4">
                <dt className="text-sm font-medium text-gray-500">Filtered Results</dt>
                <dd className="text-2xl font-bold text-gray-900">{filteredRequests.length}</dd>
              </div>
            </div>
          </div>
        </div>

        {/* Empty State */}
        {filteredRequests.length === 0 && !loading && (
          <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
            <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {requests.length === 0 ? 'No Pending Approvals' : 'No Matching Requests'}
            </h3>
            <p className="text-gray-600 max-w-md mx-auto mb-4">
              {requests.length === 0
                ? "There are currently no emergency requests awaiting your approval."
                : "No requests match your current filters. Try adjusting your search criteria."
              }
            </p>
            {requests.length === 0 && (
              <div className="mt-4 text-sm text-gray-500">
                <p>Emergency requests will appear here when:</p>
                <ul className="mt-2 text-xs">
                  <li>• New requests are submitted by patients</li>
                  <li>• Requests are forwarded for approval</li>
                  <li>• Critical cases are escalated</li>
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Requests List */}
        {filteredRequests.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('id')}
                    >
                      <div className="flex items-center gap-1">
                        Request ID
                        {sortConfig.key === 'id' && (
                          sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('request_time')}
                    >
                      <div className="flex items-center gap-1">
                        Submitted
                        {sortConfig.key === 'request_time' && (
                          sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Patient
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Urgency
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentRequests.map((request, index) => {
                    // Debug log for each request
                    console.log(`Rendering request ${index}:`, request);
                    
                    return (
                      <tr key={request.id || index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            ER-{request.id || 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {request.request_time ? 
                              new Date(request.request_time).toLocaleDateString() : 
                              request.created_at ? 
                              new Date(request.created_at).toLocaleDateString() :
                              'No date'
                            }
                          </div>
                          <div className="text-xs text-gray-500">
                            {request.request_time ? 
                              new Date(request.request_time).toLocaleTimeString() :
                              request.created_at ? 
                              new Date(request.created_at).toLocaleTimeString() :
                              ''
                            }
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <User className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {request.patient?.name || 
                                 request.patient?.user?.first_name + ' ' + request.patient?.user?.last_name ||
                                 request.patient_name || 
                                 'Unknown Patient'}
                              </div>
                              {(request.patient?.medical_id || request.patient?.id) && (
                                <div className="text-xs text-gray-500">
                                  ID: {request.patient.medical_id || request.patient.id}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 max-w-xs truncate" title={request.location || 'No location'}>
                            {request.location || 'No location provided'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getUrgencyBadge(request.urgency_level || 'standard')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => viewRequestDetails(request)}
                            className="text-blue-600 hover:text-blue-800 px-3 py-1 rounded hover:bg-blue-50 transition-colors flex items-center gap-1"
                          >
                            <Eye className="w-4 h-4" />
                            Review
                          </button>
                        </td>
                      </tr>
                    );
                  })}
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
                        <span className="sr-only">Previous</span>
                        <ChevronLeft className="h-5 w-5" aria-hidden="true" />
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
                                ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
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
                        <span className="sr-only">Next</span>
                        <ChevronRight className="h-5 w-5" aria-hidden="true" />
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Request Detail Modal */}
        {showDetailModal && selectedRequest && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">Emergency Request #{selectedRequest.id}</h2>
                      <p className="text-gray-600">
                        Submitted: {new Date(selectedRequest.request_time).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100"
                  >
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                  {/* Left Column */}
                  <div className="space-y-6">
                    {/* Patient Information */}
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <h3 className="flex items-center gap-2 font-semibold text-blue-800 mb-3">
                        <User className="w-5 h-5" />
                        Patient Information
                      </h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm font-medium text-blue-700">Name:</span>
                          <span className="text-sm text-blue-900">
                            {selectedRequest.patient?.name || selectedRequest.patient_name || 'Unknown'}
                          </span>
                        </div>
                        {selectedRequest.patient?.medical_id && (
                          <div className="flex justify-between">
                            <span className="text-sm font-medium text-blue-700">Medical ID:</span>
                            <span className="text-sm text-blue-900 font-mono">{selectedRequest.patient.medical_id}</span>
                          </div>
                        )}
                        {selectedRequest.patient?.age && (
                          <div className="flex justify-between">
                            <span className="text-sm font-medium text-blue-700">Age:</span>
                            <span className="text-sm text-blue-900">{selectedRequest.patient.age}</span>
                          </div>
                        )}
                        {selectedRequest.patient?.gender && (
                          <div className="flex justify-between">
                            <span className="text-sm font-medium text-blue-700">Gender:</span>
                            <span className="text-sm text-blue-900">{selectedRequest.patient.gender}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Location Information */}
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <h3 className="flex items-center gap-2 font-semibold text-green-800 mb-3">
                        <MapPin className="w-5 h-5" />
                        Location Details
                      </h3>
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-medium text-green-700 mb-1">Address:</p>
                          <p className="text-sm text-green-900 bg-white bg-opacity-70 p-2 rounded border">
                            {selectedRequest.location}
                          </p>
                        </div>
                        {selectedRequest.gps_coordinates && (
                          <div>
                            <p className="text-sm font-medium text-green-700 mb-1">GPS Coordinates:</p>
                            <div className="bg-white bg-opacity-70 p-2 rounded border">
                              <p className="text-sm text-green-900 font-mono mb-2">
                                {selectedRequest.gps_coordinates}
                              </p>
                              <button
                                onClick={() => {
                                  const [lat, lng] = selectedRequest.gps_coordinates.split(',');
                                  window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
                                }}
                                className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                              >
                                <MapPin className="w-3 h-3" />
                                View on Map
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-6">
                    {/* Medical Information */}
                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                      <h3 className="flex items-center gap-2 font-semibold text-purple-800 mb-3">
                        <Activity className="w-5 h-5" />
                        Medical Details
                      </h3>
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-medium text-purple-700 mb-1">Condition:</p>
                          <p className="text-sm text-purple-900 bg-white bg-opacity-70 p-2 rounded border">
                            {selectedRequest.condition_description}
                          </p>
                        </div>
                        {selectedRequest.suspected_disease && (
                          <div>
                            <p className="text-sm font-medium text-purple-700 mb-1">Suspected Condition:</p>
                            <p className="text-sm text-purple-900 bg-white bg-opacity-70 p-2 rounded border">
                              {selectedRequest.suspected_disease}
                            </p>
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-purple-700 mb-1">Urgency Level:</p>
                          <div className="inline-block">
                            {getUrgencyBadge(selectedRequest.urgency_level)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Approval/Rejection Form */}
                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                      <h3 className="flex items-center gap-2 font-semibold text-yellow-800 mb-3">
                        <CheckCircle className="w-5 h-5" />
                        Review Actions
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-yellow-700 mb-1">
                            Approval Notes (Required for approval)
                          </label>
                          <textarea
                            value={approvalNote}
                            onChange={(e) => setApprovalNote(e.target.value)}
                            placeholder="Document your approval rationale..."
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-yellow-700 mb-1">
                            Rejection Reason (Required for rejection)
                          </label>
                          <textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="Provide specific reason for rejection..."
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                          <button
                            onClick={() => setShowDetailModal(false)}
                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => rejectRequest(selectedRequest.id)}
                            disabled={!rejectionReason.trim() || loading}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {loading ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            ) : (
                              <XCircle className="w-4 h-4" />
                            )}
                            Reject Request
                          </button>
                          <button
                            onClick={() => approveRequest(selectedRequest.id)}
                            disabled={!approvalNote.trim() || loading}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {loading ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            ) : (
                              <CheckCircle className="w-4 h-4" />
                            )}
                            Approve Request
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default EmergencyApprovalPage;
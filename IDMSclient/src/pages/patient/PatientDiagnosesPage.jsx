import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import diagnosisService from '../../services/diagnosisService';
import { useAuth } from '../../contexts/AuthContext';
import { 
  FileText, 
  Clock, 
  User, 
  Shield, 
  CheckCircle, 
  X, 
  Eye, 
  Calendar, 
  Activity,
  AlertTriangle,
  Thermometer,
  Heart,
  Filter,
  Search,
  Download,
  Plus,
  Stethoscope,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  ExternalLink
} from 'lucide-react';

const PatientDiagnosesPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [diagnoses, setDiagnoses] = useState([]);
  const [filteredDiagnoses, setFilteredDiagnoses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDiagnosis, setSelectedDiagnosis] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  const [filters, setFilters] = useState({
    status: 'all',
    severity: 'all',
    dateRange: 'all',
    search: ''
  });

  useEffect(() => {
    loadDiagnoses();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [diagnoses, filters]);

  const loadDiagnoses = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('Loading diagnoses for user:', user);
      
      const response = await diagnosisService.diagnoses.list();
      const diagnosesData = response.data.results || response.data || [];
      
      console.log('Loaded diagnoses:', diagnosesData);
      
      const sortedDiagnoses = diagnosesData.sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
      );
      
      setDiagnoses(sortedDiagnoses);
    } catch (error) {
      console.error('Error loading diagnoses:', error);
      setError('Failed to load medical records: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...diagnoses];

    if (filters.status !== 'all') {
      filtered = filtered.filter(diagnosis => diagnosis.status === filters.status);
    }

    if (filters.severity !== 'all') {
      filtered = filtered.filter(diagnosis => diagnosis.severity === filters.severity);
    }

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
        case 'year':
          filterDate = new Date();
          filterDate.setFullYear(now.getFullYear() - 1);
          break;
        default:
          filterDate = null;
      }
      
      if (filterDate) {
        filtered = filtered.filter(diagnosis => new Date(diagnosis.created_at) >= filterDate);
      }
    }

    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(diagnosis => 
        diagnosis.disease?.name?.toLowerCase().includes(searchTerm) ||
        diagnosis.treating_doctor?.first_name?.toLowerCase().includes(searchTerm) ||
        diagnosis.treating_doctor?.last_name?.toLowerCase().includes(searchTerm) ||
        diagnosis.doctor_notes?.toLowerCase().includes(searchTerm) ||
        JSON.stringify(diagnosis.symptoms || {}).toLowerCase().includes(searchTerm)
      );
    }

    setFilteredDiagnoses(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });

    const sorted = [...filteredDiagnoses].sort((a, b) => {
      let aValue = a[key];
      let bValue = b[key];

      // Handle nested properties
      if (key === 'disease') {
        aValue = a.disease?.name || '';
        bValue = b.disease?.name || '';
      } else if (key === 'doctor') {
        aValue = a.treating_doctor ? `${a.treating_doctor.first_name} ${a.treating_doctor.last_name}` : '';
        bValue = b.treating_doctor ? `${b.treating_doctor.first_name} ${b.treating_doctor.last_name}` : '';
      } else if (key === 'created_at') {
        aValue = new Date(a.created_at);
        bValue = new Date(b.created_at);
      }

      if (aValue < bValue) return direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return direction === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredDiagnoses(sorted);
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'self_reported': { text: 'Self-Reported', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
      'doctor_confirmed': { text: 'Confirmed', color: 'bg-green-100 text-green-800 border-green-200' },
      'doctor_rejected': { text: 'Rejected', color: 'bg-red-100 text-red-800 border-red-200' },
      'modified': { text: 'Modified', color: 'bg-blue-100 text-blue-800 border-blue-200' }
    };
    
    const statusInfo = statusMap[status] || { text: 'Unknown', color: 'bg-gray-100 text-gray-800 border-gray-200' };
    
    return (
      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full border ${statusInfo.color}`}>
        {statusInfo.text}
      </span>
    );
  };

  const getSeverityBadge = (severity) => {
    if (!severity) return null;
    
    const severityMap = {
      'critical': { text: 'Critical', color: 'bg-red-100 text-red-800 border-red-200', icon: AlertTriangle },
      'severe': { text: 'Severe', color: 'bg-orange-100 text-orange-800 border-orange-200', icon: Shield },
      'moderate': { text: 'Moderate', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock },
      'mild': { text: 'Mild', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle }
    };
    
    const severityInfo = severityMap[severity.toLowerCase()] || { text: severity, color: 'bg-gray-100 text-gray-800 border-gray-200', icon: Activity };
    const IconComponent = severityInfo.icon;
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full border ${severityInfo.color}`}>
        <IconComponent className="w-3 h-3" />
        {severityInfo.text}
      </span>
    );
  };

  const formatSymptomDisplay = (symptom) => {
    return symptom.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getSymptomsSummary = (symptoms) => {
    if (!symptoms) return 'No symptoms recorded';
    
    const selectedSymptoms = symptoms.selected || [];
    const customSymptoms = symptoms.custom || [];
    const allSymptoms = [...selectedSymptoms, ...customSymptoms];
    
    if (allSymptoms.length === 0) return 'No symptoms recorded';
    if (allSymptoms.length <= 2) return allSymptoms.map(formatSymptomDisplay).join(', ');
    
    return `${allSymptoms.slice(0, 2).map(formatSymptomDisplay).join(', ')} +${allSymptoms.length - 2} more`;
  };

  const getVitalsSummary = (diagnosis) => {
    const vitals = [];
    if (diagnosis.temperature) vitals.push(`${diagnosis.temperature}°F`);
    if (diagnosis.heart_rate) vitals.push(`${diagnosis.heart_rate} BPM`);
    if (diagnosis.blood_pressure) vitals.push(diagnosis.blood_pressure);
    
    return vitals.length > 0 ? vitals.join(' • ') : 'Not recorded';
  };

  const viewDiagnosisDetails = (diagnosis) => {
    setSelectedDiagnosis(diagnosis);
    setShowDetailModal(true);
  };

  const getStatistics = () => {
    const totalDiagnoses = diagnoses.length;
    const confirmedCount = diagnoses.filter(d => d.status === 'doctor_confirmed').length;
    const pendingCount = diagnoses.filter(d => d.status === 'self_reported').length;
    const recentCount = diagnoses.filter(d => {
      const diagnosisDate = new Date(d.created_at);
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      return diagnosisDate >= monthAgo;
    }).length;

    return { total: totalDiagnoses, confirmed: confirmedCount, pending: pendingCount, recent: recentCount };
  };

  // Pagination
  const totalPages = Math.ceil(filteredDiagnoses.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentDiagnoses = filteredDiagnoses.slice(startIndex, endIndex);

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
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your medical records...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Records</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={loadDiagnoses}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
            <button
              onClick={() => navigate('/patient/symptom-checker')}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Start New Check
            </button>
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
            <h1 className="text-2xl font-bold text-gray-900">Medical Records</h1>
            <p className="text-gray-600">View your diagnoses and medical history</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={loadDiagnoses}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button
              onClick={() => navigate('/patient/symptom-checker')}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              New Symptom Check
            </button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Records</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Doctor Confirmed</p>
                <p className="text-2xl font-bold text-green-600">{stats.confirmed}</p>
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
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
                <p className="text-sm font-medium text-gray-600">Recent (30 days)</p>
                <p className="text-2xl font-bold text-blue-600">{stats.recent}</p>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-600" />
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
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({...filters, status: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="self_reported">Self-Reported</option>
                <option value="doctor_confirmed">Doctor Confirmed</option>
                <option value="doctor_rejected">Doctor Rejected</option>
                <option value="modified">Modified</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
              <select
                value={filters.severity}
                onChange={(e) => setFilters({...filters, severity: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Severities</option>
                <option value="mild">Mild</option>
                <option value="moderate">Moderate</option>
                <option value="severe">Severe</option>
                <option value="critical">Critical</option>
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
                <option value="year">Last Year</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Per Page</label>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={5}>5 records</option>
                <option value={10}>10 records</option>
                <option value={25}>25 records</option>
                <option value={50}>50 records</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search records..."
                  value={filters.search}
                  onChange={(e) => setFilters({...filters, search: e.target.value})}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {filteredDiagnoses.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {diagnoses.length === 0 ? 'No Medical Records' : 'No Results Found'}
              </h3>
              <p className="text-gray-600 mb-4">
                {diagnoses.length === 0 
                  ? "You don't have any medical records yet."
                  : "No records match your current filters."
                }
              </p>
              {diagnoses.length === 0 && (
                <button
                  onClick={() => navigate('/patient/symptom-checker')}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Start Symptom Check
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <SortableHeader column="created_at">Date</SortableHeader>
                      <SortableHeader column="disease">Condition</SortableHeader>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Symptoms
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Vitals
                      </th>
                      <SortableHeader column="severity">Severity</SortableHeader>
                      <SortableHeader column="status">Status</SortableHeader>
                      <SortableHeader column="doctor">Doctor</SortableHeader>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {currentDiagnoses.map((diagnosis) => {
                      const diagnosisDate = new Date(diagnosis.created_at);
                      
                      return (
                        <tr key={diagnosis.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {diagnosisDate.toLocaleDateString()}
                            </div>
                            <div className="text-xs text-gray-500">
                              {diagnosisDate.toLocaleTimeString()}
                            </div>
                          </td>
                          
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                                <Stethoscope className="w-4 h-4 text-blue-600" />
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {diagnosis.disease?.name || 'Unknown Condition'}
                                </div>
                                {diagnosis.disease?.category && (
                                  <div className="text-xs text-gray-500">
                                    {diagnosis.disease.category}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900 max-w-xs">
                              {getSymptomsSummary(diagnosis.symptoms)}
                            </div>
                          </td>
                          
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">
                              {getVitalsSummary(diagnosis)}
                            </div>
                          </td>
                          
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getSeverityBadge(diagnosis.severity)}
                          </td>
                          
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getStatusBadge(diagnosis.status)}
                          </td>
                          
                          <td className="px-6 py-4">
                            {diagnosis.treating_doctor ? (
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  Dr. {diagnosis.treating_doctor.first_name} {diagnosis.treating_doctor.last_name}
                                </div>
                                {diagnosis.confirmed_at && (
                                  <div className="text-xs text-gray-500">
                                    Confirmed {new Date(diagnosis.confirmed_at).toLocaleDateString()}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-sm text-gray-500">Not assigned</span>
                            )}
                          </td>
                          
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => viewDiagnosisDetails(diagnosis)}
                                className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 transition-colors"
                                title="View Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              {diagnosis.session && (
                                <button
                                  onClick={() => navigate(`/patient/symptom-checker/results/${diagnosis.session.id}`)}
                                  className="text-gray-600 hover:text-gray-800 p-1 rounded hover:bg-gray-50 transition-colors"
                                  title="View Original Analysis"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </button>
                              )}
                            </div>
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
                        <span className="font-medium">{Math.min(endIndex, filteredDiagnoses.length)}</span> of{' '}
                        <span className="font-medium">{filteredDiagnoses.length}</span> results
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

        {/* Detail Modal */}
        {showDetailModal && selectedDiagnosis && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-screen overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Diagnosis Details</h2>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-500 hover:text-gray-700 p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">Condition</h3>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <Stethoscope className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{selectedDiagnosis.disease?.name || 'Unknown'}</p>
                        {selectedDiagnosis.disease?.category && (
                          <p className="text-sm text-gray-500">{selectedDiagnosis.disease.category}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">Status & Severity</h3>
                    <div className="flex gap-2">
                      {getStatusBadge(selectedDiagnosis.status)}
                      {getSeverityBadge(selectedDiagnosis.severity)}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">Date & Time</h3>
                    <p className="text-gray-900">{new Date(selectedDiagnosis.created_at).toLocaleString()}</p>
                  </div>
                  
                  {selectedDiagnosis.treating_doctor && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">Treating Doctor</h3>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-600" />
                        <span className="text-gray-900">
                          Dr. {selectedDiagnosis.treating_doctor.first_name} {selectedDiagnosis.treating_doctor.last_name}
                        </span>
                      </div>
                      {selectedDiagnosis.confirmed_at && (
                        <p className="text-sm text-green-600 mt-1">
                          Confirmed on {new Date(selectedDiagnosis.confirmed_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">Symptoms</h3>
                    <div className="space-y-2">
                      {selectedDiagnosis.symptoms?.selected && selectedDiagnosis.symptoms.selected.length > 0 && (
                        <div>
                          <p className="text-xs text-blue-600 font-medium mb-1">Selected Symptoms:</p>
                          <div className="flex flex-wrap gap-1">
                            {selectedDiagnosis.symptoms.selected.map((symptom, index) => (
                              <span
                                key={index}
                                className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full"
                              >
                                {formatSymptomDisplay(symptom)}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {selectedDiagnosis.symptoms?.custom && selectedDiagnosis.symptoms.custom.length > 0 && (
                        <div>
                          <p className="text-xs text-green-600 font-medium mb-1">Custom Symptoms:</p>
                          <div className="flex flex-wrap gap-1">
                            {selectedDiagnosis.symptoms.custom.map((symptom, index) => (
                              <span
                                key={index}
                                className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full"
                              >
                                {symptom}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {(!selectedDiagnosis.symptoms?.selected || selectedDiagnosis.symptoms.selected.length === 0) &&
                       (!selectedDiagnosis.symptoms?.custom || selectedDiagnosis.symptoms.custom.length === 0) && (
                        <p className="text-gray-500 text-sm">No symptoms recorded</p>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">Vital Signs</h3>
                    <div className="space-y-2">
                      {selectedDiagnosis.temperature && (
                        <div className="flex items-center gap-2 text-sm">
                          <Thermometer className="w-4 h-4 text-red-500" />
                          <span className="text-gray-700">Temperature:</span>
                          <span className="font-medium">{selectedDiagnosis.temperature}°F</span>
                        </div>
                      )}
                      {selectedDiagnosis.heart_rate && (
                        <div className="flex items-center gap-2 text-sm">
                          <Heart className="w-4 h-4 text-red-500" />
                          <span className="text-gray-700">Heart Rate:</span>
                          <span className="font-medium">{selectedDiagnosis.heart_rate} BPM</span>
                        </div>
                      )}
                      {selectedDiagnosis.blood_pressure && (
                        <div className="flex items-center gap-2 text-sm">
                          <Activity className="w-4 h-4 text-blue-500" />
                          <span className="text-gray-700">Blood Pressure:</span>
                          <span className="font-medium">{selectedDiagnosis.blood_pressure}</span>
                        </div>
                      )}
                      {!selectedDiagnosis.temperature && !selectedDiagnosis.heart_rate && !selectedDiagnosis.blood_pressure && (
                        <p className="text-gray-500 text-sm">No vital signs recorded</p>
                      )}
                    </div>
                  </div>
                  
                  {selectedDiagnosis.session && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">Related Session</h3>
                      <button
                        onClick={() => {
                          setShowDetailModal(false);
                          navigate(`/patient/symptom-checker/results/${selectedDiagnosis.session.id}`);
                        }}
                        className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 underline"
                      >
                        <ExternalLink className="w-4 h-4" />
                        View Original Symptom Analysis
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              {selectedDiagnosis.doctor_notes && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">Doctor's Notes</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-900 whitespace-pre-wrap">{selectedDiagnosis.doctor_notes}</p>
                  </div>
                </div>
              )}
              
              <div className="flex justify-end mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
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

export default PatientDiagnosesPage;
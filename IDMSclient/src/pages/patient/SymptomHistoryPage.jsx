import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import diagnosisService from '../../services/diagnosisService';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Clock, 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Eye, 
  Calendar, 
  User, 
  MapPin, 
  Plus,
  Filter,
  Search,
  FileText,
  TrendingUp,
  Shield,
  RefreshCw,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

const SymptomHistoryPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [filteredSessions, setFilteredSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortField, setSortField] = useState('created_at');
  const [sortDirection, setSortDirection] = useState('desc');
  const [filters, setFilters] = useState({
    severity: 'all',
    dateRange: 'all',
    search: ''
  });

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [sessions, filters, sortField, sortDirection]);

  const loadSessions = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await diagnosisService.sessions.list();
      const sessionsData = response.data.results || response.data || [];
      
      console.log('Loaded sessions:', sessionsData);
      setSessions(sessionsData);
    } catch (error) {
      console.error('Error loading symptom sessions:', error);
      setError('Failed to load symptom history: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...sessions];

    // Apply filters
    if (filters.severity !== 'all') {
      filtered = filtered.filter(session => 
        (session.severity_level || 'mild') === filters.severity
      );
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
        default:
          filterDate = null;
      }
      
      if (filterDate) {
        filtered = filtered.filter(session => new Date(session.created_at) >= filterDate);
      }
    }

    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(session => 
        session.primary_suspected_disease?.name?.toLowerCase().includes(searchTerm) ||
        session.selected_symptoms?.some(symptom => 
          symptom.toLowerCase().includes(searchTerm)
        ) ||
        session.custom_symptoms?.some(symptom => 
          symptom.toLowerCase().includes(searchTerm)
        ) ||
        session.location?.toLowerCase().includes(searchTerm) ||
        session.recommendation?.toLowerCase().includes(searchTerm)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aVal, bVal;
      
      switch (sortField) {
        case 'created_at':
          aVal = new Date(a.created_at);
          bVal = new Date(b.created_at);
          break;
        case 'severity_level':
          const severityOrder = { 'critical': 4, 'severe': 3, 'moderate': 2, 'mild': 1 };
          aVal = severityOrder[a.severity_level || 'mild'];
          bVal = severityOrder[b.severity_level || 'mild'];
          break;
        case 'primary_suspected_disease':
          aVal = a.primary_suspected_disease?.name || '';
          bVal = b.primary_suspected_disease?.name || '';
          break;
        case 'overall_risk_score':
          aVal = a.overall_risk_score || 0;
          bVal = b.overall_risk_score || 0;
          break;
        default:
          aVal = a[sortField] || '';
          bVal = b[sortField] || '';
      }

      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    setFilteredSessions(filtered);
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'severe':
        return <Shield className="w-4 h-4 text-orange-600" />;
      case 'moderate':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'mild':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      default:
        return <Activity className="w-4 h-4 text-gray-600" />;
    }
  };

  const getSeverityBadge = (severity) => {
    const sev = severity?.toLowerCase() || 'mild';
    const colors = {
      'critical': 'bg-red-100 text-red-800 border-red-200',
      'severe': 'bg-orange-100 text-orange-800 border-orange-200',
      'moderate': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'mild': 'bg-green-100 text-green-800 border-green-200'
    };
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full border ${colors[sev] || colors.mild}`}>
        {getSeverityIcon(sev)}
        {sev.charAt(0).toUpperCase() + sev.slice(1)}
      </span>
    );
  };

  const formatSymptomDisplay = (symptom) => {
    return symptom.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const viewSessionDetails = (sessionId) => {
    navigate(`/patient/symptom-checker/results/${sessionId}`);
  };

  const startNewCheck = () => {
    navigate('/patient/symptom-checker');
  };

  const getStatistics = () => {
    const totalSessions = sessions.length;
    const criticalCount = sessions.filter(s => s.severity_level === 'critical').length;
    const severeCount = sessions.filter(s => s.severity_level === 'severe').length;
    const recentSessions = sessions.filter(s => {
      const sessionDate = new Date(s.created_at);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return sessionDate >= weekAgo;
    }).length;

    return {
      total: totalSessions,
      critical: criticalCount,
      severe: severeCount,
      recent: recentSessions
    };
  };

  const SortableHeader = ({ field, children, className = "" }) => (
    <th 
      className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 ${className}`}
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortField === field && (
          sortDirection === 'asc' ? 
          <ChevronUp className="w-4 h-4" /> : 
          <ChevronDown className="w-4 h-4" />
        )}
      </div>
    </th>
  );

  const stats = getStatistics();

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your symptom history...</p>
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
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading History</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={loadSessions}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
            <button
              onClick={startNewCheck}
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
            <h1 className="text-2xl font-bold text-gray-900">Symptom Check History</h1>
            <p className="text-gray-600">Review your past symptom analyses and health assessments</p>
          </div>
          <button
            onClick={startNewCheck}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            New Symptom Check
          </button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Checks</p>
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
                <p className="text-sm font-medium text-gray-600">This Week</p>
                <p className="text-2xl font-bold text-blue-600">{stats.recent}</p>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Severe Cases</p>
                <p className="text-2xl font-bold text-orange-600">{stats.severe}</p>
              </div>
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <Shield className="w-5 h-5 text-orange-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Critical Cases</p>
                <p className="text-2xl font-bold text-red-600">{stats.critical}</p>
              </div>
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
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
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search symptoms, conditions, locations..."
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
          {filteredSessions.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {sessions.length === 0 ? 'No Symptom Checks Yet' : 'No Results Found'}
              </h3>
              <p className="text-gray-600 mb-4">
                {sessions.length === 0 
                  ? "You haven't performed any symptom checks yet."
                  : "No symptom checks match your current filters."
                }
              </p>
              {sessions.length === 0 && (
                <button
                  onClick={startNewCheck}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Start Your First Symptom Check
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <SortableHeader field="created_at">Date & Time</SortableHeader>
                    <SortableHeader field="severity_level">Severity</SortableHeader>
                    <SortableHeader field="primary_suspected_disease">Primary Condition</SortableHeader>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Symptoms
                    </th>
                    <SortableHeader field="overall_risk_score">Risk Score</SortableHeader>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredSessions.map((session) => {
                    const sessionDate = new Date(session.created_at);
                    const totalSymptoms = (session.selected_symptoms?.length || 0) + (session.custom_symptoms?.length || 0);
                    
                    return (
                      <tr key={session.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {sessionDate.toLocaleDateString()}
                          </div>
                          <div className="text-sm text-gray-500">
                            {sessionDate.toLocaleTimeString()}
                          </div>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getSeverityBadge(session.severity_level)}
                        </td>
                        
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            {session.primary_suspected_disease?.name || 'No specific condition'}
                          </div>
                          {(session.overall_risk_score || 0) > 0 && (
                            <div className="text-xs text-gray-500">
                              Score: {session.overall_risk_score}
                            </div>
                          )}
                        </td>
                        
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            {totalSymptoms} symptom{totalSymptoms !== 1 ? 's' : ''}
                          </div>
                          <div className="text-xs text-gray-500 max-w-xs truncate">
                            {session.selected_symptoms?.slice(0, 2).map(formatSymptomDisplay).join(', ')}
                            {session.selected_symptoms?.length > 2 && '...'}
                            {session.custom_symptoms?.length > 0 && 
                              (session.selected_symptoms?.length > 0 ? ', ' : '') + 
                              session.custom_symptoms.slice(0, 1).join(', ')
                            }
                            {session.custom_symptoms?.length > 1 && '...'}
                          </div>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="text-sm text-gray-900">
                              {session.overall_risk_score || 0}
                            </div>
                            {session.needs_followup && (
                              <Clock className="w-4 h-4 text-yellow-500 ml-2" title="Follow-up needed" />
                            )}
                          </div>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => viewSessionDetails(session.id)}
                            className="text-blue-600 hover:text-blue-900 inline-flex items-center gap-1 px-3 py-1 rounded hover:bg-blue-50 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        {filteredSessions.length > 0 && (
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Showing {filteredSessions.length} of {sessions.length} symptom checks
            </div>
            <button
              onClick={loadSessions}
              className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default SymptomHistoryPage;
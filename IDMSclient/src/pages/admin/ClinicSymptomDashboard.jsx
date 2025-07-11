import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import diagnosisService from '../../services/diagnosisService';
import { authAPI, healthcareAPI } from '../../services/api';
import { 
  Activity, 
  AlertTriangle, 
  Clock, 
  Users, 
  CheckCircle, 
  Eye, 
  Stethoscope,
  TrendingUp,
  Calendar,
  Search,
  Filter,
  FileText,
  UserCheck,
  AlertCircle,
  Heart,
  RefreshCw,
  X,
  User,
  Thermometer,
  ExternalLink
} from 'lucide-react';

const ClinicSymptomDashboard = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [diagnoses, setDiagnoses] = useState([]);
  const [filteredSessions, setFilteredSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('sessions');
  const [error, setError] = useState('');
  const [selectedDiagnosis, setSelectedDiagnosis] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  
  const [filters, setFilters] = useState({
    severity: 'all',
    status: 'all',
    timeframe: 'today',
    search: ''
  });

  const [stats, setStats] = useState({
    totalSessions: 0,
    criticalCases: 0,
    pendingReview: 0,
    todaySessions: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [sessions, filters]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const user = authAPI.getCurrentUser();
      
      console.log('Loading symptom dashboard data...');
      
      // Load symptom sessions - filter by clinic if user has assigned clinics
      try {
        const sessionsResponse = await diagnosisService.sessions.list();
        console.log('Sessions response:', sessionsResponse);
        const allSessions = sessionsResponse.data.results || sessionsResponse.data || [];
        setSessions(Array.isArray(allSessions) ? allSessions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)) : []);
      } catch (sessionError) {
        console.warn('Failed to load sessions:', sessionError);
        setSessions([]);
      }
      
      // Load diagnoses for medical staff
      try {
        const diagnosesResponse = await diagnosisService.diagnoses.list();
        console.log('Diagnoses response:', diagnosesResponse);
        const allDiagnoses = diagnosesResponse.data.results || diagnosesResponse.data || [];
        
        // Filter based on user's clinic assignments if applicable
        const userClinics = user.clinics || [];
        let filteredDiagnoses = allDiagnoses;
        
        if (userClinics.length > 0 && user.role?.name !== 'Admin') {
          filteredDiagnoses = allDiagnoses.filter(d => 
            !d.treating_doctor || d.treating_doctor.id === user.id || userClinics.some(c => c.id === d.clinic_id)
          );
        }
        
        setDiagnoses(Array.isArray(filteredDiagnoses) ? filteredDiagnoses.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)) : []);
      } catch (diagnosisError) {
        console.warn('Failed to load diagnoses:', diagnosisError);
        setDiagnoses([]);
      }
      
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Error loading symptom data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats after both sessions and diagnoses are loaded
  useEffect(() => {
    if (sessions.length >= 0 && diagnoses.length >= 0) {
      calculateStats(sessions, diagnoses);
    }
  }, [sessions, diagnoses]);

  const calculateStats = (sessions, diagnoses) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todaySessions = sessions.filter(s => new Date(s.created_at) >= today).length;
    const criticalCases = sessions.filter(s => s.severity_level === 'critical').length;
    const pendingReview = diagnoses.filter(d => d.status === 'self_reported').length;
    
    setStats({
      totalSessions: sessions.length,
      criticalCases,
      pendingReview,
      todaySessions
    });
  };

  const applyFilters = () => {
    let filtered = [...sessions];

    // Severity filter
    if (filters.severity !== 'all') {
      filtered = filtered.filter(session => session.severity_level === filters.severity);
    }

    // Timeframe filter
    if (filters.timeframe !== 'all') {
      const now = new Date();
      let filterDate = null;
      
      switch (filters.timeframe) {
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

    // Search filter
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
        session.user?.email?.toLowerCase().includes(searchTerm)
      );
    }

    // Sort by severity and date
    filtered.sort((a, b) => {
      const severityOrder = { critical: 4, severe: 3, moderate: 2, mild: 1 };
      const severityA = severityOrder[a.severity_level] || 1;
      const severityB = severityOrder[b.severity_level] || 1;
      
      if (severityA !== severityB) {
        return severityB - severityA; // Higher severity first
      }
      
      return new Date(b.created_at) - new Date(a.created_at); // Newer first
    });

    setFilteredSessions(filtered);
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case 'severe':
        return <AlertCircle className="w-5 h-5 text-orange-600" />;
      case 'moderate':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'mild':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      default:
        return <Activity className="w-5 h-5 text-gray-600" />;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'severe':
        return 'bg-orange-50 border-orange-200 text-orange-800';
      case 'moderate':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'mild':
        return 'bg-green-50 border-green-200 text-green-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
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
      'severe': { text: 'Severe', color: 'bg-orange-100 text-orange-800 border-orange-200', icon: AlertCircle },
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

  const viewSessionDetails = (sessionId) => {
    // Fixed: Use the correct route path
    navigate(`/doctor/clinic-session-review/${sessionId}`);
  };

  const viewDiagnosisDetails = (diagnosis) => {
    setSelectedDiagnosis(diagnosis);
    setShowDetailModal(true);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading symptom dashboard...</p>
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
            <h1 className="text-2xl font-bold text-gray-900">Symptom Monitoring Dashboard</h1>
            <p className="text-gray-600">Monitor and review patient symptom assessments</p>
          </div>
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Today's Sessions</p>
                <p className="text-2xl font-bold text-blue-600">{stats.todaySessions}</p>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Sessions</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalSessions}</p>
              </div>
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                <Activity className="w-5 h-5 text-gray-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Critical Cases</p>
                <p className="text-2xl font-bold text-red-600">{stats.criticalCases}</p>
              </div>
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Review</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pendingReview}</p>
              </div>
              <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('sessions')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'sessions'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Symptom Sessions ({filteredSessions.length})
                </div>
              </button>
              <button
                onClick={() => setActiveTab('diagnoses')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'diagnoses'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Stethoscope className="w-4 h-4" />
                  Diagnoses ({diagnoses.length})
                </div>
              </button>
            </nav>
          </div>

          <div className="p-6">
            {/* Filters */}
            <div className="flex items-center gap-2 mb-6">
              <Filter className="w-5 h-5 text-gray-600" />
              <h3 className="font-medium text-gray-900">Filters</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
                <select
                  value={filters.severity}
                  onChange={(e) => setFilters({...filters, severity: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Severities</option>
                  <option value="critical">Critical</option>
                  <option value="severe">Severe</option>
                  <option value="moderate">Moderate</option>
                  <option value="mild">Mild</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Timeframe</label>
                <select
                  value={filters.timeframe}
                  onChange={(e) => setFilters({...filters, timeframe: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="today">Today</option>
                  <option value="week">Last Week</option>
                  <option value="month">Last Month</option>
                  <option value="all">All Time</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search patients, conditions, symptoms..."
                    value={filters.search}
                    onChange={(e) => setFilters({...filters, search: e.target.value})}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Content based on active tab */}
            {activeTab === 'sessions' && (
              <div className="space-y-4">
                {filteredSessions.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Symptom Sessions</h3>
                    <p className="text-gray-600">
                      {sessions.length === 0 ? 'No sessions available.' : 'No sessions match your current filters.'}
                    </p>
                  </div>
                ) : (
                  filteredSessions.map((session) => (
                    <div key={session.id} className={`border rounded-lg p-4 ${getSeverityColor(session.severity_level)}`}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0">
                            {getSeverityIcon(session.severity_level)}
                          </div>
                          <div>
                            <h3 className="font-semibold">
                              Session #{session.id}
                              {session.user && (
                                <span className="ml-2 text-sm font-normal">
                                  by {session.user.email}
                                </span>
                              )}
                            </h3>
                            <p className="text-sm opacity-90">
                              {new Date(session.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-white bg-opacity-50">
                            {session.severity_level?.replace(/^\w/, c => c.toUpperCase()) || 'Mild'}
                          </span>
                          <button
                            onClick={() => viewSessionDetails(session.id)}
                            className="text-current hover:opacity-75 p-1"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4 mb-3">
                        <div>
                          <h4 className="text-sm font-medium mb-1">Primary Condition</h4>
                          <p className="text-sm opacity-90">
                            {session.primary_suspected_disease?.name || 'No specific condition identified'}
                          </p>
                          {session.overall_risk_score > 0 && (
                            <p className="text-xs opacity-75 mt-1">
                              Risk Score: {session.overall_risk_score}
                            </p>
                          )}
                        </div>
                        
                        <div>
                          <h4 className="text-sm font-medium mb-1">Patient Context</h4>
                          <div className="flex gap-4 text-sm opacity-90">
                            {session.age_range && (
                              <span>Age: {session.age_range}</span>
                            )}
                            {session.temperature && (
                              <span>Temp: {session.temperature}°F</span>
                            )}
                            {session.heart_rate && (
                              <span>HR: {session.heart_rate}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-medium mb-1">Symptoms</h4>
                        <div className="flex flex-wrap gap-1">
                          {session.selected_symptoms?.slice(0, 4).map((symptom, index) => (
                            <span
                              key={index}
                              className="text-xs px-2 py-1 bg-white bg-opacity-50 rounded-full"
                            >
                              {formatSymptomDisplay(symptom)}
                            </span>
                          ))}
                          {session.selected_symptoms?.length > 4 && (
                            <span className="text-xs px-2 py-1 bg-white bg-opacity-50 rounded-full">
                              +{session.selected_symptoms.length - 4} more
                            </span>
                          )}
                        </div>
                        
                        <div className="mt-2">
                          <p className="text-sm font-medium">Recommendation:</p>
                          <p className="text-sm opacity-90">{session.recommendation}</p>
                        </div>
                      </div>

                      {session.needs_followup && (
                        <div className="mt-3 pt-3 border-t border-current border-opacity-20">
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="w-4 h-4" />
                            <span className="font-medium">Follow-up needed</span>
                            {session.followup_date && (
                              <span>by {new Date(session.followup_date).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'diagnoses' && (
              <div className="space-y-4">
                {diagnoses.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <Stethoscope className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Diagnoses</h3>
                    <p className="text-gray-600">No diagnosis records found.</p>
                  </div>
                ) : (
                  diagnoses.filter(d => {
                    if (filters.status === 'all') return true;
                    return d.status === filters.status;
                  }).map((diagnosis) => (
                    <div key={diagnosis.id} className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <Stethoscope className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {diagnosis.disease?.name || 'Unknown Condition'}
                            </h3>
                            <p className="text-sm text-gray-500">
                              Patient: {diagnosis.patient?.email || 'Unknown'}
                            </p>
                            <p className="text-sm text-gray-500">
                              {new Date(diagnosis.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            diagnosis.status === 'doctor_confirmed' ? 'bg-green-100 text-green-800' :
                            diagnosis.status === 'doctor_rejected' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {diagnosis.status.replace('_', ' ').replace(/^\w/, c => c.toUpperCase())}
                          </span>
                          <button
                            onClick={() => viewDiagnosisDetails(diagnosis)}
                            className="text-blue-600 hover:text-blue-800 p-1"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4 mb-3">
                        <div>
                          <h4 className="text-sm font-medium mb-1">Symptoms</h4>
                          <p className="text-sm text-gray-600">
                            {getSymptomsSummary(diagnosis.symptoms)}
                          </p>
                        </div>
                        
                        <div>
                          <h4 className="text-sm font-medium mb-1">Vitals</h4>
                          <p className="text-sm text-gray-600">
                            {getVitalsSummary(diagnosis)}
                          </p>
                        </div>
                      </div>

                      {diagnosis.doctor_notes && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-md">
                          <h4 className="text-sm font-medium text-gray-700 mb-1">Doctor's Notes</h4>
                          <p className="text-sm text-gray-600">{diagnosis.doctor_notes}</p>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Diagnosis Detail Modal */}
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

                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">Patient Information</h3>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-600" />
                      <span className="text-gray-900">
                        {selectedDiagnosis.patient?.email || selectedDiagnosis.patient?.first_name + ' ' + selectedDiagnosis.patient?.last_name || 'Unknown Patient'}
                      </span>
                    </div>
                    {selectedDiagnosis.patient?.phone && (
                      <p className="text-sm text-gray-600 mt-1">
                        Phone: {selectedDiagnosis.patient.phone}
                      </p>
                    )}
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

                  {selectedDiagnosis.confidence_score && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">Confidence Score</h3>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${selectedDiagnosis.confidence_score}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-gray-900">{selectedDiagnosis.confidence_score}%</span>
                      </div>
                    </div>
                  )}
                  
                  {selectedDiagnosis.session && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">Related Session</h3>
                      <button
                        onClick={() => {
                          setShowDetailModal(false);
                          viewSessionDetails(selectedDiagnosis.session.id || selectedDiagnosis.session);
                        }}
                        className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 underline"
                      >
                        <ExternalLink className="w-4 h-4" />
                        View Original Symptom Session
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

              {selectedDiagnosis.treatment_plan && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">Treatment Plan</h3>
                  <div className="bg-blue-50 rounded-lg p-4">
                    <p className="text-gray-900 whitespace-pre-wrap">{selectedDiagnosis.treatment_plan}</p>
                  </div>
                </div>
              )}

              {selectedDiagnosis.follow_up_instructions && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">Follow-up Instructions</h3>
                  <div className="bg-yellow-50 rounded-lg p-4">
                    <p className="text-gray-900 whitespace-pre-wrap">{selectedDiagnosis.follow_up_instructions}</p>
                  </div>
                </div>
              )}
              
              <div className="flex justify-between mt-6 pt-6 border-t border-gray-200">
                <div className="flex gap-3">
                  {selectedDiagnosis.status === 'self_reported' && (
                    <>
                      <button
                        onClick={() => {
                          // Handle confirm diagnosis
                          console.log('Confirming diagnosis:', selectedDiagnosis.id);
                          // You can add the confirm logic here
                        }}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                      >
                        Confirm Diagnosis
                      </button>
                      <button
                        onClick={() => {
                          // Handle reject diagnosis
                          console.log('Rejecting diagnosis:', selectedDiagnosis.id);
                          // You can add the reject logic here
                        }}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                      >
                        Reject Diagnosis
                      </button>
                    </>
                  )}
                </div>
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

export default ClinicSymptomDashboard;
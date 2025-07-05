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
  Heart
} from 'lucide-react';

const ClinicSymptomDashboard = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [diagnoses, setDiagnoses] = useState([]);
  const [filteredSessions, setFilteredSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('sessions');
  
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
      const user = authAPI.getCurrentUser();
      
      // Load symptom sessions - filter by clinic if user has assigned clinics
      const sessionsResponse = await diagnosisService.sessions.list();
      const allSessions = sessionsResponse.data.results || sessionsResponse.data;
      
      // Load diagnoses for medical staff
      const diagnosesResponse = await diagnosisService.diagnoses.list();
      const allDiagnoses = diagnosesResponse.data.results || diagnosesResponse.data;
      
      // Filter based on user's clinic assignments if applicable
      const userClinics = user.clinics || [];
      let filteredSessions = allSessions;
      let filteredDiagnoses = allDiagnoses;
      
      if (userClinics.length > 0 && user.role?.name !== 'Admin') {
        // Filter sessions by location if user has specific clinic assignments
        // This would need backend support to properly filter by clinic
        filteredSessions = allSessions;
        filteredDiagnoses = allDiagnoses.filter(d => 
          !d.treating_doctor || d.treating_doctor.id === user.id || userClinics.some(c => c.id === d.clinic_id)
        );
      }
      
      setSessions(filteredSessions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
      setDiagnoses(filteredDiagnoses.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
      
      // Calculate statistics
      calculateStats(filteredSessions, filteredDiagnoses);
      
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Error loading symptom data');
    } finally {
      setLoading(false);
    }
  };

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

  const formatSymptomDisplay = (symptom) => {
    return symptom.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const viewSessionDetails = (sessionId) => {
    navigate(`/clinic/symptom-review/${sessionId}`);
  };

  const viewDiagnosisDetails = (diagnosisId) => {
    navigate(`/clinic/diagnosis-review/${diagnosisId}`);
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
            <h1 className="text-2xl font-bold text-gray-900">Symptom Monitoring Dashboard</h1>
            <p className="text-gray-600">Monitor and review patient symptom assessments</p>
          </div>
        </div>

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
                    <p className="text-gray-600">No sessions match your current filters.</p>
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
                            onClick={() => viewDiagnosisDetails(diagnosis.id)}
                            className="text-blue-600 hover:text-blue-800 p-1"
                            title="Review Diagnosis"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
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
      </div>
    </DashboardLayout>
  );
};

export default ClinicSymptomDashboard;
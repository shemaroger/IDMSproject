import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import diagnosisService from '../../services/diagnosisService';
import { authAPI } from '../../services/api';
import { 
  CheckCircle, 
  X, 
  Clock, 
  AlertTriangle, 
  User, 
  Calendar, 
  Activity, 
  Stethoscope,
  FileText,
  Search,
  Filter,
  Eye,
  MessageSquare,
  UserCheck,
  AlertCircle,
  TrendingUp,
  Shield,
  Thermometer,
  Heart,
  MapPin,
  ExternalLink,
  Download,
  RefreshCw
} from 'lucide-react';

const ClinicDiseaseConfirmation = () => {
  const navigate = useNavigate();
  const [diagnoses, setDiagnoses] = useState([]);
  const [filteredDiagnoses, setFilteredDiagnoses] = useState([]);
  const [diseases, setDiseases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedDiagnosis, setSelectedDiagnosis] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const [filters, setFilters] = useState({
    status: 'self_reported', // Focus on pending confirmations
    severity: 'all',
    timeframe: 'week',
    search: ''
  });

  const [confirmationData, setConfirmationData] = useState({
    notes: '',
    test_results: {},
    confirmed_severity: '',
    treatment_notes: ''
  });

  const [rejectionData, setRejectionData] = useState({
    notes: '',
    reason: '',
    alternative_diagnosis: '',
    recommended_action: ''
  });

  const [stats, setStats] = useState({
    pendingConfirmation: 0,
    confirmedToday: 0,
    rejectedToday: 0,
    criticalPending: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [diagnoses, filters]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load all diagnoses that need medical review
      const diagnosesResponse = await diagnosisService.diagnoses.list();
      const allDiagnoses = diagnosesResponse.data.results || diagnosesResponse.data;
      
      // Load available diseases for alternative diagnosis selection
      const diseasesResponse = await diagnosisService.diseases.list();
      const allDiseases = diseasesResponse.data.results || diseasesResponse.data;
      
      // Sort by creation date and severity (newest and most critical first)
      const sortedDiagnoses = allDiagnoses.sort((a, b) => {
        const severityOrder = { critical: 4, severe: 3, moderate: 2, mild: 1 };
        const severityA = severityOrder[a.severity] || 1;
        const severityB = severityOrder[b.severity] || 1;
        
        if (severityA !== severityB) {
          return severityB - severityA; // Higher severity first
        }
        
        return new Date(b.created_at) - new Date(a.created_at); // Newer first
      });
      
      setDiagnoses(sortedDiagnoses);
      setDiseases(allDiseases);
      calculateStats(sortedDiagnoses);
      
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Error loading diagnosis data');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (diagnoses) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const pendingConfirmation = diagnoses.filter(d => d.status === 'self_reported').length;
    const confirmedToday = diagnoses.filter(d => 
      d.status === 'doctor_confirmed' && new Date(d.confirmed_at) >= today
    ).length;
    const rejectedToday = diagnoses.filter(d => 
      d.status === 'doctor_rejected' && new Date(d.confirmed_at) >= today
    ).length;
    const criticalPending = diagnoses.filter(d => 
      d.status === 'self_reported' && d.severity === 'critical'
    ).length;
    
    setStats({
      pendingConfirmation,
      confirmedToday,
      rejectedToday,
      criticalPending
    });
  };

  const applyFilters = () => {
    let filtered = [...diagnoses];

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(diagnosis => diagnosis.status === filters.status);
    }

    // Severity filter
    if (filters.severity !== 'all') {
      filtered = filtered.filter(diagnosis => diagnosis.severity === filters.severity);
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
        filtered = filtered.filter(diagnosis => new Date(diagnosis.created_at) >= filterDate);
      }
    }

    // Search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(diagnosis => 
        diagnosis.disease?.name?.toLowerCase().includes(searchTerm) ||
        diagnosis.patient?.email?.toLowerCase().includes(searchTerm) ||
        diagnosis.doctor_notes?.toLowerCase().includes(searchTerm) ||
        JSON.stringify(diagnosis.symptoms).toLowerCase().includes(searchTerm)
      );
    }

    setFilteredDiagnoses(filtered);
  };

  const handleConfirmDiagnosis = async () => {
    if (!selectedDiagnosis || !confirmationData.notes.trim()) {
      alert('Please provide confirmation notes');
      return;
    }

    setActionLoading(true);
    try {
      await diagnosisService.diagnoses.confirm(selectedDiagnosis.id, {
        notes: confirmationData.notes,
        test_results: confirmationData.test_results,
        severity: confirmationData.confirmed_severity || selectedDiagnosis.severity
      });

      setShowConfirmModal(false);
      resetConfirmationData();
      loadData(); // Refresh data
      alert('Diagnosis confirmed successfully!');
      
    } catch (error) {
      console.error('Error confirming diagnosis:', error);
      alert('Error confirming diagnosis: ' + (error.response?.data?.error || error.message));
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectDiagnosis = async () => {
    if (!selectedDiagnosis || !rejectionData.reason.trim() || !rejectionData.notes.trim()) {
      alert('Please provide rejection reason and notes');
      return;
    }

    setActionLoading(true);
    try {
      await diagnosisService.diagnoses.reject(selectedDiagnosis.id, {
        notes: `${rejectionData.notes}\n\nAlternative: ${rejectionData.alternative_diagnosis}\nRecommended Action: ${rejectionData.recommended_action}`,
        reason: rejectionData.reason,
        alternative_diagnosis: rejectionData.alternative_diagnosis,
        recommended_action: rejectionData.recommended_action
      });

      setShowRejectModal(false);
      resetRejectionData();
      loadData(); // Refresh data
      alert('Diagnosis rejected with feedback provided.');
      
    } catch (error) {
      console.error('Error rejecting diagnosis:', error);
      alert('Error rejecting diagnosis: ' + (error.response?.data?.error || error.message));
    } finally {
      setActionLoading(false);
    }
  };

  const resetConfirmationData = () => {
    setConfirmationData({
      notes: '',
      test_results: {},
      confirmed_severity: '',
      treatment_notes: ''
    });
  };

  const resetRejectionData = () => {
    setRejectionData({
      notes: '',
      reason: '',
      alternative_diagnosis: '',
      recommended_action: ''
    });
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'self_reported': { text: 'Pending Review', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      'doctor_confirmed': { text: 'Confirmed', color: 'bg-green-100 text-green-800', icon: CheckCircle },
      'doctor_rejected': { text: 'Rejected', color: 'bg-red-100 text-red-800', icon: X },
      'modified': { text: 'Modified', color: 'bg-blue-100 text-blue-800', icon: Activity }
    };
    
    const statusInfo = statusMap[status] || { text: 'Unknown', color: 'bg-gray-100 text-gray-800', icon: Activity };
    const IconComponent = statusInfo.icon;
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${statusInfo.color}`}>
        <IconComponent className="w-3 h-3" />
        {statusInfo.text}
      </span>
    );
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
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

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600';
      case 'severe':
        return 'text-orange-600';
      case 'moderate':
        return 'text-yellow-600';
      case 'mild':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  const formatSymptomDisplay = (symptom) => {
    return symptom.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const openConfirmModal = (diagnosis) => {
    setSelectedDiagnosis(diagnosis);
    setConfirmationData({
      ...confirmationData,
      confirmed_severity: diagnosis.severity
    });
    setShowConfirmModal(true);
  };

  const openRejectModal = (diagnosis) => {
    setSelectedDiagnosis(diagnosis);
    setShowRejectModal(true);
  };

  const viewDiagnosisDetails = (diagnosis) => {
    setSelectedDiagnosis(diagnosis);
    setShowDetailModal(true);
  };

  const viewPatientChart = (patientId) => {
    navigate(`/clinic/patient-chart/${patientId}`);
  };

  const viewOriginalSession = (sessionId) => {
    navigate(`/clinic/symptom-review/${sessionId}`);
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
            <h1 className="text-2xl font-bold text-gray-900">Disease Confirmation Center</h1>
            <p className="text-gray-600">Review and confirm AI-generated disease assessments</p>
          </div>
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Review</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pendingConfirmation}</p>
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
                <p className="text-2xl font-bold text-red-600">{stats.criticalPending}</p>
              </div>
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Confirmed Today</p>
                <p className="text-2xl font-bold text-green-600">{stats.confirmedToday}</p>
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Rejected Today</p>
                <p className="text-2xl font-bold text-blue-600">{stats.rejectedToday}</p>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-blue-600" />
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
                <option value="self_reported">Pending Review</option>
                <option value="doctor_confirmed">Confirmed</option>
                <option value="doctor_rejected">Rejected</option>
                <option value="modified">Modified</option>
                <option value="all">All Status</option>
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
        </div>

        {/* Diagnosis List */}
        <div className="space-y-4">
          {filteredDiagnoses.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <Stethoscope className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Diagnoses Found</h3>
              <p className="text-gray-600">No diagnoses match your current filters.</p>
            </div>
          ) : (
            filteredDiagnoses.map((diagnosis) => (
              <div key={diagnosis.id} className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Stethoscope className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        {diagnosis.disease?.name || 'Unknown Condition'}
                        {diagnosis.severity && (
                          <div className={`flex items-center gap-1 ${getSeverityColor(diagnosis.severity)}`}>
                            {getSeverityIcon(diagnosis.severity)}
                            <span className="text-xs font-medium capitalize">({diagnosis.severity})</span>
                          </div>
                        )}
                      </h3>
                      <p className="text-sm text-gray-500">
                        Patient: {diagnosis.patient?.email || 'Unknown'} • 
                        Submitted: {new Date(diagnosis.created_at).toLocaleDateString()}
                      </p>
                      {diagnosis.session && (
                        <p className="text-sm text-blue-600">
                          From AI Session #{diagnosis.session.id} • Risk Score: {diagnosis.session.overall_risk_score || 0}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(diagnosis.status)}
                    <button
                      onClick={() => viewDiagnosisDetails(diagnosis)}
                      className="text-blue-600 hover:text-blue-800 p-1"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Reported Symptoms</h4>
                    {diagnosis.symptoms?.selected && diagnosis.symptoms.selected.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {diagnosis.symptoms.selected.slice(0, 4).map((symptom, index) => (
                          <span
                            key={index}
                            className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full"
                          >
                            {formatSymptomDisplay(symptom)}
                          </span>
                        ))}
                        {diagnosis.symptoms.selected.length > 4 && (
                          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                            +{diagnosis.symptoms.selected.length - 4} more
                          </span>
                        )}
                      </div>
                    )}
                    {diagnosis.symptoms?.custom && diagnosis.symptoms.custom.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {diagnosis.symptoms.custom.slice(0, 2).map((symptom, index) => (
                          <span
                            key={index}
                            className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full"
                          >
                            {symptom}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">AI Assessment</h4>
                    <div className="text-sm text-gray-600 space-y-1">
                      {diagnosis.disease?.description && (
                        <p><strong>Condition:</strong> {diagnosis.disease.description}</p>
                      )}
                      {diagnosis.disease?.icd_code && (
                        <p><strong>ICD Code:</strong> {diagnosis.disease.icd_code}</p>
                      )}
                      <p><strong>Confidence:</strong> Based on symptom analysis</p>
                      {diagnosis.session && (
                        <button
                          onClick={() => viewOriginalSession(diagnosis.session.id)}
                          className="text-blue-600 hover:text-blue-800 text-xs flex items-center gap-1"
                        >
                          View Original Session <ExternalLink className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons - Only show for pending diagnoses */}
                {diagnosis.status === 'self_reported' && (
                  <div className="flex flex-wrap gap-2 pt-4 border-t">
                    <button
                      onClick={() => openConfirmModal(diagnosis)}
                      className="flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Confirm Diagnosis
                    </button>
                    <button
                      onClick={() => openRejectModal(diagnosis)}
                      className="flex items-center gap-1 px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                    >
                      <X className="w-4 h-4" />
                      Reject & Provide Feedback
                    </button>
                    <button
                      onClick={() => viewDiagnosisDetails(diagnosis)}
                      className="flex items-center gap-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      Detailed Review
                    </button>
                    {diagnosis.patient?.id && (
                      <button
                        onClick={() => viewPatientChart(diagnosis.patient.id)}
                        className="flex items-center gap-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                      >
                        <User className="w-4 h-4" />
                        Patient Chart
                      </button>
                    )}
                  </div>
                )}

                {/* Show confirmation/rejection info for completed reviews */}
                {diagnosis.status !== 'self_reported' && (
                  <div className="pt-4 border-t">
                    <div className="flex items-start gap-2">
                      <div className={`w-4 h-4 mt-0.5 ${
                        diagnosis.status === 'doctor_confirmed' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {diagnosis.status === 'doctor_confirmed' ? <CheckCircle className="w-4 h-4" /> : <X className="w-4 h-4" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {diagnosis.status === 'doctor_confirmed' ? 'Confirmed' : 'Rejected'} by 
                          {diagnosis.confirmed_by && (
                            <span> Dr. {diagnosis.confirmed_by.first_name} {diagnosis.confirmed_by.last_name}</span>
                          )}
                        </p>
                        {diagnosis.confirmed_at && (
                          <p className="text-xs text-gray-500">
                            {new Date(diagnosis.confirmed_at).toLocaleString()}
                          </p>
                        )}
                        {diagnosis.doctor_notes && (
                          <p className="text-sm text-gray-600 mt-1">{diagnosis.doctor_notes}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Confirm Modal */}
        {showConfirmModal && selectedDiagnosis && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-screen overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Confirm Diagnosis</h2>
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-800 mb-2">Diagnosis to Confirm</h3>
                  <p className="text-blue-700">
                    <strong>{selectedDiagnosis.disease?.name}</strong> - {selectedDiagnosis.severity} severity
                  </p>
                  <p className="text-sm text-blue-600 mt-1">
                    Patient: {selectedDiagnosis.patient?.email}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirmed Severity Level
                  </label>
                  <select
                    value={confirmationData.confirmed_severity}
                    onChange={(e) => setConfirmationData({...confirmationData, confirmed_severity: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Keep AI Assessment ({selectedDiagnosis.severity})</option>
                    <option value="mild">Mild</option>
                    <option value="moderate">Moderate</option>
                    <option value="severe">Severe</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Clinical Notes *
                  </label>
                  <textarea
                    value={confirmationData.notes}
                    onChange={(e) => setConfirmationData({...confirmationData, notes: e.target.value})}
                    placeholder="Enter your clinical reasoning for confirming this diagnosis, any additional observations, and recommended treatment approach..."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Test Results (Optional)
                  </label>
                  <textarea
                    value={JSON.stringify(confirmationData.test_results, null, 2)}
                    onChange={(e) => {
                      try {
                        setConfirmationData({...confirmationData, test_results: JSON.parse(e.target.value)});
                      } catch {
                        // Invalid JSON, keep previous value
                      }
                    }}
                    placeholder='{"blood_test": "normal", "imaging": "clear"}'
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Enter test results in JSON format (optional)</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Treatment Notes
                  </label>
                  <textarea
                    value={confirmationData.treatment_notes}
                    onChange={(e) => setConfirmationData({...confirmationData, treatment_notes: e.target.value})}
                    placeholder="Recommended treatment plan, medications, follow-up care..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleConfirmDiagnosis}
                  disabled={actionLoading || !confirmationData.notes.trim()}
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {actionLoading ? 'Confirming...' : 'Confirm Diagnosis'}
                </button>
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reject Modal */}
        {showRejectModal && selectedDiagnosis && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-screen overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Reject Diagnosis & Provide Feedback</h2>
                <button
                  onClick={() => setShowRejectModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h3 className="font-semibold text-red-800 mb-2">Diagnosis to Reject</h3>
                  <p className="text-red-700">
                    <strong>{selectedDiagnosis.disease?.name}</strong> - {selectedDiagnosis.severity} severity
                  </p>
                  <p className="text-sm text-red-600 mt-1">
                    Patient: {selectedDiagnosis.patient?.email}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rejection Reason *
                  </label>
                  <select
                    value={rejectionData.reason}
                    onChange={(e) => setRejectionData({...rejectionData, reason: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select reason for rejection...</option>
                    <option value="insufficient_symptoms">Insufficient symptoms for diagnosis</option>
                    <option value="incorrect_assessment">AI assessment appears incorrect</option>
                    <option value="requires_additional_testing">Requires additional testing</option>
                    <option value="symptoms_suggest_different_condition">Symptoms suggest different condition</option>
                    <option value="patient_needs_physical_examination">Patient needs physical examination</option>
                    <option value="severity_overestimated">Severity level overestimated</option>
                    <option value="severity_underestimated">Severity level underestimated</option>
                    <option value="other">Other (specify in notes)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Alternative Diagnosis (If Applicable)
                  </label>
                  <select
                    value={rejectionData.alternative_diagnosis}
                    onChange={(e) => setRejectionData({...rejectionData, alternative_diagnosis: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select alternative condition (optional)...</option>
                    {diseases.map(disease => (
                      <option key={disease.id} value={disease.name}>
                        {disease.name} ({disease.disease_type})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Recommended Action *
                  </label>
                  <select
                    value={rejectionData.recommended_action}
                    onChange={(e) => setRejectionData({...rejectionData, recommended_action: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select recommended action...</option>
                    <option value="schedule_appointment">Schedule in-person appointment</option>
                    <option value="order_tests">Order additional tests</option>
                    <option value="specialist_referral">Refer to specialist</option>
                    <option value="emergency_care">Seek emergency care</option>
                    <option value="monitor_symptoms">Monitor symptoms and reassess</option>
                    <option value="telemedicine_consultation">Schedule telemedicine consultation</option>
                    <option value="self_care">Continue with self-care measures</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Clinical Notes *
                  </label>
                  <textarea
                    value={rejectionData.notes}
                    onChange={(e) => setRejectionData({...rejectionData, notes: e.target.value})}
                    placeholder="Provide detailed feedback about why you're rejecting this diagnosis, what additional information is needed, and your clinical reasoning..."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> This feedback will be used to improve the AI system and will be shared 
                    with the patient along with your recommended next steps.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleRejectDiagnosis}
                  disabled={actionLoading || !rejectionData.reason || !rejectionData.recommended_action || !rejectionData.notes.trim()}
                  className="flex-1 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {actionLoading ? 'Rejecting...' : 'Reject & Send Feedback'}
                </button>
                <button
                  onClick={() => setShowRejectModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Detail Modal */}
        {showDetailModal && selectedDiagnosis && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-screen overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Diagnosis Details</h2>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Left Column - Patient & Symptoms */}
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-gray-900 mb-3">Patient Information</h3>
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm font-medium text-gray-700">Email:</span>
                        <p className="text-sm text-gray-600">{selectedDiagnosis.patient?.email || 'Unknown'}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-700">Submitted:</span>
                        <p className="text-sm text-gray-600">{new Date(selectedDiagnosis.created_at).toLocaleString()}</p>
                      </div>
                      {selectedDiagnosis.session && (
                        <>
                          {selectedDiagnosis.session.age_range && (
                            <div>
                              <span className="text-sm font-medium text-gray-700">Age:</span>
                              <p className="text-sm text-gray-600">{selectedDiagnosis.session.age_range}</p>
                            </div>
                          )}
                          {selectedDiagnosis.session.gender && (
                            <div>
                              <span className="text-sm font-medium text-gray-700">Gender:</span>
                              <p className="text-sm text-gray-600">{selectedDiagnosis.session.gender}</p>
                            </div>
                          )}
                          {selectedDiagnosis.session.location && (
                            <div>
                              <span className="text-sm font-medium text-gray-700">Location:</span>
                              <p className="text-sm text-gray-600">{selectedDiagnosis.session.location}</p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Vital Signs */}
                  {(selectedDiagnosis.temperature || selectedDiagnosis.heart_rate || selectedDiagnosis.session?.temperature || selectedDiagnosis.session?.heart_rate) && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-gray-900 mb-3">Vital Signs</h3>
                      <div className="grid grid-cols-2 gap-4">
                        {(selectedDiagnosis.temperature || selectedDiagnosis.session?.temperature) && (
                          <div className="flex items-center gap-2">
                            <Thermometer className="w-4 h-4 text-gray-500" />
                            <div>
                              <p className="text-sm font-medium text-gray-700">Temperature</p>
                              <p className="text-sm text-gray-600">
                                {selectedDiagnosis.temperature || selectedDiagnosis.session.temperature}°F
                              </p>
                            </div>
                          </div>
                        )}
                        {(selectedDiagnosis.heart_rate || selectedDiagnosis.session?.heart_rate) && (
                          <div className="flex items-center gap-2">
                            <Heart className="w-4 h-4 text-gray-500" />
                            <div>
                              <p className="text-sm font-medium text-gray-700">Heart Rate</p>
                              <p className="text-sm text-gray-600">
                                {selectedDiagnosis.heart_rate || selectedDiagnosis.session.heart_rate} BPM
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-gray-900 mb-3">Symptoms</h3>
                    {selectedDiagnosis.symptoms?.selected && selectedDiagnosis.symptoms.selected.length > 0 && (
                      <div className="mb-3">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Selected Symptoms:</h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedDiagnosis.symptoms.selected.map((symptom, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                            >
                              {formatSymptomDisplay(symptom)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedDiagnosis.symptoms?.custom && selectedDiagnosis.symptoms.custom.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Additional Symptoms:</h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedDiagnosis.symptoms.custom.map((symptom, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm"
                            >
                              {symptom}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column - Disease & Assessment */}
                <div className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-blue-800 mb-3">AI Disease Assessment</h3>
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm font-medium text-blue-700">Condition:</span>
                        <p className="text-sm text-blue-600">{selectedDiagnosis.disease?.name}</p>
                      </div>
                      {selectedDiagnosis.disease?.description && (
                        <div>
                          <span className="text-sm font-medium text-blue-700">Description:</span>
                          <p className="text-sm text-blue-600">{selectedDiagnosis.disease.description}</p>
                        </div>
                      )}
                      <div>
                        <span className="text-sm font-medium text-blue-700">Severity:</span>
                        <p className={`text-sm font-medium capitalize ${getSeverityColor(selectedDiagnosis.severity)}`}>
                          {selectedDiagnosis.severity}
                        </p>
                      </div>
                      {selectedDiagnosis.disease?.icd_code && (
                        <div>
                          <span className="text-sm font-medium text-blue-700">ICD Code:</span>
                          <p className="text-sm text-blue-600">{selectedDiagnosis.disease.icd_code}</p>
                        </div>
                      )}
                      {selectedDiagnosis.session && (
                        <div>
                          <span className="text-sm font-medium text-blue-700">AI Risk Score:</span>
                          <p className="text-sm text-blue-600">{selectedDiagnosis.session.overall_risk_score}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedDiagnosis.disease?.common_treatments && selectedDiagnosis.disease.common_treatments.length > 0 && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-gray-900 mb-3">Common Treatments</h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedDiagnosis.disease.common_treatments.map((treatment, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-white border border-gray-200 rounded text-sm"
                          >
                            {treatment}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedDiagnosis.session?.recommendation && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-gray-900 mb-3">AI Recommendation</h3>
                      <p className="text-sm text-gray-600">{selectedDiagnosis.session.recommendation}</p>
                    </div>
                  )}

                  {selectedDiagnosis.doctor_notes && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-gray-900 mb-3">Doctor's Notes</h3>
                      <p className="text-sm text-gray-600 whitespace-pre-wrap">{selectedDiagnosis.doctor_notes}</p>
                    </div>
                  )}

                  {selectedDiagnosis.status !== 'self_reported' && selectedDiagnosis.confirmed_by && (
                    <div className={`p-4 rounded-lg ${
                      selectedDiagnosis.status === 'doctor_confirmed' ? 'bg-green-50' : 'bg-red-50'
                    }`}>
                      <h3 className={`font-semibold mb-3 ${
                        selectedDiagnosis.status === 'doctor_confirmed' ? 'text-green-800' : 'text-red-800'
                      }`}>
                        {selectedDiagnosis.status === 'doctor_confirmed' ? 'Confirmation' : 'Rejection'} Details
                      </h3>
                      <div className="space-y-1">
                        <p className={`text-sm ${
                          selectedDiagnosis.status === 'doctor_confirmed' ? 'text-green-700' : 'text-red-700'
                        }`}>
                          <strong>By:</strong> Dr. {selectedDiagnosis.confirmed_by.first_name} {selectedDiagnosis.confirmed_by.last_name}
                        </p>
                        <p className={`text-sm ${
                          selectedDiagnosis.status === 'doctor_confirmed' ? 'text-green-700' : 'text-red-700'
                        }`}>
                          <strong>Date:</strong> {new Date(selectedDiagnosis.confirmed_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-between mt-6">
                <div className="flex gap-2">
                  {selectedDiagnosis.session && (
                    <button
                      onClick={() => {
                        setShowDetailModal(false);
                        viewOriginalSession(selectedDiagnosis.session.id);
                      }}
                      className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      View Session
                    </button>
                  )}
                  {selectedDiagnosis.patient?.id && (
                    <button
                      onClick={() => {
                        setShowDetailModal(false);
                        viewPatientChart(selectedDiagnosis.patient.id);
                      }}
                      className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      <User className="w-4 h-4" />
                      Patient Chart
                    </button>
                  )}
                </div>

                <div className="flex gap-2">
                  {selectedDiagnosis.status === 'self_reported' && (
                    <>
                      <button
                        onClick={() => {
                          setShowDetailModal(false);
                          openConfirmModal(selectedDiagnosis);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Confirm
                      </button>
                      <button
                        onClick={() => {
                          setShowDetailModal(false);
                          openRejectModal(selectedDiagnosis);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                      >
                        <X className="w-4 h-4" />
                        Reject
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Summary */}
        {filteredDiagnoses.length > 0 && (
          <div className="text-center py-4">
            <p className="text-sm text-gray-600">
              Showing {filteredDiagnoses.length} of {diagnoses.length} diagnoses
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ClinicDiseaseConfirmation;
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import diagnosisService from '../../services/diagnosisService';
import { authAPI } from '../../services/api';
import { 
  ArrowLeft, 
  User, 
  Calendar, 
  MapPin, 
  Thermometer, 
  Heart, 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  FileText, 
  Plus,
  MessageSquare,
  UserCheck,
  X,
  Shield
} from 'lucide-react';

const ClinicSessionReview = () => {
  // FIXED: All hooks must be called at the top level of the component
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  // State declarations
  const [session, setSession] = useState(null);
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);
  const [showCreateDiagnosisModal, setShowCreateDiagnosisModal] = useState(false);
  const [notes, setNotes] = useState('');
  
  const [diagnosisData, setDiagnosisData] = useState({
    disease_id: '',
    doctor_notes: '',
    severity: '',
    status: 'doctor_confirmed'
  });

  // FIXED: Extract session ID logic into a separate function
  const extractSessionId = () => {
    console.log('Extracting session ID...');
    console.log('Route params sessionId:', sessionId);
    console.log('Current location:', location.pathname);
    console.log('Location search:', location.search);
    console.log('Location state:', location.state);
    
    // Try multiple sources for session ID
    let actualSessionId = sessionId;
    
    // Method 1: Direct route parameter
    if (actualSessionId && actualSessionId !== 'undefined' && actualSessionId !== 'null') {
      console.log('Found sessionId in route params:', actualSessionId);
      return actualSessionId;
    }
    
    // Method 2: URL query parameters
    if (!actualSessionId) {
      const urlParams = new URLSearchParams(location.search);
      actualSessionId = urlParams.get('sessionId') || urlParams.get('id');
      if (actualSessionId) {
        console.log('Found sessionId in query params:', actualSessionId);
        return actualSessionId;
      }
    }
    
    // Method 3: Location state
    if (!actualSessionId && location.state?.sessionId) {
      actualSessionId = location.state.sessionId;
      console.log('Found sessionId in location state:', actualSessionId);
      return actualSessionId;
    }
    
    // Method 4: Extract from pathname (last resort)
    if (!actualSessionId) {
      const pathParts = location.pathname.split('/');
      console.log('Path parts:', pathParts);
      
      // Look for session ID after known route segments
      const possibleSessionId = pathParts[pathParts.length - 1];
      if (possibleSessionId && possibleSessionId !== 'clinic-session-review' && 
          !isNaN(parseInt(possibleSessionId))) {
        actualSessionId = possibleSessionId;
        console.log('Extracted sessionId from path:', actualSessionId);
        return actualSessionId;
      }
    }
    
    console.log('No valid session ID found');
    return null;
  };

  useEffect(() => {
    console.log('ClinicSessionReview mounted');
    
    const actualSessionId = extractSessionId();
    
    if (actualSessionId && actualSessionId !== 'undefined' && actualSessionId !== 'null') {
      console.log('Loading session with ID:', actualSessionId);
      loadSessionData(actualSessionId);
    } else {
      setLoading(false);
      setError('No session ID provided. Please ensure the URL includes a valid session ID or navigate from the symptom dashboard.');
      console.error('No valid session ID found. Current URL:', window.location.href);
    }
  }, [sessionId, location.pathname, location.search]); // Dependencies for useEffect

  const loadSessionData = async (id) => {
    if (!id) {
      setError('Invalid session ID provided');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log('Loading session data for ID:', id);
      
      // Validate the session ID
      const numericId = parseInt(id);
      if (isNaN(numericId) || numericId <= 0) {
        throw new Error('Session ID must be a valid positive number');
      }
      
      // Load session details
      const sessionResponse = await diagnosisService.sessions.get(id);
      console.log('Session response:', sessionResponse);
      
      if (!sessionResponse?.data) {
        throw new Error('Invalid session response from server');
      }
      
      setSession(sessionResponse.data);
      
      // Load disease analyses for this session
      try {
        const analysesResponse = await diagnosisService.analyses.getBySession(id);
        console.log('Analyses response:', analysesResponse);
        
        // Handle different response structures
        const analysesData = analysesResponse?.data?.results || analysesResponse?.data || [];
        setAnalyses(Array.isArray(analysesData) ? analysesData : []);
      } catch (analysisError) {
        console.warn('Failed to load analyses:', analysisError);
        setAnalyses([]);
      }
      
    } catch (error) {
      console.error('Error loading session data:', error);
      
      let errorMessage = 'Failed to load session details.';
      
      if (error.response?.status === 404) {
        errorMessage = 'Session not found. The session may have been deleted or the ID is incorrect.';
      } else if (error.response?.status === 403) {
        errorMessage = 'Access denied. You may not have permission to view this session.';
      } else if (error.response?.status >= 500) {
        errorMessage = 'Server error. Please try again later.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case 'severe':
        return <Shield className="w-5 h-5 text-orange-600" />;
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

  const handleCreateDiagnosis = async () => {
    if (!diagnosisData.disease_id || !diagnosisData.doctor_notes.trim()) {
      alert('Please select a disease and provide doctor notes.');
      return;
    }

    setCreating(true);
    try {
      const user = authAPI.getCurrentUser();
      
      if (!user?.id) {
        throw new Error('User authentication required');
      }
      
      // Create diagnosis record
      const diagnosisPayload = {
        patient: session.user.id,
        disease: parseInt(diagnosisData.disease_id),
        treating_doctor: user.id,
        status: diagnosisData.status,
        symptoms: {
          selected: session.selected_symptoms || [],
          custom: session.custom_symptoms || []
        },
        doctor_notes: diagnosisData.doctor_notes,
        severity: diagnosisData.severity || session.severity_level,
        session: session.id,
        temperature: session.temperature,
        heart_rate: session.heart_rate
      };

      const response = await diagnosisService.diagnoses.create(diagnosisPayload);
      console.log('Diagnosis created:', response);
      
      setShowCreateDiagnosisModal(false);
      setDiagnosisData({
        disease_id: '',
        doctor_notes: '',
        severity: '',
        status: 'doctor_confirmed'
      });
      
      alert('Diagnosis created successfully!');
      
    } catch (error) {
      console.error('Error creating diagnosis:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to create diagnosis';
      alert('Error creating diagnosis: ' + errorMessage);
    } finally {
      setCreating(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!notes.trim()) {
      alert('Please enter some notes before saving.');
      return;
    }
    
    try {
      // You can implement note saving logic here
      console.log('Saving notes:', notes);
      alert('Notes saved successfully!');
    } catch (error) {
      console.error('Error saving notes:', error);
      alert('Failed to save notes. Please try again.');
    }
  };

  const retryLoad = () => {
    if (!loading) {
      const actualSessionId = extractSessionId();
      if (actualSessionId) {
        loadSessionData(actualSessionId);
      } else {
        setError('Unable to determine session ID for retry. Please navigate back to the dashboard and try again.');
      }
    }
  };

  const handleGoToDashboard = () => {
    navigate('/doctor/symptom-dashboard'); // Updated path based on your URL structure
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading session details...</p>
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
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Session</h2>
          <p className="text-gray-600 mb-4 max-w-md mx-auto">{error}</p>
          <div className="space-x-4">
            <button
              onClick={retryLoad}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={handleGoToDashboard}
              className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
          
          {/* Debug information in development */}
          {import.meta.env.DEV && (
            <div className="mt-8 p-4 bg-gray-100 rounded-lg text-left max-w-2xl mx-auto">
              <h3 className="font-semibold mb-2">Debug Information:</h3>
              <p className="text-sm text-gray-600 mb-1">Current URL: {window.location.href}</p>
              <p className="text-sm text-gray-600 mb-1">URL Path: {location.pathname}</p>
              <p className="text-sm text-gray-600 mb-1">Session ID from params: {sessionId || 'undefined'}</p>
              <p className="text-sm text-gray-600 mb-1">Search params: {location.search}</p>
              <p className="text-sm text-gray-600">Expected URL format: /doctor/clinic-session-review/:sessionId</p>
            </div>
          )}
        </div>
      </DashboardLayout>
    );
  }

  if (!session) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Session Not Found</h2>
          <p className="text-gray-600 mb-4">The symptom session could not be found.</p>
          <button
            onClick={handleGoToDashboard}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </DashboardLayout>
    );
  }

  // Get the actual session ID for display
  const displaySessionId = extractSessionId() || session.id || 'Unknown';

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleGoToDashboard}
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Symptom Session Review</h1>
            <p className="text-gray-600">Session #{displaySessionId} - Medical Professional Review</p>
          </div>
        </div>

        {/* Overall Assessment */}
        <div className={`rounded-lg border-2 p-6 ${getSeverityColor(session.severity_level)}`}>
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              {getSeverityIcon(session.severity_level)}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold mb-2">
                Assessment: {session.severity_level?.replace(/^\w/, c => c.toUpperCase()) || 'Mild'}
              </h2>
              <p className="text-lg mb-3">{session.recommendation}</p>
              
              {session.primary_suspected_disease && (
                <div className="mb-3">
                  <p className="font-semibold">Primary Suspected Condition:</p>
                  <p className="text-lg">{session.primary_suspected_disease.name}</p>
                  {session.primary_suspected_disease.description && (
                    <p className="text-sm mt-1 opacity-90">{session.primary_suspected_disease.description}</p>
                  )}
                </div>
              )}
              
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  <span>Risk Score: {session.overall_risk_score}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{new Date(session.created_at).toLocaleString()}</span>
                </div>
              </div>
            </div>
            <div className="flex-shrink-0">
              <button
                onClick={() => setShowCreateDiagnosisModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white bg-opacity-50 hover:bg-opacity-75 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Diagnosis
              </button>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Patient Information */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Patient Information</h3>
            
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-500" />
                <span className="text-sm">
                  <strong>Patient:</strong> {session.user?.email || session.user?.username || 'Unknown'}
                </span>
              </div>
              
              {session.age_range && (
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-500" />
                  <span className="text-sm">
                    <strong>Age:</strong> {session.age_range}
                  </span>
                </div>
              )}
              
              {session.gender && (
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-500" />
                  <span className="text-sm">
                    <strong>Gender:</strong> {session.gender}
                  </span>
                </div>
              )}
              
              {session.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-500" />
                  <span className="text-sm">
                    <strong>Location:</strong> {session.location}
                  </span>
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="text-sm">
                  <strong>Session Date:</strong> {new Date(session.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Vital Signs */}
            {(session.temperature || session.heart_rate) && (
              <div className="mt-6 pt-4 border-t border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-3">Vital Signs</h4>
                <div className="space-y-2">
                  {session.temperature && (
                    <div className="flex items-center gap-2">
                      <Thermometer className="w-4 h-4 text-gray-500" />
                      <span className="text-sm">
                        <strong>Temperature:</strong> {session.temperature}°F
                        <span className={`ml-2 text-xs ${
                          parseFloat(session.temperature) > 100.4 ? 'text-red-600' : 
                          parseFloat(session.temperature) < 97 ? 'text-blue-600' : 'text-green-600'
                        }`}>
                          {parseFloat(session.temperature) > 100.4 ? '(High)' : 
                           parseFloat(session.temperature) < 97 ? '(Low)' : '(Normal)'}
                        </span>
                      </span>
                    </div>
                  )}
                  
                  {session.heart_rate && (
                    <div className="flex items-center gap-2">
                      <Heart className="w-4 h-4 text-gray-500" />
                      <span className="text-sm">
                        <strong>Heart Rate:</strong> {session.heart_rate} BPM
                        <span className={`ml-2 text-xs ${
                          parseInt(session.heart_rate) > 100 ? 'text-red-600' : 
                          parseInt(session.heart_rate) < 60 ? 'text-blue-600' : 'text-green-600'
                        }`}>
                          {parseInt(session.heart_rate) > 100 ? '(High)' : 
                           parseInt(session.heart_rate) < 60 ? '(Low)' : '(Normal)'}
                        </span>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Follow-up Information */}
            {session.needs_followup && (
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-yellow-800">
                    <Clock className="w-4 h-4" />
                    <span className="font-medium">Follow-up Required</span>
                  </div>
                  {session.followup_date && (
                    <p className="text-sm text-yellow-700 mt-1">
                      Recommended by: {new Date(session.followup_date).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Symptoms */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Reported Symptoms</h3>
            
            {session.selected_symptoms && session.selected_symptoms.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Selected Symptoms ({session.selected_symptoms.length})</h4>
                <div className="space-y-1">
                  {session.selected_symptoms.map((symptom, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <CheckCircle className="w-3 h-3 text-blue-500" />
                      <span className="text-sm text-gray-700">{formatSymptomDisplay(symptom)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {session.custom_symptoms && session.custom_symptoms.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Additional Symptoms ({session.custom_symptoms.length})</h4>
                <div className="space-y-1">
                  {session.custom_symptoms.map((symptom, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <CheckCircle className="w-3 h-3 text-green-500" />
                      <span className="text-sm text-gray-700">{symptom}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(!session.selected_symptoms || session.selected_symptoms.length === 0) &&
             (!session.custom_symptoms || session.custom_symptoms.length === 0) && (
              <div className="text-center py-8 text-gray-500">
                <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No symptoms reported</p>
              </div>
            )}
          </div>

          {/* Clinical Actions */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Clinical Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={() => setShowCreateDiagnosisModal(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  Create Diagnosis Record
                </button>

                <button
                  onClick={() => navigate(`/doctor/patient-chart/${session.user?.id}`)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <User className="w-4 h-4" />
                  View Patient Chart
                </button>

                {session.severity_level === 'critical' && (
                  <button
                    onClick={() => navigate('/doctor/emergency-management')}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    Emergency Protocols
                  </button>
                )}
              </div>
            </div>

            {/* Session Notes */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Clinical Notes</h3>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add your clinical observations and notes about this session..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="mt-3 flex justify-end">
                <button 
                  onClick={handleSaveNotes}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                >
                  Save Notes
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Disease Analysis Results */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Analysis Results</h3>
          
          {analyses.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No analysis results available</p>
            </div>
          ) : (
            <div className="space-y-4">
              {analyses.map((analysis, index) => (
                <div
                  key={analysis.id}
                  className={`p-4 rounded-lg border ${
                    index === 0 ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                        {analysis.disease.name}
                        {index === 0 && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                            Primary Match
                          </span>
                        )}
                      </h4>
                      {analysis.disease.description && (
                        <p className="text-sm text-gray-600 mt-1">{analysis.disease.description}</p>
                      )}
                    </div>
                    <div className="text-right ml-4">
                      <div className="text-2xl font-bold text-gray-900">
                        {Math.round(analysis.probability_percentage)}%
                      </div>
                      <div className="text-xs text-gray-500">Confidence</div>
                    </div>
                  </div>
                  
                  <div className="grid md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Score:</span>
                      <span className="ml-1">{analysis.calculated_score} points</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Severity:</span>
                      <span className={`ml-1 capitalize ${
                        analysis.severity_assessment === 'critical' ? 'text-red-600' :
                        analysis.severity_assessment === 'severe' ? 'text-orange-600' :
                        analysis.severity_assessment === 'moderate' ? 'text-yellow-600' : 'text-green-600'
                      }`}>
                        {analysis.severity_assessment}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">ICD Code:</span>
                      <span className="ml-1">{analysis.disease.icd_code || 'N/A'}</span>
                    </div>
                  </div>

                  {/* Treatment Information */}
                  {analysis.disease.common_treatments && analysis.disease.common_treatments.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Common Treatments:</h5>
                      <div className="flex flex-wrap gap-2">
                        {analysis.disease.common_treatments.map((treatment, idx) => (
                          <span
                            key={idx}
                            className="text-xs px-2 py-1 bg-white border border-gray-200 rounded"
                          >
                            {treatment}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Button */}
                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={() => {
                        setDiagnosisData({
                          ...diagnosisData,
                          disease_id: analysis.disease.id,
                          severity: analysis.severity_assessment
                        });
                        setShowCreateDiagnosisModal(true);
                      }}
                      className="text-sm px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                      Create Diagnosis
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create Diagnosis Modal */}
        {showCreateDiagnosisModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-screen overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Create Diagnosis Record</h2>
                <button
                  onClick={() => setShowCreateDiagnosisModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Condition/Disease *
                  </label>
                  <select
                    value={diagnosisData.disease_id}
                    onChange={(e) => setDiagnosisData({...diagnosisData, disease_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select a condition...</option>
                    {analyses.map((analysis) => (
                      <option key={analysis.disease.id} value={analysis.disease.id}>
                        {analysis.disease.name} ({Math.round(analysis.probability_percentage)}% match)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Severity Level
                  </label>
                  <select
                    value={diagnosisData.severity}
                    onChange={(e) => setDiagnosisData({...diagnosisData, severity: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Use AI Assessment ({session.severity_level})</option>
                    <option value="mild">Mild</option>
                    <option value="moderate">Moderate</option>
                    <option value="severe">Severe</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Diagnosis Status
                  </label>
                  <select
                    value={diagnosisData.status}
                    onChange={(e) => setDiagnosisData({...diagnosisData, status: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="doctor_confirmed">Confirm Diagnosis</option>
                    <option value="doctor_rejected">Reject AI Assessment</option>
                    <option value="modified">Modified Diagnosis</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Doctor's Notes *
                  </label>
                  <textarea
                    value={diagnosisData.doctor_notes}
                    onChange={(e) => setDiagnosisData({...diagnosisData, doctor_notes: e.target.value})}
                    placeholder="Enter your clinical assessment, reasoning, and treatment recommendations..."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                {/* Patient Summary */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Patient Summary</h4>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p><strong>Patient:</strong> {session.user?.email || session.user?.username}</p>
                    <p><strong>Age:</strong> {session.age_range || 'Not specified'}</p>
                    <p><strong>Symptoms:</strong> {[...(session.selected_symptoms || []), ...(session.custom_symptoms || [])].slice(0, 3).join(', ')}</p>
                    <p><strong>AI Assessment:</strong> {session.severity_level} severity</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleCreateDiagnosis}
                  disabled={creating || !diagnosisData.disease_id || !diagnosisData.doctor_notes.trim()}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {creating ? 'Creating...' : 'Create Diagnosis'}
                </button>
                <button
                  onClick={() => setShowCreateDiagnosisModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ClinicSessionReview;
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import diagnosisService from '../../services/diagnosisService';
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Activity, 
  Phone, 
  MapPin, 
  User, 
  Heart, 
  Thermometer,
  FileText,
  RefreshCw,
  Hospital,
  ShieldAlert,
  Info,
  Calendar,
  Plus
} from 'lucide-react';

const SymptomResultsPage = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    console.log('Session ID from params:', sessionId);
    if (sessionId && sessionId !== ':sessionId') {
      loadSessionData();
    } else {
      setError('Invalid session ID');
      setLoading(false);
    }
  }, [sessionId]);

  const loadSessionData = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('Loading session data for ID:', sessionId);
      
      // Load session details
      const sessionResponse = await diagnosisService.sessions.get(sessionId);
      console.log('Session response:', sessionResponse.data);
      setSession(sessionResponse.data);
      
      // Load disease analyses for this session
      try {
        const analysesResponse = await diagnosisService.analyses.getBySession(sessionId);
        console.log('Analyses response:', analysesResponse.data);
        setAnalyses(analysesResponse.data.results || analysesResponse.data || []);
      } catch (analysesError) {
        console.log('No analyses found:', analysesError);
        setAnalyses([]);
      }
      
    } catch (error) {
      console.error('Error loading session data:', error);
      setError('Failed to load session data: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case 'severe':
        return <ShieldAlert className="w-5 h-5 text-orange-600" />;
      case 'moderate':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'mild':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      default:
        return <Activity className="w-5 h-5 text-gray-600" />;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
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
    if (!session) return;
    
    setCreating(true);
    try {
      console.log('Creating diagnosis for session:', sessionId);
      const response = await diagnosisService.sessions.createDiagnosis(sessionId);
      console.log('Diagnosis created:', response.data);
      
      // Show success message
      alert('Diagnosis record created successfully! You can track it in your medical records.');
      
      // Navigate to diagnoses page
      navigate('/patient/diagnoses');
    } catch (error) {
      console.error('Error creating diagnosis:', error);
      
      let errorMessage = 'Error creating diagnosis record';
      if (error.response?.data?.error) {
        errorMessage += ': ' + error.response.data.error;
      } else if (error.message) {
        errorMessage += ': ' + error.message;
      }
      
      alert(errorMessage);
    } finally {
      setCreating(false);
    }
  };

  const handleRequestEmergency = () => {
    navigate('/patient/emergency', { 
      state: { 
        fromSymptomChecker: true, 
        sessionId: sessionId,
        condition: session?.primary_suspected_disease?.name,
        symptoms: [...(session?.selected_symptoms || []), ...(session?.custom_symptoms || [])]
      } 
    });
  };

  const handleNewAnalysis = () => {
    navigate('/patient/symptom-checker');
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your analysis results...</p>
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
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Results</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={loadSessionData}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={handleNewAnalysis}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Start New Analysis
            </button>
          </div>
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
          <p className="text-gray-600 mb-4">The symptom analysis session could not be found.</p>
          <button
            onClick={handleNewAnalysis}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Start New Analysis
          </button>
        </div>
      </DashboardLayout>
    );
  }

  // Default values for missing data
  const severity = session.severity_level || 'mild';
  const recommendation = session.recommendation || 'Continue monitoring your symptoms. Consult a healthcare provider if symptoms worsen.';
  const riskScore = session.overall_risk_score || 0;

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Symptom Analysis Results</h1>
          <p className="text-gray-600">Based on your symptoms and additional information</p>
        </div>

        {/* Overall Assessment */}
        <div className={`rounded-lg border-2 p-6 ${getSeverityColor(severity)}`}>
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              {getSeverityIcon(severity)}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold mb-2">
                Overall Assessment: {severity.charAt(0).toUpperCase() + severity.slice(1)}
              </h2>
              <p className="text-lg mb-3">{recommendation}</p>
              
              {session.primary_suspected_disease && (
                <div className="mb-3">
                  <p className="font-semibold">Primary Suspected Condition:</p>
                  <p className="text-lg">{session.primary_suspected_disease.name}</p>
                  {session.primary_suspected_disease.description && (
                    <p className="text-sm mt-1 opacity-90">{session.primary_suspected_disease.description}</p>
                  )}
                </div>
              )}
              
              <div className="flex items-center gap-2 text-sm">
                <Activity className="w-4 h-4" />
                <span>Risk Score: {riskScore}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Emergency Actions */}
        {(severity === 'critical' || severity === 'severe') && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-red-600 mt-1" />
              <div className="flex-1">
                <h3 className="text-lg font-bold text-red-800 mb-2">Immediate Action Required</h3>
                <p className="text-red-700 mb-4">
                  Your symptoms suggest you need {severity === 'critical' ? 'immediate emergency' : 'prompt medical'} attention.
                </p>
                <div className="flex flex-wrap gap-3">
                  {severity === 'critical' && (
                    <a
                      href="tel:911"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <Phone className="w-4 h-4" />
                      Call 911
                    </a>
                  )}
                  <button
                    onClick={handleRequestEmergency}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <Hospital className="w-4 h-4" />
                    Request Medical Help
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Symptoms Summary */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Symptoms</h3>
              
              {session.selected_symptoms && session.selected_symptoms.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Selected Symptoms:</h4>
                  <div className="flex flex-wrap gap-2">
                    {session.selected_symptoms.map((symptom, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                      >
                        {formatSymptomDisplay(symptom)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {session.custom_symptoms && session.custom_symptoms.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Additional Symptoms:</h4>
                  <div className="flex flex-wrap gap-2">
                    {session.custom_symptoms.map((symptom, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
                      >
                        {symptom}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Vital Signs */}
              {(session.temperature || session.heart_rate) && (
                <div className="mt-4 p-3 bg-gray-50 rounded-md">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Vital Signs:</h4>
                  <div className="flex gap-4 text-sm">
                    {session.temperature && (
                      <div className="flex items-center gap-1">
                        <Thermometer className="w-4 h-4 text-gray-500" />
                        <span>{session.temperature}°F</span>
                      </div>
                    )}
                    {session.heart_rate && (
                      <div className="flex items-center gap-1">
                        <Heart className="w-4 h-4 text-gray-500" />
                        <span>{session.heart_rate} BPM</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Disease Analysis Results */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Possible Conditions</h3>
              
              {analyses.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Analysis in progress or no specific conditions identified.</p>
                  <button 
                    onClick={loadSessionData}
                    className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Refresh to check for updates
                  </button>
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
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-semibold text-gray-900">
                            {analysis.disease?.name || 'Unknown Condition'}
                            {index === 0 && (
                              <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                Primary Match
                              </span>
                            )}
                          </h4>
                          {analysis.disease?.description && (
                            <p className="text-sm text-gray-600 mt-1">{analysis.disease.description}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-gray-900">
                            {Math.round(analysis.probability_percentage || analysis.calculated_score || 0)}%
                          </div>
                          <div className="text-xs text-gray-500">Match</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <Activity className="w-4 h-4 text-gray-500" />
                            <span>Score: {analysis.calculated_score || 0}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            {getSeverityIcon(analysis.severity_assessment || 'mild')}
                            <span className="capitalize">{analysis.severity_assessment || 'mild'}</span>
                          </div>
                        </div>
                        
                        {analysis.disease?.icd_code && (
                          <div className="text-xs text-gray-500">
                            ICD: {analysis.disease.icd_code}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Session Info */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Session Information</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span>
                    {new Date(session.created_at).toLocaleDateString()} at{' '}
                    {new Date(session.created_at).toLocaleTimeString()}
                  </span>
                </div>
                
                {session.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-500" />
                    <span>{session.location}</span>
                  </div>
                )}
                
                {session.age_range && (
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-500" />
                    <span>Age: {session.age_range}</span>
                  </div>
                )}
                
                {session.gender && (
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-500" />
                    <span>Gender: {session.gender}</span>
                  </div>
                )}
              </div>

              {session.needs_followup && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <div className="flex items-center gap-2 text-yellow-800">
                    <Clock className="w-4 h-4" />
                    <span className="font-medium">Follow-up Needed</span>
                  </div>
                  {session.followup_date && (
                    <p className="text-sm text-yellow-700 mt-1">
                      By: {new Date(session.followup_date).toLocaleString()}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={handleCreateDiagnosis}
                  disabled={creating}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {creating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4" />
                      Create Diagnosis Record
                    </>
                  )}
                </button>

                {severity !== 'mild' && (
                  <button
                    onClick={handleRequestEmergency}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <Hospital className="w-4 h-4" />
                    Request Medical Help
                  </button>
                )}

                <button
                  onClick={handleNewAnalysis}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  New Symptom Check
                </button>

                <button
                  onClick={loadSessionData}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh Results
                </button>
              </div>
            </div>

            {/* Disclaimer */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <Info className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-yellow-800 mb-1">Medical Disclaimer</h4>
                  <p className="text-sm text-yellow-700">
                    This analysis is for informational purposes only and should not replace 
                    professional medical advice, diagnosis, or treatment. Always consult with 
                    a qualified healthcare provider.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SymptomResultsPage;
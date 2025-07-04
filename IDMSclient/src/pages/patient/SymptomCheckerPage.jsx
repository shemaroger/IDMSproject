import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  X, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Heart, 
  Brain, 
  Lung, 
  Thermometer,
  Activity,
  Users,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Loader2
} from 'lucide-react';
import symptomCheckerService from '../services/symptomChecker';

const SymptomCheckerPage = () => {
  const [currentStep, setCurrentStep] = useState('welcome');
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [customSymptoms, setCustomSymptoms] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categorizedSymptoms, setCategorizedSymptoms] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userInfo, setUserInfo] = useState({
    ageRange: '',
    gender: '',
    location: ''
  });
  const [analysisResults, setAnalysisResults] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [showEmergencyWarning, setShowEmergencyWarning] = useState(false);

  // Initialize symptom checker
  useEffect(() => {
    const initializeChecker = async () => {
      try {
        setLoading(true);
        await symptomCheckerService.initialize();
        const symptoms = symptomCheckerService.getCategorizedSymptoms();
        setCategorizedSymptoms(symptoms);
        
        // Expand first few categories by default
        const initialExpanded = {};
        Object.keys(symptoms).slice(0, 3).forEach(category => {
          initialExpanded[category] = true;
        });
        setExpandedCategories(initialExpanded);
      } catch (error) {
        setError('Failed to initialize symptom checker. Please try again.');
        console.error('Initialization error:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeChecker();
  }, []);

  // Check for emergency symptoms
  useEffect(() => {
    const allSymptoms = [...selectedSymptoms, ...customSymptoms];
    const emergencyCheck = symptomCheckerService.detectEmergencySymptoms(allSymptoms);
    setShowEmergencyWarning(emergencyCheck.hasEmergencySymptoms);
  }, [selectedSymptoms, customSymptoms]);

  const handleStartAssessment = async () => {
    try {
      await symptomCheckerService.startSession(userInfo);
      setCurrentStep('symptoms');
    } catch (error) {
      setError('Failed to start assessment. Please try again.');
    }
  };

  const handleSymptomSelect = (symptom) => {
    const symptomValue = symptom.value || symptom;
    
    if (selectedSymptoms.includes(symptomValue)) {
      setSelectedSymptoms(selectedSymptoms.filter(s => s !== symptomValue));
      symptomCheckerService.removeSymptom(symptomValue);
    } else {
      setSelectedSymptoms([...selectedSymptoms, symptomValue]);
      symptomCheckerService.addSymptom(symptomValue);
    }
  };

  const handleCustomSymptomAdd = () => {
    if (searchTerm.trim() && !customSymptoms.includes(searchTerm.trim())) {
      const newSymptom = searchTerm.trim();
      setCustomSymptoms([...customSymptoms, newSymptom]);
      symptomCheckerService.addCustomSymptom(newSymptom);
      setSearchTerm('');
    }
  };

  const handleRemoveCustomSymptom = (symptom) => {
    setCustomSymptoms(customSymptoms.filter(s => s !== symptom));
  };

  const handleAnalyze = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Validate symptoms
      const validation = symptomCheckerService.validateSymptoms([...selectedSymptoms, ...customSymptoms]);
      if (!validation.isValid) {
        setError(validation.errors.join(', '));
        return;
      }

      const results = await symptomCheckerService.analyzeSymptoms();
      setAnalysisResults(results);
      setCurrentStep('results');
    } catch (error) {
      setError(error.message || 'Analysis failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartOver = () => {
    setCurrentStep('welcome');
    setSelectedSymptoms([]);
    setCustomSymptoms([]);
    setAnalysisResults(null);
    setError('');
    setShowEmergencyWarning(false);
    symptomCheckerService.clearSession();
  };

  const handleEmergencyRequest = async () => {
    try {
      const location = userInfo.location || 'Location not specified';
      await symptomCheckerService.requestEmergencyServices(location);
      alert('Emergency services have been notified. Help is on the way.');
    } catch (error) {
      alert('Failed to request emergency services. Please call emergency services directly.');
    }
  };

  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const formatSymptomDisplay = (symptom) => {
    return symptom.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getFilteredSymptoms = () => {
    if (!searchTerm) return categorizedSymptoms;
    
    const filtered = {};
    Object.entries(categorizedSymptoms).forEach(([category, symptoms]) => {
      const matchingSymptoms = symptoms.filter(symptom => 
        symptom.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        symptom.value.toLowerCase().includes(searchTerm.toLowerCase())
      );
      if (matchingSymptoms.length > 0) {
        filtered[category] = matchingSymptoms;
      }
    });
    return filtered;
  };

  const getCategoryIcon = (category) => {
    const icons = {
      'General': <Thermometer className="w-5 h-5" />,
      'Respiratory': <Lung className="w-5 h-5" />,
      'Neurological': <Brain className="w-5 h-5" />,
      'Gastrointestinal': <Activity className="w-5 h-5" />,
      'Muscular': <Heart className="w-5 h-5" />,
      'Skin': <Users className="w-5 h-5" />,
      'Other': <Plus className="w-5 h-5" />
    };
    return icons[category] || <Plus className="w-5 h-5" />;
  };

  const getRiskLevelColor = (level) => {
    const colors = {
      'Critical': 'text-red-600 bg-red-50',
      'High': 'text-orange-600 bg-orange-50',
      'Moderate': 'text-yellow-600 bg-yellow-50',
      'Low': 'text-green-600 bg-green-50',
      'Minimal': 'text-gray-600 bg-gray-50'
    };
    return colors[level] || colors.Minimal;
  };

  if (loading && currentStep === 'welcome') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Initializing symptom checker...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Emergency Warning Banner */}
      {showEmergencyWarning && (
        <div className="bg-red-600 text-white p-4 text-center">
          <div className="flex items-center justify-center space-x-2">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-semibold">Emergency symptoms detected!</span>
          </div>
          <p className="mt-2">Your symptoms may indicate a serious condition. Consider seeking immediate medical attention.</p>
          <button
            onClick={handleEmergencyRequest}
            className="mt-2 bg-white text-red-600 px-4 py-2 rounded-md font-semibold hover:bg-gray-100 transition-colors"
          >
            Request Emergency Services
          </button>
        </div>
      )}

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">AI Health Symptom Checker</h1>
          <p className="text-lg text-gray-600">Get instant health insights based on your symptoms</p>
        </div>

        {/* Progress Steps */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="flex items-center justify-center space-x-4">
            <div className={`flex items-center space-x-2 ${currentStep === 'welcome' ? 'text-blue-600' : currentStep === 'symptoms' || currentStep === 'results' ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold ${currentStep === 'welcome' ? 'bg-blue-600' : currentStep === 'symptoms' || currentStep === 'results' ? 'bg-green-600' : 'bg-gray-400'}`}>
                1
              </div>
              <span className="font-medium">Basic Info</span>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400" />
            <div className={`flex items-center space-x-2 ${currentStep === 'symptoms' ? 'text-blue-600' : currentStep === 'results' ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold ${currentStep === 'symptoms' ? 'bg-blue-600' : currentStep === 'results' ? 'bg-green-600' : 'bg-gray-400'}`}>
                2
              </div>
              <span className="font-medium">Select Symptoms</span>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400" />
            <div className={`flex items-center space-x-2 ${currentStep === 'results' ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold ${currentStep === 'results' ? 'bg-blue-600' : 'bg-gray-400'}`}>
                3
              </div>
              <span className="font-medium">Results</span>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="max-w-2xl mx-auto mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <span className="text-red-700">{error}</span>
            </div>
          </div>
        )}

        {/* Welcome Step */}
        {currentStep === 'welcome' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-xl shadow-lg p-8">
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Heart className="w-10 h-10 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to AI Health Assessment</h2>
                <p className="text-gray-600">Please provide some basic information to get started</p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Age Range</label>
                  <select
                    value={userInfo.ageRange}
                    onChange={(e) => setUserInfo({...userInfo, ageRange: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select age range</option>
                    <option value="0-12">0-12 years</option>
                    <option value="13-17">13-17 years</option>
                    <option value="18-25">18-25 years</option>
                    <option value="26-35">26-35 years</option>
                    <option value="36-50">36-50 years</option>
                    <option value="51-65">51-65 years</option>
                    <option value="65+">65+ years</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                  <select
                    value={userInfo.gender}
                    onChange={(e) => setUserInfo({...userInfo, gender: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select gender</option>
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                    <option value="O">Other</option>
                    <option value="U">Prefer not to say</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Location (Optional)</label>
                  <input
                    type="text"
                    value={userInfo.location}
                    onChange={(e) => setUserInfo({...userInfo, location: e.target.value})}
                    placeholder="Enter your location"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-1">Important Disclaimer</p>
                      <p>This tool is for informational purposes only and should not replace professional medical advice. Always consult with healthcare providers for medical concerns.</p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleStartAssessment}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <span>Start Health Assessment</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Symptoms Selection Step */}
        {currentStep === 'symptoms' && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-xl shadow-lg p-8">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Select Your Symptoms</h2>
                <p className="text-gray-600">Choose all symptoms you are currently experiencing</p>
              </div>

              {/* Search Bar */}
              <div className="mb-6">
                <div className="relative">
                  <Search className="w-5 h-5 text-gray-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search symptoms or add custom symptom..."
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {searchTerm && (
                    <button
                      onClick={handleCustomSymptomAdd}
                      className="absolute right-3 top-3 text-blue-600 hover:text-blue-700"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Selected Symptoms */}
              {(selectedSymptoms.length > 0 || customSymptoms.length > 0) && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Selected Symptoms ({selectedSymptoms.length + customSymptoms.length})</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedSymptoms.map((symptom) => (
                      <span
                        key={symptom}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                      >
                        {formatSymptomDisplay(symptom)}
                        <button
                          onClick={() => handleSymptomSelect(symptom)}
                          className="ml-2 text-blue-600 hover:text-blue-800"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </span>
                    ))}
                    {customSymptoms.map((symptom) => (
                      <span
                        key={symptom}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800"
                      >
                        {formatSymptomDisplay(symptom)}
                        <button
                          onClick={() => handleRemoveCustomSymptom(symptom)}
                          className="ml-2 text-green-600 hover:text-green-800"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Symptom Categories */}
              <div className="space-y-4 mb-8">
                {Object.entries(getFilteredSymptoms()).map(([category, symptoms]) => (
                  <div key={category} className="border border-gray-200 rounded-lg">
                    <button
                      onClick={() => toggleCategory(category)}
                      className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        {getCategoryIcon(category)}
                        <span className="text-lg font-medium text-gray-900">{category}</span>
                        <span className="text-sm text-gray-500">({symptoms.length} symptoms)</span>
                      </div>
                      {expandedCategories[category] ? 
                        <ChevronUp className="w-5 h-5 text-gray-400" /> : 
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      }
                    </button>
                    
                    {expandedCategories[category] && (
                      <div className="p-4 border-t border-gray-200 bg-gray-50">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                          {symptoms.map((symptom) => (
                            <button
                              key={symptom.value}
                              onClick={() => handleSymptomSelect(symptom)}
                              className={`p-3 text-left rounded-lg transition-all ${
                                selectedSymptoms.includes(symptom.value)
                                  ? 'bg-blue-100 text-blue-900 border-2 border-blue-300'
                                  : 'bg-white text-gray-700 border border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-medium">{symptom.label}</span>
                                {selectedSymptoms.includes(symptom.value) && (
                                  <CheckCircle className="w-4 h-4 text-blue-600" />
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between">
                <button
                  onClick={() => setCurrentStep('welcome')}
                  className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleAnalyze}
                  disabled={selectedSymptoms.length === 0 && customSymptoms.length === 0 || loading}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Analyzing...</span>
                    </>
                  ) : (
                    <>
                      <span>Analyze Symptoms</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Results Step */}
        {currentStep === 'results' && analysisResults && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-xl shadow-lg p-8">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Health Assessment Results</h2>
                <p className="text-gray-600">Based on your symptoms, here's what we found</p>
              </div>

              {/* Risk Assessment Summary */}
              <div className="mb-8">
                <div className="bg-gray-50 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Risk Assessment</h3>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRiskLevelColor(analysisResults.riskAssessment.level)}`}>
                      {analysisResults.riskAssessment.level} Risk
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{analysisResults.summary.overallRiskScore}</div>
                      <div className="text-sm text-gray-600">Risk Score</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{analysisResults.diseases.length}</div>
                      <div className="text-sm text-gray-600">Conditions Analyzed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">{selectedSymptoms.length + customSymptoms.length}</div>
                      <div className="text-sm text-gray-600">Symptoms Analyzed</div>
                    </div>
                  </div>

                  <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
                    <h4 className="font-semibold text-gray-900 mb-2">Immediate Recommendation</h4>
                    <p className="text-gray-700">{analysisResults.recommendations.immediate}</p>
                  </div>
                </div>
              </div>

              {/* Possible Conditions */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Possible Conditions</h3>
                <div className="space-y-4">
                  {analysisResults.diseases.slice(0, 5).map((disease) => (
                    <div key={disease.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-gray-900">{disease.name}</h4>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-600">{disease.probability}% match</span>
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${disease.probability}%` }}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span>Type: {disease.type}</span>
                        <span>Severity: {disease.severity}</span>
                        <span>Score: {disease.score}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Emergency Actions */}
              {analysisResults.summary.emergencyRecommended && (
                <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <h3 className="text-lg font-semibold text-red-900">Emergency Action Required</h3>
                  </div>
                  <p className="text-red-700 mb-4">Your symptoms suggest you need immediate medical attention.</p>
                  <div className="flex space-x-4">
                    <button
                      onClick={handleEmergencyRequest}
                      className="bg-red-600 text-white px-4 py-2 rounded-md font-semibold hover:bg-red-700 transition-colors"
                    >
                      Request Emergency Services
                    </button>
                    <button
                      onClick={() => window.open('tel:911', '_self')}
                      className="border border-red-600 text-red-600 px-4 py-2 rounded-md font-semibold hover:bg-red-50 transition-colors"
                    >
                      Call 911
                    </button>
                  </div>
                </div>
              )}

              {/* Prevention Tips */}
              {analysisResults.recommendations.preventionTips.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Prevention & Care Tips</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {analysisResults.recommendations.preventionTips.map((tip, index) => (
                      <div key={index} className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <h4 className="font-semibold text-green-900 mb-2">{tip.title}</h4>
                        <p className="text-green-700 text-sm">{tip.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-between">
                <button
                  onClick={handleStartOver}
                  className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Start New Assessment
                </button>
                <div className="flex space-x-4">
                  <button
                    onClick={() => window.print()}
                    className="px-6 py-3 border border-blue-600 text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
                  >
                    Save/Print Results
                  </button>
                  <button
                    onClick={() => {
                      // TODO: Implement booking appointment
                      alert('Redirecting to appointment booking...');
                    }}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                  >
                    Book Appointment
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SymptomCheckerPage;
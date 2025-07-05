import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import diagnosisService from '../../services/diagnosisService';
import { healthcareAPI, authAPI } from '../../services/api';
import { 
  Search, 
  Plus, 
  X, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Activity, 
  User, 
  MapPin, 
  Thermometer,
  Heart,
  Info,
  Loader2,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';

const SymptomCheckerPage = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [customSymptoms, setCustomSymptoms] = useState([]);
  const [symptomSearch, setSymptomSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  
  // Patient context data
  const [contextData, setContextData] = useState({
    location: '',
    age_range: '',
    gender: '',
    temperature: '',
    heart_rate: ''
  });

  const [newCustomSymptom, setNewCustomSymptom] = useState('');
  const [diseases, setDiseases] = useState([]);
  const [showEmergencyWarning, setShowEmergencyWarning] = useState(false);

  // Common symptoms grouped by category
  const symptomCategories = {
    'General': [
      'fever', 'fatigue', 'weakness', 'sweating', 'chills', 
      'loss_of_appetite', 'weight_loss', 'malaise'
    ],
    'Respiratory': [
      'cough', 'shortness_of_breath', 'chest_pain', 'rapid_breathing',
      'difficulty_breathing', 'wheezing', 'sore_throat'
    ],
    'Digestive': [
      'nausea', 'vomiting', 'diarrhea', 'abdominal_pain', 
      'stomach_pain', 'loss_of_appetite', 'bloating'
    ],
    'Neurological': [
      'headache', 'dizziness', 'confusion', 'seizures', 
      'memory_problems', 'difficulty_concentrating'
    ],
    'Muscular': [
      'muscle_aches', 'joint_pain', 'back_pain', 'stiffness',
      'muscle_weakness', 'cramps'
    ],
    'Cardiovascular': [
      'chest_pain', 'heart_palpitations', 'rapid_heartbeat',
      'slow_heartbeat', 'irregular_heartbeat'
    ],
    'Skin': [
      'rash', 'itching', 'redness', 'swelling', 'bruising',
      'pale_skin', 'blue_lips_or_fingernails'
    ],
    'Emergency Signs': [
      'severe_chest_pain', 'difficulty_breathing', 'blue_lips_or_fingernails',
      'seizures', 'loss_of_consciousness', 'severe_bleeding'
    ]
  };

  // Emergency symptoms that trigger warning
  const emergencySymptoms = [
    'difficulty_breathing', 'severe_chest_pain', 'seizures', 'confusion', 
    'blue_lips_or_fingernails', 'loss_of_consciousness', 'severe_bleeding'
  ];

  useEffect(() => {
    loadDiseases();
  }, []);

  // Check for emergency symptoms
  useEffect(() => {
    const allSymptoms = [...selectedSymptoms, ...customSymptoms];
    const hasEmergency = allSymptoms.some(symptom => 
      emergencySymptoms.includes(symptom.toLowerCase().replace(/\s+/g, '_'))
    );
    setShowEmergencyWarning(hasEmergency);
  }, [selectedSymptoms, customSymptoms]);

  const loadDiseases = async () => {
    try {
      const response = await diagnosisService.diseases.list();
      setDiseases(response.data.results || response.data);
    } catch (error) {
      console.error('Error loading diseases:', error);
    }
  };

  const handleSymptomToggle = (symptom) => {
    setSelectedSymptoms(prev => {
      if (prev.includes(symptom)) {
        return prev.filter(s => s !== symptom);
      } else {
        return [...prev, symptom];
      }
    });
  };

  const addCustomSymptom = () => {
    if (newCustomSymptom.trim() && !customSymptoms.includes(newCustomSymptom.trim())) {
      setCustomSymptoms(prev => [...prev, newCustomSymptom.trim()]);
      setNewCustomSymptom('');
    }
  };

  const removeCustomSymptom = (symptom) => {
    setCustomSymptoms(prev => prev.filter(s => s !== symptom));
  };

  const getFilteredSymptoms = (categorySymptoms) => {
    if (!symptomSearch) return categorySymptoms;
    return categorySymptoms.filter(symptom =>
      symptom.toLowerCase().includes(symptomSearch.toLowerCase()) ||
      symptom.replace('_', ' ').toLowerCase().includes(symptomSearch.toLowerCase())
    );
  };

  const formatSymptomDisplay = (symptom) => {
    return symptom.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const handleEmergencyRequest = async () => {
    try {
      alert('Emergency services have been notified. Please call 911 immediately or go to the nearest emergency room.');
    } catch (error) {
      alert('Failed to request emergency services. Please call 911 directly.');
    }
  };

  const handleAnalyzeSymptoms = async () => {
    if (selectedSymptoms.length === 0 && customSymptoms.length === 0) {
      setError('Please select at least one symptom before analyzing.');
      return;
    }

    setAnalyzing(true);
    setError('');
    
    try {
      // Validate data using the utility function
      const sessionData = {
        selected_symptoms: selectedSymptoms,
        custom_symptoms: customSymptoms,
        location: contextData.location,
        age_range: contextData.age_range,
        gender: contextData.gender,
        temperature: contextData.temperature ? parseFloat(contextData.temperature) : null,
        heart_rate: contextData.heart_rate ? parseInt(contextData.heart_rate) : null
      };

      // Validate the data before sending
      const validation = diagnosisService.utils.validateSessionData(sessionData);
      if (!validation.isValid) {
        setError(validation.errors.join(', '));
        return;
      }

      console.log('Creating symptom session with data:', sessionData);
      
      // Use the enhanced creation method
      const response = await diagnosisService.sessions.createWithAnalysis(sessionData);
      const sessionId = response.data.id;
      
      console.log('Session created:', response.data);
      
      // Navigate to results page
      navigate(`/patient/symptom-checker/results/${sessionId}`);
      
    } catch (error) {
      console.error('Error analyzing symptoms:', error);
      const errorMessage = diagnosisService.utils.formatError(error);
      setError(errorMessage);
    } finally {
      setAnalyzing(false);
    }
  };

  const getTotalSymptoms = () => {
    return selectedSymptoms.length + customSymptoms.length;
  };

  const renderStepIndicator = () => {
    const steps = [
      { number: 1, title: 'Select Symptoms', icon: Activity },
      { number: 2, title: 'Additional Info', icon: User },
      { number: 3, title: 'Review & Analyze', icon: CheckCircle }
    ];

    return (
      <div className="flex items-center justify-center mb-8">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = currentStep === step.number;
          const isCompleted = currentStep > step.number;
          
          return (
            <React.Fragment key={step.number}>
              <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                isActive 
                  ? 'border-blue-600 bg-blue-600 text-white' 
                  : isCompleted 
                    ? 'border-green-600 bg-green-600 text-white'
                    : 'border-gray-300 bg-white text-gray-500'
              }`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="ml-2 mr-4">
                <p className={`text-sm font-medium ${
                  isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
                }`}>
                  {step.title}
                </p>
              </div>
              {index < steps.length - 1 && (
                <div className={`w-8 h-px mx-2 ${
                  isCompleted ? 'bg-green-600' : 'bg-gray-300'
                }`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  const renderSymptomSelection = () => {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">What symptoms are you experiencing?</h2>
          <p className="text-gray-600">Select all symptoms that apply to you. Be as specific as possible.</p>
        </div>

        {/* Emergency Warning Banner */}
        {showEmergencyWarning && (
          <div className="bg-red-600 text-white p-4 rounded-lg">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-semibold">Emergency symptoms detected!</span>
            </div>
            <p className="text-center mb-3">Your symptoms may indicate a serious condition. Consider seeking immediate medical attention.</p>
            <div className="text-center">
              <button
                onClick={handleEmergencyRequest}
                className="bg-white text-red-600 px-4 py-2 rounded-md font-semibold hover:bg-gray-100 transition-colors mr-2"
              >
                Get Emergency Help
              </button>
              <button
                onClick={() => window.open('tel:911', '_self')}
                className="border border-white text-white px-4 py-2 rounded-md font-semibold hover:bg-red-700 transition-colors"
              >
                Call 911
              </button>
            </div>
          </div>
        )}

        {/* Emergency Warning */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-800">Emergency Warning</h3>
              <p className="text-red-700 text-sm">
                If you're experiencing severe chest pain, difficulty breathing, loss of consciousness, 
                or other life-threatening symptoms, call <strong>911</strong> immediately.
              </p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search symptoms..."
            value={symptomSearch}
            onChange={(e) => setSymptomSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Selected Symptoms Count */}
        {getTotalSymptoms() > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-blue-800 text-sm">
              <CheckCircle className="w-4 h-4 inline mr-1" />
              {getTotalSymptoms()} symptoms selected
            </p>
          </div>
        )}

        {/* Symptom Categories */}
        <div className="space-y-6">
          {Object.entries(symptomCategories).map(([category, symptoms]) => {
            const filteredSymptoms = getFilteredSymptoms(symptoms);
            if (filteredSymptoms.length === 0 && symptomSearch) return null;

            return (
              <div key={category} className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className={`font-semibold mb-3 ${
                  category === 'Emergency Signs' ? 'text-red-600' : 'text-gray-900'
                }`}>
                  {category}
                  {category === 'Emergency Signs' && (
                    <span className="ml-2 text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                      URGENT
                    </span>
                  )}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {filteredSymptoms.map((symptom) => (
                    <button
                      key={symptom}
                      onClick={() => handleSymptomToggle(symptom)}
                      className={`text-left p-3 rounded-md border transition-colors ${
                        selectedSymptoms.includes(symptom)
                          ? category === 'Emergency Signs'
                            ? 'border-red-500 bg-red-50 text-red-800'
                            : 'border-blue-500 bg-blue-50 text-blue-800'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm">{formatSymptomDisplay(symptom)}</span>
                        {selectedSymptoms.includes(symptom) && (
                          <CheckCircle className="w-4 h-4" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Custom Symptoms */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Add Custom Symptoms</h3>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              placeholder="Describe a symptom not listed above..."
              value={newCustomSymptom}
              onChange={(e) => setNewCustomSymptom(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addCustomSymptom()}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={addCustomSymptom}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          
          {customSymptoms.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Custom symptoms:</p>
              <div className="flex flex-wrap gap-2">
                {customSymptoms.map((symptom, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
                  >
                    {symptom}
                    <button
                      onClick={() => removeCustomSymptom(symptom)}
                      className="text-green-600 hover:text-green-800"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-end">
          <button
            onClick={() => setCurrentStep(2)}
            disabled={getTotalSymptoms() === 0}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            Continue to Additional Information
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  const renderAdditionalInfo = () => {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Additional Information</h2>
          <p className="text-gray-600">Help us provide better analysis by sharing additional context.</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <MapPin className="w-4 h-4 inline mr-1" />
                Location (Optional)
              </label>
              <input
                type="text"
                placeholder="Your current location"
                value={contextData.location}
                onChange={(e) => setContextData({...contextData, location: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Helps identify location-specific health risks</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <User className="w-4 h-4 inline mr-1" />
                Age Range
              </label>
              <select
                value={contextData.age_range}
                onChange={(e) => setContextData({...contextData, age_range: e.target.value})}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Gender
              </label>
              <select
                value={contextData.gender}
                onChange={(e) => setContextData({...contextData, gender: e.target.value})}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Thermometer className="w-4 h-4 inline mr-1" />
                Temperature (°F)
              </label>
              <input
                type="number"
                step="0.1"
                placeholder="e.g., 98.6"
                min="90"
                max="110"
                value={contextData.temperature}
                onChange={(e) => setContextData({...contextData, temperature: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Normal range: 97-99°F</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Heart className="w-4 h-4 inline mr-1" />
                Heart Rate (BPM)
              </label>
              <input
                type="number"
                placeholder="e.g., 72"
                min="30"
                max="220"
                value={contextData.heart_rate}
                onChange={(e) => setContextData({...contextData, heart_rate: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Normal range: 60-100 BPM</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <button
            onClick={() => setCurrentStep(1)}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Symptoms
          </button>
          <button
            onClick={() => setCurrentStep(3)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            Review & Analyze
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  const renderReviewAndAnalyze = () => {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Review Your Information</h2>
          <p className="text-gray-600">Please review your symptoms and information before analysis.</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <span className="text-red-700">{error}</span>
            </div>
          </div>
        )}

        {/* Selected Symptoms Review */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Selected Symptoms ({getTotalSymptoms()})</h3>
          
          {selectedSymptoms.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Common Symptoms:</h4>
              <div className="flex flex-wrap gap-2">
                {selectedSymptoms.map((symptom) => (
                  <span
                    key={symptom}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                  >
                    {formatSymptomDisplay(symptom)}
                    <button
                      onClick={() => handleSymptomToggle(symptom)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {customSymptoms.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Custom Symptoms:</h4>
              <div className="flex flex-wrap gap-2">
                {customSymptoms.map((symptom, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
                  >
                    {symptom}
                    <button
                      onClick={() => removeCustomSymptom(symptom)}
                      className="text-green-600 hover:text-green-800"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Additional Information Review */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Additional Information</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Location:</span>
              <span className="ml-2 text-gray-600">{contextData.location || 'Not specified'}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Age Range:</span>
              <span className="ml-2 text-gray-600">{contextData.age_range || 'Not specified'}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Gender:</span>
              <span className="ml-2 text-gray-600">{contextData.gender || 'Not specified'}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Temperature:</span>
              <span className="ml-2 text-gray-600">
                {contextData.temperature ? `${contextData.temperature}°F` : 'Not specified'}
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Heart Rate:</span>
              <span className="ml-2 text-gray-600">
                {contextData.heart_rate ? `${contextData.heart_rate} BPM` : 'Not specified'}
              </span>
            </div>
          </div>
        </div>

        {/* Important Notice */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-yellow-500 mt-0.5" />
            <div>
              <h3 className="font-semibold text-yellow-800">Important Notice</h3>
              <p className="text-yellow-700 text-sm mt-1">
                This analysis is for informational purposes only and does not replace professional medical advice. 
                Always consult with a healthcare provider for proper diagnosis and treatment.
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <button
            onClick={() => setCurrentStep(2)}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Additional Info
          </button>
          <button
            onClick={handleAnalyzeSymptoms}
            disabled={analyzing || getTotalSymptoms() === 0}
            className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {analyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Activity className="w-5 h-5" />
                Analyze Symptoms
              </>
            )}
          </button>
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Symptom Checker</h1>
          <p className="text-gray-600">Get personalized health insights based on your symptoms</p>
        </div>

        {/* Step Indicator */}
        {renderStepIndicator()}

        {/* Step Content */}
        <div className="bg-gray-50 rounded-lg p-6">
          {currentStep === 1 && renderSymptomSelection()}
          {currentStep === 2 && renderAdditionalInfo()}
          {currentStep === 3 && renderReviewAndAnalyze()}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SymptomCheckerPage;
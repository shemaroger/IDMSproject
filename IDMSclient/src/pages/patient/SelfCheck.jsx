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
  ArrowLeft,
  Brain,
  Zap,
  Shield,
  Sparkles,
  Target,
  Star
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

  // Enhanced symptom categories with icons and colors
  const symptomCategories = {
    'General': {
      icon: Activity,
      color: 'blue',
      gradient: 'from-blue-500 to-blue-600',
      symptoms: ['fever', 'fatigue', 'weakness', 'sweating', 'chills', 'loss_of_appetite', 'weight_loss', 'malaise']
    },
    'Respiratory': {
      icon: Brain,
      color: 'cyan',
      gradient: 'from-cyan-500 to-cyan-600',
      symptoms: ['cough', 'shortness_of_breath', 'chest_pain', 'rapid_breathing', 'difficulty_breathing', 'wheezing', 'sore_throat']
    },
    'Digestive': {
      icon: Target,
      color: 'emerald',
      gradient: 'from-emerald-500 to-emerald-600',
      symptoms: ['nausea', 'vomiting', 'diarrhea', 'abdominal_pain', 'stomach_pain', 'loss_of_appetite', 'bloating']
    },
    'Neurological': {
      icon: Zap,
      color: 'purple',
      gradient: 'from-purple-500 to-purple-600',
      symptoms: ['headache', 'dizziness', 'confusion', 'seizures', 'memory_problems', 'difficulty_concentrating']
    },
    'Muscular': {
      icon: Shield,
      color: 'orange',
      gradient: 'from-orange-500 to-orange-600',
      symptoms: ['muscle_aches', 'joint_pain', 'back_pain', 'stiffness', 'muscle_weakness', 'cramps']
    },
    'Cardiovascular': {
      icon: Heart,
      color: 'rose',
      gradient: 'from-rose-500 to-rose-600',
      symptoms: ['chest_pain', 'heart_palpitations', 'rapid_heartbeat', 'slow_heartbeat', 'irregular_heartbeat']
    },
    'Skin': {
      icon: Sparkles,
      color: 'amber',
      gradient: 'from-amber-500 to-amber-600',
      symptoms: ['rash', 'itching', 'redness', 'swelling', 'bruising', 'pale_skin', 'blue_lips_or_fingernails']
    },
    'Emergency Signs': {
      icon: AlertTriangle,
      color: 'red',
      gradient: 'from-red-500 to-red-600',
      symptoms: ['severe_chest_pain', 'difficulty_breathing', 'blue_lips_or_fingernails', 'seizures', 'loss_of_consciousness', 'severe_bleeding']
    }
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
      const sessionData = {
        selected_symptoms: selectedSymptoms,
        custom_symptoms: customSymptoms,
        location: contextData.location,
        age_range: contextData.age_range,
        gender: contextData.gender,
        temperature: contextData.temperature ? parseFloat(contextData.temperature) : null,
        heart_rate: contextData.heart_rate ? parseInt(contextData.heart_rate) : null
      };

      const validation = diagnosisService.utils.validateSessionData(sessionData);
      if (!validation.isValid) {
        setError(validation.errors.join(', '));
        return;
      }

      console.log('Creating symptom session with data:', sessionData);
      
      const response = await diagnosisService.sessions.createWithAnalysis(sessionData);
      const sessionId = response.data.id;
      
      console.log('Session created:', response.data);
      
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
      { number: 1, title: 'Select Symptoms', description: 'Tell us what you feel', icon: Activity },
      { number: 2, title: 'Additional Info', description: 'Share more details', icon: User },
      { number: 3, title: 'Review & Analyze', description: 'Get your results', icon: Brain }
    ];

    return (
      <div className="relative mb-12">
        {/* Background decoration */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-full h-1 bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>
        </div>
        
        <div className="relative flex items-center justify-center">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = currentStep === step.number;
            const isCompleted = currentStep > step.number;
            
            return (
              <React.Fragment key={step.number}>
                <div className={`flex flex-col items-center bg-white z-10 px-4 ${index === 0 ? 'pr-8' : index === steps.length - 1 ? 'pl-8' : 'px-8'}`}>
                  <div className={`w-16 h-16 rounded-full border-4 flex items-center justify-center mb-3 transition-all duration-300 ${
                    isActive 
                      ? 'border-blue-500 bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg scale-110' 
                      : isCompleted 
                        ? 'border-green-500 bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg'
                        : 'border-gray-300 bg-white text-gray-400 hover:border-gray-400'
                  }`}>
                    <Icon className="w-7 h-7" />
                  </div>
                  <div className="text-center">
                    <p className={`text-sm font-bold mb-1 transition-colors ${
                      isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
                    }`}>
                      {step.title}
                    </p>
                    <p className="text-xs text-gray-500">{step.description}</p>
                  </div>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    );
  };

  const renderSymptomSelection = () => {
    return (
      <div className="space-y-8">
        {/* Hero Section */}
        <div className="text-center relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-50 via-purple-50 to-cyan-50 rounded-3xl transform rotate-1"></div>
          <div className="relative bg-white rounded-2xl p-8 shadow-lg">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Activity className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3">
              What symptoms are you experiencing?
            </h2>
            <p className="text-gray-600 text-lg">Select all symptoms that apply to you. Be as specific as possible for better analysis.</p>
          </div>
        </div>

        {/* Emergency Warning Banner */}
        {showEmergencyWarning && (
          <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-6 rounded-2xl shadow-xl relative overflow-hidden">
            <div className="absolute inset-0 bg-red-600 opacity-20"></div>
            <div className="relative">
              <div className="flex items-center justify-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <span className="font-bold text-xl">Emergency symptoms detected!</span>
              </div>
              <p className="text-center mb-6 text-red-100">Your symptoms may indicate a serious condition. Consider seeking immediate medical attention.</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={handleEmergencyRequest}
                  className="bg-white text-red-600 px-6 py-3 rounded-xl font-bold hover:bg-red-50 transition-all duration-200 shadow-lg"
                >
                  Get Emergency Help
                </button>
                <button
                  onClick={() => window.open('tel:911', '_self')}
                  className="border-2 border-white text-white px-6 py-3 rounded-xl font-bold hover:bg-white hover:text-red-600 transition-all duration-200"
                >
                  Call 911 Now
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Search Bar */}
        <div className="relative max-w-2xl mx-auto">
          <div className="relative">
            <Search className="w-6 h-6 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search symptoms (e.g., headache, fever, cough)..."
              value={symptomSearch}
              onChange={(e) => setSymptomSearch(e.target.value)}
              className="w-full pl-12 pr-6 py-4 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 text-lg"
            />
          </div>
        </div>

        {/* Selected Symptoms Counter */}
        {getTotalSymptoms() > 0 && (
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-2xl p-4">
            <div className="flex items-center justify-center gap-3">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              <p className="text-blue-800 font-semibold text-lg">
                {getTotalSymptoms()} symptoms selected
              </p>
            </div>
          </div>
        )}

        {/* Symptom Categories */}
        <div className="grid gap-6">
          {Object.entries(symptomCategories).map(([category, config]) => {
            const filteredSymptoms = getFilteredSymptoms(config.symptoms);
            if (filteredSymptoms.length === 0 && symptomSearch) return null;

            const Icon = config.icon;
            const isEmergency = category === 'Emergency Signs';

            return (
              <div key={category} className={`relative rounded-2xl overflow-hidden ${
                isEmergency ? 'ring-2 ring-red-300' : ''
              }`}>
                {/* Background gradient */}
                <div className={`absolute inset-0 bg-gradient-to-br ${config.gradient} opacity-5`}></div>
                
                <div className="relative bg-white border-2 border-gray-100 rounded-2xl p-6 hover:shadow-lg transition-all duration-300">
                  {/* Category Header */}
                  <div className="flex items-center gap-4 mb-6">
                    <div className={`w-12 h-12 bg-gradient-to-br ${config.gradient} rounded-xl flex items-center justify-center shadow-lg`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className={`text-xl font-bold ${isEmergency ? 'text-red-600' : 'text-gray-900'}`}>
                        {category}
                        {isEmergency && (
                          <span className="ml-3 text-xs bg-red-100 text-red-800 px-3 py-1 rounded-full font-medium">
                            URGENT
                          </span>
                        )}
                      </h3>
                      <p className="text-gray-500 text-sm">
                        {filteredSymptoms.length} symptom{filteredSymptoms.length !== 1 ? 's' : ''} available
                      </p>
                    </div>
                  </div>

                  {/* Symptoms Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filteredSymptoms.map((symptom) => {
                      const isSelected = selectedSymptoms.includes(symptom);
                      
                      return (
                        <button
                          key={symptom}
                          onClick={() => handleSymptomToggle(symptom)}
                          className={`group relative p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                            isSelected
                              ? isEmergency
                                ? 'border-red-400 bg-red-50 shadow-lg scale-105'
                                : `border-${config.color}-400 bg-${config.color}-50 shadow-lg scale-105`
                              : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md hover:scale-102'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`font-medium transition-colors ${
                              isSelected
                                ? isEmergency ? 'text-red-800' : `text-${config.color}-800`
                                : 'text-gray-700 group-hover:text-gray-900'
                            }`}>
                              {formatSymptomDisplay(symptom)}
                            </span>
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                              isSelected
                                ? isEmergency
                                  ? 'border-red-500 bg-red-500'
                                  : `border-${config.color}-500 bg-${config.color}-500`
                                : 'border-gray-300 group-hover:border-gray-400'
                            }`}>
                              {isSelected && <CheckCircle className="w-4 h-4 text-white" />}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Custom Symptoms */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl transform rotate-1"></div>
          <div className="relative bg-white border-2 border-gray-100 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                <Plus className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Add Custom Symptoms</h3>
                <p className="text-gray-500 text-sm">Describe symptoms not listed above</p>
              </div>
            </div>
            
            <div className="flex gap-3 mb-4">
              <input
                type="text"
                placeholder="Describe a symptom not listed above..."
                value={newCustomSymptom}
                onChange={(e) => setNewCustomSymptom(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addCustomSymptom()}
                className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 transition-all duration-200"
              />
              <button
                onClick={addCustomSymptom}
                className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            
            {customSymptoms.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-gray-700">Custom symptoms:</p>
                <div className="flex flex-wrap gap-2">
                  {customSymptoms.map((symptom, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-800 rounded-full border-2 border-emerald-200 shadow-sm"
                    >
                      <Star className="w-3 h-3" />
                      {symptom}
                      <button
                        onClick={() => removeCustomSymptom(symptom)}
                        className="text-emerald-600 hover:text-emerald-800 hover:bg-emerald-200 rounded-full p-1 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-end pt-6">
          <button
            onClick={() => setCurrentStep(2)}
            disabled={getTotalSymptoms() === 0}
            className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-3 shadow-lg hover:shadow-xl font-semibold text-lg"
          >
            Continue to Additional Information
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  };

  const renderAdditionalInfo = () => {
    return (
      <div className="space-y-8">
        {/* Hero Section */}
        <div className="text-center relative">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-50 via-blue-50 to-cyan-50 rounded-3xl transform -rotate-1"></div>
          <div className="relative bg-white rounded-2xl p-8 shadow-lg">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <User className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-3">
              Additional Information
            </h2>
            <p className="text-gray-600 text-lg">Help us provide better analysis by sharing additional context about yourself.</p>
          </div>
        </div>

        {/* Information Form */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl transform rotate-1"></div>
          <div className="relative bg-white border-2 border-gray-100 rounded-2xl p-8 shadow-lg">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Location */}
              <div className="space-y-2">
                <label className="flex items-center text-sm font-semibold text-gray-700 mb-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mr-3">
                    <MapPin className="w-4 h-4 text-white" />
                  </div>
                  Location (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Your current location"
                  value={contextData.location}
                  onChange={(e) => setContextData({...contextData, location: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200"
                />
                <p className="text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">
                  Helps identify location-specific health risks
                </p>
              </div>

              {/* Age Range */}
              <div className="space-y-2">
                <label className="flex items-center text-sm font-semibold text-gray-700 mb-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center mr-3">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  Age Range
                </label>
                <select
                  value={contextData.age_range}
                  onChange={(e) => setContextData({...contextData, age_range: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all duration-200"
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

              {/* Gender */}
              <div className="space-y-2">
                <label className="flex items-center text-sm font-semibold text-gray-700 mb-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center mr-3">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  Gender
                </label>
                <select
                  value={contextData.gender}
                  onChange={(e) => setContextData({...contextData, gender: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 transition-all duration-200"
                >
                  <option value="">Select gender</option>
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                  <option value="O">Other</option>
                  <option value="U">Prefer not to say</option>
                </select>
              </div>

              {/* Temperature */}
              <div className="space-y-2">
                <label className="flex items-center text-sm font-semibold text-gray-700 mb-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center mr-3">
                    <Thermometer className="w-4 h-4 text-white" />
                  </div>
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
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100 transition-all duration-200"
                />
                <p className="text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">
                  Normal range: 97-99°F
                </p>
              </div>

              {/* Heart Rate */}
              <div className="space-y-2">
                <label className="flex items-center text-sm font-semibold text-gray-700 mb-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-rose-500 to-rose-600 rounded-lg flex items-center justify-center mr-3">
                    <Heart className="w-4 h-4 text-white" />
                  </div>
                  Heart Rate (BPM)
                </label>
                <input
                  type="number"
                  placeholder="e.g., 72"
                  min="30"
                  max="220"
                  value={contextData.heart_rate}
                  onChange={(e) => setContextData({...contextData, heart_rate: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-100 transition-all duration-200"
                />
                <p className="text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">
                  Normal range: 60-100 BPM
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <Info className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-amber-800 mb-2">Why do we need this information?</h3>
              <p className="text-amber-700 text-sm leading-relaxed">
                This additional information helps our AI provide more accurate analysis by considering factors like age-related conditions, 
                location-specific health risks, and vital sign patterns. All information is optional and kept confidential.
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-6">
          <button
            onClick={() => setCurrentStep(1)}
            className="px-6 py-4 border-2 border-gray-300 text-gray-700 rounded-2xl hover:border-gray-400 hover:bg-gray-50 transition-all duration-200 flex items-center gap-3 font-semibold"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Symptoms
          </button>
          <button
            onClick={() => setCurrentStep(3)}
            className="px-8 py-4 bg-gradient-to-r from-purple-500 to-blue-600 text-white rounded-2xl hover:from-purple-600 hover:to-blue-700 transition-all duration-200 flex items-center gap-3 shadow-lg hover:shadow-xl font-semibold text-lg"
          >
            Review & Analyze
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  };

  const renderReviewAndAnalyze = () => {
    return (
      <div className="space-y-8">
        {/* Hero Section */}
        <div className="text-center relative">
          <div className="absolute inset-0 bg-gradient-to-r from-green-50 via-blue-50 to-purple-50 rounded-3xl transform rotate-1"></div>
          <div className="relative bg-white rounded-2xl p-8 shadow-lg">
            <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Brain className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent mb-3">
              Review Your Information
            </h2>
            <p className="text-gray-600 text-lg">Please review your symptoms and information before we analyze them.</p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-gradient-to-r from-red-50 to-red-100 border-2 border-red-200 rounded-2xl p-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-red-800 mb-1">Error</h3>
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Selected Symptoms Review */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl transform -rotate-1"></div>
          <div className="relative bg-white border-2 border-gray-100 rounded-2xl p-8 shadow-lg">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Selected Symptoms</h3>
                <p className="text-gray-500">Total: {getTotalSymptoms()} symptoms</p>
              </div>
            </div>
            
            {selectedSymptoms.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">Common Symptoms:</h4>
                <div className="flex flex-wrap gap-3">
                  {selectedSymptoms.map((symptom) => (
                    <span
                      key={symptom}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 rounded-full border-2 border-blue-200 shadow-sm"
                    >
                      <CheckCircle className="w-4 h-4" />
                      {formatSymptomDisplay(symptom)}
                      <button
                        onClick={() => handleSymptomToggle(symptom)}
                        className="text-blue-600 hover:text-blue-800 hover:bg-blue-200 rounded-full p-1 transition-colors"
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
                <h4 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">Custom Symptoms:</h4>
                <div className="flex flex-wrap gap-3">
                  {customSymptoms.map((symptom, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-800 rounded-full border-2 border-emerald-200 shadow-sm"
                    >
                      <Star className="w-4 h-4" />
                      {symptom}
                      <button
                        onClick={() => removeCustomSymptom(symptom)}
                        className="text-emerald-600 hover:text-emerald-800 hover:bg-emerald-200 rounded-full p-1 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Additional Information Review */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-cyan-50 rounded-2xl transform rotate-1"></div>
          <div className="relative bg-white border-2 border-gray-100 rounded-2xl p-8 shadow-lg">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-cyan-600 rounded-xl flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Additional Information</h3>
                <p className="text-gray-500">Context for better analysis</p>
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                  <MapPin className="w-5 h-5 text-blue-600" />
                  <div>
                    <span className="font-semibold text-gray-700">Location:</span>
                    <span className="ml-2 text-gray-600">{contextData.location || 'Not specified'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-xl">
                  <User className="w-5 h-5 text-purple-600" />
                  <div>
                    <span className="font-semibold text-gray-700">Age Range:</span>
                    <span className="ml-2 text-gray-600">{contextData.age_range || 'Not specified'}</span>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-red-50 rounded-xl">
                  <Thermometer className="w-5 h-5 text-red-600" />
                  <div>
                    <span className="font-semibold text-gray-700">Temperature:</span>
                    <span className="ml-2 text-gray-600">
                      {contextData.temperature ? `${contextData.temperature}°F` : 'Not specified'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-rose-50 rounded-xl">
                  <Heart className="w-5 h-5 text-rose-600" />
                  <div>
                    <span className="font-semibold text-gray-700">Heart Rate:</span>
                    <span className="ml-2 text-gray-600">
                      {contextData.heart_rate ? `${contextData.heart_rate} BPM` : 'Not specified'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Important Notice */}
        <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-200 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-yellow-800 mb-2">Important Medical Disclaimer</h3>
              <p className="text-yellow-700 text-sm leading-relaxed">
                This AI-powered analysis is for informational purposes only and does not replace professional medical advice, 
                diagnosis, or treatment. Always consult with a qualified healthcare provider for proper medical care. 
                If you're experiencing a medical emergency, call 911 immediately.
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-6">
          <button
            onClick={() => setCurrentStep(2)}
            className="px-6 py-4 border-2 border-gray-300 text-gray-700 rounded-2xl hover:border-gray-400 hover:bg-gray-50 transition-all duration-200 flex items-center gap-3 font-semibold"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Additional Info
          </button>
          <button
            onClick={handleAnalyzeSymptoms}
            disabled={analyzing || getTotalSymptoms() === 0}
            className="px-8 py-4 bg-gradient-to-r from-green-500 to-blue-600 text-white rounded-2xl hover:from-green-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-3 shadow-lg hover:shadow-xl font-semibold text-lg"
          >
            {analyzing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Analyzing Your Symptoms...
              </>
            ) : (
              <>
                <Brain className="w-5 h-5" />
                Analyze My Symptoms
              </>
            )}
          </button>
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
        <div className="max-w-6xl mx-auto py-8 px-4 space-y-8">
          {/* Main Header */}
          <div className="text-center relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-100 via-purple-100 to-cyan-100 rounded-3xl transform rotate-2 opacity-50"></div>
            <div className="relative bg-white rounded-2xl p-10 shadow-xl">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Activity className="w-12 h-12 text-white" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-600 bg-clip-text text-transparent mb-4">
                AI Symptom Checker
              </h1>
              <p className="text-gray-600 text-xl max-w-2xl mx-auto leading-relaxed">
                Get personalized health insights powered by advanced AI. Describe your symptoms and receive 
                intelligent analysis to help guide your healthcare decisions.
              </p>
            </div>
          </div>

          {/* Step Indicator */}
          {renderStepIndicator()}

          {/* Main Content Area */}
          <div className="relative">
            <div className="absolute inset-0 bg-white rounded-3xl shadow-2xl transform rotate-1 opacity-50"></div>
            <div className="relative bg-white rounded-2xl shadow-xl p-8 md:p-12">
              {currentStep === 1 && renderSymptomSelection()}
              {currentStep === 2 && renderAdditionalInfo()}
              {currentStep === 3 && renderReviewAndAnalyze()}
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-gray-500 text-sm">
            <p>
              🏥 Powered by advanced AI technology | 🔒 Your data is secure and confidential | 
              ⚡ Results in seconds
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SymptomCheckerPage;
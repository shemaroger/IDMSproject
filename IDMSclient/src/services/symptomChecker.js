// src/services/symptomChecker.js
import { healthcareAPI, apiUtils } from './api';

class SymptomCheckerService {
  constructor() {
    this.currentSession = null;
    this.availableSymptoms = new Map();
    this.diseaseLibrary = new Map();
    this.sessionHistory = [];
  }

  // Initialize the symptom checker with available symptoms and diseases
  async initialize() {
    try {
      console.log('Initializing symptom checker...');
      
      // Load available symptoms
      const symptomsResponse = await healthcareAPI.diseases.getAvailableSymptoms();
      this.availableSymptoms = new Map(
        symptomsResponse.data.symptoms.map(symptom => [symptom, this.formatSymptomDisplay(symptom)])
      );
      
      // Load disease library
      const diseasesResponse = await healthcareAPI.diseases.list();
      this.diseaseLibrary = new Map(
        diseasesResponse.data.results.map(disease => [disease.id, disease])
      );
      
      console.log(`Loaded ${this.availableSymptoms.size} symptoms and ${this.diseaseLibrary.size} diseases`);
      
      return {
        success: true,
        symptomsCount: this.availableSymptoms.size,
        diseasesCount: this.diseaseLibrary.size
      };
    } catch (error) {
      console.error('Failed to initialize symptom checker:', error);
      throw new Error('Failed to initialize symptom checker: ' + apiUtils.formatErrorMessage(error));
    }
  }

  // Format symptom name for display
  formatSymptomDisplay(symptom) {
    return symptom
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  // Get categorized symptoms for better UX
  getCategorizedSymptoms() {
    const categories = {
      'General': ['fever', 'fatigue', 'headache', 'nausea', 'vomiting', 'sweating'],
      'Respiratory': ['cough', 'shortness_of_breath', 'difficulty_breathing', 'chest_pain', 'rapid_breathing'],
      'Neurological': ['confusion', 'seizures', 'dizziness', 'loss_of_consciousness'],
      'Gastrointestinal': ['abdominal_pain', 'diarrhea', 'loss_of_appetite'],
      'Muscular': ['muscle_aches', 'joint_pain', 'weakness'],
      'Skin': ['rash', 'pale_skin', 'blue_lips_or_fingernails'],
      'Other': []
    };

    const categorized = {};
    const usedSymptoms = new Set();

    // Categorize known symptoms
    Object.entries(categories).forEach(([category, symptoms]) => {
      if (category === 'Other') return;
      
      categorized[category] = symptoms
        .filter(symptom => this.availableSymptoms.has(symptom))
        .map(symptom => ({
          value: symptom,
          label: this.formatSymptomDisplay(symptom),
          category
        }));
      
      symptoms.forEach(symptom => usedSymptoms.add(symptom));
    });

    // Add remaining symptoms to 'Other'
    categorized['Other'] = Array.from(this.availableSymptoms.keys())
      .filter(symptom => !usedSymptoms.has(symptom))
      .map(symptom => ({
        value: symptom,
        label: this.formatSymptomDisplay(symptom),
        category: 'Other'
      }));

    return categorized;
  }

  // Get all symptoms as a flat array for search
  getAllSymptoms() {
    return Array.from(this.availableSymptoms.keys()).map(symptom => ({
      value: symptom,
      label: this.formatSymptomDisplay(symptom)
    }));
  }

  // Start a new symptom checking session
  async startSession(userInfo = {}) {
    try {
      console.log('Starting new symptom checker session...');
      
      this.currentSession = {
        id: `session_${Date.now()}`,
        selectedSymptoms: [],
        customSymptoms: [],
        userInfo: {
          location: userInfo.location || '',
          age_range: userInfo.ageRange || '',
          gender: userInfo.gender || ''
        },
        startTime: new Date(),
        analysisResults: null,
        recommendations: null
      };

      console.log('Session started:', this.currentSession.id);
      return this.currentSession;
    } catch (error) {
      console.error('Failed to start session:', error);
      throw new Error('Failed to start symptom checking session');
    }
  }

  // Add symptom to current session
  addSymptom(symptom) {
    if (!this.currentSession) {
      throw new Error('No active session. Please start a session first.');
    }

    const symptomValue = symptom.value || symptom;
    
    if (!this.currentSession.selectedSymptoms.includes(symptomValue)) {
      this.currentSession.selectedSymptoms.push(symptomValue);
      console.log(`Added symptom: ${symptomValue}`);
    }

    return this.currentSession.selectedSymptoms;
  }

  // Remove symptom from current session
  removeSymptom(symptom) {
    if (!this.currentSession) {
      throw new Error('No active session. Please start a session first.');
    }

    const symptomValue = symptom.value || symptom;
    const index = this.currentSession.selectedSymptoms.indexOf(symptomValue);
    
    if (index > -1) {
      this.currentSession.selectedSymptoms.splice(index, 1);
      console.log(`Removed symptom: ${symptomValue}`);
    }

    return this.currentSession.selectedSymptoms;
  }

  // Add custom symptom
  addCustomSymptom(symptom) {
    if (!this.currentSession) {
      throw new Error('No active session. Please start a session first.');
    }

    const customSymptom = symptom.trim().toLowerCase();
    
    if (customSymptom && !this.currentSession.customSymptoms.includes(customSymptom)) {
      this.currentSession.customSymptoms.push(customSymptom);
      console.log(`Added custom symptom: ${customSymptom}`);
    }

    return this.currentSession.customSymptoms;
  }

  // Get current session symptoms
  getCurrentSymptoms() {
    if (!this.currentSession) return [];
    
    return {
      selected: this.currentSession.selectedSymptoms,
      custom: this.currentSession.customSymptoms,
      all: [...this.currentSession.selectedSymptoms, ...this.currentSession.customSymptoms]
    };
  }

  // Quick symptom check (without creating session)
  async quickCheck(symptoms) {
    try {
      console.log('Performing quick symptom check...');
      
      const response = await healthcareAPI.symptomChecker.quickCheck(symptoms);
      return this.formatQuickCheckResults(response.data);
    } catch (error) {
      console.error('Quick check failed:', error);
      throw new Error('Quick symptom check failed: ' + apiUtils.formatErrorMessage(error));
    }
  }

  // Full symptom analysis
  async analyzeSymptoms() {
    if (!this.currentSession) {
      throw new Error('No active session. Please start a session first.');
    }

    if (this.currentSession.selectedSymptoms.length === 0) {
      throw new Error('Please select at least one symptom before analysis.');
    }

    try {
      console.log('Analyzing symptoms...');
      
      const analysisData = {
        selected_symptoms: this.currentSession.selectedSymptoms,
        custom_symptoms: this.currentSession.customSymptoms,
        ...this.currentSession.userInfo
      };

      const response = await healthcareAPI.symptomChecker.analyzeSymptoms(analysisData);
      
      // Store results in session
      this.currentSession.analysisResults = response.data;
      this.currentSession.recommendations = this.generateRecommendations(response.data);
      this.currentSession.serverSessionId = response.data.session_id;

      // Add to history
      this.sessionHistory.push({
        ...this.currentSession,
        completedAt: new Date()
      });

      console.log('Analysis completed:', response.data);
      return this.formatAnalysisResults(response.data);
    } catch (error) {
      console.error('Symptom analysis failed:', error);
      throw new Error('Symptom analysis failed: ' + apiUtils.formatErrorMessage(error));
    }
  }

  // Format quick check results
  formatQuickCheckResults(data) {
    return {
      summary: {
        totalSymptoms: data.symptoms_analyzed?.length || 0,
        riskLevel: this.getRiskLevel(data.overall_risk_score || 0),
        emergencyRecommended: data.emergency_recommended || false
      },
      diseases: (data.disease_analyses || []).map(disease => ({
        name: disease.disease_name,
        probability: disease.probability_percentage,
        severity: disease.severity_assessment,
        score: disease.calculated_score
      })),
      recommendation: data.recommendation || 'Please consult a healthcare provider.'
    };
  }

  // Format full analysis results
  formatAnalysisResults(data) {
    const formatted = {
      sessionId: data.session_id,
      summary: {
        overallRiskScore: data.overall_risk_score,
        severityLevel: data.severity_level,
        primaryDisease: data.primary_suspected_disease,
        emergencyRecommended: data.emergency_recommended,
        clinicVisitRecommended: data.nearest_clinic_recommended,
        followUpNeeded: data.needs_followup,
        followUpDate: data.followup_date
      },
      diseases: (data.disease_analyses || []).map(disease => ({
        id: disease.disease,
        name: disease.disease_name,
        type: disease.disease_type,
        probability: disease.probability_percentage,
        severity: disease.severity_assessment,
        score: disease.calculated_score
      })).sort((a, b) => b.probability - a.probability),
      recommendations: {
        immediate: data.recommendation,
        preventionTips: data.prevention_tips || []
      },
      riskAssessment: {
        level: this.getRiskLevel(data.overall_risk_score),
        color: this.getRiskColor(data.severity_level),
        urgency: this.getUrgencyLevel(data.severity_level)
      }
    };

    return formatted;
  }

  // Generate additional recommendations based on analysis
  generateRecommendations(analysisData) {
    const recommendations = {
      immediate: [],
      lifestyle: [],
      monitoring: [],
      prevention: []
    };

    const severityLevel = analysisData.severity_level;
    const emergencyRecommended = analysisData.emergency_recommended;

    // Immediate recommendations
    if (emergencyRecommended || severityLevel === 'critical') {
      recommendations.immediate.push({
        type: 'emergency',
        title: 'Seek Emergency Care',
        description: 'Your symptoms indicate a potentially serious condition. Please seek immediate medical attention.',
        action: 'Go to nearest emergency room or call emergency services',
        priority: 'critical'
      });
    } else if (severityLevel === 'severe') {
      recommendations.immediate.push({
        type: 'urgent',
        title: 'Contact Healthcare Provider',
        description: 'Your symptoms warrant medical evaluation. Please contact your healthcare provider today.',
        action: 'Schedule urgent appointment or visit walk-in clinic',
        priority: 'high'
      });
    } else if (severityLevel === 'moderate') {
      recommendations.immediate.push({
        type: 'routine',
        title: 'Schedule Medical Consultation',
        description: 'Consider scheduling an appointment with your healthcare provider within the next few days.',
        action: 'Book appointment with your doctor',
        priority: 'medium'
      });
    }

    // Lifestyle recommendations
    recommendations.lifestyle.push({
      type: 'general',
      title: 'Rest and Hydration',
      description: 'Get adequate rest and stay well-hydrated to support your body\'s healing process.',
      action: 'Drink plenty of fluids and get adequate sleep',
      priority: 'low'
    });

    // Monitoring recommendations
    recommendations.monitoring.push({
      type: 'symptoms',
      title: 'Monitor Your Symptoms',
      description: 'Keep track of your symptoms and seek medical attention if they worsen.',
      action: 'Track symptom changes and duration',
      priority: 'medium'
    });

    return recommendations;
  }

  // Get risk level based on score
  getRiskLevel(score) {
    if (score >= 80) return 'Critical';
    if (score >= 60) return 'High';
    if (score >= 40) return 'Moderate';
    if (score >= 20) return 'Low';
    return 'Minimal';
  }

  // Get risk color for UI
  getRiskColor(severityLevel) {
    const colors = {
      'critical': '#ef4444', // red
      'severe': '#f97316',   // orange
      'moderate': '#eab308', // yellow
      'mild': '#22c55e',     // green
      'minimal': '#6b7280'   // gray
    };
    return colors[severityLevel] || colors.minimal;
  }

  // Get urgency level
  getUrgencyLevel(severityLevel) {
    const urgency = {
      'critical': 'Immediate attention required',
      'severe': 'Urgent medical care needed',
      'moderate': 'Medical consultation recommended',
      'mild': 'Monitor symptoms',
      'minimal': 'Self-care appropriate'
    };
    return urgency[severityLevel] || urgency.minimal;
  }

  // Get prevention tips for specific disease
  async getPreventionTips(diseaseName) {
    try {
      const response = await healthcareAPI.preventionTips.getByDisease(diseaseName);
      return response.data;
    } catch (error) {
      console.error('Failed to get prevention tips:', error);
      return { tips_by_category: {}, total_tips: 0 };
    }
  }

  // Request emergency services
  async requestEmergencyServices(location, additionalInfo = {}) {
    if (!this.currentSession?.serverSessionId) {
      throw new Error('No active analysis session found');
    }

    try {
      console.log('Requesting emergency services...');
      
      const emergencyData = {
        location,
        gps_coordinates: additionalInfo.gpsCoordinates || '',
        ...additionalInfo
      };

      const response = await healthcareAPI.symptomSessions.requestEmergency(
        this.currentSession.serverSessionId,
        emergencyData
      );

      return {
        success: true,
        emergencyRequestId: response.data.emergency_request_id,
        message: 'Emergency services have been notified. Help is on the way.'
      };
    } catch (error) {
      console.error('Emergency request failed:', error);
      throw new Error('Failed to request emergency services: ' + apiUtils.formatErrorMessage(error));
    }
  }

  // Get session history
  getSessionHistory() {
    return this.sessionHistory.map(session => ({
      id: session.id,
      date: session.completedAt,
      symptomsCount: session.selectedSymptoms.length + session.customSymptoms.length,
      primaryDisease: session.analysisResults?.primary_suspected_disease || 'Unknown',
      riskLevel: this.getRiskLevel(session.analysisResults?.overall_risk_score || 0),
      severityLevel: session.analysisResults?.severity_level || 'mild'
    }));
  }

  // Clear current session
  clearSession() {
    this.currentSession = null;
    console.log('Session cleared');
  }

  // Get statistics
  async getStatistics(days = 30) {
    try {
      const response = await healthcareAPI.symptomChecker.getStatistics(days);
      return response.data;
    } catch (error) {
      console.error('Failed to get statistics:', error);
      return null;
    }
  }

  // Emergency symptom detection
  detectEmergencySymptoms(symptoms) {
    const emergencySymptoms = [
      'difficulty_breathing',
      'chest_pain',
      'severe_chest_pain',
      'confusion',
      'seizures',
      'loss_of_consciousness',
      'blue_lips_or_fingernails',
      'severe_abdominal_pain',
      'high_fever',
      'severe_headache',
      'stroke_symptoms'
    ];

    const detectedEmergencySymptoms = symptoms.filter(symptom => 
      emergencySymptoms.some(emergency => 
        symptom.toLowerCase().includes(emergency.toLowerCase()) ||
        emergency.includes(symptom.toLowerCase())
      )
    );

    return {
      hasEmergencySymptoms: detectedEmergencySymptoms.length > 0,
      emergencySymptoms: detectedEmergencySymptoms,
      recommendation: detectedEmergencySymptoms.length > 0 ? 
        'CRITICAL: Seek immediate emergency medical attention' : 
        'Continue with normal symptom assessment'
    };
  }

  // Validate symptoms before analysis
  validateSymptoms(symptoms) {
    const errors = [];
    
    if (!symptoms || symptoms.length === 0) {
      errors.push('Please select at least one symptom');
    }

    if (symptoms.length > 20) {
      errors.push('Please select no more than 20 symptoms for accurate analysis');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Get symptom suggestions based on input
  getSymptomSuggestions(input) {
    const query = input.toLowerCase();
    const suggestions = [];

    // Search through available symptoms
    for (const [symptom, displayName] of this.availableSymptoms) {
      if (symptom.toLowerCase().includes(query) || 
          displayName.toLowerCase().includes(query)) {
        suggestions.push({
          value: symptom,
          label: displayName,
          match: 'symptom'
        });
      }
    }

    // Add common symptom combinations
    const commonCombinations = {
      'cold': ['runny_nose', 'sneezing', 'sore_throat', 'cough'],
      'flu': ['fever', 'body_aches', 'fatigue', 'headache'],
      'stomach': ['nausea', 'vomiting', 'abdominal_pain', 'diarrhea']
    };

    if (commonCombinations[query]) {
      suggestions.push({
        value: query,
        label: `${query} symptoms`,
        match: 'combination',
        symptoms: commonCombinations[query]
      });
    }

    return suggestions.slice(0, 10); // Limit to 10 suggestions
  }
}

// Create singleton instance
const symptomCheckerService = new SymptomCheckerService();

export default symptomCheckerService;
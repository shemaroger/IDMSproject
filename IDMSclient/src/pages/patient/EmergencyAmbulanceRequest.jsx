import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  MapPin, 
  Phone, 
  Clock, 
  Plus,
  Send,
  Loader2,
  CheckCircle,
  XCircle,
  Navigation,
  Heart,
  User,
  FileText
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
// import { healthcareAPI } from '../../services/api';

const EmergencyAmbulanceRequest = () => {
  const [formData, setFormData] = useState({
    location: '',
    gps_coordinates: '',
    condition_description: '',
    suspected_disease: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [error, setError] = useState('');
  const [recentRequests, setRecentRequests] = useState([]);
  const [criticalSession, setCriticalSession] = useState(null);

  useEffect(() => {
    // Uncomment when API is ready
    // fetchRecentRequests();
    // checkForCriticalSessions();
    
    // Mock data for now
    setRecentRequests([
      {
        id: 1,
        status: 'P',
        condition_description: 'Chest pain and difficulty breathing',
        location: 'Kigali City Center',
        request_time: new Date().toISOString()
      },
      {
        id: 2,
        status: 'D',
        condition_description: 'High fever and severe headache',
        location: 'Nyamirambo',
        request_time: new Date(Date.now() - 86400000).toISOString()
      }
    ]);
  }, []);

  const fetchRecentRequests = async () => {
    try {
      // const response = await healthcareAPI.emergencies.list({ limit: 5 });
      // setRecentRequests(response.data.results || response.data);
      console.log('fetchRecentRequests called - API not implemented yet');
    } catch (error) {
      console.error('Error fetching recent requests:', error);
    }
  };

  const checkForCriticalSessions = async () => {
    try {
      // const response = await healthcareAPI.emergencies.getCriticalCases();
      // if (response.data.total_critical_sessions > 0) {
      //   setCriticalSession(response.data);
      // }
      console.log('checkForCriticalSessions called - API not implemented yet');
    } catch (error) {
      console.error('Error checking critical sessions:', error);
    }
  };

  const getCurrentLocation = async () => {
    setLocationLoading(true);
    setError('');

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser');
      setLocationLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const coordinates = `${latitude},${longitude}`;
        
        setFormData(prev => ({
          ...prev,
          gps_coordinates: coordinates
        }));

        // Try to get address from coordinates (reverse geocoding)
        try {
          // In a real app, you'd use a geocoding service like Google Maps
          setFormData(prev => ({
            ...prev,
            location: `Location: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
          }));
        } catch (geocodeError) {
          console.error('Geocoding error:', geocodeError);
        }
        
        setLocationLoading(false);
      },
      (error) => {
        setError(`Location error: ${error.message}`);
        setLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    // Validation
    if (!formData.location.trim()) {
      setError('Location is required');
      setIsSubmitting(false);
      return;
    }

    if (!formData.condition_description.trim()) {
      setError('Please describe the emergency condition');
      setIsSubmitting(false);
      return;
    }

    try {
      const requestData = {
        ...formData,
        // Add timestamp for immediate processing
        request_time: new Date().toISOString()
      };

      // Mock successful submission for now
      console.log('Submitting emergency request:', requestData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // const response = await healthcareAPI.emergencies.create(requestData);
      
      setSubmitSuccess(true);
      setFormData({
        location: '',
        gps_coordinates: '',
        condition_description: '',
        suspected_disease: ''
      });
      
      // Refresh recent requests
      // fetchRecentRequests();

      // Auto-hide success message after 5 seconds
      setTimeout(() => setSubmitSuccess(false), 5000);

    } catch (error) {
      setError(error.response?.data?.message || 'Failed to submit emergency request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const getStatusColor = (status) => {
    const colors = {
      'P': 'bg-yellow-100 text-yellow-800',
      'D': 'bg-blue-100 text-blue-800',
      'A': 'bg-purple-100 text-purple-800',
      'T': 'bg-orange-100 text-orange-800',
      'C': 'bg-green-100 text-green-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusText = (status) => {
    const statusMap = {
      'P': 'Pending',
      'D': 'Dispatched',
      'A': 'Arrived',
      'T': 'In Transit',
      'C': 'Completed'
    };
    return statusMap[status] || status;
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center mb-4">
              <AlertTriangle className="h-8 w-8 text-red-600 mr-3" />
              <h1 className="text-3xl font-bold text-gray-900">Emergency Ambulance Request</h1>
            </div>
            <p className="text-gray-600">
              Request immediate medical assistance. For life-threatening emergencies, call local emergency services directly.
            </p>
          </div>

          {/* Critical Session Alert */}
          {criticalSession && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4 rounded-md">
              <div className="flex">
                <AlertTriangle className="h-5 w-5 text-red-400 mr-2 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-red-800">
                    Critical Health Assessment Detected
                  </h3>
                  <p className="mt-1 text-sm text-red-700">
                    Based on your recent symptom assessment, immediate medical attention may be required.
                    {criticalSession.total_critical_sessions} critical session(s) found in the last 24 hours.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Success Message */}
          {submitSuccess && (
            <div className="mb-6 bg-green-50 border-l-4 border-green-400 p-4 rounded-md">
              <div className="flex">
                <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
                <div>
                  <h3 className="text-sm font-medium text-green-800">Request Submitted Successfully</h3>
                  <p className="mt-1 text-sm text-green-700">
                    Your emergency request has been received and is being processed. Emergency services will contact you shortly.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4 rounded-md">
              <div className="flex">
                <XCircle className="h-5 w-5 text-red-400 mr-2" />
                <div>
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <p className="mt-1 text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Request Form */}
            <div className="lg:col-span-2">
              <div className="bg-white shadow-lg rounded-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Submit Emergency Request</h2>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Location Section */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <MapPin className="h-4 w-4 inline mr-1" />
                      Emergency Location *
                    </label>
                    <div className="flex space-x-3">
                      <input
                        type="text"
                        name="location"
                        value={formData.location}
                        onChange={handleInputChange}
                        placeholder="Enter the emergency location address"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        required
                      />
                      <button
                        type="button"
                        onClick={getCurrentLocation}
                        disabled={locationLoading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 flex items-center"
                      >
                        {locationLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Navigation className="h-4 w-4" />
                        )}
                        <span className="ml-1 hidden sm:inline">GPS</span>
                      </button>
                    </div>
                    {formData.gps_coordinates && (
                      <p className="mt-1 text-xs text-gray-500">
                        GPS: {formData.gps_coordinates}
                      </p>
                    )}
                  </div>

                  {/* Condition Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <FileText className="h-4 w-4 inline mr-1" />
                      Emergency Condition Description *
                    </label>
                    <textarea
                      name="condition_description"
                      value={formData.condition_description}
                      onChange={handleInputChange}
                      rows={4}
                      placeholder="Describe the medical emergency, symptoms, and current condition..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      required
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Provide as much detail as possible to help emergency responders prepare
                    </p>
                  </div>

                  {/* Suspected Disease */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Heart className="h-4 w-4 inline mr-1" />
                      Suspected Disease/Condition (if known)
                    </label>
                    <input
                      type="text"
                      name="suspected_disease"
                      value={formData.suspected_disease}
                      onChange={handleInputChange}
                      placeholder="e.g., Heart Attack, Stroke, Severe Allergic Reaction..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>

                  {/* Submit Button */}
                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-red-600 text-white py-3 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 flex items-center justify-center font-medium"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin mr-2" />
                          Submitting Request...
                        </>
                      ) : (
                        <>
                          <Send className="h-5 w-5 mr-2" />
                          Submit Emergency Request
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Emergency Contacts */}
              <div className="bg-white shadow-lg rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Emergency Contacts</h3>
                <div className="space-y-3">
                  <div className="flex items-center p-3 bg-red-50 rounded-md">
                    <Phone className="h-5 w-5 text-red-600 mr-3" />
                    <div>
                      <p className="font-medium text-red-900">Emergency Services</p>
                      <p className="text-sm text-red-700">112 (Rwanda)</p>
                    </div>
                  </div>
                  <div className="flex items-center p-3 bg-blue-50 rounded-md">
                    <Phone className="h-5 w-5 text-blue-600 mr-3" />
                    <div>
                      <p className="font-medium text-blue-900">Hospital Direct</p>
                      <p className="text-sm text-blue-700">+250 788 123 456</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Requests */}
              <div className="bg-white shadow-lg rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Requests</h3>
                {recentRequests.length === 0 ? (
                  <p className="text-gray-500 text-sm">No recent emergency requests</p>
                ) : (
                  <div className="space-y-3">
                    {recentRequests.slice(0, 3).map((request) => (
                      <div key={request.id} className="border-l-4 border-gray-200 pl-3 py-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                            {getStatusText(request.status)}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(request.request_time).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 truncate">
                          {request.condition_description}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          <MapPin className="h-3 w-3 inline mr-1" />
                          {request.location}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Important Notice */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <h3 className="text-sm font-semibold text-yellow-800 mb-2">Important Notice</h3>
                <ul className="text-xs text-yellow-700 space-y-1">
                  <li>• For immediate life-threatening emergencies, call 112 directly</li>
                  <li>• Keep your phone accessible for emergency services to contact you</li>
                  <li>• Provide accurate location information</li>
                  <li>• Stay calm and follow dispatcher instructions</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default EmergencyAmbulanceRequest;
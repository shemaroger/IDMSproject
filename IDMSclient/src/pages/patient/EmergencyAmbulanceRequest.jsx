import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { emergencyAmbulanceService } from '../../services/emergencyAmbulanceService';
import { healthcareAPI, authAPI } from '../../services/api';
import api from '../../services/api';
import { Plus, Clock, MapPin, AlertTriangle, Phone, CheckCircle, Navigation, Eye, X } from 'lucide-react';

const PatientEmergencyPage = () => {
  const [emergencyRequests, setEmergencyRequests] = useState([]);
  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [formData, setFormData] = useState({
    clinic: '',
    location: '',
    gps_coordinates: '',
    condition_description: '',
    suspected_disease: '',
    urgency_level: 'standard',
    additional_notes: ''
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchEmergencyRequests();
    fetchClinics();
  }, []);

  const fetchClinics = async () => {
    try {
      const response = await healthcareAPI.clinics.list();
      setClinics(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching clinics:', error);
    }
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser');
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setFormData(prev => ({
          ...prev,
          gps_coordinates: `${latitude},${longitude}`
        }));
        setGettingLocation(false);
        alert('Location captured successfully!');
      },
      (error) => {
        setGettingLocation(false);
        let errorMessage = 'Unable to get location';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied by user';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out';
            break;
        }
        alert(errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const fetchEmergencyRequests = async () => {
    try {
      const response = await emergencyAmbulanceService.list();
      setEmergencyRequests(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching emergency requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.location.trim() || !formData.condition_description.trim()) {
      alert('Please fill in all required fields');
      return;
    }
    
    setCreating(true);
    
    try {
      console.log('=== EMERGENCY REQUEST SUBMISSION DEBUG ===');
      console.log('Form data:', JSON.stringify(formData, null, 2));
      
      // Get current user and patient info
      const currentUser = authAPI.getCurrentUser();
      console.log('Current user:', JSON.stringify(currentUser, null, 2));
      
      // Try to get patient ID first
      let patientId = null;
      
      // Method 1: Check if user object has patient info
      if (currentUser?.patient_id) {
        patientId = currentUser.patient_id;
        console.log('Patient ID from user.patient_id:', patientId);
      } else if (currentUser?.patient?.id) {
        patientId = currentUser.patient.id;
        console.log('Patient ID from user.patient.id:', patientId);
      } else if (currentUser?.role?.name === 'Patient') {
        // Method 2: Try to fetch from patients API
        try {
          console.log('Fetching patient data from API...');
          const patientResponse = await healthcareAPI.patients.list({ user: currentUser.id });
          console.log('Patient API response:', JSON.stringify(patientResponse.data, null, 2));
          
          const patientData = patientResponse.data.results?.[0] || patientResponse.data[0];
          if (patientData?.id) {
            patientId = patientData.id;
            console.log('Patient ID from API:', patientId);
          } else {
            // Method 3: Use user ID as fallback
            patientId = currentUser.id;
            console.log('Using user ID as patient ID:', patientId);
          }
        } catch (apiError) {
          console.error('Patient API error:', apiError);
          // Use user ID as final fallback
          patientId = currentUser.id;
          console.log('Fallback: using user ID as patient ID:', patientId);
        }
      }
      
      // Prepare request data
      const requestData = {
        patient: patientId,
        location: formData.location.trim(),
        condition_description: formData.condition_description.trim(),
        suspected_disease: formData.suspected_disease?.trim() || '',
        urgency_level: formData.urgency_level || 'standard',
        additional_notes: formData.additional_notes?.trim() || '',
        ...(formData.clinic && { clinic: parseInt(formData.clinic) }),
        ...(formData.gps_coordinates && { gps_coordinates: formData.gps_coordinates.trim() })
      };
      
      console.log('Final request data:', JSON.stringify(requestData, null, 2));
      
      // Make the API call directly
      const response = await api.post('/emergency-requests/', requestData);
      console.log('Success response:', JSON.stringify(response.data, null, 2));
      
      setShowCreateForm(false);
      setFormData({
        clinic: '',
        location: '',
        gps_coordinates: '',
        condition_description: '',
        suspected_disease: '',
        urgency_level: 'standard',
        additional_notes: ''
      });
      fetchEmergencyRequests();
      alert('Emergency request submitted successfully!');
    } catch (error) {
      console.error('=== ERROR DETAILS ===');
      console.error('Full error object:', error);
      console.error('Error message:', error.message);
      console.error('Error response:', error.response);
      console.error('Error response status:', error.response?.status);
      console.error('Error response data:', error.response?.data);
      console.error('Error response headers:', error.response?.headers);
      
      // Show more specific error message
      let errorMessage = 'Error submitting request:\n';
      if (error.response?.data) {
        if (typeof error.response.data === 'object') {
          // Handle Django field validation errors
          const fieldErrors = Object.entries(error.response.data)
            .map(([field, messages]) => {
              const messageText = Array.isArray(messages) ? messages.join(', ') : messages;
              return `• ${field}: ${messageText}`;
            })
            .join('\n');
          errorMessage += fieldErrors;
        } else {
          errorMessage += error.response.data;
        }
      } else {
        errorMessage += error.message;
      }
      
      alert(errorMessage);
    } finally {
      setCreating(false);
    }
  };

  const getStatusBadge = (status, approvalStatus) => {
    if (approvalStatus === 'rejected') {
      return <span className="px-2 py-1 text-xs font-semibold bg-red-100 text-red-800 rounded-full">Rejected</span>;
    }
    
    const statusMap = {
      'P': { text: 'Pending Review', color: 'bg-yellow-100 text-yellow-800' },
      'D': { text: 'Dispatched', color: 'bg-blue-100 text-blue-800' },
      'A': { text: 'Ambulance Arrived', color: 'bg-purple-100 text-purple-800' },
      'T': { text: 'In Transit to Hospital', color: 'bg-indigo-100 text-indigo-800' },
      'C': { text: 'Completed', color: 'bg-green-100 text-green-800' }
    };
    
    const statusInfo = statusMap[status] || { text: 'Unknown', color: 'bg-gray-100 text-gray-800' };
    
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusInfo.color}`}>
        {statusInfo.text}
      </span>
    );
  };

  const getUrgencyColor = (urgency) => {
    const colorMap = {
      'immediate': 'text-red-600',
      'urgent': 'text-orange-600',
      'standard': 'text-green-600',
      'non_urgent': 'text-gray-600'
    };
    return colorMap[urgency] || 'text-gray-600';
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>

        {/* Detail Modal */}
        {showDetailModal && selectedRequest && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-screen overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Emergency Request Details</h2>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Left Column - Basic Info */}
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-gray-900 mb-3">Request Information</h3>
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm font-medium text-gray-700">Request ID:</span>
                        <span className="ml-2 text-sm text-gray-600">#{selectedRequest.id}</span>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-700">Submitted:</span>
                        <span className="ml-2 text-sm text-gray-600">
                          {new Date(selectedRequest.request_time).toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-700">Status:</span>
                        <span className="ml-2">{getStatusBadge(selectedRequest.status, selectedRequest.approval_status)}</span>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-700">Urgency:</span>
                        <span className={`ml-2 text-sm font-medium ${getUrgencyColor(selectedRequest.urgency_level)}`}>
                          {selectedRequest.urgency_level?.replace('_', ' ').toUpperCase() || 'STANDARD'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-gray-900 mb-3">Location Details</h3>
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm font-medium text-gray-700">Address:</span>
                        <p className="text-sm text-gray-600 mt-1">{selectedRequest.location}</p>
                      </div>
                      {selectedRequest.gps_coordinates && (
                        <div>
                          <span className="text-sm font-medium text-gray-700">GPS Coordinates:</span>
                          <p className="text-sm text-gray-600 mt-1">{selectedRequest.gps_coordinates}</p>
                        </div>
                      )}
                      {selectedRequest.clinic_name && (
                        <div>
                          <span className="text-sm font-medium text-gray-700">Preferred Clinic:</span>
                          <p className="text-sm text-blue-600 mt-1">{selectedRequest.clinic_name}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-gray-900 mb-3">Medical Information</h3>
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm font-medium text-gray-700">Condition Description:</span>
                        <p className="text-sm text-gray-600 mt-1">{selectedRequest.condition_description}</p>
                      </div>
                      {selectedRequest.suspected_disease && (
                        <div>
                          <span className="text-sm font-medium text-gray-700">Suspected Condition:</span>
                          <p className="text-sm text-gray-600 mt-1">{selectedRequest.suspected_disease}</p>
                        </div>
                      )}
                      {selectedRequest.additional_notes && (
                        <div>
                          <span className="text-sm font-medium text-gray-700">Additional Notes:</span>
                          <p className="text-sm text-gray-600 mt-1">{selectedRequest.additional_notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column - Timeline & Status */}
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-gray-900 mb-3">Status Timeline</h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Request Submitted</p>
                          <p className="text-xs text-gray-600">
                            {new Date(selectedRequest.request_time).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {selectedRequest.approved_at && (
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">Request Approved</p>
                            <p className="text-xs text-gray-600">
                              {new Date(selectedRequest.approved_at).toLocaleString()}
                            </p>
                            {selectedRequest.approved_by_name && (
                              <p className="text-xs text-gray-500">By: {selectedRequest.approved_by_name}</p>
                            )}
                          </div>
                        </div>
                      )}

                      {selectedRequest.dispatched_at && (
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">Ambulance Dispatched</p>
                            <p className="text-xs text-gray-600">
                              {new Date(selectedRequest.dispatched_at).toLocaleString()}
                            </p>
                            {selectedRequest.dispatched_by_name && (
                              <p className="text-xs text-gray-500">By: {selectedRequest.dispatched_by_name}</p>
                            )}
                          </div>
                        </div>
                      )}

                      {selectedRequest.arrived_at && (
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">Ambulance Arrived</p>
                            <p className="text-xs text-gray-600">
                              {new Date(selectedRequest.arrived_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      )}

                      {selectedRequest.in_transit_at && (
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">In Transit to Hospital</p>
                            <p className="text-xs text-gray-600">
                              {new Date(selectedRequest.in_transit_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      )}

                      {selectedRequest.completed_at && (
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 bg-green-600 rounded-full"></div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">Request Completed</p>
                            <p className="text-xs text-gray-600">
                              {new Date(selectedRequest.completed_at).toLocaleString()}
                            </p>
                            {selectedRequest.completed_by_name && (
                              <p className="text-xs text-gray-500">By: {selectedRequest.completed_by_name}</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedRequest.assigned_ambulance && (
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-blue-800 mb-3">Ambulance Information</h3>
                      <div className="space-y-2">
                        <div>
                          <span className="text-sm font-medium text-blue-700">Ambulance ID:</span>
                          <p className="text-sm text-blue-600 mt-1">{selectedRequest.assigned_ambulance}</p>
                        </div>
                        {selectedRequest.hospital_destination && (
                          <div>
                            <span className="text-sm font-medium text-blue-700">Hospital Destination:</span>
                            <p className="text-sm text-blue-600 mt-1">{selectedRequest.hospital_destination}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedRequest.approval_status === 'rejected' && (
                    <div className="bg-red-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-red-800 mb-3">Rejection Information</h3>
                      <div className="space-y-2">
                        {selectedRequest.rejection_reason && (
                          <div>
                            <span className="text-sm font-medium text-red-700">Reason:</span>
                            <p className="text-sm text-red-600 mt-1">{selectedRequest.rejection_reason}</p>
                          </div>
                        )}
                        {selectedRequest.approval_comments && (
                          <div>
                            <span className="text-sm font-medium text-red-700">Comments:</span>
                            <p className="text-sm text-red-600 mt-1">{selectedRequest.approval_comments}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedRequest.patient_details && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-gray-900 mb-3">Emergency Contact</h3>
                      <div className="space-y-2">
                        {selectedRequest.patient_details.emergency_contact_name && (
                          <div>
                            <span className="text-sm font-medium text-gray-700">Contact Name:</span>
                            <p className="text-sm text-gray-600 mt-1">{selectedRequest.patient_details.emergency_contact_name}</p>
                          </div>
                        )}
                        {selectedRequest.patient_details.emergency_contact_phone && (
                          <div>
                            <span className="text-sm font-medium text-gray-700">Contact Phone:</span>
                            <p className="text-sm text-gray-600 mt-1">{selectedRequest.patient_details.emergency_contact_phone}</p>
                          </div>
                        )}
                        {selectedRequest.patient_details.insurance_provider && (
                          <div>
                            <span className="text-sm font-medium text-gray-700">Insurance:</span>
                            <p className="text-sm text-gray-600 mt-1">{selectedRequest.patient_details.insurance_provider}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Emergency Ambulance Requests</h1>
            <p className="text-gray-600">Request emergency medical assistance and track your requests</p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Request Emergency Ambulance
          </button>
        </div>

        {/* Emergency Notice */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-800">Emergency Notice</h3>
              <p className="text-red-700 text-sm">
                If this is a life-threatening emergency, call <strong>911</strong> immediately. 
                This system is for requesting ambulance services and tracking existing requests.
              </p>
            </div>
          </div>
        </div>

        {/* Create Form Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-screen overflow-y-auto">
              <h2 className="text-xl font-bold mb-4">Request Emergency Ambulance</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Preferred Clinic (Optional)
                  </label>
                  <select
                    value={formData.clinic}
                    onChange={(e) => setFormData({...formData, clinic: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="">Select a clinic (optional)</option>
                    {clinics.map((clinic) => (
                      <option key={clinic.id} value={clinic.id}>
                        {clinic.name} - {clinic.address}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Select your preferred clinic if you have one. This helps with coordination.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Current Location *
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={formData.location}
                      onChange={(e) => setFormData({...formData, location: e.target.value})}
                      placeholder="Enter your exact location or nearest landmark"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                    <button
                      onClick={getCurrentLocation}
                      disabled={gettingLocation}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                    >
                      <Navigation className="w-4 h-4" />
                      {gettingLocation ? 'Getting...' : 'Get Location'}
                    </button>
                  </div>
                  {formData.gps_coordinates && (
                    <p className="text-xs text-green-600 mt-1">
                      GPS coordinates captured: {formData.gps_coordinates}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Medical Condition/Emergency *
                  </label>
                  <textarea
                    required
                    value={formData.condition_description}
                    onChange={(e) => setFormData({...formData, condition_description: e.target.value})}
                    placeholder="Describe your symptoms or medical emergency"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Suspected Condition (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.suspected_disease}
                    onChange={(e) => setFormData({...formData, suspected_disease: e.target.value})}
                    placeholder="If you know or suspect a specific condition"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Urgency Level
                  </label>
                  <select
                    value={formData.urgency_level}
                    onChange={(e) => setFormData({...formData, urgency_level: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="immediate">Immediate (Life-threatening)</option>
                    <option value="urgent">Urgent (Serious but not life-threatening)</option>
                    <option value="standard">Standard (Medical attention needed)</option>
                    <option value="non_urgent">Non-urgent (Can wait)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Additional Notes
                  </label>
                  <textarea
                    value={formData.additional_notes}
                    onChange={(e) => setFormData({...formData, additional_notes: e.target.value})}
                    placeholder="Any additional information that might help emergency responders"
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleSubmit}
                    disabled={creating}
                    className="flex-1 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    {creating ? 'Submitting...' : 'Submit Emergency Request'}
                  </button>
                  <button
                    onClick={() => setShowCreateForm(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Emergency Requests List */}
        <div className="space-y-4">
          {emergencyRequests.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Emergency Requests</h3>
              <p className="text-gray-600">You haven't submitted any emergency ambulance requests yet.</p>
            </div>
          ) : (
            emergencyRequests.map((request) => (
              <div key={request.id} className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Emergency Request #{request.id}</h3>
                      <p className="text-sm text-gray-500">
                        Submitted on {new Date(request.request_time).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${getUrgencyColor(request.urgency_level)}`}>
                      {request.urgency_level?.replace('_', ' ').toUpperCase() || 'STANDARD'}
                    </span>
                    {getStatusBadge(request.status, request.approval_status)}
                    <button
                      onClick={() => viewRequestDetails(request)}
                      className="text-blue-600 hover:text-blue-800 p-1"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-gray-400 mt-1" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Location</p>
                      <p className="text-sm text-gray-600">{request.location}</p>
                      {request.clinic_name && (
                        <p className="text-xs text-blue-600 mt-1">Clinic: {request.clinic_name}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <Clock className="w-4 h-4 text-gray-400 mt-1" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Status Timeline</p>
                      <div className="text-sm text-gray-600 space-y-1">
                        {request.approved_at && (
                          <div className="flex items-center gap-1">
                            <CheckCircle className="w-3 h-3 text-green-500" />
                            Approved: {new Date(request.approved_at).toLocaleString()}
                          </div>
                        )}
                        {request.dispatched_at && (
                          <div className="flex items-center gap-1">
                            <CheckCircle className="w-3 h-3 text-blue-500" />
                            Dispatched: {new Date(request.dispatched_at).toLocaleString()}
                          </div>
                        )}
                        {request.arrived_at && (
                          <div className="flex items-center gap-1">
                            <CheckCircle className="w-3 h-3 text-purple-500" />
                            Arrived: {new Date(request.arrived_at).toLocaleString()}
                          </div>
                        )}
                        {request.completed_at && (
                          <div className="flex items-center gap-1">
                            <CheckCircle className="w-3 h-3 text-green-600" />
                            Completed: {new Date(request.completed_at).toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <p className="text-sm font-medium text-gray-700 mb-1">Medical Condition</p>
                  <p className="text-sm text-gray-600 mb-2">{request.condition_description}</p>
                  
                  {request.suspected_disease && (
                    <>
                      <p className="text-sm font-medium text-gray-700 mb-1">Suspected Condition</p>
                      <p className="text-sm text-gray-600 mb-2">{request.suspected_disease}</p>
                    </>
                  )}

                  {request.assigned_ambulance && (
                    <div className="bg-blue-50 p-3 rounded-md">
                      <p className="text-sm font-medium text-blue-800">Ambulance Assigned</p>
                      <p className="text-sm text-blue-700">{request.assigned_ambulance}</p>
                      {request.hospital_destination && (
                        <p className="text-sm text-blue-700">Destination: {request.hospital_destination}</p>
                      )}
                    </div>
                  )}

                  {request.approval_status === 'rejected' && request.rejection_reason && (
                    <div className="bg-red-50 p-3 rounded-md">
                      <p className="text-sm font-medium text-red-800">Rejection Reason</p>
                      <p className="text-sm text-red-700">{request.rejection_reason}</p>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PatientEmergencyPage;
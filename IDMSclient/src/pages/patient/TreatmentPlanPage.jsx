import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  Clock, 
  Pill, 
  User, 
  FileText, 
  AlertCircle, 
  CheckCircle, 
  Plus, 
  Edit, 
  Trash2, 
  Save,
  X,
  Activity,
  Heart,
  Thermometer,
  Stethoscope,
  ArrowLeft,
  Loader
} from 'lucide-react';
import diagnosisService from '../services/diagnosisService';

const TreatmentPlanPage = () => {
  const { id } = useParams(); // Treatment plan ID or diagnosis ID
  const navigate = useNavigate();
  
  const [treatmentPlan, setTreatmentPlan] = useState(null);
  const [diagnosis, setDiagnosis] = useState(null);
  const [testResults, setTestResults] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [showAddMedication, setShowAddMedication] = useState(false);
  const [newMedication, setNewMedication] = useState({
    name: '',
    dosage: '',
    frequency: '',
    duration: '',
    instructions: ''
  });
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadTreatmentData();
  }, [id]);

  const loadTreatmentData = async () => {
    try {
      setLoading(true);
      setError(null);

      // First try to get treatment plan directly
      let treatmentPlanData = null;
      let diagnosisData = null;

      try {
        treatmentPlanData = await diagnosisService.treatmentPlans.get(id);
        if (treatmentPlanData.diagnosis) {
          diagnosisData = await diagnosisService.diagnoses.get(treatmentPlanData.diagnosis);
        }
      } catch (planError) {
        // If direct treatment plan fetch fails, try to get diagnosis and its treatment plan
        try {
          diagnosisData = await diagnosisService.diagnoses.get(id);
          if (diagnosisData) {
            treatmentPlanData = await diagnosisService.diagnoses.getTreatmentPlan(id);
          }
        } catch (diagnosisError) {
          throw new Error('Could not find treatment plan or diagnosis');
        }
      }

      if (!treatmentPlanData && diagnosisData) {
        // No treatment plan exists yet, create one
        const newPlan = await diagnosisService.treatmentPlans.create({
          diagnosis: diagnosisData.id,
          duration: '7 days',
          follow_up_required: diagnosisData.severity !== 'mild',
          follow_up_interval: diagnosisData.severity === 'critical' ? 1 : 7,
          medications: [],
          procedures: [],
          notes: `Initial treatment plan for ${diagnosisData.disease?.name || 'condition'}`
        });
        treatmentPlanData = newPlan;
      }

      if (!treatmentPlanData) {
        throw new Error('No treatment plan found');
      }

      setTreatmentPlan(treatmentPlanData);
      setDiagnosis(diagnosisData);

      // Initialize edit form
      setEditForm({
        duration: treatmentPlanData.duration || '7 days',
        follow_up_required: treatmentPlanData.follow_up_required || false,
        follow_up_interval: treatmentPlanData.follow_up_interval || 7,
        notes: treatmentPlanData.notes || ''
      });

      // Load test results if diagnosis exists
      if (diagnosisData?.id) {
        try {
          const results = await diagnosisService.testResults.getByDiagnosis(diagnosisData.id);
          setTestResults(Array.isArray(results) ? results : results.results || []);
        } catch (testError) {
          console.warn('Could not load test results:', testError.message);
          setTestResults([]);
        }
      }

    } catch (error) {
      console.error('Error loading treatment data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveChanges = async () => {
    try {
      setSaving(true);
      setError(null);

      const updatedPlan = await diagnosisService.treatmentPlans.update(treatmentPlan.id, editForm);
      setTreatmentPlan(updatedPlan);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update treatment plan:', error);
      setError('Failed to update treatment plan: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddMedication = async () => {
    const validation = diagnosisService.utils.validateMedication(newMedication);
    if (!validation.isValid) {
      setError(validation.errors.join(', '));
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const updatedPlan = await diagnosisService.treatmentPlans.addMedication(
        treatmentPlan.id, 
        newMedication
      );
      
      setTreatmentPlan(updatedPlan);
      setNewMedication({
        name: '',
        dosage: '',
        frequency: '',
        duration: '',
        instructions: ''
      });
      setShowAddMedication(false);
    } catch (error) {
      console.error('Failed to add medication:', error);
      setError('Failed to add medication: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMedication = async (medicationIndex) => {
    if (!confirm('Are you sure you want to remove this medication?')) return;

    try {
      setSaving(true);
      setError(null);

      const updatedMedications = treatmentPlan.medications.filter((_, index) => index !== medicationIndex);
      const updatedPlan = await diagnosisService.treatmentPlans.update(treatmentPlan.id, {
        medications: updatedMedications
      });
      
      setTreatmentPlan(updatedPlan);
    } catch (error) {
      console.error('Failed to remove medication:', error);
      setError('Failed to remove medication: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCompleteTreatment = async () => {
    if (!confirm('Are you sure you want to mark this treatment plan as completed?')) return;

    try {
      setSaving(true);
      setError(null);

      const completedPlan = await diagnosisService.treatmentPlans.complete(treatmentPlan.id);
      setTreatmentPlan(completedPlan);
    } catch (error) {
      console.error('Failed to complete treatment plan:', error);
      setError('Failed to complete treatment plan: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'mild': return 'text-yellow-600 bg-yellow-50';
      case 'moderate': return 'text-orange-600 bg-orange-50';
      case 'severe': return 'text-red-600 bg-red-50';
      case 'critical': return 'text-red-800 bg-red-100';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-50';
      case 'completed': return 'text-blue-600 bg-blue-50';
      case 'paused': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading treatment plan...</p>
        </div>
      </div>
    );
  }

  if (error && !treatmentPlan) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Treatment Plan</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center mx-auto px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Diagnoses
        </button>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              <p className="text-red-700">{error}</p>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-400 hover:text-red-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Treatment Plan - {diagnosis?.disease?.name || 'Medical Condition'}
              </h1>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                {diagnosis?.patient && (
                  <div className="flex items-center">
                    <User className="w-4 h-4 mr-1" />
                    Patient: {diagnosis.patient.first_name} {diagnosis.patient.last_name}
                  </div>
                )}
                {treatmentPlan?.supervising_doctor && (
                  <div className="flex items-center">
                    <Stethoscope className="w-4 h-4 mr-1" />
                    Doctor: {treatmentPlan.supervising_doctor.first_name} {treatmentPlan.supervising_doctor.last_name}
                  </div>
                )}
                {diagnosis?.severity && (
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(diagnosis.severity)}`}>
                    {diagnosis.severity}
                  </span>
                )}
                {treatmentPlan?.status && (
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(treatmentPlan.status)}`}>
                    {treatmentPlan.status}
                  </span>
                )}
              </div>
            </div>
            <div className="flex space-x-3">
              {treatmentPlan?.status === 'active' && (
                <>
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    disabled={saving}
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    {isEditing ? 'Cancel Edit' : 'Edit Plan'}
                  </button>
                  <button
                    onClick={handleCompleteTreatment}
                    className="flex items-center px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                    disabled={saving}
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Complete Treatment
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'overview', label: 'Overview', icon: FileText },
                { id: 'medications', label: 'Medications', icon: Pill },
                { id: 'tests', label: 'Test Results', icon: Activity },
                { id: 'progress', label: 'Progress', icon: Calendar }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="w-4 h-4 mr-2" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-3">Treatment Duration</h3>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.duration}
                        onChange={(e) => setEditForm(prev => ({ ...prev, duration: e.target.value }))}
                        className="w-full p-2 border border-gray-300 rounded-md"
                        placeholder="e.g., 7 days"
                      />
                    ) : (
                      <p className="text-gray-700">{treatmentPlan?.duration || 'Not specified'}</p>
                    )}
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-3">Follow-up Required</h3>
                    {isEditing ? (
                      <div className="space-y-2">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={editForm.follow_up_required}
                            onChange={(e) => setEditForm(prev => ({ ...prev, follow_up_required: e.target.checked }))}
                            className="mr-2"
                          />
                          Follow-up required
                        </label>
                        {editForm.follow_up_required && (
                          <input
                            type="number"
                            value={editForm.follow_up_interval}
                            onChange={(e) => setEditForm(prev => ({ ...prev, follow_up_interval: parseInt(e.target.value) }))}
                            className="w-full p-2 border border-gray-300 rounded-md"
                            placeholder="Days until follow-up"
                          />
                        )}
                      </div>
                    ) : (
                      <p className="text-gray-700">
                        {treatmentPlan?.follow_up_required 
                          ? `Yes, in ${treatmentPlan.follow_up_interval} days`
                          : 'No follow-up required'
                        }
                      </p>
                    )}
                  </div>
                </div>

                {treatmentPlan?.procedures && treatmentPlan.procedures.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-3">Procedures</h3>
                    <ul className="space-y-2">
                      {treatmentPlan.procedures.map((procedure, index) => (
                        <li key={index} className="flex items-center text-gray-700">
                          <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                          {procedure}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Clinical Notes</h3>
                  {isEditing ? (
                    <textarea
                      value={editForm.notes}
                      onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                      className="w-full p-3 border border-gray-300 rounded-md h-24"
                      placeholder="Enter clinical notes..."
                    />
                  ) : (
                    <p className="text-gray-700">{treatmentPlan?.notes || 'No notes available'}</p>
                  )}
                </div>

                {isEditing && (
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                      disabled={saving}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveChanges}
                      disabled={saving}
                      className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      <Save className="w-4 h-4 mr-1" />
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Medications Tab */}
            {activeTab === 'medications' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900">Current Medications</h3>
                  {treatmentPlan?.status === 'active' && (
                    <button
                      onClick={() => setShowAddMedication(true)}
                      className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      disabled={saving}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Medication
                    </button>
                  )}
                </div>

                {/* Add Medication Form */}
                {showAddMedication && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-semibold text-gray-900">Add New Medication</h4>
                      <button
                        onClick={() => setShowAddMedication(false)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input
                        type="text"
                        placeholder="Medication name *"
                        value={newMedication.name}
                        onChange={(e) => setNewMedication(prev => ({ ...prev, name: e.target.value }))}
                        className="p-2 border border-gray-300 rounded-md"
                      />
                      <input
                        type="text"
                        placeholder="Dosage *"
                        value={newMedication.dosage}
                        onChange={(e) => setNewMedication(prev => ({ ...prev, dosage: e.target.value }))}
                        className="p-2 border border-gray-300 rounded-md"
                      />
                      <input
                        type="text"
                        placeholder="Frequency *"
                        value={newMedication.frequency}
                        onChange={(e) => setNewMedication(prev => ({ ...prev, frequency: e.target.value }))}
                        className="p-2 border border-gray-300 rounded-md"
                      />
                      <input
                        type="text"
                        placeholder="Duration"
                        value={newMedication.duration}
                        onChange={(e) => setNewMedication(prev => ({ ...prev, duration: e.target.value }))}
                        className="p-2 border border-gray-300 rounded-md"
                      />
                      <textarea
                        placeholder="Special instructions"
                        value={newMedication.instructions}
                        onChange={(e) => setNewMedication(prev => ({ ...prev, instructions: e.target.value }))}
                        className="p-2 border border-gray-300 rounded-md md:col-span-2"
                        rows="2"
                      />
                    </div>
                    <div className="flex justify-end space-x-3 mt-4">
                      <button
                        onClick={() => setShowAddMedication(false)}
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                        disabled={saving}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleAddMedication}
                        disabled={saving}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                      >
                        {saving ? 'Adding...' : 'Add Medication'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Medications List */}
                <div className="space-y-4">
                  {treatmentPlan?.medications && treatmentPlan.medications.length > 0 ? (
                    treatmentPlan.medications.map((medication, index) => (
                      <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center mb-2">
                              <Pill className="w-5 h-5 text-blue-500 mr-2" />
                              <h4 className="font-semibold text-gray-900">{medication.name}</h4>
                              <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                Active
                              </span>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="font-medium text-gray-600">Dosage:</span>
                                <p className="text-gray-900">{medication.dosage}</p>
                              </div>
                              <div>
                                <span className="font-medium text-gray-600">Frequency:</span>
                                <p className="text-gray-900">{medication.frequency}</p>
                              </div>
                              <div>
                                <span className="font-medium text-gray-600">Duration:</span>
                                <p className="text-gray-900">{medication.duration || 'Not specified'}</p>
                              </div>
                              <div>
                                <span className="font-medium text-gray-600">Instructions:</span>
                                <p className="text-gray-900">{medication.instructions || 'None'}</p>
                              </div>
                            </div>
                          </div>
                          {treatmentPlan?.status === 'active' && (
                            <button
                              onClick={() => handleRemoveMedication(index)}
                              className="ml-4 p-2 text-red-500 hover:bg-red-50 rounded-md"
                              title="Remove medication"
                              disabled={saving}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Pill className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No medications prescribed yet</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Test Results Tab */}
            {activeTab === 'tests' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">Test Results</h3>
                
                <div className="space-y-4">
                  {testResults && testResults.length > 0 ? (
                    testResults.map((result, index) => (
                      <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-semibold text-gray-900">{result.test?.name || 'Test Result'}</h4>
                            <p className="text-sm text-gray-600">
                              Performed on {formatDate(result.performed_at)}
                              {result.performed_by && ` by ${result.performed_by.first_name} ${result.performed_by.last_name}`}
                            </p>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            result.result?.toLowerCase().includes('normal') ? 'bg-green-100 text-green-800' :
                            result.result?.toLowerCase().includes('abnormal') ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {result.result}
                          </span>
                        </div>
                        
                        {result.notes && (
                          <div className="bg-gray-50 rounded p-3">
                            <p className="text-sm text-gray-700">{result.notes}</p>
                          </div>
                        )}
                        
                        {result.reference_range && (
                          <div className="mt-2 text-sm text-gray-600">
                            <span className="font-medium">Reference Range:</span> {result.reference_range}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No test results available</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Progress Tab */}
            {activeTab === 'progress' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">Treatment Progress</h3>
                
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="text-center">
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${
                      treatmentPlan?.status === 'completed' 
                        ? 'bg-blue-100' 
                        : 'bg-green-100'
                    }`}>
                      <CheckCircle className={`w-10 h-10 ${
                        treatmentPlan?.status === 'completed' 
                          ? 'text-blue-600' 
                          : 'text-green-600'
                      }`} />
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">
                      {treatmentPlan?.status === 'completed' 
                        ? 'Treatment Completed' 
                        : 'Treatment In Progress'
                      }
                    </h4>
                    <p className="text-gray-600 mb-4">
                      {treatmentPlan?.status === 'completed' 
                        ? 'This treatment plan has been successfully completed.'
                        : 'Treatment is currently active and being monitored.'
                      }
                    </p>
                    
                    {treatmentPlan?.follow_up_required && treatmentPlan.status !== 'completed' && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 inline-block">
                        <div className="flex items-center">
                          <Calendar className="w-5 h-5 text-blue-600 mr-2" />
                          <span className="text-blue-800 font-medium">
                            Next Follow-up: {treatmentPlan.follow_up_interval} days from start
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="text-sm font-medium text-gray-600">Created</div>
                        <div className="text-lg font-semibold text-gray-900">
                          {formatDate(treatmentPlan?.created_at)}
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="text-sm font-medium text-gray-600">Last Updated</div>
                        <div className="text-lg font-semibold text-gray-900">
                          {formatDate(treatmentPlan?.updated_at)}
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="text-sm font-medium text-gray-600">Duration</div>
                        <div className="text-lg font-semibold text-gray-900">
                          {treatmentPlan?.duration || 'Not specified'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Treatment Timeline */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Treatment Timeline</h4>
                  <div className="space-y-4">
                    <div className="flex items-start">
                      <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="ml-3">
                        <p className="font-medium text-gray-900">Treatment Plan Created</p>
                        <p className="text-sm text-gray-600">{formatDate(treatmentPlan?.created_at)}</p>
                      </div>
                    </div>
                    
                    {treatmentPlan?.medications && treatmentPlan.medications.length > 0 && (
                      <div className="flex items-start">
                        <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <Pill className="w-4 h-4 text-green-600" />
                        </div>
                        <div className="ml-3">
                          <p className="font-medium text-gray-900">Medications Prescribed</p>
                          <p className="text-sm text-gray-600">{treatmentPlan.medications.length} medication(s) prescribed</p>
                        </div>
                      </div>
                    )}
                    
                    {testResults && testResults.length > 0 && (
                      <div className="flex items-start">
                        <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                          <Activity className="w-4 h-4 text-purple-600" />
                        </div>
                        <div className="ml-3">
                          <p className="font-medium text-gray-900">Test Results Available</p>
                          <p className="text-sm text-gray-600">{testResults.length} test result(s) recorded</p>
                        </div>
                      </div>
                    )}

                    {treatmentPlan?.status === 'completed' && (
                      <div className="flex items-start">
                        <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <CheckCircle className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="ml-3">
                          <p className="font-medium text-gray-900">Treatment Completed</p>
                          <p className="text-sm text-gray-600">{formatDate(treatmentPlan?.completed_at)}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Vital Signs Summary (if available from diagnosis) */}
                {diagnosis && (diagnosis.temperature || diagnosis.heart_rate || diagnosis.blood_pressure) && (
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Initial Vital Signs</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {diagnosis.temperature && (
                        <div className="flex items-center p-3 bg-red-50 rounded-lg">
                          <Thermometer className="w-5 h-5 text-red-500 mr-3" />
                          <div>
                            <div className="text-sm font-medium text-gray-600">Temperature</div>
                            <div className="text-lg font-semibold text-gray-900">{diagnosis.temperature}°F</div>
                          </div>
                        </div>
                      )}
                      
                      {diagnosis.heart_rate && (
                        <div className="flex items-center p-3 bg-pink-50 rounded-lg">
                          <Heart className="w-5 h-5 text-pink-500 mr-3" />
                          <div>
                            <div className="text-sm font-medium text-gray-600">Heart Rate</div>
                            <div className="text-lg font-semibold text-gray-900">{diagnosis.heart_rate} BPM</div>
                          </div>
                        </div>
                      )}
                      
                      {diagnosis.blood_pressure && (
                        <div className="flex items-center p-3 bg-blue-50 rounded-lg">
                          <Activity className="w-5 h-5 text-blue-500 mr-3" />
                          <div>
                            <div className="text-sm font-medium text-gray-600">Blood Pressure</div>
                            <div className="text-lg font-semibold text-gray-900">{diagnosis.blood_pressure}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TreatmentPlanPage;
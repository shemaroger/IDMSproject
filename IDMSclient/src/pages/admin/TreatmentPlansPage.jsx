import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import diagnosisService from '../../services/diagnosisService';
import { Plus, Search, Edit, Trash2, Eye, Filter, Clock, CheckCircle, User, Calendar, Pill } from 'lucide-react';

const TreatmentPlansPage = () => {
  const [plans, setPlans] = useState([]);
  const [diagnoses, setDiagnoses] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMedicationModal, setShowMedicationModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [plansResponse, diagnosesResponse, doctorsResponse] = await Promise.all([
        diagnosisService.treatmentPlans.list(),
        diagnosisService.diagnoses.list(),
        diagnosisService.doctors.list()
      ]);
      
      setPlans(plansResponse.results || plansResponse);
      setDiagnoses(diagnosesResponse.results || diagnosesResponse);
      setDoctors(doctorsResponse.results || doctorsResponse);
    } catch (error) {
      setError('Failed to fetch data');
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async (planId) => {
    if (!window.confirm('Are you sure you want to mark this treatment as completed?')) return;
    
    try {
      await diagnosisService.treatmentPlans.complete(planId);
      fetchData();
    } catch (error) {
      setError('Failed to complete treatment plan');
    }
  };

  const handleDelete = async (planId) => {
    if (!window.confirm('Are you sure you want to delete this treatment plan?')) return;
    
    try {
      await diagnosisService.treatmentPlans.delete(planId);
      setPlans(plans.filter(plan => plan.id !== planId));
    } catch (error) {
      setError('Failed to delete treatment plan');
    }
  };

  const getStatusColor = (duration) => {
    if (duration === 'Completed') return 'bg-green-100 text-green-800';
    return 'bg-blue-100 text-blue-800';
  };

  const filteredPlans = plans.filter(plan => {
    const diagnosis = diagnoses.find(d => d.id === plan.diagnosis);
    const doctor = doctors.find(d => d.id === plan.supervising_doctor);
    
    const matchesSearch = 
      diagnosis?.disease_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doctor?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doctor?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plan.instructions?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'completed' && plan.duration === 'Completed') ||
      (statusFilter === 'active' && plan.duration !== 'Completed');
    
    return matchesSearch && matchesStatus;
  });

  const TreatmentPlanCard = ({ plan }) => {
    const diagnosis = diagnoses.find(d => d.id === plan.diagnosis);
    const doctor = doctors.find(d => d.id === plan.supervising_doctor);
    
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {diagnosis?.disease_name || 'Unknown Diagnosis'}
            </h3>
            <div className="flex items-center space-x-4 mt-2">
              <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(plan.duration)}`}>
                {plan.duration}
              </span>
              {plan.follow_up_required && (
                <span className="inline-flex items-center text-xs text-orange-600">
                  <Clock className="w-3 h-3 mr-1" />
                  Follow-up required
                </span>
              )}
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setSelectedPlan(plan)}
              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              onClick={() => {setSelectedPlan(plan); setShowMedicationModal(true);}}
              className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
              title="Add Medication"
            >
              <Pill className="w-4 h-4" />
            </button>
            <button
              onClick={() => {setSelectedPlan(plan); setShowCreateModal(true);}}
              className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
            >
              <Edit className="w-4 h-4" />
            </button>
            {plan.duration !== 'Completed' && (
              <button
                onClick={() => handleComplete(plan.id)}
                className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                title="Mark as Completed"
              >
                <CheckCircle className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => handleDelete(plan.id)}
              className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex items-center">
            <User className="w-4 h-4 mr-2" />
            <span>Dr. {doctor?.first_name} {doctor?.last_name}</span>
          </div>
          <div className="flex items-center">
            <Calendar className="w-4 h-4 mr-2" />
            <span>Created: {new Date(plan.created_at).toLocaleDateString()}</span>
          </div>
          {plan.follow_up_required && (
            <div className="flex items-center">
              <Clock className="w-4 h-4 mr-2" />
              <span>Follow-up every {plan.follow_up_interval} days</span>
            </div>
          )}
        </div>

        {plan.medications?.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Medications:</h4>
            <div className="space-y-1">
              {plan.medications.slice(0, 2).map((med, index) => (
                <div key={index} className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                  <strong>{med.name}</strong> - {med.dosage} ({med.frequency})
                </div>
              ))}
              {plan.medications.length > 2 && (
                <div className="text-xs text-gray-500">
                  +{plan.medications.length - 2} more medications
                </div>
              )}
            </div>
          </div>
        )}

        {plan.instructions && (
          <div className="mt-4">
            <p className="text-sm text-gray-600 line-clamp-3">{plan.instructions}</p>
          </div>
        )}
      </div>
    );
  };

  const CreatePlanModal = () => {
    const [formData, setFormData] = useState({
      diagnosis: selectedPlan?.diagnosis || '',
      duration: selectedPlan?.duration || '',
      follow_up_required: selectedPlan?.follow_up_required || false,
      follow_up_interval: selectedPlan?.follow_up_interval || '',
      instructions: selectedPlan?.instructions || ''
    });
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
      e.preventDefault();
      setSubmitting(true);
      
      try {
        const validation = diagnosisService.utils.validateTreatmentPlan(formData);
        if (!validation.isValid) {
          setError(validation.errors.join(', '));
          return;
        }

        if (selectedPlan) {
          await diagnosisService.treatmentPlans.update(selectedPlan.id, formData);
        } else {
          await diagnosisService.treatmentPlans.create(formData);
        }
        fetchData();
        setShowCreateModal(false);
        setSelectedPlan(null);
        setError('');
      } catch (error) {
        setError('Failed to save treatment plan');
      } finally {
        setSubmitting(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <h2 className="text-xl font-semibold mb-4">
            {selectedPlan ? 'Edit Treatment Plan' : 'Create New Treatment Plan'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Diagnosis
              </label>
              <select
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={formData.diagnosis}
                onChange={(e) => setFormData({...formData, diagnosis: e.target.value})}
              >
                <option value="">Select Diagnosis</option>
                {diagnoses.map(diagnosis => (
                  <option key={diagnosis.id} value={diagnosis.id}>
                    {diagnosis.disease_name} - {diagnosis.patient_name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duration
              </label>
              <input
                type="text"
                required
                placeholder="e.g., 2 weeks, 1 month"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={formData.duration}
                onChange={(e) => setFormData({...formData, duration: e.target.value})}
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="follow_up_required"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                checked={formData.follow_up_required}
                onChange={(e) => setFormData({...formData, follow_up_required: e.target.checked})}
              />
              <label htmlFor="follow_up_required" className="ml-2 block text-sm text-gray-900">
                Follow-up required
              </label>
            </div>

            {formData.follow_up_required && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Follow-up Interval (days)
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={formData.follow_up_interval}
                  onChange={(e) => setFormData({...formData, follow_up_interval: e.target.value})}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Instructions
              </label>
              <textarea
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={formData.instructions}
                onChange={(e) => setFormData({...formData, instructions: e.target.value})}
                placeholder="Treatment instructions, precautions, etc."
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => {setShowCreateModal(false); setSelectedPlan(null); setError('');}}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {submitting ? 'Saving...' : (selectedPlan ? 'Update' : 'Create')}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const AddMedicationModal = () => {
    const [medicationData, setMedicationData] = useState({
      name: '',
      dosage: '',
      frequency: ''
    });
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
      e.preventDefault();
      setSubmitting(true);
      
      try {
        const validation = diagnosisService.utils.validateMedication(medicationData);
        if (!validation.isValid) {
          setError(validation.errors.join(', '));
          return;
        }

        await diagnosisService.treatmentPlans.addMedication(selectedPlan.id, medicationData);
        fetchData();
        setShowMedicationModal(false);
        setSelectedPlan(null);
        setError('');
      } catch (error) {
        setError('Failed to add medication');
      } finally {
        setSubmitting(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <h2 className="text-xl font-semibold mb-4">Add Medication</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Medication Name
              </label>
              <input
                type="text"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={medicationData.name}
                onChange={(e) => setMedicationData({...medicationData, name: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dosage
              </label>
              <input
                type="text"
                required
                placeholder="e.g., 500mg, 2 tablets"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={medicationData.dosage}
                onChange={(e) => setMedicationData({...medicationData, dosage: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Frequency
              </label>
              <input
                type="text"
                required
                placeholder="e.g., Twice daily, Every 8 hours"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={medicationData.frequency}
                onChange={(e) => setMedicationData({...medicationData, frequency: e.target.value})}
              />
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => {setShowMedicationModal(false); setSelectedPlan(null); setError('');}}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {submitting ? 'Adding...' : 'Add Medication'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Treatment Plans</h1>
            <p className="text-gray-600">Manage patient treatment plans and medications</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create Plan</span>
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search plans..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <select
              className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Plans Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredPlans.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No treatment plans found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredPlans.map(plan => (
              <TreatmentPlanCard key={plan.id} plan={plan} />
            ))}
          </div>
        )}

        {/* Create/Edit Modal */}
        {showCreateModal && <CreatePlanModal />}

        {/* Add Medication Modal */}
        {showMedicationModal && <AddMedicationModal />}

        {/* View Details Modal */}
        {selectedPlan && !showCreateModal && !showMedicationModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-semibold mb-4">Treatment Plan Details</h2>
              <div className="space-y-4">
                <div>
                  <strong className="text-gray-700">Diagnosis:</strong>
                  <p className="text-gray-900">{diagnoses.find(d => d.id === selectedPlan.diagnosis)?.disease_name}</p>
                </div>
                <div>
                  <strong className="text-gray-700">Supervising Doctor:</strong>
                  <p className="text-gray-900">Dr. {doctors.find(d => d.id === selectedPlan.supervising_doctor)?.first_name} {doctors.find(d => d.id === selectedPlan.supervising_doctor)?.last_name}</p>
                </div>
                <div>
                  <strong className="text-gray-700">Duration:</strong>
                  <p className="text-gray-900">{selectedPlan.duration}</p>
                </div>
                <div>
                  <strong className="text-gray-700">Follow-up:</strong>
                  <p className="text-gray-900">
                    {selectedPlan.follow_up_required 
                      ? `Every ${selectedPlan.follow_up_interval} days` 
                      : 'Not required'
                    }
                  </p>
                </div>
                {selectedPlan.instructions && (
                  <div>
                    <strong className="text-gray-700">Instructions:</strong>
                    <p className="text-gray-900">{selectedPlan.instructions}</p>
                  </div>
                )}
                {selectedPlan.medications?.length > 0 && (
                  <div>
                    <strong className="text-gray-700">Medications:</strong>
                    <div className="mt-2 space-y-2">
                      {selectedPlan.medications.map((med, index) => (
                        <div key={index} className="bg-gray-50 p-3 rounded">
                          <div className="font-medium">{med.name}</div>
                          <div className="text-sm text-gray-600">
                            Dosage: {med.dosage} | Frequency: {med.frequency}
                          </div>
                          {med.added_at && (
                            <div className="text-xs text-gray-500">
                              Added: {new Date(med.added_at).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {selectedPlan.procedures?.length > 0 && (
                  <div>
                    <strong className="text-gray-700">Procedures:</strong>
                    <div className="mt-2 space-y-2">
                      {selectedPlan.procedures.map((proc, index) => (
                        <div key={index} className="bg-gray-50 p-3 rounded">
                          <div className="font-medium">{proc.name}</div>
                          <div className="text-sm text-gray-600">{proc.description}</div>
                          {proc.scheduled_date && (
                            <div className="text-xs text-gray-500">
                              Scheduled: {new Date(proc.scheduled_date).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setSelectedPlan(null)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default TreatmentPlansPage;
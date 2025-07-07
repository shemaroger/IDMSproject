import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import diagnosisService from '../../services/diagnosisService';
import { Search, Filter, Clock, CheckCircle, XCircle, User, Calendar, FileText, Eye, AlertCircle } from 'lucide-react';

const DoctorCasesPage = () => {
  const [cases, setCases] = useState([]);
  const [activeCases, setActiveCases] = useState([]);
  const [pendingCases, setPendingCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState('all'); // all, active, pending
  const [selectedCase, setSelectedCase] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [confirmationData, setConfirmationData] = useState({
    notes: '',
    treatment_recommended: true
  });
  const [rejectionData, setRejectionData] = useState({
    reason: '',
    notes: ''
  });
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCases();
  }, []);

  const fetchCases = async () => {
    try {
      setLoading(true);
      const [allCasesResponse, activeCasesResponse, pendingCasesResponse] = await Promise.all([
        diagnosisService.doctors.getCases(),
        diagnosisService.doctors.getActiveCases(),
        diagnosisService.doctors.getPendingCases()
      ]);
      
      setCases(allCasesResponse.results || allCasesResponse);
      setActiveCases(activeCasesResponse.results || activeCasesResponse);
      setPendingCases(pendingCasesResponse.results || pendingCasesResponse);
    } catch (error) {
      setError('Failed to fetch cases');
      console.error('Error fetching cases:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDiagnosis = async () => {
    try {
      await diagnosisService.diagnoses.confirm(selectedCase.id, confirmationData);
      fetchCases();
      setShowConfirmModal(false);
      setSelectedCase(null);
      setConfirmationData({ notes: '', treatment_recommended: true });
    } catch (error) {
      setError('Failed to confirm diagnosis');
    }
  };

  const handleRejectDiagnosis = async () => {
    try {
      await diagnosisService.diagnoses.reject(selectedCase.id, rejectionData);
      fetchCases();
      setShowRejectModal(false);
      setSelectedCase(null);
      setRejectionData({ reason: '', notes: '' });
    } catch (error) {
      setError('Failed to reject diagnosis');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'self_reported': 'bg-yellow-100 text-yellow-800',
      'doctor_confirmed': 'bg-green-100 text-green-800',
      'rejected': 'bg-red-100 text-red-800',
      'under_review': 'bg-blue-100 text-blue-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'self_reported':
        return <Clock className="w-4 h-4" />;
      case 'doctor_confirmed':
        return <CheckCircle className="w-4 h-4" />;
      case 'rejected':
        return <XCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getCurrentCases = () => {
    switch (viewMode) {
      case 'active':
        return activeCases;
      case 'pending':
        return pendingCases;
      default:
        return cases;
    }
  };

  const filteredCases = getCurrentCases().filter(caseItem => {
    const matchesSearch = 
      caseItem.disease_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      caseItem.patient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      caseItem.symptoms?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || caseItem.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const CaseCard = ({ caseItem }) => (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {caseItem.disease_name}
          </h3>
          <div className="flex items-center space-x-2 mt-2">
            <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(caseItem.status)}`}>
              {getStatusIcon(caseItem.status)}
              <span className="ml-1 capitalize">{caseItem.status.replace('_', ' ')}</span>
            </span>
            <span className="text-xs text-gray-500">
              Confidence: {caseItem.confidence_score}%
            </span>
          </div>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setSelectedCase(caseItem)}
            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Eye className="w-4 h-4" />
          </button>
          {caseItem.status === 'self_reported' && (
            <>
              <button
                onClick={() => {setSelectedCase(caseItem); setShowConfirmModal(true);}}
                className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                title="Confirm Diagnosis"
              >
                <CheckCircle className="w-4 h-4" />
              </button>
              <button
                onClick={() => {setSelectedCase(caseItem); setShowRejectModal(true);}}
                className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Reject Diagnosis"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="space-y-2 text-sm text-gray-600">
        <div className="flex items-center">
          <User className="w-4 h-4 mr-2" />
          <span>Patient: {caseItem.patient_name}</span>
        </div>
        <div className="flex items-center">
          <Calendar className="w-4 h-4 mr-2" />
          <span>Created: {new Date(caseItem.created_at).toLocaleDateString()}</span>
        </div>
        {caseItem.treating_doctor_name && (
          <div className="flex items-center">
            <User className="w-4 h-4 mr-2" />
            <span>Treating Doctor: {caseItem.treating_doctor_name}</span>
          </div>
        )}
      </div>

      {caseItem.symptoms && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Symptoms:</h4>
          <p className="text-sm text-gray-600 line-clamp-2">{caseItem.symptoms}</p>
        </div>
      )}

      {caseItem.analysis_notes && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Analysis:</h4>
          <p className="text-sm text-gray-600 line-clamp-2">{caseItem.analysis_notes}</p>
        </div>
      )}
    </div>
  );

  const ConfirmModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Confirm Diagnosis</h2>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-2">
              Are you sure you want to confirm this diagnosis for <strong>{selectedCase?.patient_name}</strong>?
            </p>
            <p className="text-sm text-gray-600">
              Disease: <strong>{selectedCase?.disease_name}</strong>
            </p>
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="treatment_recommended"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              checked={confirmationData.treatment_recommended}
              onChange={(e) => setConfirmationData({...confirmationData, treatment_recommended: e.target.checked})}
            />
            <label htmlFor="treatment_recommended" className="ml-2 block text-sm text-gray-900">
              Recommend treatment plan
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Additional Notes
            </label>
            <textarea
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={confirmationData.notes}
              onChange={(e) => setConfirmationData({...confirmationData, notes: e.target.value})}
              placeholder="Any additional notes or observations..."
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={() => {setShowConfirmModal(false); setSelectedCase(null);}}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmDiagnosis}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Confirm Diagnosis
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const RejectModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Reject Diagnosis</h2>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-2">
              Why are you rejecting this diagnosis for <strong>{selectedCase?.patient_name}</strong>?
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason for Rejection
            </label>
            <select
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={rejectionData.reason}
              onChange={(e) => setRejectionData({...rejectionData, reason: e.target.value})}
            >
              <option value="">Select reason</option>
              <option value="insufficient_symptoms">Insufficient symptoms</option>
              <option value="incorrect_diagnosis">Incorrect diagnosis</option>
              <option value="requires_further_testing">Requires further testing</option>
              <option value="symptoms_suggest_different_condition">Symptoms suggest different condition</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Additional Notes
            </label>
            <textarea
              rows={3}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={rejectionData.notes}
              onChange={(e) => setRejectionData({...rejectionData, notes: e.target.value})}
              placeholder="Explain your reasoning and any recommendations..."
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={() => {setShowRejectModal(false); setSelectedCase(null);}}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleRejectDiagnosis}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Reject Diagnosis
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Cases</h1>
            <p className="text-gray-600">Review and manage patient diagnoses</p>
          </div>
          <div className="flex space-x-2">
            <span className="text-sm text-gray-500">
              Total: {cases.length} | Active: {activeCases.length} | Pending: {pendingCases.length}
            </span>
          </div>
        </div>

        {/* View Mode Tabs */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
          <button
            onClick={() => setViewMode('all')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'all' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            All Cases ({cases.length})
          </button>
          <button
            onClick={() => setViewMode('pending')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'pending' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Pending Review ({pendingCases.length})
          </button>
          <button
            onClick={() => setViewMode('active')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'active' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Active Cases ({activeCases.length})
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search cases..."
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
              <option value="self_reported">Self Reported</option>
              <option value="doctor_confirmed">Doctor Confirmed</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Cases Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredCases.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">
              {searchTerm || statusFilter !== 'all' ? 'No cases match your filters' : 'No cases found'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredCases.map(caseItem => (
              <CaseCard key={caseItem.id} caseItem={caseItem} />
            ))}
          </div>
        )}

        {/* Modals */}
        {showConfirmModal && <ConfirmModal />}
        {showRejectModal && <RejectModal />}

        {/* Case Details Modal */}
        {selectedCase && !showConfirmModal && !showRejectModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-semibold mb-4">Case Details</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <strong className="text-gray-700">Patient:</strong>
                    <p className="text-gray-900">{selectedCase.patient_name}</p>
                  </div>
                  <div>
                    <strong className="text-gray-700">Disease:</strong>
                    <p className="text-gray-900">{selectedCase.disease_name}</p>
                  </div>
                  <div>
                    <strong className="text-gray-700">Status:</strong>
                    <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedCase.status)}`}>
                      {getStatusIcon(selectedCase.status)}
                      <span className="ml-1 capitalize">{selectedCase.status.replace('_', ' ')}</span>
                    </span>
                  </div>
                  <div>
                    <strong className="text-gray-700">Confidence:</strong>
                    <p className="text-gray-900">{selectedCase.confidence_score}%</p>
                  </div>
                </div>
                
                <div>
                  <strong className="text-gray-700">Created:</strong>
                  <p className="text-gray-900">{new Date(selectedCase.created_at).toLocaleString()}</p>
                </div>

                {selectedCase.treating_doctor_name && (
                  <div>
                    <strong className="text-gray-700">Treating Doctor:</strong>
                    <p className="text-gray-900">{selectedCase.treating_doctor_name}</p>
                  </div>
                )}

                {selectedCase.symptoms && (
                  <div>
                    <strong className="text-gray-700">Symptoms:</strong>
                    <p className="text-gray-900">{selectedCase.symptoms}</p>
                  </div>
                )}

                {selectedCase.analysis_notes && (
                  <div>
                    <strong className="text-gray-700">Analysis Notes:</strong>
                    <p className="text-gray-900">{selectedCase.analysis_notes}</p>
                  </div>
                )}

                {selectedCase.doctor_notes && (
                  <div>
                    <strong className="text-gray-700">Doctor Notes:</strong>
                    <p className="text-gray-900">{selectedCase.doctor_notes}</p>
                  </div>
                )}

                {selectedCase.rejection_reason && (
                  <div>
                    <strong className="text-gray-700">Rejection Reason:</strong>
                    <p className="text-red-600">{selectedCase.rejection_reason}</p>
                  </div>
                )}
              </div>
              
              <div className="flex justify-between mt-6">
                <div className="flex space-x-2">
                  {selectedCase.status === 'self_reported' && (
                    <>
                      <button
                        onClick={() => {setShowConfirmModal(true);}}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => {setShowRejectModal(true);}}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        Reject
                      </button>
                    </>
                  )}
                </div>
                <button
                  onClick={() => setSelectedCase(null)}
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

export default DoctorCasesPage;
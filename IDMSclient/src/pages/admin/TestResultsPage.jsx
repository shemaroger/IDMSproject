import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import diagnosisService from '../../services/diagnosisService';
import { Plus, Search, Edit, Trash2, Eye, Filter, Calendar, User, FileText, Activity } from 'lucide-react';

const TestResultsPage = () => {
  const [testResults, setTestResults] = useState([]);
  const [tests, setTests] = useState([]);
  const [diagnoses, setDiagnoses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [diagnosisFilter, setDiagnosisFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedResult, setSelectedResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch data with proper error handling for each endpoint
      const fetchPromises = [
        diagnosisService.testResults.list().catch(error => {
          console.warn('Test results fetch failed:', error);
          return { results: [], count: 0 };
        }),
        diagnosisService.medicalTests.list().catch(error => {
          console.warn('Medical tests fetch failed:', error);
          return { results: [], count: 0 };
        }),
        diagnosisService.diagnoses.list().catch(error => {
          console.warn('Diagnoses fetch failed:', error);
          return { results: [], count: 0 };
        })
      ];
      
      const [resultsResponse, testsResponse, diagnosesResponse] = await Promise.all(fetchPromises);
      
      setTestResults(Array.isArray(resultsResponse) ? resultsResponse : (resultsResponse.results || []));
      setTests(Array.isArray(testsResponse) ? testsResponse : (testsResponse.results || []));
      setDiagnoses(Array.isArray(diagnosesResponse) ? diagnosesResponse : (diagnosesResponse.results || []));
      
      // Show warning if any data is missing
      if ((!resultsResponse.results || resultsResponse.results.length === 0) && 
          (!diagnosesResponse.results || diagnosesResponse.results.length === 0)) {
        setError('No data available. Some backend endpoints may not be configured.');
      }
      
    } catch (error) {
      setError('Failed to fetch data: ' + error.message);
      console.error('Error fetching data:', error);
      // Ensure arrays are set even on error
      setTestResults([]);
      setTests([]);
      setDiagnoses([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (resultId) => {
    if (!window.confirm('Are you sure you want to delete this test result?')) return;
    
    try {
      await diagnosisService.testResults.delete(resultId);
      setTestResults(testResults.filter(result => result.id !== resultId));
    } catch (error) {
      setError('Failed to delete test result');
    }
  };

  const getTestTypeColor = (testType) => {
    const colors = {
      blood: 'bg-red-100 text-red-800',
      imaging: 'bg-blue-100 text-blue-800',
      physical: 'bg-green-100 text-green-800',
      other: 'bg-gray-100 text-gray-800'
    };
    return colors[testType] || colors.other;
  };

  const filteredResults = Array.isArray(testResults) ? testResults.filter(result => {
    const test = Array.isArray(tests) ? tests.find(t => t.id === result.test) : null;
    const diagnosis = Array.isArray(diagnoses) ? diagnoses.find(d => d.id === result.diagnosis) : null;
    
    const matchesSearch = 
      test?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      diagnosis?.disease_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      result.notes?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDiagnosis = diagnosisFilter === 'all' || result.diagnosis.toString() === diagnosisFilter;
    
    return matchesSearch && matchesDiagnosis;
  }) : [];

  const TestResultCard = ({ result }) => {
    const test = Array.isArray(tests) ? tests.find(t => t.id === result.test) : null;
    const diagnosis = Array.isArray(diagnoses) ? diagnoses.find(d => d.id === result.diagnosis) : null;
    
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {test?.name || `Test ID: ${result.test}`}
            </h3>
            <div className="flex items-center space-x-2 mt-2">
              <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getTestTypeColor(test?.test_type)}`}>
                {test?.test_type || 'Unknown'}
              </span>
              <span className="text-xs text-gray-500">
                {diagnosis?.disease_name || `Diagnosis ID: ${result.diagnosis}`}
              </span>
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setSelectedResult(result)}
              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              onClick={() => {setSelectedResult(result); setShowCreateModal(true);}}
              className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleDelete(result.id)}
              className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex items-center">
            <User className="w-4 h-4 mr-2" />
            <span>Patient: {diagnosis?.patient_name || 'Unknown'}</span>
          </div>
          <div className="flex items-center">
            <Calendar className="w-4 h-4 mr-2" />
            <span>Performed: {new Date(result.performed_at).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center">
            <Activity className="w-4 h-4 mr-2" />
            <span>By: {result.performed_by_name || 'Unknown'}</span>
          </div>
        </div>

        {result.result && (
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Results:</h4>
            <div className="bg-gray-50 p-3 rounded text-sm">
              {typeof result.result === 'object' ? (
                <pre className="whitespace-pre-wrap">{JSON.stringify(result.result, null, 2)}</pre>
              ) : (
                <span>{result.result}</span>
              )}
            </div>
          </div>
        )}

        {result.notes && (
          <div className="mt-4">
            <p className="text-sm text-gray-600">
              <FileText className="w-4 h-4 inline mr-1" />
              {result.notes}
            </p>
          </div>
        )}
      </div>
    );
  };

  const CreateResultModal = () => {
    const [formData, setFormData] = useState({
      diagnosis: selectedResult?.diagnosis || '',
      test: selectedResult?.test || '',
      result: selectedResult?.result ? JSON.stringify(selectedResult.result, null, 2) : '',
      notes: selectedResult?.notes || ''
    });
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
      e.preventDefault();
      setSubmitting(true);
      
      try {
        // Parse result if it's JSON
        let parsedResult = formData.result;
        try {
          parsedResult = JSON.parse(formData.result);
        } catch {
          // Keep as string if not valid JSON
        }

        const resultData = {
          ...formData,
          result: parsedResult
        };

        const validation = diagnosisService.utils.validateTestResult(resultData);
        if (!validation.isValid) {
          setError(validation.errors.join(', '));
          return;
        }

        if (selectedResult) {
          await diagnosisService.testResults.update(selectedResult.id, resultData);
        } else {
          await diagnosisService.testResults.create(resultData);
        }
        
        fetchData();
        setShowCreateModal(false);
        setSelectedResult(null);
        setError('');
      } catch (error) {
        setError('Failed to save test result');
      } finally {
        setSubmitting(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <h2 className="text-xl font-semibold mb-4">
            {selectedResult ? 'Edit Test Result' : 'Add New Test Result'}
          </h2>
          <div className="space-y-4">
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
                {Array.isArray(diagnoses) && diagnoses.map(diagnosis => (
                  <option key={diagnosis.id} value={diagnosis.id}>
                    {diagnosis.disease_name} - {diagnosis.patient_name}
                  </option>
                ))}
                {(!Array.isArray(diagnoses) || diagnoses.length === 0) && (
                  <option value="" disabled>No diagnoses available</option>
                )}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Test
              </label>
              <select
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={formData.test}
                onChange={(e) => setFormData({...formData, test: e.target.value})}
              >
                <option value="">Select Test</option>
                {Array.isArray(tests) && tests.map(test => (
                  <option key={test.id} value={test.id}>
                    {test.name} ({test.test_type})
                  </option>
                ))}
                {(!Array.isArray(tests) || tests.length === 0) && (
                  <option value="" disabled>No tests available</option>
                )}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Result
              </label>
              <textarea
                required
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                value={formData.result}
                onChange={(e) => setFormData({...formData, result: e.target.value})}
                placeholder='Enter result data (JSON format for structured data):\n{\n  "value": "120/80",\n  "unit": "mmHg",\n  "normal_range": "90-140/60-90"\n}'
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter as JSON for structured data or plain text for simple results
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Additional notes, observations, or recommendations"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => {setShowCreateModal(false); setSelectedResult(null); setError('');}}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {submitting ? 'Saving...' : (selectedResult ? 'Update' : 'Create')}
              </button>
            </div>
          </div>
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
            <h1 className="text-2xl font-bold text-gray-900">Test Results</h1>
            <p className="text-gray-600">Manage patient test results and lab reports</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Result</span>
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search results..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <select
              className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
              value={diagnosisFilter}
              onChange={(e) => setDiagnosisFilter(e.target.value)}
            >
              <option value="all">All Diagnoses</option>
              {Array.isArray(diagnoses) && diagnoses.map(diagnosis => (
                <option key={diagnosis.id} value={diagnosis.id}>
                  {diagnosis.disease_name} - {diagnosis.patient_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Results Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredResults.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No test results found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredResults.map(result => (
              <TestResultCard key={result.id} result={result} />
            ))}
          </div>
        )}

        {/* Create/Edit Modal */}
        {showCreateModal && <CreateResultModal />}

        {/* View Details Modal */}
        {selectedResult && !showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-semibold mb-4">Test Result Details</h2>
              <div className="space-y-4">
                <div>
                  <strong className="text-gray-700">Test:</strong>
                  <p className="text-gray-900">{tests.find(t => t.id === selectedResult.test)?.name}</p>
                </div>
                <div>
                  <strong className="text-gray-700">Test Type:</strong>
                  <p className="text-gray-900">{tests.find(t => t.id === selectedResult.test)?.test_type}</p>
                </div>
                <div>
                  <strong className="text-gray-700">Diagnosis:</strong>
                  <p className="text-gray-900">{diagnoses.find(d => d.id === selectedResult.diagnosis)?.disease_name}</p>
                </div>
                <div>
                  <strong className="text-gray-700">Patient:</strong>
                  <p className="text-gray-900">{diagnoses.find(d => d.id === selectedResult.diagnosis)?.patient_name}</p>
                </div>
                <div>
                  <strong className="text-gray-700">Performed At:</strong>
                  <p className="text-gray-900">{new Date(selectedResult.performed_at).toLocaleString()}</p>
                </div>
                <div>
                  <strong className="text-gray-700">Performed By:</strong>
                  <p className="text-gray-900">{selectedResult.performed_by_name || 'Unknown'}</p>
                </div>
                <div>
                  <strong className="text-gray-700">Result:</strong>
                  <div className="bg-gray-50 p-4 rounded mt-2">
                    {typeof selectedResult.result === 'object' ? (
                      <pre className="text-sm whitespace-pre-wrap">{JSON.stringify(selectedResult.result, null, 2)}</pre>
                    ) : (
                      <p className="text-gray-900">{selectedResult.result}</p>
                    )}
                  </div>
                </div>
                {selectedResult.notes && (
                  <div>
                    <strong className="text-gray-700">Notes:</strong>
                    <p className="text-gray-900">{selectedResult.notes}</p>
                  </div>
                )}
                
                {/* Typical Values Comparison */}
                {tests.find(t => t.id === selectedResult.test)?.typical_values && (
                  <div>
                    <strong className="text-gray-700">Typical Values:</strong>
                    <div className="bg-blue-50 p-4 rounded mt-2">
                      <pre className="text-sm">{JSON.stringify(tests.find(t => t.id === selectedResult.test)?.typical_values, null, 2)}</pre>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setSelectedResult(null)}
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

export default TestResultsPage;
import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import diagnosisService from '../../services/diagnosisService';
import { Plus, Search, Edit, Trash2, Eye, Filter } from 'lucide-react';

const MedicalTestsPage = () => {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTest, setSelectedTest] = useState(null);
  const [error, setError] = useState('');

  const testTypes = [
    { value: 'blood', label: 'Blood Test' },
    { value: 'imaging', label: 'Imaging' },
    { value: 'physical', label: 'Physical Exam' },
    { value: 'other', label: 'Other' }
  ];

  useEffect(() => {
    fetchTests();
  }, []);

  const fetchTests = async () => {
    try {
      setLoading(true);
      const response = await diagnosisService.medicalTests.list();
      setTests(response.results || response);
    } catch (error) {
      setError('Failed to fetch medical tests');
      console.error('Error fetching tests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (testId) => {
    if (!window.confirm('Are you sure you want to delete this test?')) return;
    
    try {
      await diagnosisService.medicalTests.delete(testId);
      setTests(tests.filter(test => test.id !== testId));
    } catch (error) {
      setError('Failed to delete test');
    }
  };

  const filteredTests = tests.filter(test => {
    const matchesSearch = test.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         test.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || test.test_type === filterType;
    return matchesSearch && matchesType;
  });

  const TestCard = ({ test }) => (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{test.name}</h3>
          <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full mt-1">
            {testTypes.find(t => t.value === test.test_type)?.label || test.test_type}
          </span>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setSelectedTest(test)}
            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => {setSelectedTest(test); setShowCreateModal(true);}}
            className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDelete(test.id)}
            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      <p className="text-gray-600 text-sm mb-3">{test.description}</p>
      {test.typical_values && (
        <div className="text-sm text-gray-500">
          <strong>Typical Values:</strong> {JSON.stringify(test.typical_values)}
        </div>
      )}
    </div>
  );

  const CreateTestModal = () => {
    const [formData, setFormData] = useState({
      name: selectedTest?.name || '',
      description: selectedTest?.description || '',
      test_type: selectedTest?.test_type || 'blood',
      typical_values: selectedTest?.typical_values || {}
    });
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
      e.preventDefault();
      setSubmitting(true);
      
      try {
        if (selectedTest) {
          await diagnosisService.medicalTests.update(selectedTest.id, formData);
        } else {
          await diagnosisService.medicalTests.create(formData);
        }
        fetchTests();
        setShowCreateModal(false);
        setSelectedTest(null);
      } catch (error) {
        setError('Failed to save test');
      } finally {
        setSubmitting(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <h2 className="text-xl font-semibold mb-4">
            {selectedTest ? 'Edit Test' : 'Create New Test'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Test Name
              </label>
              <input
                type="text"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                required
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Test Type
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={formData.test_type}
                onChange={(e) => setFormData({...formData, test_type: e.target.value})}
              >
                {testTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => {setShowCreateModal(false); setSelectedTest(null);}}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {submitting ? 'Saving...' : (selectedTest ? 'Update' : 'Create')}
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
            <h1 className="text-2xl font-bold text-gray-900">Medical Tests</h1>
            <p className="text-gray-600">Manage standard medical tests and procedures</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Test</span>
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search tests..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <select
              className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="all">All Types</option>
              {testTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
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

        {/* Tests Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredTests.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No medical tests found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTests.map(test => (
              <TestCard key={test.id} test={test} />
            ))}
          </div>
        )}

        {/* Create/Edit Modal */}
        {showCreateModal && <CreateTestModal />}

        {/* View Modal */}
        {selectedTest && !showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-semibold mb-4">Test Details</h2>
              <div className="space-y-3">
                <div>
                  <strong className="text-gray-700">Name:</strong>
                  <p className="text-gray-900">{selectedTest.name}</p>
                </div>
                <div>
                  <strong className="text-gray-700">Type:</strong>
                  <p className="text-gray-900">
                    {testTypes.find(t => t.value === selectedTest.test_type)?.label}
                  </p>
                </div>
                <div>
                  <strong className="text-gray-700">Description:</strong>
                  <p className="text-gray-900">{selectedTest.description}</p>
                </div>
                {selectedTest.typical_values && (
                  <div>
                    <strong className="text-gray-700">Typical Values:</strong>
                    <pre className="text-sm text-gray-900 bg-gray-50 p-2 rounded mt-1">
                      {JSON.stringify(selectedTest.typical_values, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setSelectedTest(null)}
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

export default MedicalTestsPage;
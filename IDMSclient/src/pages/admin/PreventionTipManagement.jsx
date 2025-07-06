import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import {
  AlertTriangle,
  CheckCircle,
  Plus,
  RefreshCw,
  Trash2,
  Edit2,
  Info,
  ShieldAlert,
  Clock,
  Activity,
  FileImage,
  FileVideo,
  Search,
  X,
  Eye,
  Save,
} from 'lucide-react';

const PreventionTipManagement = () => {
  const navigate = useNavigate();
  const [tips, setTips] = useState([]);
  const [filteredTips, setFilteredTips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [diseaseOptions, setDiseaseOptions] = useState([]);
  const [editingTip, setEditingTip] = useState(null);
  const [selectedTip, setSelectedTip] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterDisease, setFilterDisease] = useState('all');
  const [sortBy, setSortBy] = useState('priority');
  const [sortOrder, setSortOrder] = useState('asc');

  // Manually defined disease options
  const diseaseOptionsStatic = [
    { value: '1', label: 'Malaria' },
    { value: '2', label: 'Pneumonia' },
    { value: '3', label: 'Influenza' },
    { value: '4', label: 'Tuberculosis' },
  ];

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'prevention',
    priority: 1,
    disease: diseaseOptionsStatic.length > 0 ? diseaseOptionsStatic[0].value : '',
    image: null,
    video: null,
    video_url: '',
  });

  const [filePreviews, setFilePreviews] = useState({
    image: null,
    video: null
  });

  // Categories for easier management
  const CATEGORIES = [
    { value: 'prevention', label: 'Prevention' },
    { value: 'self_care', label: 'Self Care' },
    { value: 'when_to_seek_help', label: 'When to Seek Help' },
    { value: 'emergency_signs', label: 'Emergency Signs' }
  ];

  // Load prevention tips
  const loadTips = useCallback(() => {
    try {
      setLoading(true);
      setError('');
      // Simulate loading tips from an API
      const mockTips = [
        {
          id: 1,
          title: 'Tip for Malaria',
          description: 'Description for Malaria prevention tip.',
          category: 'prevention',
          priority: 1,
          disease: '1',
          disease_name: 'Malaria',
          created_at: new Date().toISOString(),
        },
        {
          id: 2,
          title: 'Tip for Pneumonia',
          description: 'Description for Pneumonia prevention tip.',
          category: 'self_care',
          priority: 2,
          disease: '2',
          disease_name: 'Pneumonia',
          created_at: new Date().toISOString(),
        },
      ];
      setTips(mockTips);
      setDiseaseOptions(diseaseOptionsStatic);
    } catch (error) {
      setError('Failed to load prevention tips: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTips();
  }, [loadTips]);

  // Filter and search tips
  useEffect(() => {
    let filtered = [...tips];

    if (searchTerm) {
      filtered = filtered.filter(tip =>
        tip.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tip.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterCategory !== 'all') {
      filtered = filtered.filter(tip => tip.category === filterCategory);
    }

    if (filterDisease !== 'all') {
      filtered = filtered.filter(tip => tip.disease === filterDisease);
    }

    filtered.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      if (sortBy === 'created_at') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredTips(filtered);
  }, [tips, searchTerm, filterCategory, filterDisease, sortBy, sortOrder]);

  const handleView = (tip) => {
    setSelectedTip(tip);
    setIsViewModalOpen(true);
  };

  const handleEdit = (tip) => {
    setFormData({
      title: tip.title,
      description: tip.description,
      category: tip.category,
      priority: tip.priority,
      disease: tip.disease,
      image: null,
      video: null,
      video_url: tip.video_url || '',
    });
    setEditingTip(tip);
    setIsFormModalOpen(true);
  };

  const handleCreate = () => {
    setFormData({
      title: '',
      description: '',
      category: 'prevention',
      priority: 1,
      disease: diseaseOptionsStatic.length > 0 ? diseaseOptionsStatic[0].value : '',
      image: null,
      video: null,
      video_url: '',
    });
    setEditingTip(null);
    setIsFormModalOpen(true);
  };

  const closeModal = () => {
    setIsViewModalOpen(false);
    setIsFormModalOpen(false);
    setSelectedTip(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    const file = files[0];

    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }

      setFormData(prev => ({ ...prev, [name]: file }));

      if (name === 'image' && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => {
          setFilePreviews(prev => ({ ...prev, image: reader.result }));
        };
        reader.readAsDataURL(file);
      }

      if (name === 'video' && file.type.startsWith('video/')) {
        const reader = new FileReader();
        reader.onload = () => {
          setFilePreviews(prev => ({ ...prev, video: reader.result }));
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');

      if (!formData.title.trim()) {
        setError('Title is required');
        return;
      }

      if (!formData.description.trim()) {
        setError('Description is required');
        return;
      }

      if (editingTip) {
        // Simulate updating a tip
        setTips(prevTips => prevTips.map(tip =>
          tip.id === editingTip.id ? { ...tip, ...formData } : tip
        ));
        setSuccess('Prevention tip updated successfully!');
      } else {
        // Simulate creating a tip
        const newTip = {
          ...formData,
          id: tips.length + 1,
          disease_name: diseaseOptionsStatic.find(d => d.value === formData.disease)?.label,
          created_at: new Date().toISOString(),
        };
        setTips(prevTips => [...prevTips, newTip]);
        setSuccess('Prevention tip created successfully!');
      }

      resetForm();
      closeModal();
    } catch (error) {
      setError('Failed to save prevention tip: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category: 'prevention',
      priority: 1,
      disease: diseaseOptionsStatic.length > 0 ? diseaseOptionsStatic[0].value : '',
      image: null,
      video: null,
      video_url: '',
    });
    setFilePreviews({ image: null, video: null });
  };

  const getPriorityColor = (priority) => {
    if (priority <= 3) return 'bg-red-100 text-red-800 border-red-200';
    if (priority <= 6) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-green-100 text-green-800 border-green-200';
  };

  const getCategoryLabel = (category) => {
    const cat = CATEGORIES.find(c => c.value === category);
    return cat ? cat.label : category;
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Prevention Tips Management</h1>
          <p className="text-gray-600 mt-2">Create and manage disease prevention and care tips</p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
              <span className="text-green-800">{success}</span>
              <button
                onClick={() => setSuccess('')}
                className="ml-auto text-green-500 hover:text-green-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-500 mr-3" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="text-sm text-red-700">{error}</p>
              </div>
              <button
                onClick={() => setError('')}
                className="ml-auto text-red-500 hover:text-red-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Create New Tip Button */}
        <div className="flex justify-end">
          <button
            onClick={handleCreate}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create New Tip
          </button>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
            <div className="text-2xl font-bold text-blue-600">{tips.length}</div>
            <div className="text-sm text-gray-600">Total Tips</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
            <div className="text-2xl font-bold text-green-600">
              {tips.filter(tip => tip.category === 'prevention').length}
            </div>
            <div className="text-sm text-gray-600">Prevention Tips</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
            <div className="text-2xl font-bold text-red-600">
              {tips.filter(tip => tip.category === 'emergency_signs').length}
            </div>
            <div className="text-sm text-gray-600">Emergency Tips</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
            <div className="text-2xl font-bold text-purple-600">
              {tips.filter(tip => tip.priority <= 3).length}
            </div>
            <div className="text-sm text-gray-600">High Priority</div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search tips by title or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Categories</option>
                {CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>

              <select
                value={filterDisease}
                onChange={(e) => setFilterDisease(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Diseases</option>
                {diseaseOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>

              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-');
                  setSortBy(field);
                  setSortOrder(order);
                }}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="priority-asc">Priority (Low to High)</option>
                <option value="priority-desc">Priority (High to Low)</option>
                <option value="created_at-desc">Newest First</option>
                <option value="created_at-asc">Oldest First</option>
                <option value="title-asc">Title (A-Z)</option>
                <option value="title-desc">Title (Z-A)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tips Table */}
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-x-auto">
          {filteredTips.length === 0 ? (
            <div className="text-center py-12">
              <Info className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-4 text-lg text-gray-600">No prevention tips found</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Disease</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTips.map(tip => (
                  <tr key={tip.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{tip.title}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{tip.disease_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{getCategoryLabel(tip.category)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getPriorityColor(tip.priority)}`}>
                        {tip.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleView(tip)}
                        className="text-indigo-600 hover:text-indigo-900 mr-2"
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleEdit(tip)}
                        className="text-blue-600 hover:text-blue-900 mr-2"
                      >
                        <Edit2 className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(tip.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Modal for Viewing Tip Details */}
        {isViewModalOpen && selectedTip && (
          <div className="fixed z-10 inset-0 overflow-y-auto">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
              </div>
              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                      <h3 className="text-lg leading-6 font-medium text-gray-900">{selectedTip.title}</h3>
                      <div className="mt-2">
                        <p className="text-sm text-gray-500">{selectedTip.description}</p>
                        <div className="mt-4">
                          <p className="text-sm font-medium text-gray-700">Disease: <span className="text-gray-500">{selectedTip.disease_name}</span></p>
                          <p className="text-sm font-medium text-gray-700">Category: <span className="text-gray-500">{getCategoryLabel(selectedTip.category)}</span></p>
                          <p className="text-sm font-medium text-gray-700">Priority: <span className={`text-gray-500 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getPriorityColor(selectedTip.priority)}`}>{selectedTip.priority}</span></p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button onClick={closeModal} type="button" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm">
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal for Creating/Editing Tip */}
        {isFormModalOpen && (
          <div className="fixed z-10 inset-0 overflow-y-auto">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
              </div>
              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                      <h3 className="text-lg leading-6 font-medium text-gray-900">
                        {editingTip ? 'Edit Prevention Tip' : 'Create New Prevention Tip'}
                      </h3>
                      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Title</label>
                          <input
                            type="text"
                            name="title"
                            value={formData.title}
                            onChange={handleInputChange}
                            required
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Description</label>
                          <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleInputChange}
                            required
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Disease</label>
                          <select
                            name="disease"
                            value={formData.disease}
                            onChange={handleInputChange}
                            required
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                          >
                            <option value="">Select a disease...</option>
                            {diseaseOptionsStatic.map(option => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Category</label>
                          <select
                            name="category"
                            value={formData.category}
                            onChange={handleInputChange}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                          >
                            {CATEGORIES.map(cat => (
                              <option key={cat.value} value={cat.value}>{cat.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Priority</label>
                          <input
                            type="number"
                            name="priority"
                            value={formData.priority}
                            onChange={handleInputChange}
                            min="1"
                            max="10"
                            required
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                          />
                        </div>
                        <div className="flex justify-end space-x-3">
                          <button
                            type="button"
                            onClick={closeModal}
                            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:col-start-1 sm:text-sm"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="mt-3 w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:col-start-2 sm:text-sm"
                          >
                            {editingTip ? 'Update Tip' : 'Create Tip'}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default PreventionTipManagement;

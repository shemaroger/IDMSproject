import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Filter,
  X,
  Save,
  AlertCircle,
  CheckCircle,
  FileText,
  List,
  Users,
  HelpCircle,
  Eye,
  Star,
  Calendar,
  Tag
} from 'lucide-react';
import { healthcareAPI } from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';

const PreventionTipManagement = () => {
  const [tips, setTips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editingTip, setEditingTip] = useState(null);
  const [viewingTip, setViewingTip] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [viewMode, setViewMode] = useState('table'); // 'grid' or 'table'
  const [notification, setNotification] = useState(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDisease, setFilterDisease] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [sortBy, setSortBy] = useState('priority');

  // Form state
  const [formData, setFormData] = useState({
    disease: '',
    category: '',
    title: '',
    content_type: 'text',
    short_summary: '',
    detailed_content: '',
    risk_factors: '',
    prevention_methods: '',
    symptoms: '',
    priority: 5,
    video_url: ''
  });

  const diseaseOptions = [
    { value: 'malaria', label: 'Malaria', color: 'red' },
    { value: 'pneumonia', label: 'Pneumonia', color: 'blue' }
  ];

  const categoryOptions = [
    { value: 'prevention', label: 'Prevention', icon: '🛡️' },
    { value: 'self_care', label: 'Self Care', icon: '💊' },
    { value: 'when_to_seek_help', label: 'When to Seek Help', icon: '🏥' },
    { value: 'emergency_signs', label: 'Emergency Signs', icon: '🚨' }
  ];

  const contentTypeOptions = [
    { value: 'text', label: 'Text Paragraph', icon: <FileText className="w-4 h-4" /> },
    { value: 'bullet', label: 'Bullet Points', icon: <List className="w-4 h-4" /> },
    { value: 'step', label: 'Step-by-Step', icon: <Users className="w-4 h-4" /> },
    { value: 'faq', label: 'FAQ Format', icon: <HelpCircle className="w-4 h-4" /> }
  ];

  useEffect(() => {
    fetchTips();
  }, []);

  const fetchTips = async () => {
    try {
      setLoading(true);
      const params = {};
      if (searchTerm) params.search = searchTerm;
      if (filterDisease) params.disease = filterDisease;
      if (filterCategory) params.category = filterCategory;
      
      console.log('Fetching with params:', params);
      const response = await healthcareAPI.preventionTips.list(params);
      console.log('Response:', response);
      setTips(response.results || response);
    } catch (error) {
      showNotification('Error fetching tips: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleSubmit = async () => {
    if (!formData.disease || !formData.category || !formData.title || !formData.short_summary || !formData.detailed_content) {
      showNotification('Please fill in all required fields', 'error');
      return;
    }

    const cleanFormData = {
      disease: formData.disease,
      category: formData.category,
      title: formData.title,
      content_type: formData.content_type,
      short_summary: formData.short_summary,
      detailed_content: formData.detailed_content,
      priority: formData.priority
    };

    if (formData.risk_factors.trim()) {
      cleanFormData.risk_factors = formData.risk_factors;
    }
    if (formData.prevention_methods.trim()) {
      cleanFormData.prevention_methods = formData.prevention_methods;
    }
    if (formData.symptoms.trim()) {
      cleanFormData.symptoms = formData.symptoms;
    }
    if (formData.video_url.trim()) {
      try {
        new URL(formData.video_url);
        cleanFormData.video_url = formData.video_url;
      } catch (e) {
        showNotification('Please enter a valid URL (e.g., https://youtube.com/watch?v=...)', 'error');
        return;
      }
    }

    console.log('Sending data:', cleanFormData);

    try {
      if (editingTip) {
        await healthcareAPI.preventionTips.update(editingTip.id, cleanFormData);
        showNotification('Prevention tip updated successfully!');
      } else {
        await healthcareAPI.preventionTips.create(cleanFormData);
        showNotification('Prevention tip created successfully!');
      }
      setShowModal(false);
      setEditingTip(null);
      resetForm();
      fetchTips();
    } catch (error) {
      console.error('Full error:', error);
      let errorMessage = 'An unexpected error occurred';
      
      if (error.response?.data) {
        if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        } else if (error.response.data.error) {
          errorMessage = error.response.data.error;
        } else if (error.response.data.detail) {
          errorMessage = error.response.data.detail;
        } else {
          const fieldErrors = Object.entries(error.response.data)
            .map(([field, errors]) => `${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}`)
            .join('; ');
          errorMessage = fieldErrors || 'Validation failed';
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      showNotification('Error saving tip: ' + errorMessage, 'error');
    }
  };

  const handleView = (tip) => {
    setViewingTip(tip);
    setShowViewModal(true);
  };

  const handleEdit = (tip) => {
    setEditingTip(tip);
    setFormData({
      disease: tip.disease,
      category: tip.category,
      title: tip.title,
      content_type: tip.content_type,
      short_summary: tip.short_summary,
      detailed_content: tip.detailed_content,
      risk_factors: tip.risk_factors || '',
      prevention_methods: tip.prevention_methods || '',
      symptoms: tip.symptoms || '',
      priority: tip.priority,
      video_url: tip.video_url || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    try {
      await healthcareAPI.preventionTips.delete(id);
      showNotification('Prevention tip deleted successfully!');
      setDeleteConfirm(null);
      fetchTips();
    } catch (error) {
      showNotification('Error deleting tip: ' + error.message, 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      disease: '',
      category: '',
      title: '',
      content_type: 'text',
      short_summary: '',
      detailed_content: '',
      risk_factors: '',
      prevention_methods: '',
      symptoms: '',
      priority: 5,
      video_url: ''
    });
  };

  const openCreateModal = () => {
    resetForm();
    setEditingTip(null);
    setShowModal(true);
  };

  // Filter and sort tips
  const filteredAndSortedTips = tips
    .filter(tip => {
      const matchesSearch = tip.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           tip.short_summary.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDisease = !filterDisease || tip.disease === filterDisease;
      const matchesCategory = !filterCategory || tip.category === filterCategory;
      
      return matchesSearch && matchesDisease && matchesCategory;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'priority':
          return a.priority - b.priority;
        case 'title':
          return a.title.localeCompare(b.title);
        case 'disease':
          return a.disease.localeCompare(b.disease);
        case 'created':
          return new Date(b.created_at) - new Date(a.created_at);
        default:
          return 0;
      }
    });

  const getContentTypeIcon = (type) => {
    const option = contentTypeOptions.find(opt => opt.value === type);
    return option ? option.icon : <FileText className="w-4 h-4" />;
  };

  const getPriorityColor = (priority) => {
    if (priority <= 3) return 'bg-red-50 text-red-700 border-red-200';
    if (priority <= 6) return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    return 'bg-green-50 text-green-700 border-green-200';
  };

  const getDiseaseColor = (disease) => {
    return disease === 'malaria' 
      ? 'bg-red-50 text-red-700 border-red-200' 
      : 'bg-blue-50 text-blue-700 border-blue-200';
  };

  const getCategoryEmoji = (category) => {
    const option = categoryOptions.find(opt => opt.value === category);
    return option ? option.icon : '📋';
  };

  // Statistics
  const stats = {
    total: tips.length,
    malaria: tips.filter(tip => tip.disease === 'malaria').length,
    pneumonia: tips.filter(tip => tip.disease === 'pneumonia').length,
    highPriority: tips.filter(tip => tip.priority <= 3).length
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header Section */}
        <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-2xl p-8 border border-blue-100 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <h1 className="text-4xl font-bold text-gray-900">Prevention Tips</h1>
                <p className="text-lg text-gray-600">Manage comprehensive health prevention tips for malaria and pneumonia</p>
              </div>
              
              {/* Statistics Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Tips</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                      <span className="text-red-600 font-bold">M</span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Malaria</p>
                      <p className="text-2xl font-bold text-red-600">{stats.malaria}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <span className="text-blue-600 font-bold">P</span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Pneumonia</p>
                      <p className="text-2xl font-bold text-blue-600">{stats.pneumonia}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                      <Star className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">High Priority</p>
                      <p className="text-2xl font-bold text-orange-600">{stats.highPriority}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'table' 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Table View
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'grid' 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Card View
                </button>
              </div>
              <button
                onClick={openCreateModal}
                className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <Plus className="w-5 h-5" />
                <span className="font-semibold">Add New Tip</span>
              </button>
            </div>
          </div>
        </div>

        {/* Filters and Search Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Search Tips</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by title or summary..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
              </div>
            </div>

            {/* Disease Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Disease</label>
              <select
                value={filterDisease}
                onChange={(e) => setFilterDisease(e.target.value)}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              >
                <option value="">All Diseases</option>
                {diseaseOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              >
                <option value="">All Categories</option>
                {categoryOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.icon} {option.label}</option>
                ))}
              </select>
            </div>

            {/* Sort By */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              >
                <option value="priority">Priority</option>
                <option value="title">Title</option>
                <option value="disease">Disease</option>
                <option value="created">Date Created</option>
              </select>
            </div>

            {/* Apply Filters Button */}
            <div className="flex items-end">
              <button
                onClick={fetchTips}
                className="w-full bg-gray-100 text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-200 transition-all duration-200 flex items-center justify-center space-x-2 font-medium"
              >
                <Filter className="w-4 h-4" />
                <span>Apply</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          {loading ? (
            <div className="p-16 text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-6 text-gray-600 font-medium text-lg">Loading prevention tips...</p>
            </div>
          ) : (
            <>
              {filteredAndSortedTips.length > 0 ? (
                <div className="p-6">
                  {viewMode === 'table' ? (
                    /* Table View */
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="text-left py-4 px-6 font-semibold text-gray-700">Title & Summary</th>
                            <th className="text-left py-4 px-6 font-semibold text-gray-700">Disease</th>
                            <th className="text-left py-4 px-6 font-semibold text-gray-700">Category</th>
                            <th className="text-left py-4 px-6 font-semibold text-gray-700">Type</th>
                            <th className="text-left py-4 px-6 font-semibold text-gray-700">Priority</th>
                            <th className="text-left py-4 px-6 font-semibold text-gray-700">Status</th>
                            <th className="text-center py-4 px-6 font-semibold text-gray-700">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredAndSortedTips.map((tip) => (
                            <tr key={tip.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                              <td className="py-4 px-6">
                                <div className="space-y-1">
                                  <div className="font-semibold text-gray-900 text-sm">{tip.title}</div>
                                  <div className="text-xs text-gray-600 line-clamp-2">{tip.short_summary}</div>
                                </div>
                              </td>
                              <td className="py-4 px-6">
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${getDiseaseColor(tip.disease)}`}>
                                  {tip.disease_display || tip.disease}
                                </span>
                              </td>
                              <td className="py-4 px-6">
                                <div className="flex items-center space-x-1">
                                  <span className="text-sm">{getCategoryEmoji(tip.category)}</span>
                                  <span className="text-sm text-gray-700">{tip.category_display || tip.category}</span>
                                </div>
                              </td>
                              <td className="py-4 px-6">
                                <div className="flex items-center space-x-2">
                                  {getContentTypeIcon(tip.content_type)}
                                  <span className="text-sm text-gray-600">{tip.content_type_display || tip.content_type}</span>
                                </div>
                              </td>
                              <td className="py-4 px-6">
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${getPriorityColor(tip.priority)}`}>
                                  P{tip.priority}
                                </span>
                              </td>
                              <td className="py-4 px-6">
                                <div className="flex flex-wrap gap-1">
                                  {tip.video_url && (
                                    <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs">Video</span>
                                  )}
                                  {tip.risk_factors && (
                                    <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-xs">Risk</span>
                                  )}
                                  {tip.symptoms && (
                                    <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs">Symptoms</span>
                                  )}
                                </div>
                              </td>
                              <td className="py-4 px-6">
                                <div className="flex items-center justify-center space-x-1">
                                  <button
                                    onClick={() => handleView(tip)}
                                    className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-all duration-200"
                                    title="View tip"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleEdit(tip)}
                                    className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-all duration-200"
                                    title="Edit tip"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirm(tip.id)}
                                    className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-all duration-200"
                                    title="Delete tip"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    /* Card View */
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                      {filteredAndSortedTips.map((tip) => (
                        <div 
                          key={tip.id} 
                          className="border border-gray-200 rounded-xl p-6 hover:shadow-xl transition-all duration-300 bg-gray-50 hover:bg-white group transform hover:-translate-y-1"
                        >
                          {/* Card Header */}
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center space-x-2">
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${getDiseaseColor(tip.disease)}`}>
                                {tip.disease_display || tip.disease}
                              </span>
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border ${getPriorityColor(tip.priority)}`}>
                                P{tip.priority}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                              <button
                                onClick={() => handleView(tip)}
                                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-all duration-200"
                                title="View tip"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleEdit(tip)}
                                className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-all duration-200"
                                title="Edit tip"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(tip.id)}
                                className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-all duration-200"
                                title="Delete tip"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Card Content */}
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <h3 className="font-bold text-gray-900 text-xl leading-tight line-clamp-2">{tip.title}</h3>
                              
                              <div className="flex items-center space-x-3 text-sm text-gray-600">
                                <div className="flex items-center space-x-1">
                                  {getContentTypeIcon(tip.content_type)}
                                  <span>{tip.content_type_display || tip.content_type}</span>
                                </div>
                                <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                                <div className="flex items-center space-x-1">
                                  <span>{getCategoryEmoji(tip.category)}</span>
                                  <span>{tip.category_display || tip.category}</span>
                                </div>
                              </div>
                            </div>

                            <p className="text-gray-700 text-sm leading-relaxed line-clamp-3">{tip.short_summary}</p>

                            {/* Additional Info */}
                            {(tip.video_url || tip.risk_factors || tip.symptoms || tip.prevention_methods) && (
                              <div className="pt-4 border-t border-gray-200">
                                <div className="flex flex-wrap gap-2">
                                  {tip.video_url && (
                                    <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-md text-xs font-medium">
                                      📹 Video
                                    </span>
                                  )}
                                  {tip.risk_factors && (
                                    <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded-md text-xs font-medium">
                                      ⚠️ Risk Factors
                                    </span>
                                  )}
                                  {tip.symptoms && (
                                    <span className="bg-green-100 text-green-700 px-2 py-1 rounded-md text-xs font-medium">
                                      🩺 Symptoms
                                    </span>
                                  )}
                                  {tip.prevention_methods && (
                                    <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-md text-xs font-medium">
                                      🛡️ Methods
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <FileText className="w-12 h-12 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No prevention tips found</h3>
                  <p className="text-gray-500 mb-8 max-w-md mx-auto">
                    {searchTerm || filterDisease || filterCategory 
                      ? "Try adjusting your filters to find more tips." 
                      : "Get started by creating your first prevention tip to help patients stay healthy."
                    }
                  </p>
                  <button
                    onClick={openCreateModal}
                    className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    Create First Tip
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* View Modal */}
        {showViewModal && viewingTip && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[95vh] overflow-y-auto shadow-2xl">
              {/* Modal Header */}
              <div className={`p-6 border-b border-gray-200 rounded-t-2xl ${
                viewingTip.disease === 'malaria' 
                  ? 'bg-gradient-to-r from-red-50 to-pink-50' 
                  : 'bg-gradient-to-r from-blue-50 to-indigo-50'
              }`}>
                <div className="flex justify-between items-start">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${getDiseaseColor(viewingTip.disease)}`}>
                        {viewingTip.disease_display || viewingTip.disease}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-sm font-semibold ${getPriorityColor(viewingTip.priority)}`}>
                        Priority {viewingTip.priority}
                      </span>
                      <div className="flex items-center space-x-1 text-sm text-gray-600">
                        <span>{getCategoryEmoji(viewingTip.category)}</span>
                        <span>{viewingTip.category_display || viewingTip.category}</span>
                      </div>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">{viewingTip.title}</h2>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      {getContentTypeIcon(viewingTip.content_type)}
                      <span>{viewingTip.content_type_display || viewingTip.content_type}</span>
                      {viewingTip.created_at && (
                        <>
                          <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(viewingTip.created_at).toLocaleDateString()}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setShowViewModal(false)}
                    className="text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg p-2 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-8">
                {/* Summary Section */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Summary</h3>
                  <p className="text-gray-700 leading-relaxed">{viewingTip.short_summary}</p>
                </div>

                {/* Detailed Content Section */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Detailed Content</h3>
                  <div className="text-gray-700 leading-relaxed whitespace-pre-line">
                    {viewingTip.content_type === 'bullet' ? (
                      <ul className="list-disc list-inside space-y-2">
                        {viewingTip.detailed_content.split('\n').filter(line => line.trim()).map((line, index) => (
                          <li key={index} className="text-gray-700">{line.trim()}</li>
                        ))}
                      </ul>
                    ) : viewingTip.content_type === 'step' ? (
                      <ol className="list-decimal list-inside space-y-2">
                        {viewingTip.detailed_content.split('\n').filter(line => line.trim()).map((line, index) => (
                          <li key={index} className="text-gray-700">{line.trim()}</li>
                        ))}
                      </ol>
                    ) : viewingTip.content_type === 'faq' ? (
                      <div className="space-y-4">
                        {viewingTip.detailed_content.split('\n').filter(line => line.trim()).map((line, index) => (
                          <div key={index} className={index % 2 === 0 ? 'font-semibold text-gray-900' : 'text-gray-700 mb-2'}>
                            {index % 2 === 0 ? `Q: ${line.trim()}` : `A: ${line.trim()}`}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p>{viewingTip.detailed_content}</p>
                    )}
                  </div>
                </div>

                {/* Medical Information Grid */}
                {(viewingTip.risk_factors || viewingTip.prevention_methods || viewingTip.symptoms) && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {viewingTip.risk_factors && (
                      <div className="bg-orange-50 rounded-xl p-6 border border-orange-100">
                        <h4 className="font-semibold text-orange-900 mb-3 flex items-center">
                          ⚠️ Risk Factors
                        </h4>
                        <p className="text-orange-800 text-sm leading-relaxed whitespace-pre-line">
                          {viewingTip.risk_factors}
                        </p>
                      </div>
                    )}

                    {viewingTip.prevention_methods && (
                      <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
                        <h4 className="font-semibold text-blue-900 mb-3 flex items-center">
                          🛡️ Prevention Methods
                        </h4>
                        <p className="text-blue-800 text-sm leading-relaxed whitespace-pre-line">
                          {viewingTip.prevention_methods}
                        </p>
                      </div>
                    )}

                    {viewingTip.symptoms && (
                      <div className="bg-green-50 rounded-xl p-6 border border-green-100">
                        <h4 className="font-semibold text-green-900 mb-3 flex items-center">
                          🩺 Symptoms to Watch
                        </h4>
                        <p className="text-green-800 text-sm leading-relaxed whitespace-pre-line">
                          {viewingTip.symptoms}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Video Section */}
                {viewingTip.video_url && (
                  <div className="bg-purple-50 rounded-xl p-6 border border-purple-100">
                    <h4 className="font-semibold text-purple-900 mb-3 flex items-center">
                      📹 Educational Video
                    </h4>
                    <a 
                      href={viewingTip.video_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-purple-700 hover:text-purple-900 underline break-all"
                    >
                      {viewingTip.video_url}
                    </a>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                  <button
                    onClick={() => setShowViewModal(false)}
                    className="px-6 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      setShowViewModal(false);
                      handleEdit(viewingTip);
                    }}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 font-medium"
                  >
                    <Edit className="w-4 h-4" />
                    <span>Edit Tip</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Create/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[95vh] overflow-y-auto shadow-2xl">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-b border-gray-200 rounded-t-2xl">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {editingTip ? 'Edit Prevention Tip' : 'Create New Prevention Tip'}
                    </h2>
                    <p className="text-gray-600 mt-1">
                      {editingTip ? 'Update the prevention tip information' : 'Add a new health prevention tip'}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg p-2 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-8">
                {/* Basic Information */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                    <Tag className="w-5 h-5 mr-2 text-blue-600" />
                    Basic Information
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Disease <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.disease}
                        onChange={(e) => setFormData({...formData, disease: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      >
                        <option value="">Select Disease</option>
                        {diseaseOptions.map(option => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Category <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData({...formData, category: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      >
                        <option value="">Select Category</option>
                        {categoryOptions.map(option => (
                          <option key={option.value} value={option.value}>{option.icon} {option.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Title <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                        maxLength={200}
                        placeholder="Enter a clear, descriptive title"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      />
                      <div className="text-xs text-gray-500 mt-1">{formData.title.length}/200 characters</div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Content Type</label>
                      <select
                        value={formData.content_type}
                        onChange={(e) => setFormData({...formData, content_type: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      >
                        {contentTypeOptions.map(option => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Priority (1-10)</label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={formData.priority}
                        onChange={(e) => setFormData({...formData, priority: parseInt(e.target.value)})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      />
                    </div>
                  </div>
                </div>

                {/* Content Details */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                    <Edit className="w-5 h-5 mr-2 text-green-600" />
                    Content Details
                  </h3>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Short Summary <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={formData.short_summary}
                        onChange={(e) => setFormData({...formData, short_summary: e.target.value})}
                        maxLength={350}
                        rows={3}
                        placeholder="Brief summary for cards and previews"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none"
                      />
                      <div className="text-xs text-gray-500 mt-1">{formData.short_summary.length}/350 characters</div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Detailed Content <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={formData.detailed_content}
                        onChange={(e) => setFormData({...formData, detailed_content: e.target.value})}
                        rows={6}
                        placeholder="Enter detailed content. Use line breaks for bullets/steps."
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Video URL</label>
                      <input
                        type="url"
                        value={formData.video_url}
                        onChange={(e) => setFormData({...formData, video_url: e.target.value})}
                        placeholder="https://youtube.com/watch?v=..."
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      />
                    </div>
                  </div>
                </div>

                {/* Medical Information */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-100">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                    <HelpCircle className="w-5 h-5 mr-2 text-green-600" />
                    Medical Information
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Risk Factors</label>
                      <textarea
                        value={formData.risk_factors}
                        onChange={(e) => setFormData({...formData, risk_factors: e.target.value})}
                        rows={4}
                        placeholder="List key risk factors..."
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors resize-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Prevention Methods</label>
                      <textarea
                        value={formData.prevention_methods}
                        onChange={(e) => setFormData({...formData, prevention_methods: e.target.value})}
                        rows={4}
                        placeholder="Describe prevention techniques..."
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors resize-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Symptoms</label>
                      <textarea
                        value={formData.symptoms}
                        onChange={(e) => setFormData({...formData, symptoms: e.target.value})}
                        rows={4}
                        placeholder="Common symptoms to watch for..."
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors resize-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Modal Actions */}
                <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                  <button
                    onClick={() => setShowModal(false)}
                    className="px-6 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 font-medium shadow-lg hover:shadow-xl"
                  >
                    <Save className="w-5 h-5" />
                    <span>{editingTip ? 'Update Tip' : 'Create Tip'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
              <div className="flex items-center space-x-4 mb-6">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-red-600" />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Delete Prevention Tip</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Are you sure you want to delete this tip? This action cannot be undone.
                  </p>
                </div>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Notification Toast */}
        {notification && (
          <div className={`fixed top-4 right-4 p-4 rounded-xl shadow-lg z-50 transition-all duration-300 max-w-md ${
            notification.type === 'success' 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex items-center space-x-3">
              {notification.type === 'success' ? (
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              )}
              <span className={`font-medium ${
                notification.type === 'success' ? 'text-green-800' : 'text-red-800'
              }`}>
                {notification.message}
              </span>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default PreventionTipManagement;
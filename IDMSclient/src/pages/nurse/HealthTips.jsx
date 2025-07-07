import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter,
  Play,
  BookOpen,
  Shield,
  AlertTriangle,
  Heart,
  Eye,
  X,
  ExternalLink,
  Clock,
  Star,
  ChevronRight,
  Info
} from 'lucide-react';
import { healthcareAPI } from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';

const PatientPreventionTips = () => {
  const [tips, setTips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTip, setSelectedTip] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDisease, setFilterDisease] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  const diseaseOptions = [
    { value: 'malaria', label: 'Malaria', icon: '🦟', color: 'red' },
    { value: 'pneumonia', label: 'Pneumonia', icon: '🫁', color: 'blue' }
  ];

  const categoryOptions = [
    { 
      value: 'prevention', 
      label: 'Prevention Tips', 
      icon: '🛡️', 
      description: 'How to prevent getting sick',
      color: 'blue'
    },
    { 
      value: 'self_care', 
      label: 'Self Care', 
      icon: '💊', 
      description: 'Taking care of yourself at home',
      color: 'green'
    },
    { 
      value: 'when_to_seek_help', 
      label: 'When to Seek Help', 
      icon: '🏥', 
      description: 'Know when to visit a doctor',
      color: 'orange'
    },
    { 
      value: 'emergency_signs', 
      label: 'Emergency Signs', 
      icon: '🚨', 
      description: 'Critical warning signs',
      color: 'red'
    }
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
      
      const response = await healthcareAPI.preventionTips.list(params);
      // Sort by priority (lower number = higher priority)
      const sortedTips = (response.results || response).sort((a, b) => a.priority - b.priority);
      setTips(sortedTips);
    } catch (error) {
      console.error('Error fetching tips:', error);
      setTips([]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (tip) => {
    setSelectedTip(tip);
    setShowDetailModal(true);
  };

  const filteredTips = tips.filter(tip => {
    const matchesSearch = tip.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tip.short_summary.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDisease = !filterDisease || tip.disease === filterDisease;
    const matchesCategory = !filterCategory || tip.category === filterCategory;
    
    return matchesSearch && matchesDisease && matchesCategory;
  });

  const getDiseaseInfo = (disease) => {
    return diseaseOptions.find(d => d.value === disease) || { icon: '📋', color: 'gray' };
  };

  const getCategoryInfo = (category) => {
    return categoryOptions.find(c => c.value === category) || { icon: '📋', color: 'gray' };
  };

  const getPriorityIcon = (priority) => {
    if (priority <= 3) return { icon: <AlertTriangle className="w-4 h-4" />, color: 'text-red-600' };
    if (priority <= 6) return { icon: <Info className="w-4 h-4" />, color: 'text-yellow-600' };
    return { icon: <BookOpen className="w-4 h-4" />, color: 'text-green-600' };
  };

  const renderContent = (content, type) => {
    const lines = content.split('\n').filter(line => line.trim());
    
    switch(type) {
      case 'bullet':
        return (
          <ul className="space-y-2">
            {lines.map((line, index) => (
              <li key={index} className="flex items-start space-x-2">
                <span className="text-blue-500 mt-1">•</span>
                <span className="text-gray-700">{line.trim()}</span>
              </li>
            ))}
          </ul>
        );
      case 'step':
        return (
          <ol className="space-y-3">
            {lines.map((line, index) => (
              <li key={index} className="flex items-start space-x-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                  {index + 1}
                </span>
                <span className="text-gray-700">{line.trim()}</span>
              </li>
            ))}
          </ol>
        );
      case 'faq':
        return (
          <div className="space-y-4">
            {lines.map((line, index) => (
              <div key={index} className={`${index % 2 === 0 ? 'bg-blue-50 p-3 rounded-lg' : 'pl-3'}`}>
                <div className={`${index % 2 === 0 ? 'font-semibold text-blue-900' : 'text-gray-700'}`}>
                  {index % 2 === 0 ? `❓ ${line.trim()}` : `💡 ${line.trim()}`}
                </div>
              </div>
            ))}
          </div>
        );
      default:
        return <p className="text-gray-700 leading-relaxed whitespace-pre-line">{content}</p>;
    }
  };

  const categoryStats = categoryOptions.map(category => ({
    ...category,
    count: tips.filter(tip => tip.category === category.value).length
  }));

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header Section */}
        <div className="bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 rounded-2xl p-8 border border-green-100">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto shadow-lg">
              <Heart className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Health Prevention Tips</h1>
              <p className="text-lg text-gray-600 mt-2">Stay healthy with expert advice on preventing malaria and pneumonia</p>
            </div>
            
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
              {categoryStats.map((category) => (
                <div key={category.value} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  <div className="text-center space-y-2">
                    <div className="text-2xl">{category.icon}</div>
                    <div className="text-sm font-medium text-gray-600">{category.label}</div>
                    <div className="text-xl font-bold text-gray-900">{category.count}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Search Health Tips</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search for prevention tips..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Health Condition</label>
              <select
                value={filterDisease}
                onChange={(e) => setFilterDisease(e.target.value)}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">All Conditions</option>
                {diseaseOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.icon} {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">All Categories</option>
                {categoryOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.icon} {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Tips Display */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          {loading ? (
            <div className="p-16 text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-600 mx-auto"></div>
              <p className="mt-6 text-gray-600 font-medium text-lg">Loading health tips...</p>
            </div>
          ) : (
            <>
              {filteredTips.length > 0 ? (
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredTips.map((tip) => {
                      const diseaseInfo = getDiseaseInfo(tip.disease);
                      const categoryInfo = getCategoryInfo(tip.category);
                      const priorityInfo = getPriorityIcon(tip.priority);
                      
                      return (
                        <div 
                          key={tip.id} 
                          className="bg-gradient-to-br from-white to-gray-50 rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 cursor-pointer group"
                          onClick={() => handleViewDetails(tip)}
                        >
                          {/* Card Header */}
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center space-x-2">
                              <span className={`text-2xl`}>{diseaseInfo.icon}</span>
                              <span className={`text-2xl`}>{categoryInfo.icon}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className={`${priorityInfo.color}`}>
                                {priorityInfo.icon}
                              </div>
                              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                            </div>
                          </div>

                          {/* Disease & Category Labels */}
                          <div className="flex flex-wrap gap-2 mb-3">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                              diseaseInfo.color === 'red' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                              {tip.disease_display || tip.disease}
                            </span>
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                              categoryInfo.color === 'red' ? 'bg-red-100 text-red-700' :
                              categoryInfo.color === 'orange' ? 'bg-orange-100 text-orange-700' :
                              categoryInfo.color === 'green' ? 'bg-green-100 text-green-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                              {categoryInfo.label}
                            </span>
                          </div>

                          {/* Content */}
                          <div className="space-y-3">
                            <h3 className="font-bold text-gray-900 text-lg leading-tight group-hover:text-green-600 transition-colors">
                              {tip.title}
                            </h3>
                            <p className="text-gray-600 text-sm leading-relaxed line-clamp-3">
                              {tip.short_summary}
                            </p>
                          </div>

                          {/* Features */}
                          <div className="mt-4 pt-4 border-t border-gray-100">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3 text-xs text-gray-500">
                                {tip.video_url && (
                                  <div className="flex items-center space-x-1">
                                    <Play className="w-3 h-3" />
                                    <span>Video</span>
                                  </div>
                                )}
                                {tip.risk_factors && (
                                  <div className="flex items-center space-x-1">
                                    <AlertTriangle className="w-3 h-3" />
                                    <span>Risks</span>
                                  </div>
                                )}
                                {tip.symptoms && (
                                  <div className="flex items-center space-x-1">
                                    <Heart className="w-3 h-3" />
                                    <span>Symptoms</span>
                                  </div>
                                )}
                              </div>
                              <button className="text-green-600 hover:text-green-700 font-medium text-sm flex items-center space-x-1">
                                <span>Read More</span>
                                <Eye className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Search className="w-12 h-12 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No health tips found</h3>
                  <p className="text-gray-500 max-w-md mx-auto">
                    {searchTerm || filterDisease || filterCategory 
                      ? "Try adjusting your search or filters to find relevant health tips." 
                      : "No prevention tips are currently available."
                    }
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Detail Modal */}
        {showDetailModal && selectedTip && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[95vh] overflow-y-auto shadow-2xl">
              {/* Modal Header */}
              <div className={`p-6 border-b border-gray-200 rounded-t-2xl ${
                getDiseaseInfo(selectedTip.disease).color === 'red' 
                  ? 'bg-gradient-to-r from-red-50 to-pink-50' 
                  : 'bg-gradient-to-r from-blue-50 to-indigo-50'
              }`}>
                <div className="flex justify-between items-start">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <span className="text-3xl">{getDiseaseInfo(selectedTip.disease).icon}</span>
                      <span className="text-3xl">{getCategoryInfo(selectedTip.category).icon}</span>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                          getDiseaseInfo(selectedTip.disease).color === 'red' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {selectedTip.disease_display || selectedTip.disease}
                        </span>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                          getCategoryInfo(selectedTip.category).color === 'red' ? 'bg-red-100 text-red-700' :
                          getCategoryInfo(selectedTip.category).color === 'orange' ? 'bg-orange-100 text-orange-700' :
                          getCategoryInfo(selectedTip.category).color === 'green' ? 'bg-green-100 text-green-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {getCategoryInfo(selectedTip.category).label}
                        </span>
                      </div>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">{selectedTip.title}</h2>
                    <p className="text-gray-600">{getCategoryInfo(selectedTip.category).description}</p>
                  </div>
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg p-2 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-8">
                {/* Summary */}
                <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
                  <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
                    <BookOpen className="w-5 h-5 mr-2" />
                    Summary
                  </h3>
                  <p className="text-blue-800 leading-relaxed">{selectedTip.short_summary}</p>
                </div>

                {/* Detailed Content */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Info className="w-5 h-5 mr-2" />
                    Detailed Information
                  </h3>
                  {renderContent(selectedTip.detailed_content, selectedTip.content_type)}
                </div>

                {/* Medical Information */}
                {(selectedTip.risk_factors || selectedTip.prevention_methods || selectedTip.symptoms) && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {selectedTip.risk_factors && (
                      <div className="bg-orange-50 rounded-xl p-6 border border-orange-100">
                        <h4 className="font-semibold text-orange-900 mb-3 flex items-center">
                          <AlertTriangle className="w-5 h-5 mr-2" />
                          Risk Factors
                        </h4>
                        <p className="text-orange-800 text-sm leading-relaxed whitespace-pre-line">
                          {selectedTip.risk_factors}
                        </p>
                      </div>
                    )}

                    {selectedTip.prevention_methods && (
                      <div className="bg-green-50 rounded-xl p-6 border border-green-100">
                        <h4 className="font-semibold text-green-900 mb-3 flex items-center">
                          <Shield className="w-5 h-5 mr-2" />
                          Prevention Methods
                        </h4>
                        <p className="text-green-800 text-sm leading-relaxed whitespace-pre-line">
                          {selectedTip.prevention_methods}
                        </p>
                      </div>
                    )}

                    {selectedTip.symptoms && (
                      <div className="bg-purple-50 rounded-xl p-6 border border-purple-100">
                        <h4 className="font-semibold text-purple-900 mb-3 flex items-center">
                          <Heart className="w-5 h-5 mr-2" />
                          Symptoms to Watch
                        </h4>
                        <p className="text-purple-800 text-sm leading-relaxed whitespace-pre-line">
                          {selectedTip.symptoms}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Video Section */}
                {selectedTip.video_url && (
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-100">
                    <h4 className="font-semibold text-purple-900 mb-4 flex items-center">
                      <Play className="w-5 h-5 mr-2" />
                      Educational Video
                    </h4>
                    <a 
                      href={selectedTip.video_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-2 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors font-medium"
                    >
                      <Play className="w-4 h-4" />
                      <span>Watch Video</span>
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                )}

                {/* Close Button */}
                <div className="flex justify-center pt-6 border-t border-gray-200">
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="px-8 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default PatientPreventionTips;
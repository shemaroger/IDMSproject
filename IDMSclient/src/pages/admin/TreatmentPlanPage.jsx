import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import diagnosisService from '../../services/diagnosisService';
import { authAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { 
  ArrowLeft,
  Calendar,
  Clock,
  Pill,
  FileText,
  User,
  Stethoscope,
  AlertCircle,
  CheckCircle,
  Download,
  Printer,
  Activity,
  Heart,
  Thermometer,
  RefreshCw,
  AlertTriangle,
  Target,
  TrendingUp,
  ClipboardCheck,
  Phone,
  Mail,
  CalendarDays,
  Timer,
  Zap,
  Shield,
  Filter,
  Search,
  Eye,
  Plus,
  ExternalLink,
  MoreHorizontal,
  ChevronDown,
  X
} from 'lucide-react';

const TreatmentPlanPage = () => {
  const { id, diagnosisId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [treatmentPlans, setTreatmentPlans] = useState([]);
  const [treatmentPlan, setTreatmentPlan] = useState(null);
  const [diagnosis, setDiagnosis] = useState(null);
  const [userTreatmentSummary, setUserTreatmentSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('list');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [loadingRef, setLoadingRef] = useState(false); // Prevent double calls

  // NEW: Filter states
  const [filters, setFilters] = useState({
    status: 'all',
    dateRange: 'all',
    search: '',
    userId: '' // For doctor view
  });

  const isPatientView = window.location.pathname.includes('/patient/');
  const isDoctorView = window.location.pathname.includes('/doctor/');

  useEffect(() => {
    // Prevent double calls in React StrictMode
    if (loadingRef) return;
    setLoadingRef(true);
    
    if (id || diagnosisId) {
      setViewMode('detail');
      loadTreatmentPlan();
    } else {
      setViewMode('list');
      loadTreatmentPlansList();
    }
    
    // Cleanup function
    return () => setLoadingRef(false);
  }, [id, diagnosisId]);

  // NEW: Enhanced list loading with user-specific filtering
  const loadTreatmentPlansList = async () => {
    try {
      setLoading(true);
      setError('');
      
      let response;
      let plans = [];
      
      if (isPatientView && user?.id) {
        // Load patient's own treatment plans
        try {
          response = await diagnosisService.treatmentPlans.getMy();
          plans = response.data?.results || response.data || response || [];
        } catch (patientError) {
          console.warn('Could not load patient plans, falling back to general list:', patientError.message);
          // Fallback to general list and filter
          response = await diagnosisService.treatmentPlans.list();
          const allPlans = response.data?.results || response.data || response || [];
          plans = Array.isArray(allPlans) ? allPlans.filter(plan => 
            plan.diagnosis?.patient?.id === user.id || 
            plan.patient?.id === user.id
          ) : [];
        }
        
        // Load user summary
        try {
          const summaryResponse = await diagnosisService.treatmentPlans.getUserSummary(user.id);
          setUserTreatmentSummary(summaryResponse.data || summaryResponse);
        } catch (summaryError) {
          console.warn('Could not load treatment summary:', summaryError.message);
        }
        
      } else if (isDoctorView) {
        // Load all treatment plans for doctor view
        response = await diagnosisService.treatmentPlans.list();
        plans = response.data?.results || response.data || response || [];
        
        // If user filter is applied, filter by specific user
        if (filters.userId) {
          try {
            const userPlansResponse = await diagnosisService.treatmentPlans.getByUser(filters.userId);
            plans = userPlansResponse.treatment_plans || [];
          } catch (filterError) {
            console.warn('Could not filter by user:', filterError.message);
            // Keep the original plans if filtering fails
          }
        }
      } else {
        // Default: load all plans
        response = await diagnosisService.treatmentPlans.list();
        plans = response.data?.results || response.data || response || [];
      }
      
      setTreatmentPlans(Array.isArray(plans) ? plans : []);
      
      // Clear any previous errors if successful
      if (Array.isArray(plans)) {
        setError('');
      }
      
    } catch (error) {
      console.error('Error loading treatment plans list:', error);
      
      // Provide helpful error message
      let errorMessage = 'Failed to load treatment plans.';
      if (error.response?.status === 403) {
        errorMessage = 'Access denied. You may not have permission to view treatment plans.';
      } else if (error.response?.status === 401) {
        errorMessage = 'Authentication required. Please log in again.';
      } else if (error.response?.status === 404) {
        errorMessage = 'Treatment plans endpoint not found. Please contact support.';
      } else if (error.message) {
        errorMessage += ` ${error.message}`;
      }
      
      setError(errorMessage);
      setTreatmentPlans([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const loadTreatmentPlan = async () => {
    try {
      setLoading(true);
      setError('');

      if (diagnosisId) {
        // Load diagnosis first
        try {
          const diagnosisResponse = await diagnosisService.diagnoses.get(diagnosisId);
          const diagnosisData = diagnosisResponse.data || diagnosisResponse;
          setDiagnosis(diagnosisData);
        } catch (diagnosisError) {
          console.error('Could not load diagnosis:', diagnosisError.message);
          setError(`Diagnosis not found (ID: ${diagnosisId}). It may have been deleted or you may not have access to it.`);
          return;
        }
        
        // Try to load treatment plan for diagnosis
        try {
          const treatmentResponse = await diagnosisService.diagnoses.getTreatmentPlan(diagnosisId);
          if (treatmentResponse) {
            const treatmentData = treatmentResponse.data || treatmentResponse;
            setTreatmentPlan(treatmentData);
          }
        } catch (treatmentError) {
          console.log('No direct treatment plan found, searching all plans...');
          
          // Fallback: search through all treatment plans
          try {
            const allPlansResponse = await diagnosisService.treatmentPlans.list();
            const allPlans = allPlansResponse.data?.results || allPlansResponse.data || allPlansResponse || [];
            const matchingPlan = Array.isArray(allPlans) 
              ? allPlans.find(plan => 
                  plan.diagnosis === parseInt(diagnosisId) || 
                  plan.diagnosis?.id === parseInt(diagnosisId) ||
                  plan.diagnosis === diagnosisId ||
                  plan.diagnosis?.id === diagnosisId
                )
              : null;
            
            if (matchingPlan) {
              setTreatmentPlan(matchingPlan);
            } else {
              console.log('No treatment plan found for diagnosis ID:', diagnosisId);
              setTreatmentPlan(null);
            }
          } catch (listError) {
            console.warn('Could not search treatment plans:', listError.message);
            setTreatmentPlan(null);
          }
        }
        
      } else if (id) {
        // Load specific treatment plan by ID
        try {
          const treatmentResponse = await diagnosisService.treatmentPlans.get(id);
          const treatmentData = treatmentResponse.data || treatmentResponse;
          setTreatmentPlan(treatmentData);
          
          // Try to load associated diagnosis
          if (treatmentData.diagnosis) {
            const diagnosisId = treatmentData.diagnosis.id || treatmentData.diagnosis;
            try {
              const diagnosisResponse = await diagnosisService.diagnoses.get(diagnosisId);
              const diagnosisData = diagnosisResponse.data || diagnosisResponse;
              setDiagnosis(diagnosisData);
            } catch (diagnosisError) {
              console.log('Could not load associated diagnosis:', diagnosisError.message);
            }
          }
        } catch (treatmentError) {
          console.error('Treatment plan not found:', treatmentError.message);
          
          // Check if the treatment plan exists in the list
          try {
            const allPlansResponse = await diagnosisService.treatmentPlans.list();
            const allPlans = allPlansResponse.data?.results || allPlansResponse.data || allPlansResponse || [];
            const availablePlans = Array.isArray(allPlans) ? allPlans.map(p => ({
              id: p.id, 
              condition: p.diagnosis?.disease?.name || 'Unknown',
              patient: p.diagnosis?.patient?.email || 'Unknown'
            })) : [];
            
            console.log('Available treatment plans:', availablePlans);
            
            if (availablePlans.length > 0) {
              const plansList = availablePlans
                .map(p => `#${p.id} (${p.condition} - ${p.patient})`)
                .join(', ');
              setError(`Treatment plan #${id} not found. Available plans: ${plansList}`);
            } else {
              setError(`Treatment plan #${id} not found. No treatment plans are currently available.`);
            }
          } catch (listError) {
            console.error('Could not load treatment plans list:', listError);
            setError(`Treatment plan #${id} not found and could not load available plans: ${listError.message}`);
          }
          
          setTreatmentPlan(null);
        }
      }

    } catch (error) {
      console.error('Error loading treatment plan:', error);
      setError(`Failed to load treatment plan: ${error.message || 'Unknown error occurred'}`);
    } finally {
      setLoading(false);
    }
  };

  // NEW: Apply filters to treatment plans
  const applyFilters = () => {
    let filtered = [...treatmentPlans];
    
    if (filters.status !== 'all') {
      filtered = filtered.filter(plan => plan.status === filters.status);
    }
    
    if (filters.dateRange !== 'all') {
      const now = new Date();
      let filterDate = null;

      switch (filters.dateRange) {
        case 'today':
          filterDate = new Date();
          filterDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          filterDate = new Date();
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterDate = new Date();
          filterDate.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          filterDate = new Date();
          filterDate.setFullYear(now.getFullYear() - 1);
          break;
        default:
          filterDate = null;
      }

      if (filterDate) {
        filtered = filtered.filter(plan => new Date(plan.created_at) >= filterDate);
      }
    }
    
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(plan =>
        plan.diagnosis?.disease?.name?.toLowerCase().includes(searchTerm) ||
        plan.diagnosis?.patient?.email?.toLowerCase().includes(searchTerm) ||
        plan.supervising_doctor?.first_name?.toLowerCase().includes(searchTerm) ||
        plan.supervising_doctor?.last_name?.toLowerCase().includes(searchTerm) ||
        plan.instructions?.toLowerCase().includes(searchTerm) ||
        plan.medications?.some(med => 
          med.name?.toLowerCase().includes(searchTerm) ||
          med.medication_name?.toLowerCase().includes(searchTerm)
        )
      );
    }
    
    return filtered;
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'active': { text: 'Active', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle },
      'completed': { text: 'Completed', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: CheckCircle },
      'on_hold': { text: 'On Hold', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock },
      'cancelled': { text: 'Cancelled', color: 'bg-red-100 text-red-800 border-red-200', icon: AlertCircle }
    };
    
    const statusInfo = statusMap[status] || { text: 'Unknown', color: 'bg-gray-100 text-gray-800 border-gray-200', icon: AlertCircle };
    const IconComponent = statusInfo.icon;
    
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 text-sm font-medium rounded-full border ${statusInfo.color}`}>
        <IconComponent className="w-4 h-4" />
        {statusInfo.text}
      </span>
    );
  };

  const getSeverityBadge = (severity) => {
    if (!severity) return null;
    
    const severityMap = {
      'critical': { text: 'Critical', color: 'bg-red-100 text-red-800 border-red-200', icon: AlertTriangle },
      'severe': { text: 'Severe', color: 'bg-orange-100 text-orange-800 border-orange-200', icon: AlertCircle },
      'moderate': { text: 'Moderate', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock },
      'mild': { text: 'Mild', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle }
    };
    
    const severityInfo = severityMap[severity.toLowerCase()] || { text: severity, color: 'bg-gray-100 text-gray-800 border-gray-200', icon: Activity };
    const IconComponent = severityInfo.icon;
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full border ${severityInfo.color}`}>
        <IconComponent className="w-3 h-3" />
        {severityInfo.text}
      </span>
    );
  };

  const viewTreatmentPlan = (planId) => {
    const basePath = isPatientView ? '/patient' : '/doctor';
    navigate(`${basePath}/treatment-plan/${planId}`);
  };

  const formatSymptomDisplay = (symptom) => {
    return symptom.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // NEW: Get enhanced statistics
  const getEnhancedStatistics = () => {
    if (userTreatmentSummary && isPatientView) {
      return {
        total: userTreatmentSummary.total_plans || 0,
        active: userTreatmentSummary.active_plans || 0,
        completed: userTreatmentSummary.completed_plans || 0,
        recent: userTreatmentSummary.recent_plans?.length || 0
      };
    }

    const total = treatmentPlans.length;
    const active = treatmentPlans.filter(p => p.status === 'active').length;
    const completed = treatmentPlans.filter(p => p.status === 'completed').length;
    const recent = treatmentPlans.filter(p => {
      const planDate = new Date(p.created_at);
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      return planDate >= monthAgo;
    }).length;

    return { total, active, completed, recent };
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading treatment plan...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const filteredPlans = viewMode === 'list' ? applyFilters() : [];
  const stats = getEnhancedStatistics();

  // Pagination for list view
  const totalPages = Math.ceil(filteredPlans.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPlans = filteredPlans.slice(startIndex, endIndex);

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {viewMode === 'list' 
                  ? (isPatientView ? 'My Treatment Plans' : 'Treatment Plans')
                  : 'Treatment Plan'
                }
              </h1>
              <p className="text-gray-600">
                {viewMode === 'list' 
                  ? (isPatientView 
                      ? 'View your prescribed treatment plans and medications'
                      : 'Manage and review all treatment plans'
                    )
                  : diagnosis 
                    ? `For ${diagnosis.disease?.name || 'Unknown Condition'}` 
                    : 'Medical treatment plan details'
                }
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {viewMode === 'list' && (
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Filter className="w-4 h-4" />
                Filters
                <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </button>
            )}
            
            {treatmentPlan && !isPatientView && (
              <>
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-2 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  Print
                </button>
                <button
                  onClick={() => {/* Export logic */}}
                  className="flex items-center gap-2 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Export
                </button>
              </>
            )}
            
            <button
              onClick={() => viewMode === 'list' ? loadTreatmentPlansList() : loadTreatmentPlan()}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-red-700 font-medium">{error}</p>
                {treatmentPlans.length > 0 && viewMode === 'detail' && (
                  <div className="mt-3">
                    <p className="text-sm text-red-600 mb-2">Available treatment plans:</p>
                    <div className="flex flex-wrap gap-2">
                      {treatmentPlans.slice(0, 5).map(plan => (
                        <button
                          key={plan.id}
                          onClick={() => navigate(`${isPatientView ? '/patient' : '/doctor'}/treatment-plan/${plan.id}`)}
                          className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 rounded text-sm transition-colors"
                        >
                          Plan #{plan.id} - {plan.diagnosis?.disease?.name || 'Unknown'}
                        </button>
                      ))}
                      {treatmentPlans.length > 5 && (
                        <span className="px-3 py-1 bg-red-50 text-red-700 rounded text-sm">
                          +{treatmentPlans.length - 5} more
                        </span>
                      )}
                    </div>
                    <div className="mt-2">
                      <button
                        onClick={() => {
                          setViewMode('list');
                          navigate(isPatientView ? '/patient/treatment-plans' : '/doctor/treatment-plans');
                        }}
                        className="text-sm text-red-600 hover:text-red-800 underline"
                      >
                        View all treatment plans
                      </button>
                    </div>
                  </div>
                )}
                {viewMode === 'detail' && (
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => loadTreatmentPlan()}
                      className="flex items-center gap-1 px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 rounded text-sm transition-colors"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Retry
                    </button>
                    <button
                      onClick={() => navigate(-1)}
                      className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm transition-colors"
                    >
                      Go Back
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {viewMode === 'list' ? (
          <div className="space-y-6">
            {/* Enhanced Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Plans</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
                  </div>
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active</p>
                    <p className="text-2xl font-bold text-green-600">{stats.active}</p>
                  </div>
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Completed</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.completed}</p>
                  </div>
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Target className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">This Month</p>
                    <p className="text-2xl font-bold text-orange-600">{stats.recent}</p>
                  </div>
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-orange-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* NEW: Enhanced Filters */}
            {showFilters && (
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={filters.status}
                      onChange={(e) => setFilters({...filters, status: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">All Status</option>
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                      <option value="on_hold">On Hold</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
                    <select
                      value={filters.dateRange}
                      onChange={(e) => setFilters({...filters, dateRange: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">All Time</option>
                      <option value="today">Today</option>
                      <option value="week">Last Week</option>
                      <option value="month">Last Month</option>
                      <option value="year">Last Year</option>
                    </select>
                  </div>

                  {isDoctorView && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">User ID</label>
                      <input
                        type="number"
                        placeholder="Filter by user ID..."
                        value={filters.userId}
                        onChange={(e) => setFilters({...filters, userId: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                    <div className="relative">
                      <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search plans..."
                        value={filters.search}
                        onChange={(e) => setFilters({...filters, search: e.target.value})}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                  <div className="text-sm text-gray-600">
                    Showing {filteredPlans.length} of {treatmentPlans.length} treatment plans
                  </div>
                  <button
                    onClick={() => setFilters({status: 'all', dateRange: 'all', search: '', userId: ''})}
                    className="text-sm text-blue-600 hover:text-blue-800 underline"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            )}

            {/* Treatment Plans List */}
            <div className="bg-white border border-gray-200 rounded-lg">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  {isPatientView ? 'Your Treatment Plans' : 'All Treatment Plans'}
                </h2>
                <p className="text-gray-600">
                  {isPatientView 
                    ? 'Review your prescribed treatments and medications'
                    : 'Manage and review patient treatment plans'
                  }
                </p>
              </div>

              <div className="divide-y divide-gray-200">
                {filteredPlans.length === 0 ? (
                  <div className="text-center py-12">
                    <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {treatmentPlans.length === 0 ? 'No Treatment Plans' : 'No Results Found'}
                    </h3>
                    <p className="text-gray-600">
                      {treatmentPlans.length === 0
                        ? (isPatientView 
                            ? "You don't have any treatment plans yet."
                            : "No treatment plans have been created yet."
                          )
                        : "No plans match your current filters."
                      }
                    </p>
                  </div>
                ) : (
                  <>
                    {currentPlans.map((plan) => (
                      <div key={plan.id} className="p-6 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <FileText className="w-4 h-4 text-blue-600" />
                              </div>
                              <div>
                                <h3 className="font-medium text-gray-900">
                                  {plan.diagnosis?.disease?.name || `Treatment Plan #${plan.id}`}
                                </h3>
                                <p className="text-sm text-gray-500">
                                  Created {new Date(plan.created_at).toLocaleDateString()}
                                </p>
                              </div>
                              {getStatusBadge(plan.status || 'active')}
                            </div>

                            <div className="grid md:grid-cols-4 gap-4 mt-3">
                              {!isPatientView && (
                                <div>
                                  <p className="text-sm font-medium text-gray-700">Patient</p>
                                  <p className="text-sm text-gray-600">
                                    {plan.diagnosis?.patient?.email || plan.patient?.email || 'Unknown'}
                                  </p>
                                </div>
                              )}
                              <div>
                                <p className="text-sm font-medium text-gray-700">Condition</p>
                                <p className="text-sm text-gray-600">
                                  {plan.diagnosis?.disease?.name || 'Not specified'}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-700">Duration</p>
                                <p className="text-sm text-gray-600">
                                  {plan.duration || 'Not specified'}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-700">Doctor</p>
                                <p className="text-sm text-gray-600">
                                  {plan.supervising_doctor 
                                    ? `Dr. ${plan.supervising_doctor.first_name} ${plan.supervising_doctor.last_name}`
                                    : 'Not assigned'
                                  }
                                </p>
                              </div>
                            </div>

                            {plan.medications && plan.medications.length > 0 && (
                              <div className="mt-3">
                                <p className="text-sm font-medium text-gray-700 mb-1">
                                  Medications ({plan.medications.length})
                                </p>
                                <div className="flex flex-wrap gap-1">
                                  {plan.medications.slice(0, 3).map((med, index) => (
                                    <span
                                      key={index}
                                      className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full"
                                    >
                                      {med.name || med.medication_name || `Medication ${index + 1}`}
                                    </span>
                                  ))}
                                  {plan.medications.length > 3 && (
                                    <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                                      +{plan.medications.length - 3} more
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}

                            {plan.instructions && (
                              <div className="mt-3">
                                <p className="text-sm font-medium text-gray-700 mb-1">Instructions</p>
                                <p className="text-sm text-gray-600 line-clamp-2">
                                  {plan.instructions}
                                </p>
                              </div>
                            )}
                          </div>

                          <div className="ml-4 flex flex-col gap-2">
                            <button
                              onClick={() => viewTreatmentPlan(plan.id)}
                              className="flex items-center gap-2 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                              View Details
                            </button>
                            {plan.diagnosis?.id && (
                              <button
                                onClick={() => navigate(`${isPatientView ? '/patient' : '/doctor'}/diagnoses/${plan.diagnosis.id}`)}
                                className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                              >
                                <Stethoscope className="w-4 h-4" />
                                View Diagnosis
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                        <div className="flex-1 flex justify-between sm:hidden">
                          <button
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                          >
                            Previous
                          </button>
                          <button
                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages}
                            className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                          >
                            Next
                          </button>
                        </div>
                        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm text-gray-700">
                              Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                              <span className="font-medium">{Math.min(endIndex, filteredPlans.length)}</span> of{' '}
                              <span className="font-medium">{filteredPlans.length}</span> results
                            </p>
                          </div>
                          <div>
                            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                              <button
                                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                disabled={currentPage === 1}
                                className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                              >
                                Previous
                              </button>
                              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pageNumber;
                                if (totalPages <= 5) {
                                  pageNumber = i + 1;
                                } else if (currentPage <= 3) {
                                  pageNumber = i + 1;
                                } else if (currentPage >= totalPages - 2) {
                                  pageNumber = totalPages - 4 + i;
                                } else {
                                  pageNumber = currentPage - 2 + i;
                                }

                                return (
                                  <button
                                    key={pageNumber}
                                    onClick={() => setCurrentPage(pageNumber)}
                                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                      currentPage === pageNumber
                                        ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                        : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                    }`}
                                  >
                                    {pageNumber}
                                  </button>
                                );
                              })}
                              <button
                                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                disabled={currentPage === totalPages}
                                className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                              >
                                Next
                              </button>
                            </nav>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Detail View */
          <div className="space-y-6">
            {diagnosis && (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Patient & Diagnosis Information</h2>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Patient Details</h3>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-600" />
                          <span className="text-gray-900">
                            {diagnosis.patient?.first_name && diagnosis.patient?.last_name 
                              ? `${diagnosis.patient.first_name} ${diagnosis.patient.last_name}`
                              : diagnosis.patient?.email || 'Unknown Patient'
                            }
                          </span>
                        </div>
                        {diagnosis.patient?.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-gray-600" />
                            <span className="text-gray-600">{diagnosis.patient.email}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Diagnosis</h3>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <Stethoscope className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{diagnosis.disease?.name || 'Unknown Condition'}</p>
                          <p className="text-sm text-gray-500">{diagnosis.disease?.category || ''}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 mb-3">
                        {getSeverityBadge(diagnosis.severity)}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Vital Signs</h3>
                      <div className="space-y-1">
                        {diagnosis.temperature && (
                          <div className="flex items-center gap-2 text-sm">
                            <Thermometer className="w-4 h-4 text-red-500" />
                            <span className="text-gray-700">Temperature: {diagnosis.temperature}°F</span>
                          </div>
                        )}
                        {diagnosis.heart_rate && (
                          <div className="flex items-center gap-2 text-sm">
                            <Heart className="w-4 h-4 text-red-500" />
                            <span className="text-gray-700">Heart Rate: {diagnosis.heart_rate} BPM</span>
                          </div>
                        )}
                        {!diagnosis.temperature && !diagnosis.heart_rate && (
                          <p className="text-gray-500 text-sm">No vital signs recorded</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {treatmentPlan ? (
              <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold text-gray-900">Treatment Plan Overview</h2>
                      {getStatusBadge(treatmentPlan.status || 'active')}
                    </div>

                    <div className="space-y-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <Timer className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Duration</p>
                            <p className="font-medium">{treatmentPlan.duration || 'Not specified'}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                            <CalendarDays className="w-4 h-4 text-green-600" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Follow-up</p>
                            <p className="font-medium">{treatmentPlan.follow_up_interval || 'As needed'}</p>
                          </div>
                        </div>
                      </div>

                      {treatmentPlan.supervising_doctor && (
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-purple-600" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Supervising Doctor</p>
                            <p className="font-medium">
                              Dr. {treatmentPlan.supervising_doctor.first_name} {treatmentPlan.supervising_doctor.last_name}
                            </p>
                          </div>
                        </div>
                      )}

                      {treatmentPlan.instructions && (
                        <div>
                          <h3 className="text-sm font-medium text-gray-700 mb-2">Treatment Instructions</h3>
                          <div className="bg-gray-50 rounded-lg p-4">
                            <p className="text-gray-900 whitespace-pre-wrap">{treatmentPlan.instructions}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Prescribed Medications</h2>

                    {treatmentPlan.medications && treatmentPlan.medications.length > 0 ? (
                      <div className="space-y-3">
                        {treatmentPlan.medications.map((medication, index) => (
                          <div key={medication.id || index} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <Pill className="w-4 h-4 text-green-600" />
                              </div>
                              <div className="flex-1">
                                <h3 className="font-medium text-gray-900">{medication.name || medication.medication_name || 'Unknown Medication'}</h3>
                                <div className="grid md:grid-cols-2 gap-4 mt-2 text-sm">
                                  <div>
                                    <p className="text-gray-600">Dosage: <span className="font-medium text-gray-900">{medication.dosage || 'Not specified'}</span></p>
                                    <p className="text-gray-600">Frequency: <span className="font-medium text-gray-900">{medication.frequency || 'Not specified'}</span></p>
                                  </div>
                                  <div>
                                    {medication.duration && (
                                      <p className="text-gray-600">Duration: <span className="font-medium text-gray-900">{medication.duration}</span></p>
                                    )}
                                    {medication.added_at && (
                                      <p className="text-gray-600">Added: <span className="font-medium text-gray-900">{new Date(medication.added_at).toLocaleDateString()}</span></p>
                                    )}
                                  </div>
                                </div>
                                {medication.notes && (
                                  <div className="mt-2 p-2 bg-yellow-50 rounded border-l-4 border-yellow-200">
                                    <p className="text-sm text-yellow-800">
                                      <strong>Instructions:</strong> {medication.notes}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Pill className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No Medications</h3>
                        <p className="text-gray-600">No medications prescribed for this treatment plan.</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Treatment Summary</h3>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ClipboardCheck className="w-4 h-4 text-green-600" />
                          <span className="text-sm text-gray-700">Plan Status</span>
                        </div>
                        <span className="text-sm font-medium text-green-600">
                          {treatmentPlan.status?.replace('_', ' ').replace(/^\w/, c => c.toUpperCase()) || 'Active'}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Pill className="w-4 h-4 text-purple-600" />
                          <span className="text-sm text-gray-700">Medications</span>
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          {treatmentPlan.medications?.length || 0}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-blue-600" />
                          <span className="text-sm text-gray-700">Created</span>
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          {new Date(treatmentPlan.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      {treatmentPlan.updated_at && treatmentPlan.updated_at !== treatmentPlan.created_at && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <RefreshCw className="w-4 h-4 text-orange-600" />
                            <span className="text-sm text-gray-700">Last Updated</span>
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            {new Date(treatmentPlan.updated_at).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {isPatientView && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                      <div className="flex items-center gap-2 mb-3">
                        <ClipboardCheck className="w-5 h-5 text-blue-600" />
                        <h3 className="text-lg font-semibold text-blue-900">Important Reminders</h3>
                      </div>
                      
                      <div className="space-y-2 text-sm text-blue-800">
                        <p>• Take medications as prescribed by your doctor</p>
                        <p>• Follow the treatment duration completely</p>
                        <p>• Contact your doctor if you experience side effects</p>
                        <p>• Attend all follow-up appointments</p>
                        {treatmentPlan.supervising_doctor && (
                          <p>• Your supervising doctor: Dr. {treatmentPlan.supervising_doctor.first_name} {treatmentPlan.supervising_doctor.last_name}</p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                      <h3 className="text-lg font-semibold text-red-900">Emergency Instructions</h3>
                    </div>
                    
                    <div className="space-y-2 text-sm text-red-800">
                      <p>Contact emergency services immediately if you experience:</p>
                      <ul className="list-disc list-inside space-y-1 ml-2">
                        <li>Severe difficulty breathing</li>
                        <li>Chest pain or pressure</li>
                        <li>Loss of consciousness</li>
                        <li>Severe allergic reactions</li>
                        <li>Unusual side effects from medications</li>
                      </ul>
                      <p className="font-medium mt-3">Emergency: 911</p>
                      {treatmentPlan.supervising_doctor && (
                        <p className="font-medium">
                          Doctor Contact: {treatmentPlan.supervising_doctor.email || 'Contact through clinic'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-lg p-12">
                <div className="text-center">
                  <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-medium text-gray-900 mb-2">No Treatment Plan Found</h3>
                  <p className="text-gray-600 mb-4">
                    {diagnosisId 
                      ? 'No treatment plan has been created for this diagnosis yet.'
                      : 'The requested treatment plan could not be found.'
                    }
                  </p>
                  {diagnosis && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
                      <p className="text-sm text-blue-800">
                        <strong>Diagnosis:</strong> {diagnosis.disease?.name || 'Unknown Condition'}
                      </p>
                      <p className="text-sm text-blue-600 mt-1">
                        Status: {diagnosis.status?.replace('_', ' ').replace(/^\w/, c => c.toUpperCase())}
                      </p>
                      {diagnosis.treating_doctor && (
                        <p className="text-sm text-blue-600 mt-1">
                          Doctor: Dr. {diagnosis.treating_doctor.first_name} {diagnosis.treating_doctor.last_name}
                        </p>
                      )}
                    </div>
                  )}
                  <div className="mt-6 flex gap-3 justify-center">
                    {isPatientView && (
                      <button
                        onClick={() => navigate('/patient/diagnoses')}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        View All Diagnoses
                      </button>
                    )}
                    {isDoctorView && (
                      <button
                        onClick={() => navigate('/doctor/treatment-plans')}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        View All Treatment Plans
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default TreatmentPlanPage;
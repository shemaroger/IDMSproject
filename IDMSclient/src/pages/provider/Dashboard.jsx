import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { healthcareAPI, apiUtils } from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { 
  Calendar,
  Activity,
  Heart,
  TrendingUp,
  TrendingDown,
  Clock,
  MapPin,
  AlertTriangle,
  CheckCircle,
  FileText,
  Pill,
  Users,
  BarChart3,
  PieChart,
  LineChart,
  RefreshCw,
  Download,
  Filter,
  Eye,
  Plus
} from 'lucide-react';
import {
  LineChart as RechartsLineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

const PatientAnalyticsDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('last_30_days');
  const [analyticsData, setAnalyticsData] = useState({
    healthOverview: {
      totalAppointments: 0,
      emergencyRequests: 0,
      activePrescriptions: 0,
      healthScore: 0
    },
    appointmentTrends: [],
    healthMetrics: {
      vitals: [],
      symptoms: [],
      medications: []
    },
    emergencyHistory: [],
    upcomingAppointments: [],
    recentActivities: [],
    healthInsights: [],
    complianceMetrics: {
      appointmentAttendance: 0,
      medicationCompliance: 0,
      followUpRate: 0
    }
  });

  const timeRangeOptions = [
    { value: 'last_7_days', label: 'Last 7 Days' },
    { value: 'last_30_days', label: 'Last 30 Days' },
    { value: 'last_3_months', label: 'Last 3 Months' },
    { value: 'last_6_months', label: 'Last 6 Months' },
    { value: 'last_year', label: 'Last Year' }
  ];

  useEffect(() => {
    loadAnalyticsData();
  }, [user, timeRange]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const patientId = user?.patient_id || user?.id;
      if (!patientId) {
        throw new Error('Patient profile not found');
      }

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      switch (timeRange) {
        case 'last_7_days':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case 'last_30_days':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case 'last_3_months':
          startDate.setMonth(endDate.getMonth() - 3);
          break;
        case 'last_6_months':
          startDate.setMonth(endDate.getMonth() - 6);
          break;
        case 'last_year':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
      }

      // Parallel API calls for comprehensive data
      const [
        appointmentsRes,
        emergenciesRes,
        vitalsRes,
        prescriptionsRes,
        upcomingRes
      ] = await Promise.allSettled([
        healthcareAPI.appointments.list({ 
          patient: patientId,
          appointment_date__gte: startDate.toISOString().split('T')[0],
          appointment_date__lte: endDate.toISOString().split('T')[0]
        }),
        healthcareAPI.emergencies.list({ 
          patient: patientId,
          request_time__gte: startDate.toISOString(),
          request_time__lte: endDate.toISOString()
        }),
        // Mock vitals data - replace with actual API call
        Promise.resolve({ data: generateMockVitals(startDate, endDate) }),
        healthcareAPI.prescriptions?.list({ patient: patientId }) || Promise.resolve({ data: [] }),
        healthcareAPI.appointments.list({ 
          patient: patientId,
          appointment_date__gte: new Date().toISOString().split('T')[0],
          status: 'A'
        })
      ]);

      // Extract data safely
      const appointments = extractApiData(appointmentsRes);
      const emergencies = extractApiData(emergenciesRes);
      const vitals = extractApiData(vitalsRes);
      const prescriptions = extractApiData(prescriptionsRes);
      const upcoming = extractApiData(upcomingRes);

      // Process and transform data
      const processedData = processAnalyticsData({
        appointments,
        emergencies,
        vitals,
        prescriptions,
        upcoming,
        startDate,
        endDate
      });

      setAnalyticsData(processedData);

    } catch (error) {
      console.error('Error loading analytics data:', error);
      setError(apiUtils.formatErrorMessage(error));
      
      // Set fallback data
      setAnalyticsData({
        healthOverview: { totalAppointments: 0, emergencyRequests: 0, activePrescriptions: 0, healthScore: 0 },
        appointmentTrends: [],
        healthMetrics: { vitals: [], symptoms: [], medications: [] },
        emergencyHistory: [],
        upcomingAppointments: [],
        recentActivities: [],
        healthInsights: [],
        complianceMetrics: { appointmentAttendance: 0, medicationCompliance: 0, followUpRate: 0 }
      });
    } finally {
      setLoading(false);
    }
  };

  const extractApiData = (response) => {
    if (response.status === 'fulfilled') {
      const data = response.value?.data;
      return data?.results || data || [];
    }
    return [];
  };

  const generateMockVitals = (startDate, endDate) => {
    const vitals = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      vitals.push({
        date: currentDate.toISOString().split('T')[0],
        blood_pressure_systolic: 110 + Math.random() * 30,
        blood_pressure_diastolic: 70 + Math.random() * 20,
        heart_rate: 60 + Math.random() * 40,
        temperature: 36.1 + Math.random() * 2,
        weight: 70 + Math.random() * 10,
        blood_sugar: 80 + Math.random() * 60
      });
      currentDate.setDate(currentDate.getDate() + 3);
    }
    
    return vitals;
  };

  const processAnalyticsData = (data) => {
    const { appointments, emergencies, vitals, prescriptions, upcoming } = data;

    // Process appointment trends
    const appointmentTrends = processTimeSeriesData(appointments, 'appointment_date');
    
    // Calculate health overview
    const healthOverview = {
      totalAppointments: appointments.length,
      emergencyRequests: emergencies.length,
      activePrescriptions: prescriptions.filter(p => p.status === 'active').length,
      healthScore: calculateHealthScore(appointments, emergencies, vitals)
    };

    // Process health metrics
    const healthMetrics = {
      vitals: vitals.map(v => ({
        date: v.date,
        bloodPressure: `${Math.round(v.blood_pressure_systolic)}/${Math.round(v.blood_pressure_diastolic)}`,
        heartRate: Math.round(v.heart_rate),
        temperature: v.temperature.toFixed(1),
        weight: v.weight.toFixed(1)
      })),
      symptoms: generateSymptomsTrend(appointments),
      medications: prescriptions.map(p => ({
        name: p.medication_name || p.name,
        dosage: p.dosage,
        frequency: p.frequency,
        compliance: Math.random() * 30 + 70 // Mock compliance percentage
      }))
    };

    // Process emergency history
    const emergencyHistory = emergencies.map(e => ({
      id: e.id,
      date: new Date(e.request_time).toLocaleDateString(),
      condition: e.condition_description,
      severity: e.urgency_level,
      status: e.status,
      outcome: e.resolution || 'Resolved'
    }));

    // Process upcoming appointments
    const upcomingAppointments = upcoming.slice(0, 5).map(apt => ({
      id: apt.id,
      date: new Date(apt.appointment_date).toLocaleDateString(),
      time: new Date(apt.appointment_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
      doctor: apt.healthcare_provider?.name || 'Dr. Smith',
      type: apt.appointment_type || 'General Consultation',
      location: apt.clinic?.name || 'Main Clinic'
    }));

    // Generate recent activities
    const recentActivities = generateRecentActivities(appointments, emergencies, prescriptions);

    // Generate health insights
    const healthInsights = generateHealthInsights(healthMetrics, emergencies, appointments);

    // Calculate compliance metrics
    const complianceMetrics = {
      appointmentAttendance: calculateAttendanceRate(appointments),
      medicationCompliance: calculateMedicationCompliance(prescriptions),
      followUpRate: calculateFollowUpRate(appointments)
    };

    return {
      healthOverview,
      appointmentTrends,
      healthMetrics,
      emergencyHistory,
      upcomingAppointments,
      recentActivities,
      healthInsights,
      complianceMetrics
    };
  };

  const processTimeSeriesData = (data, dateField) => {
    const grouped = {};
    data.forEach(item => {
      const date = new Date(item[dateField]).toLocaleDateString();
      grouped[date] = (grouped[date] || 0) + 1;
    });
    
    return Object.entries(grouped).map(([date, count]) => ({ date, count }));
  };

  const calculateHealthScore = (appointments, emergencies, vitals) => {
    let score = 100;
    
    // Deduct for emergencies
    score -= emergencies.length * 5;
    
    // Deduct for missed appointments
    const missedAppointments = appointments.filter(a => a.status === 'C').length;
    score -= missedAppointments * 3;
    
    // Add for regular check-ups
    const checkUps = appointments.filter(a => a.status === 'D').length;
    score += Math.min(checkUps * 2, 20);
    
    return Math.max(Math.min(score, 100), 0);
  };

  const generateSymptomsTrend = (appointments) => {
    const symptoms = ['Headache', 'Fatigue', 'Fever', 'Cough', 'Nausea'];
    return symptoms.map(symptom => ({
      name: symptom,
      frequency: Math.floor(Math.random() * 10),
      severity: Math.random() * 5 + 1
    }));
  };

  const generateRecentActivities = (appointments, emergencies, prescriptions) => {
    const activities = [];
    
    appointments.slice(0, 3).forEach(apt => {
      activities.push({
        id: `apt-${apt.id}`,
        type: 'appointment',
        title: 'Medical Appointment',
        description: `Consultation with ${apt.healthcare_provider?.name || 'Doctor'}`,
        date: apt.appointment_date,
        icon: Calendar,
        color: 'text-blue-600'
      });
    });

    emergencies.slice(0, 2).forEach(emergency => {
      activities.push({
        id: `emr-${emergency.id}`,
        type: 'emergency',
        title: 'Emergency Request',
        description: emergency.condition_description,
        date: emergency.request_time,
        icon: AlertTriangle,
        color: 'text-red-600'
      });
    });

    return activities.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
  };

  const generateHealthInsights = (healthMetrics, emergencies, appointments) => {
    const insights = [];
    
    if (healthMetrics.vitals.length > 0) {
      const latestVitals = healthMetrics.vitals[healthMetrics.vitals.length - 1];
      if (latestVitals.heartRate > 100) {
        insights.push({
          type: 'warning',
          title: 'Elevated Heart Rate',
          message: 'Your recent heart rate reading is above normal range.',
          action: 'Consider scheduling a check-up'
        });
      }
    }

    if (emergencies.length > 2) {
      insights.push({
        type: 'alert',
        title: 'Frequent Emergency Visits',
        message: 'You have had multiple emergency visits recently.',
        action: 'Discuss preventive care with your doctor'
      });
    }

    if (appointments.filter(a => a.status === 'D').length < 2) {
      insights.push({
        type: 'info',
        title: 'Regular Check-ups',
        message: 'Consider scheduling regular preventive check-ups.',
        action: 'Book a wellness appointment'
      });
    }

    return insights;
  };

  const calculateAttendanceRate = (appointments) => {
    if (appointments.length === 0) return 0;
    const attended = appointments.filter(a => a.status === 'D').length;
    return Math.round((attended / appointments.length) * 100);
  };

  const calculateMedicationCompliance = (prescriptions) => {
    return Math.random() * 20 + 80; // Mock compliance rate
  };

  const calculateFollowUpRate = (appointments) => {
    const followUps = appointments.filter(a => 
      a.reason?.toLowerCase().includes('follow') || 
      a.appointment_type?.toLowerCase().includes('follow')
    ).length;
    return appointments.length > 0 ? Math.round((followUps / appointments.length) * 100) : 0;
  };

  const exportHealthData = () => {
    const exportData = {
      timeRange,
      generatedAt: new Date().toISOString(),
      patientId: user?.id,
      healthOverview: analyticsData.healthOverview,
      complianceMetrics: analyticsData.complianceMetrics,
      upcomingAppointments: analyticsData.upcomingAppointments,
      recentActivities: analyticsData.recentActivities
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `health_analytics_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const StatCard = ({ icon: Icon, title, value, subtitle, color = 'text-gray-600', trend = null, onClick = null }) => (
    <div 
      className={`bg-white p-6 rounded-xl shadow-sm border border-gray-100 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className="flex flex-col items-end">
          <Icon className={`h-8 w-8 ${color}`} />
          {trend !== null && (
            <div className={`flex items-center mt-2 text-xs ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {trend > 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
              {Math.abs(trend)}%
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your health analytics...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 mb-4">{error}</p>
            <button 
              onClick={loadAnalyticsData}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 mx-auto"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-2">
                Health Analytics Dashboard
              </h1>
              <p className="text-blue-100">
                Track your health journey and wellness metrics over time
              </p>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="px-4 py-2 bg-white/20 text-white rounded-lg border border-white/30 focus:ring-2 focus:ring-white/50"
              >
                {timeRangeOptions.map(option => (
                  <option key={option.value} value={option.value} className="text-gray-900">
                    {option.label}
                  </option>
                ))}
              </select>
              <button
                onClick={exportHealthData}
                className="flex items-center gap-2 px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors"
              >
                <Download className="h-4 w-4" />
                Export
              </button>
              <button
                onClick={loadAnalyticsData}
                className="flex items-center gap-2 px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Health Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Calendar}
            title="Total Appointments"
            value={analyticsData.healthOverview.totalAppointments}
            subtitle={`${timeRange.replace('_', ' ')}`}
            color="text-blue-600"
            trend={5}
          />
          <StatCard
            icon={AlertTriangle}
            title="Emergency Requests"
            value={analyticsData.healthOverview.emergencyRequests}
            subtitle="Urgent care visits"
            color="text-red-600"
            trend={-12}
          />
          <StatCard
            icon={Pill}
            title="Active Prescriptions"
            value={analyticsData.healthOverview.activePrescriptions}
            subtitle="Current medications"
            color="text-green-600"
          />
          <StatCard
            icon={Heart}
            title="Health Score"
            value={analyticsData.healthOverview.healthScore}
            subtitle="Overall wellness"
            color="text-purple-600"
            trend={3}
          />
        </div>

        {/* Compliance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            icon={CheckCircle}
            title="Appointment Attendance"
            value={`${analyticsData.complianceMetrics.appointmentAttendance}%`}
            subtitle="Show-up rate"
            color="text-green-600"
          />
          <StatCard
            icon={Pill}
            title="Medication Compliance"
            value={`${Math.round(analyticsData.complianceMetrics.medicationCompliance)}%`}
            subtitle="Adherence rate"
            color="text-blue-600"
          />
          <StatCard
            icon={Activity}
            title="Follow-up Rate"
            value={`${analyticsData.complianceMetrics.followUpRate}%`}
            subtitle="Care continuity"
            color="text-purple-600"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Charts */}
          <div className="lg:col-span-2 space-y-6">
            {/* Appointment Trends */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <LineChart className="h-5 w-5 text-blue-600 mr-2" />
                Appointment Trends
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsLineChart data={analyticsData.appointmentTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#3B82F6" strokeWidth={2} />
                </RechartsLineChart>
              </ResponsiveContainer>
            </div>

            {/* Health Metrics */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Heart className="h-5 w-5 text-red-600 mr-2" />
                Vital Signs Trends
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsLineChart data={analyticsData.healthMetrics.vitals}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="heartRate" stroke="#EF4444" name="Heart Rate" />
                  <Line type="monotone" dataKey="weight" stroke="#10B981" name="Weight" />
                </RechartsLineChart>
              </ResponsiveContainer>
            </div>

            {/* Symptoms Analysis */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <BarChart3 className="h-5 w-5 text-orange-600 mr-2" />
                Common Symptoms
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={analyticsData.healthMetrics.symptoms}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="frequency" fill="#F59E0B" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Health Insights */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Eye className="h-5 w-5 text-purple-600 mr-2" />
                Health Insights
              </h3>
              
              <div className="space-y-4">
                {analyticsData.healthInsights.length > 0 ? (
                  analyticsData.healthInsights.map((insight, index) => (
                    <div 
                      key={index} 
                      className={`p-4 rounded-lg border-l-4 ${
                        insight.type === 'warning' ? 'bg-yellow-50 border-yellow-500' :
                        insight.type === 'alert' ? 'bg-red-50 border-red-500' :
                        'bg-blue-50 border-blue-500'
                      }`}
                    >
                      <div className="font-medium text-gray-900">{insight.title}</div>
                      <div className="text-sm text-gray-600 mt-1">{insight.message}</div>
                      <div className="text-xs text-gray-500 mt-2">{insight.action}</div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6">
                    <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                    <p className="text-gray-600">Your health metrics look good!</p>
                  </div>
                )}
              </div>
            </div>

            {/* Upcoming Appointments */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Calendar className="h-5 w-5 text-blue-600 mr-2" />
                  Upcoming Appointments
                </h3>
                <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                  <Plus className="h-4 w-4 inline mr-1" />
                  Schedule
                </button>
              </div>
              
              <div className="space-y-3">
                {analyticsData.upcomingAppointments.length > 0 ? (
                  analyticsData.upcomingAppointments.map((appointment) => (
                    <div key={appointment.id} className="p-3 bg-gray-50 rounded-lg">
                      <div className="font-medium text-gray-900">{appointment.doctor}</div>
                      <div className="text-sm text-gray-600">{appointment.type}</div>
                      <div className="text-xs text-gray-500 flex items-center mt-1">
                        <Clock className="h-3 w-3 mr-1" />
                        {appointment.date} at {appointment.time}
                      </div>
                      {appointment.location && (
                        <div className="text-xs text-gray-500 flex items-center">
                          <MapPin className="h-3 w-3 mr-1" />
                          {appointment.location}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4">
                    <Calendar className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">No upcoming appointments</p>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Activities */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Activity className="h-5 w-5 text-green-600 mr-2" />
                Recent Activities
              </h3>
              
              <div className="space-y-3">
                {analyticsData.recentActivities.map((activity) => {
                  const IconComponent = activity.icon;
                  return (
                    <div key={activity.id} className="flex items-start space-x-3">
                      <div className={`p-2 rounded-full bg-gray-100`}>
                        <IconComponent className={`h-4 w-4 ${activity.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 text-sm">{activity.title}</div>
                        <div className="text-xs text-gray-600 truncate">{activity.description}</div>
                        <div className="text-xs text-gray-500">
                          {new Date(activity.date).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Emergency History */}
        {analyticsData.emergencyHistory.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
              Emergency History
            </h3>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Condition
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Severity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Outcome
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {analyticsData.emergencyHistory.map((emergency) => (
                    <tr key={emergency.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {emergency.date}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                        <div className="truncate" title={emergency.condition}>
                          {emergency.condition}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          emergency.severity === 'immediate' ? 'bg-red-100 text-red-800' :
                          emergency.severity === 'urgent' ? 'bg-orange-100 text-orange-800' :
                          emergency.severity === 'standard' ? 'bg-blue-100 text-blue-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {emergency.severity}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          emergency.status === 'C' || emergency.status === 'completed' ? 'bg-green-100 text-green-800' :
                          emergency.status === 'D' || emergency.status === 'dispatched' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {emergency.status === 'C' ? 'Completed' : 
                           emergency.status === 'D' ? 'Dispatched' :
                           emergency.status === 'P' ? 'Pending' : emergency.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {emergency.outcome}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Medication Tracking */}
        {analyticsData.healthMetrics.medications.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Pill className="h-5 w-5 text-green-600 mr-2" />
              Medication Compliance
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {analyticsData.healthMetrics.medications.map((medication, index) => (
                <div key={index} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium text-gray-900">{medication.name}</div>
                    <div className="text-sm text-gray-500">{medication.dosage}</div>
                  </div>
                  <div className="text-sm text-gray-600 mb-3">{medication.frequency}</div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Compliance</span>
                    <span className={`text-xs font-medium ${
                      medication.compliance >= 90 ? 'text-green-600' :
                      medication.compliance >= 70 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {Math.round(medication.compliance)}%
                    </span>
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                    <div 
                      className={`h-2 rounded-full ${
                        medication.compliance >= 90 ? 'bg-green-500' :
                        medication.compliance >= 70 ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${medication.compliance}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Health Goals & Recommendations */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Health Goals */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <TrendingUp className="h-5 w-5 text-purple-600 mr-2" />
              Health Goals
            </h3>
            
            <div className="space-y-4">
              <div className="p-4 bg-purple-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-purple-900">Weight Management</span>
                  <span className="text-sm text-purple-600">75% Complete</span>
                </div>
                <div className="w-full bg-purple-200 rounded-full h-2">
                  <div className="bg-purple-600 h-2 rounded-full" style={{ width: '75%' }}></div>
                </div>
                <p className="text-sm text-purple-700 mt-2">Target: Lose 5kg by end of year</p>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-blue-900">Blood Pressure Control</span>
                  <span className="text-sm text-blue-600">90% Complete</span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: '90%' }}></div>
                </div>
                <p className="text-sm text-blue-700 mt-2">Target: Maintain under 130/80</p>
              </div>

              <div className="p-4 bg-green-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-green-900">Exercise Routine</span>
                  <span className="text-sm text-green-600">60% Complete</span>
                </div>
                <div className="w-full bg-green-200 rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full" style={{ width: '60%' }}></div>
                </div>
                <p className="text-sm text-green-700 mt-2">Target: 150 minutes weekly</p>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <FileText className="h-5 w-5 text-orange-600 mr-2" />
              Personalized Recommendations
            </h3>
            
            <div className="space-y-4">
              <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border-l-4 border-blue-500">
                <div className="font-medium text-gray-900 mb-1">Preventive Care</div>
                <p className="text-sm text-gray-600 mb-2">Schedule your annual physical examination</p>
                <button className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">
                  Schedule Now
                </button>
              </div>

              <div className="p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border-l-4 border-green-500">
                <div className="font-medium text-gray-900 mb-1">Lifestyle</div>
                <p className="text-sm text-gray-600 mb-2">Consider increasing daily water intake to 8 glasses</p>
                <button className="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700">
                  Set Reminder
                </button>
              </div>

              <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border-l-4 border-yellow-500">
                <div className="font-medium text-gray-900 mb-1">Medication</div>
                <p className="text-sm text-gray-600 mb-2">Refill prescription for blood pressure medication</p>
                <button className="text-xs bg-yellow-600 text-white px-3 py-1 rounded hover:bg-yellow-700">
                  Request Refill
                </button>
              </div>

              <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border-l-4 border-purple-500">
                <div className="font-medium text-gray-900 mb-1">Mental Health</div>
                <p className="text-sm text-gray-600 mb-2">Practice stress management techniques daily</p>
                <button className="text-xs bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700">
                  Learn More
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Export Summary */}
        <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Health Data Summary</h3>
              <p className="text-gray-600">
                Complete health report for {timeRange.replace('_', ' ')} • Generated on {new Date().toLocaleDateString()}
              </p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={exportHealthData}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Download className="h-4 w-4" />
                Export Full Report
              </button>
              <button 
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <FileText className="h-4 w-4" />
                Print Report
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PatientAnalyticsDashboard;
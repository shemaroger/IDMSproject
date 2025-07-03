// src/pages/nurse/Dashboard.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { healthcareAPI, authAPI, apiUtils } from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import {
  Calendar,
  Clock,
  Users,
  AlertTriangle,
  CheckCircle,
  Bell,
  Activity,
  Heart,
  Stethoscope,
  ClipboardList,
  UserCheck,
  MessageSquare,
  TrendingUp,
  ArrowRight,
  RefreshCw,
  Plus,
  Eye,
  Edit,
  Phone,
  Mail,
  MapPin,
  Star,
  Award,
  Target,
  Zap,
  Shield,
  FileText,
  BarChart3
} from 'lucide-react';

const NurseDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    appointments: [],
    todayStats: {
      totalAppointments: 0,
      pendingApprovals: 0,
      checkedInPatients: 0,
      emergencyIntakes: 0,
      completedTasks: 0
    },
    recentActivities: [],
    urgentTasks: [],
    patientAlerts: []
  });
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const navigate = useNavigate();
  const currentUser = authAPI.getCurrentUser();

  useEffect(() => {
    fetchDashboardData();
    
    // Update time every minute
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    // Refresh dashboard data every 5 minutes
    const dataInterval = setInterval(fetchDashboardData, 5 * 60 * 1000);

    return () => {
      clearInterval(timeInterval);
      clearInterval(dataInterval);
    };
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch appointments and related data
      const [appointmentsResponse] = await Promise.allSettled([
        healthcareAPI.appointments.list(),
        // Add other API calls as needed
      ]);

      const appointments = appointmentsResponse.status === 'fulfilled' 
        ? (appointmentsResponse.value.data.results || appointmentsResponse.value.data || [])
        : [];

      // Calculate today's stats
      const today = new Date().toDateString();
      const todayAppointments = appointments.filter(apt => 
        new Date(apt.appointment_date).toDateString() === today
      );

      const stats = {
        totalAppointments: todayAppointments.length,
        pendingApprovals: appointments.filter(apt => apt.status === 'P').length,
        checkedInPatients: todayAppointments.filter(apt => apt.status === 'A').length,
        emergencyIntakes: 2, // Mock data - replace with real emergency data
        completedTasks: todayAppointments.filter(apt => apt.status === 'D').length
      };

      // Generate mock urgent tasks and activities
      const urgentTasks = [
        {
          id: 1,
          type: 'approval',
          title: 'Appointment Approval Needed',
          description: 'John Doe - Emergency consultation request',
          priority: 'high',
          time: '10 minutes ago',
          action: () => navigate('/nurse/appointments?filter=pending')
        },
        {
          id: 2,
          type: 'vitals',
          title: 'Vital Signs Recording',
          description: 'Room 205 - Patient waiting for vitals check',
          priority: 'medium',
          time: '15 minutes ago',
          action: () => navigate('/nurse/vitals')
        },
        {
          id: 3,
          type: 'medication',
          title: 'Medication Administration',
          description: 'Sarah Johnson - Pain medication due',
          priority: 'high',
          time: '5 minutes ago',
          action: () => navigate('/nurse/medications')
        }
      ];

      const recentActivities = [
        {
          id: 1,
          type: 'appointment',
          message: 'Approved appointment for Maria Garcia',
          time: '2 hours ago',
          icon: CheckCircle,
          color: 'text-green-600'
        },
        {
          id: 2,
          type: 'patient',
          message: 'Checked in patient Robert Smith',
          time: '3 hours ago',
          icon: UserCheck,
          color: 'text-blue-600'
        },
        {
          id: 3,
          type: 'emergency',
          message: 'Processed emergency intake',
          time: '4 hours ago',
          icon: AlertTriangle,
          color: 'text-red-600'
        }
      ];

      setDashboardData({
        appointments,
        todayStats: stats,
        recentActivities,
        urgentTasks,
        patientAlerts: []
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const quickActions = [
    {
      title: 'Approve Appointments',
      description: 'Review pending appointment requests',
      icon: Calendar,
      color: 'bg-blue-500',
      badge: dashboardData.todayStats.pendingApprovals,
      action: () => navigate('/nurse/appointments?filter=pending_approval')
    },
    {
      title: 'Patient Check-in',
      description: 'Check in arriving patients',
      icon: UserCheck,
      color: 'bg-green-500',
      action: () => navigate('/nurse/patients?action=checkin')
    },
    {
      title: 'Emergency Intake',
      description: 'Process emergency patients',
      icon: AlertTriangle,
      color: 'bg-red-500',
      badge: dashboardData.todayStats.emergencyIntakes,
      action: () => navigate('/nurse/emergency')
    },
    {
      title: 'Vital Signs',
      description: 'Record patient vitals',
      icon: Activity,
      color: 'bg-purple-500',
      action: () => navigate('/nurse/vitals')
    },
    {
      title: 'Medication Admin',
      description: 'Administer medications',
      icon: Heart,
      color: 'bg-pink-500',
      action: () => navigate('/nurse/medications')
    },
    {
      title: 'Care Coordination',
      description: 'Coordinate patient care',
      icon: MessageSquare,
      color: 'bg-indigo-500',
      action: () => navigate('/nurse/coordination')
    }
  ];

  if (loading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading nurse dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50 p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header Section */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  Good {currentTime.getHours() < 12 ? 'Morning' : currentTime.getHours() < 18 ? 'Afternoon' : 'Evening'}, {currentUser?.first_name}!
                </h1>
                <p className="text-gray-600">{formatDate(currentTime)}</p>
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Clock className="h-4 w-4" />
                    <span>Current Time: {formatTime(currentTime)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <Zap className="h-4 w-4" />
                    <span>Active Shift</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 lg:mt-0 flex gap-3">
                <button
                  onClick={fetchDashboardData}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </button>
                <button
                  onClick={() => navigate('/nurse/appointments')}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Calendar className="h-4 w-4" />
                  Manage Appointments
                </button>
              </div>
            </div>
          </div>

          {/* Today's Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Today's Appointments</p>
                  <p className="text-2xl font-semibold text-gray-900">{dashboardData.todayStats.totalAppointments}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center gap-3">
                <div className="bg-yellow-100 p-2 rounded-lg">
                  <Clock className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Pending Approvals</p>
                  <p className="text-2xl font-semibold text-gray-900">{dashboardData.todayStats.pendingApprovals}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center gap-3">
                <div className="bg-green-100 p-2 rounded-lg">
                  <UserCheck className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Checked In</p>
                  <p className="text-2xl font-semibold text-gray-900">{dashboardData.todayStats.checkedInPatients}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center gap-3">
                <div className="bg-red-100 p-2 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Emergency Intakes</p>
                  <p className="text-2xl font-semibold text-gray-900">{dashboardData.todayStats.emergencyIntakes}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center gap-3">
                <div className="bg-purple-100 p-2 rounded-lg">
                  <Target className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Completed Tasks</p>
                  <p className="text-2xl font-semibold text-gray-900">{dashboardData.todayStats.completedTasks}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {quickActions.map((action, index) => (
                <button
                  key={index}
                  onClick={action.action}
                  className="relative p-4 border border-gray-200 rounded-lg hover:shadow-md transition-all duration-200 text-left group"
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${action.color} text-white`}>
                      <action.icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                        {action.title}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">{action.description}</p>
                    </div>
                    {action.badge && action.badge > 0 && (
                      <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center">
                        {action.badge}
                      </span>
                    )}
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600 transition-colors mt-2" />
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Urgent Tasks */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Urgent Tasks</h2>
                <Bell className="h-5 w-5 text-gray-400" />
              </div>
              
              {dashboardData.urgentTasks.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                  <p className="text-gray-600">All caught up! No urgent tasks.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {dashboardData.urgentTasks.map((task) => (
                    <div
                      key={task.id}
                      className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={task.action}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-gray-900">{task.title}</h3>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(task.priority)}`}>
                              {task.priority}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">{task.description}</p>
                          <p className="text-xs text-gray-500 mt-1">{task.time}</p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-gray-400 flex-shrink-0 ml-2" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Activities */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Recent Activities</h2>
                <Activity className="h-5 w-5 text-gray-400" />
              </div>
              
              <div className="space-y-4">
                {dashboardData.recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className={`p-1 rounded-full ${activity.color}`}>
                      <activity.icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">{activity.message}</p>
                      <p className="text-xs text-gray-500">{activity.time}</p>
                    </div>
                  </div>
                ))}
                
                <button
                  onClick={() => navigate('/nurse/reports')}
                  className="w-full text-center py-2 text-sm text-blue-600 hover:text-blue-700 transition-colors"
                >
                  View All Activities
                </button>
              </div>
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="mt-6 bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Today's Performance</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-2">
                  <Award className="h-6 w-6 text-green-600" />
                </div>
                <p className="text-sm text-gray-600">Efficiency Rate</p>
                <p className="text-xl font-semibold text-gray-900">94%</p>
              </div>
              
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-2">
                  <Star className="h-6 w-6 text-blue-600" />
                </div>
                <p className="text-sm text-gray-600">Patient Satisfaction</p>
                <p className="text-xl font-semibold text-gray-900">4.8/5</p>
              </div>
              
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-100 rounded-full mb-2">
                  <TrendingUp className="h-6 w-6 text-purple-600" />
                </div>
                <p className="text-sm text-gray-600">Tasks Completed</p>
                <p className="text-xl font-semibold text-gray-900">18/20</p>
              </div>
              
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-orange-100 rounded-full mb-2">
                  <Shield className="h-6 w-6 text-orange-600" />
                </div>
                <p className="text-sm text-gray-600">Safety Score</p>
                <p className="text-xl font-semibold text-gray-900">Excellent</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default NurseDashboard;
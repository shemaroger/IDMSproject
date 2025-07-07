import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { healthcareAPI, authAPI } from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import {
  Calendar, Clock, Phone, AlertTriangle, CheckCircle, Users, UserPlus, 
  UserCheck, RefreshCw, FileText, Activity, TrendingUp
} from 'lucide-react';

const NurseReceptionistDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalAppointments: 0,
    pendingAppointments: 0,
    approvedAppointments: 0,
    emergencyRequests: 0,
    completedToday: 0
  });
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  
  const navigate = useNavigate();
  const currentUser = authAPI.getCurrentUser();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      const [appointmentsRes, emergencyRes] = await Promise.allSettled([
        healthcareAPI.appointments.list(),
        healthcareAPI.emergencies?.list().catch(() => ({ data: [] }))
      ]);

      const appointments = appointmentsRes.status === 'fulfilled' ? 
        (appointmentsRes.value?.data?.results || appointmentsRes.value?.data || []) : [];
      const emergencies = emergencyRes.status === 'fulfilled' ? 
        (emergencyRes.value?.data?.results || emergencyRes.value?.data || []) : [];

      // Calculate today's stats
      const today = new Date().toDateString();
      const todayAppointments = appointments.filter(apt => 
        new Date(apt.appointment_date).toDateString() === today
      );

      setStats({
        totalAppointments: todayAppointments.length,
        pendingAppointments: appointments.filter(apt => apt.status === 'P').length,
        approvedAppointments: appointments.filter(apt => apt.status === 'A').length,
        emergencyRequests: emergencies.filter(e => 
          e.status === 'P' || e.approval_status === 'pending'
        ).length,
        completedToday: todayAppointments.filter(apt => apt.status === 'D').length
      });

      // Get next 3 upcoming appointments
      const now = new Date();
      const upcoming = appointments
        .filter(apt => new Date(apt.appointment_date) > now && apt.status === 'A')
        .sort((a, b) => new Date(a.appointment_date) - new Date(b.appointment_date))
        .slice(0, 3);
      
      setUpcomingAppointments(upcoming);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    {
      title: 'Manage Appointments',
      icon: Calendar,
      color: 'bg-blue-600',
      badge: stats.pendingAppointments,
      action: () => navigate('/nurse/appointments')
    },
    {
      title: 'Emergency Requests',
      icon: AlertTriangle,
      color: 'bg-red-600',
      badge: stats.emergencyRequests,
      action: () => navigate('/nurse/emergency')
    },
    {
      title: 'Patient Check-in',
      icon: UserCheck,
      color: 'bg-green-600',
      action: () => navigate('/nurse/checkin')
    },
    {
      title: 'New Registration',
      icon: UserPlus,
      color: 'bg-purple-600',
      action: () => navigate('/nurse/registration')
    },
    {
      title: 'Reports',
      icon: FileText,
      color: 'bg-teal-600',
      action: () => navigate('/nurse/reports')
    },
    {
      title: 'Directory',
      icon: Phone,
      color: 'bg-indigo-600',
      action: () => navigate('/nurse/directory')
    }
  ];

  const StatCard = ({ title, value, icon: Icon, color }) => (
    <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
        </div>
        <Icon className={`h-8 w-8 ${color.replace('text-', 'text-').replace('-600', '-500')}`} />
      </div>
    </div>
  );

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Reception Dashboard</h1>
              <p className="text-gray-600 mt-1">
                Welcome back, {currentUser?.first_name}! Manage appointments and emergency requests.
              </p>
            </div>
            <button
              onClick={fetchDashboardData}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <StatCard title="Today's Appointments" value={stats.totalAppointments} icon={Calendar} color="text-blue-600" />
          <StatCard title="Pending Approval" value={stats.pendingAppointments} icon={Clock} color="text-orange-600" />
          <StatCard title="Approved" value={stats.approvedAppointments} icon={CheckCircle} color="text-green-600" />
          <StatCard title="Emergency Requests" value={stats.emergencyRequests} icon={AlertTriangle} color="text-red-600" />
          <StatCard title="Completed Today" value={stats.completedToday} icon={Activity} color="text-purple-600" />
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {quickActions.map((action, index) => (
              <button
                key={index}
                onClick={action.action}
                className="relative p-4 border border-gray-200 rounded-lg hover:shadow-md transition-all text-left group"
              >
                <div className="flex flex-col items-center text-center">
                  <div className={`p-3 rounded-lg ${action.color} text-white mb-2`}>
                    <action.icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-medium text-gray-900 text-sm">{action.title}</h3>
                  {action.badge && action.badge > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center">
                      {action.badge}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Upcoming Appointments & Today's Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upcoming Appointments */}
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Appointments</h2>
            {upcomingAppointments.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600">No upcoming appointments</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingAppointments.map((appointment) => (
                  <div key={appointment.id} className="p-3 border border-gray-200 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900">
                          {appointment.patient_name || 'Patient Name'}
                        </p>
                        <p className="text-sm text-gray-600">{appointment.reason || 'General Consultation'}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(appointment.appointment_date).toLocaleString()}
                        </p>
                      </div>
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                        Approved
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Today's Performance */}
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Today's Performance</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Appointment Efficiency</span>
                <span className="font-semibold text-green-600">
                  {stats.totalAppointments > 0 ? 
                    Math.round((stats.completedToday / stats.totalAppointments) * 100) : 0}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Pending Tasks</span>
                <span className="font-semibold text-orange-600">
                  {stats.pendingAppointments + stats.emergencyRequests}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total Processed</span>
                <span className="font-semibold text-blue-600">
                  {stats.completedToday + stats.approvedAppointments}
                </span>
              </div>
              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Overall Status</span>
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium text-green-600">Excellent</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default NurseReceptionistDashboard;
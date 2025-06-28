import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { healthcareAPI, apiUtils } from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { 
  Calendar,
  Users,
  Activity,
  AlertTriangle,
  Clock,
  User,
  FileText,
  Stethoscope,
  TrendingUp,
  MapPin,
  Phone,
  ChevronRight,
  Plus,
  Search,
  Filter,
  Building
} from 'lucide-react';

const ProviderDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState({
    todayAppointments: [],
    totalPatients: 0,
    pendingEmergencies: [],
    recentAlerts: [],
    patientStats: {},
    scheduleOverview: {}
  });

  const userRole = user?.role?.name;
  const isDoctor = userRole === 'Doctor';
  const isHealthProvider = userRole === 'Health Provider';

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (isDoctor) {
        await loadDoctorData();
      } else if (isHealthProvider) {
        await loadHealthProviderData();
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError(apiUtils.formatErrorMessage(error));
      
      // Set fallback data on error
      setDashboardData({
        todayAppointments: [],
        totalPatients: 0,
        pendingEmergencies: [],
        recentAlerts: [],
        patientStats: {},
        scheduleOverview: {}
      });
    } finally {
      setLoading(false);
    }
  };

  const loadDoctorData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Parallel API calls for doctor data
      const [
        appointmentsResponse,
        patientsResponse,
        emergenciesResponse,
        alertsResponse
      ] = await Promise.all([
        healthcareAPI.appointments.list({ 
          healthcare_provider: user.id, 
          appointment_date__date: today 
        }),
        healthcareAPI.patients.list({ doctor: user.id }),
        healthcareAPI.emergencies.list({ status: 'P', limit: 5 }),
        healthcareAPI.alerts.list({ recipient: user.id, is_read: false, limit: 5 })
      ]);

      const todayAppointments = appointmentsResponse.data?.results || [];
      const patients = patientsResponse.data?.results || [];
      const emergencies = emergenciesResponse.data?.results || [];
      const alerts = alertsResponse.data?.results || [];

      setDashboardData({
        todayAppointments: todayAppointments.map(apt => ({
          id: apt.id,
          patient_name: `${apt.patient?.user?.first_name || ''} ${apt.patient?.user?.last_name || ''}`.trim() || 'Unknown Patient',
          appointment_time: new Date(apt.appointment_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
          reason: apt.reason || 'General consultation',
          status: apt.status === 'A' ? 'confirmed' : apt.status === 'P' ? 'pending' : 'cancelled'
        })),
        totalPatients: patients.length,
        pendingEmergencies: emergencies.map(emergency => ({
          id: emergency.id,
          patient_name: `${emergency.patient?.user?.first_name || ''} ${emergency.patient?.user?.last_name || ''}`.trim() || 'Emergency Patient',
          condition: emergency.condition_description || 'Emergency condition',
          severity: emergency.suspected_disease ? 'high' : 'medium',
          time: formatTimeAgo(emergency.request_time)
        })),
        recentAlerts: alerts.map(alert => ({
          id: alert.id,
          type: 'System Alert',
          message: alert.message || 'New alert',
          time: formatTimeAgo(alert.sent_at)
        })),
        patientStats: {
          new_this_week: patients.filter(p => isThisWeek(p.created_at)).length,
          follow_ups: todayAppointments.filter(apt => apt.reason?.toLowerCase().includes('follow')).length,
          high_risk: patients.filter(p => p.chronic_conditions).length
        },
        scheduleOverview: {
          total_slots: 12, // This would come from your scheduling system
          booked: todayAppointments.length,
          available: 12 - todayAppointments.length
        }
      });
    } catch (error) {
      console.error('Error loading doctor data:', error);
      throw error;
    }
  };

  const loadHealthProviderData = async () => {
    try {
      // Parallel API calls for health provider data
      const [
        usersResponse,
        appointmentsResponse,
        analyticsResponse
      ] = await Promise.all([
        healthcareAPI.users.list({ role__name: 'Doctor' }),
        healthcareAPI.appointments.list({ 
          appointment_date__date: new Date().toISOString().split('T')[0] 
        }),
        // You might have a specific analytics endpoint
        Promise.resolve({ data: { revenue_today: 2450, facility_utilization: 78 } })
      ]);

      const doctors = usersResponse.data?.results || [];
      const todayAppointments = appointmentsResponse.data?.results || [];

      setDashboardData({
        todayAppointments: [],
        totalPatients: 150, // This would come from your patient count API
        pendingEmergencies: [],
        recentAlerts: [],
        patientStats: {
          active_doctors: doctors.filter(d => d.is_active).length,
          total_appointments_today: todayAppointments.length,
          revenue_today: analyticsResponse.data?.revenue_today || 0
        },
        scheduleOverview: {
          facility_utilization: analyticsResponse.data?.facility_utilization || 0,
          staff_on_duty: doctors.filter(d => d.is_active).length,
          equipment_status: 'operational'
        }
      });
    } catch (error) {
      console.error('Error loading health provider data:', error);
      throw error;
    }
  };

  // Utility functions
  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes} minutes ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)} hours ago`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)} days ago`;
    }
  };

  const isThisWeek = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return date >= weekAgo;
  };

  // Action handlers that use the API
  const handleAddPatient = async () => {
    try {
      // Navigate to add patient form or open modal
      console.log('Navigate to add patient');
      // You can implement navigation here
    } catch (error) {
      console.error('Error adding patient:', error);
    }
  };

  const handleScheduleAppointment = async () => {
    try {
      // Navigate to appointment scheduling
      console.log('Navigate to schedule appointment');
    } catch (error) {
      console.error('Error scheduling appointment:', error);
    }
  };

  const handleEmergencyResponse = async (emergencyId) => {
    try {
      await healthcareAPI.emergencies.update(emergencyId, { status: 'A' });
      // Reload data to reflect changes
      loadDashboardData();
    } catch (error) {
      console.error('Error responding to emergency:', error);
      setError('Failed to respond to emergency');
    }
  };

  const StatCard = ({ icon: Icon, title, value, subtitle, color = 'text-gray-600', trend = null }) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className="flex flex-col items-end">
          <Icon className={`h-8 w-8 ${color}`} />
          {trend && (
            <div className={`flex items-center mt-2 text-xs ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
              <TrendingUp className="h-3 w-3 mr-1" />
              {trend > 0 ? '+' : ''}{trend}%
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const AppointmentCard = ({ appointment }) => (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
      <div className="flex items-center space-x-4">
        <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
          <User className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <div className="font-medium text-gray-900">{appointment.patient_name}</div>
          <div className="text-sm text-gray-600">{appointment.reason}</div>
          <div className="text-xs text-gray-500 flex items-center">
            <Clock className="h-3 w-3 mr-1" />
            {appointment.appointment_time}
          </div>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          appointment.status === 'confirmed' 
            ? 'bg-green-100 text-green-800' 
            : 'bg-yellow-100 text-yellow-800'
        }`}>
          {appointment.status}
        </span>
        <ChevronRight className="h-4 w-4 text-gray-400" />
      </div>
    </div>
  );

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your dashboard...</p>
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
              onClick={loadDashboardData}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
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
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white">
          <h1 className="text-2xl font-bold mb-2">
            Good morning, {isDoctor ? 'Dr.' : ''} {user?.first_name}!
          </h1>
          <p className="text-blue-100">
            {isDoctor 
              ? `You have ${dashboardData.todayAppointments?.length || 0} appointments today.`
              : `Your practice overview for ${new Date().toLocaleDateString()}.`
            }
          </p>
        </div>

        {/* Stats Grid */}
        {isDoctor && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={Users}
              title="Total Patients"
              value={dashboardData.totalPatients || 0}
              subtitle="Active patients"
              color="text-blue-600"
              trend={5}
            />
            <StatCard
              icon={Calendar}
              title="Today's Appointments"
              value={dashboardData.todayAppointments?.length || 0}
              subtitle={`${dashboardData.scheduleOverview?.available || 0} slots available`}
              color="text-green-600"
            />
            <StatCard
              icon={AlertTriangle}
              title="High Risk Patients"
              value={dashboardData.patientStats?.high_risk || 0}
              subtitle="Require attention"
              color="text-red-600"
            />
            <StatCard
              icon={Activity}
              title="Follow-ups"
              value={dashboardData.patientStats?.follow_ups || 0}
              subtitle="This week"
              color="text-purple-600"
            />
          </div>
        )}

        {isHealthProvider && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={Building}
              title="Active Doctors"
              value={dashboardData.patientStats?.active_doctors || 0}
              subtitle="On duty today"
              color="text-blue-600"
            />
            <StatCard
              icon={Calendar}
              title="Today's Appointments"
              value={dashboardData.patientStats?.total_appointments_today || 0}
              subtitle="Across all doctors"
              color="text-green-600"
            />
            <StatCard
              icon={TrendingUp}
              title="Daily Revenue"
              value={`$${dashboardData.patientStats?.revenue_today || 0}`}
              subtitle="Today's earnings"
              color="text-green-600"
              trend={12}
            />
            <StatCard
              icon={Activity}
              title="Facility Utilization"
              value={`${dashboardData.scheduleOverview?.facility_utilization || 0}%`}
              subtitle="Capacity used"
              color="text-purple-600"
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {isDoctor && (
              <>
                {/* Today's Appointments */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      <Calendar className="h-5 w-5 text-blue-600 mr-2" />
                      Today's Schedule
                    </h3>
                    <div className="flex space-x-2">
                      <button 
                        onClick={handleScheduleAppointment}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        Add Appointment
                      </button>
                    </div>
                  </div>
                  
                  {dashboardData.todayAppointments && dashboardData.todayAppointments.length > 0 ? (
                    <div className="space-y-3">
                      {dashboardData.todayAppointments.map((appointment) => (
                        <AppointmentCard key={appointment.id} appointment={appointment} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No appointments scheduled for today</p>
                      <button 
                        onClick={handleScheduleAppointment}
                        className="mt-2 text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Schedule an appointment
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}

            {isHealthProvider && (
              <>
                {/* Practice Overview */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      <Building className="h-5 w-5 text-blue-600 mr-2" />
                      Practice Overview
                    </h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {dashboardData.patientStats?.active_doctors || 0}
                      </div>
                      <div className="text-sm text-gray-600">Active Doctors</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {dashboardData.patientStats?.total_appointments_today || 0}
                      </div>
                      <div className="text-sm text-gray-600">Today's Appointments</div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">
                        {dashboardData.scheduleOverview?.facility_utilization || 0}%
                      </div>
                      <div className="text-sm text-gray-600">Facility Utilization</div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Emergency Alerts */}
            {dashboardData.pendingEmergencies && dashboardData.pendingEmergencies.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-red-200 p-6">
                <h3 className="text-lg font-semibold text-red-900 mb-4 flex items-center">
                  <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
                  Emergency Alerts
                </h3>
                
                <div className="space-y-3">
                  {dashboardData.pendingEmergencies.map((emergency) => (
                    <div key={emergency.id} className="p-3 bg-red-50 rounded-lg border-l-4 border-red-500">
                      <div className="font-medium text-red-900">{emergency.patient_name}</div>
                      <div className="text-sm text-red-700 mt-1">{emergency.condition}</div>
                      <div className="text-xs text-red-600 mt-1">{emergency.time}</div>
                      <button 
                        onClick={() => handleEmergencyResponse(emergency.id)}
                        className="mt-2 text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
                      >
                        Respond
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              
              <div className="space-y-3">
                {isDoctor && (
                  <>
                    <button 
                      onClick={handleAddPatient}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg flex items-center justify-center"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Patient
                    </button>
                    <button 
                      onClick={handleScheduleAppointment}
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg flex items-center justify-center"
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Schedule Appointment
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ProviderDashboard;
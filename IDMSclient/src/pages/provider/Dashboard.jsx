import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { healthcareAPI } from '../../services/api';
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
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (isDoctor) {
        setDashboardData({
          todayAppointments: [
            {
              id: 1,
              patient_name: 'Jean Mukamana',
              appointment_time: '09:00',
              reason: 'Regular Checkup',
              status: 'confirmed'
            },
            {
              id: 2,
              patient_name: 'Marie Uwimana',
              appointment_time: '10:30',
              reason: 'Follow-up',
              status: 'pending'
            },
            {
              id: 3,
              patient_name: 'Paul Nshimiyimana',
              appointment_time: '14:00',
              reason: 'Consultation',
              status: 'confirmed'
            }
          ],
          totalPatients: 24,
          pendingEmergencies: [
            {
              id: 1,
              patient_name: 'Emergency Patient',
              condition: 'Chest pain, difficulty breathing',
              severity: 'high',
              time: '30 minutes ago'
            }
          ],
          recentAlerts: [
            {
              id: 1,
              type: 'High Risk Patient',
              message: 'Patient Marie Uwimana has high blood pressure readings',
              time: '2 hours ago'
            }
          ],
          patientStats: {
            new_this_week: 3,
            follow_ups: 8,
            high_risk: 2
          },
          scheduleOverview: {
            total_slots: 12,
            booked: 8,
            available: 4
          }
        });
      } else if (isHealthProvider) {
        setDashboardData({
          todayAppointments: [],
          totalPatients: 150,
          pendingEmergencies: [], // Ensure this is always an array
          recentAlerts: [], // Ensure this is always an array
          patientStats: {
            active_doctors: 12,
            total_appointments_today: 45,
            revenue_today: 2450
          },
          scheduleOverview: {
            facility_utilization: 78,
            staff_on_duty: 15,
            equipment_status: 'operational'
          }
        });
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      // Set default values in case of error
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
                      <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
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
                    </div>
                  )}
                </div>

                {/* Recent Patients */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      <Users className="h-5 w-5 text-green-600 mr-2" />
                      Recent Patients
                    </h3>
                    <button className="text-green-600 hover:text-green-700 text-sm font-medium">
                      View All Patients
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {['Jean Mukamana', 'Marie Uwimana', 'Paul Nshimiyimana'].map((name, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                            <User className="h-4 w-4 text-green-600" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{name}</div>
                            <div className="text-sm text-gray-600">Last visit: {2 + index} days ago</div>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      </div>
                    ))}
                  </div>
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

                {/* Staff Management */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      <Users className="h-5 w-5 text-green-600 mr-2" />
                      Staff on Duty
                    </h3>
                    <button className="text-green-600 hover:text-green-700 text-sm font-medium">
                      Manage Staff
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {[
                      { name: 'Dr. Mukamana', role: 'Doctor', status: 'Available' },
                      { name: 'Dr. Uwimana', role: 'Doctor', status: 'With Patient' },
                      { name: 'Nurse Jean', role: 'Nurse', status: 'Available' }
                    ].map((staff, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <User className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{staff.name}</div>
                            <div className="text-sm text-gray-600">{staff.role}</div>
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          staff.status === 'Available' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {staff.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Emergency Alerts - Fixed conditional rendering */}
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
                    </div>
                  ))}
                </div>
                
                <button className="w-full mt-4 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg">
                  View All Emergencies
                </button>
              </div>
            )}

            {/* Recent Alerts */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Activity className="h-5 w-5 text-yellow-600 mr-2" />
                Recent Alerts
              </h3>
              
              <div className="space-y-3">
                {dashboardData.recentAlerts && dashboardData.recentAlerts.length > 0 ? (
                  dashboardData.recentAlerts.map((alert) => (
                    <div key={alert.id} className="p-3 bg-yellow-50 rounded-lg">
                      <div className="font-medium text-gray-900 text-sm">{alert.type}</div>
                      <div className="text-xs text-gray-600 mt-1">{alert.message}</div>
                      <div className="text-xs text-gray-500 mt-1">{alert.time}</div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4">
                    <Activity className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">No recent alerts</p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              
              <div className="space-y-3">
                {isDoctor && (
                  <>
                    <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg flex items-center justify-center">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Patient
                    </button>
                    <button className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg flex items-center justify-center">
                      <Calendar className="h-4 w-4 mr-2" />
                      Schedule Appointment
                    </button>
                    <button className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg flex items-center justify-center">
                      <FileText className="h-4 w-4 mr-2" />
                      Write Prescription
                    </button>
                  </>
                )}
                
                {isHealthProvider && (
                  <>
                    <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg flex items-center justify-center">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Doctor
                    </button>
                    <button className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg flex items-center justify-center">
                      <Users className="h-4 w-4 mr-2" />
                      Manage Staff
                    </button>
                    <button className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg flex items-center justify-center">
                      <TrendingUp className="h-4 w-4 mr-2" />
                      View Reports
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {isDoctor ? 'This Week' : 'Performance'}
              </h3>
              
              <div className="space-y-4">
                {isDoctor && (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Patients Seen</span>
                      <span className="font-medium">32</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Avg. Consultation</span>
                      <span className="font-medium">25 min</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Patient Satisfaction</span>
                      <span className="font-medium text-green-600">4.8/5</span>
                    </div>
                  </>
                )}
                
                {isHealthProvider && (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Monthly Revenue</span>
                      <span className="font-medium text-green-600">$45,200</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Patient Satisfaction</span>
                      <span className="font-medium text-green-600">4.7/5</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Operational Efficiency</span>
                      <span className="font-medium text-blue-600">89%</span>
                    </div>
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
import React, { useState, useEffect } from 'react';
import { LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users, Calendar, Activity, BarChart3, Shield, Heart, AlertTriangle, RefreshCw } from 'lucide-react';
import { healthcareAPI } from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';

const AnalyticsDashboard = () => {
  const [data, setData] = useState({
    userGrowth: [],
    userRoles: [],
    appointmentTrends: [],
    clinicStats: [],
    preventionTips: [],
    emergencyRequests: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [totalStats, setTotalStats] = useState({
    totalUsers: 0,
    totalAppointments: 0,
    totalClinics: 0,
    totalTips: 0,
    totalEmergencies: 0
  });

  useEffect(() => {
    loadAnalyticsData();
  }, []);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Fetch all data from your APIs with proper error handling
      const [
        usersResponse, 
        appointmentsResponse, 
        clinicsResponse, 
        tipsResponse,
        emergencyResponse
      ] = await Promise.allSettled([
        healthcareAPI.users.list(),
        healthcareAPI.appointments?.list().catch(() => ({ data: [] })),
        healthcareAPI.clinics?.list().catch(() => ({ data: [] })),
        healthcareAPI.preventionTips.list(),
        healthcareAPI.emergencies?.list().catch(() => ({ data: [] }))
      ]);

      // Extract actual data with better error handling
      const users = usersResponse.status === 'fulfilled' ? 
        (usersResponse.value?.results || usersResponse.value?.data?.results || usersResponse.value?.data || usersResponse.value || []) : [];
      
      const appointments = appointmentsResponse.status === 'fulfilled' ? 
        (appointmentsResponse.value?.results || appointmentsResponse.value?.data?.results || appointmentsResponse.value?.data || appointmentsResponse.value || []) : [];
      
      const clinics = clinicsResponse.status === 'fulfilled' ? 
        (clinicsResponse.value?.results || clinicsResponse.value?.data?.results || clinicsResponse.value?.data || clinicsResponse.value || []) : [];
      
      const tips = tipsResponse.status === 'fulfilled' ? 
        (tipsResponse.value?.results || tipsResponse.value?.data?.results || tipsResponse.value?.data || tipsResponse.value || []) : [];
        
      const emergencies = emergencyResponse.status === 'fulfilled' ? 
        (emergencyResponse.value?.results || emergencyResponse.value?.data?.results || emergencyResponse.value?.data || emergencyResponse.value || []) : [];

      console.log('Raw API Responses:', {
        usersResponse: usersResponse.status === 'fulfilled' ? usersResponse.value : 'failed',
        tipsResponse: tipsResponse.status === 'fulfilled' ? tipsResponse.value : 'failed',
        emergencyResponse: emergencyResponse.status === 'fulfilled' ? emergencyResponse.value : 'failed'
      });

      console.log('Extracted Data:', { 
        users: users.length, 
        appointments: appointments.length, 
        clinics: clinics.length, 
        tips: tips.length,
        emergencies: emergencies.length,
        tipsSample: tips.slice(0, 2),
        emergenciesSample: emergencies.slice(0, 2)
      });

      // Calculate user growth over last 6 months
      const userGrowth = Array.from({length: 6}, (_, i) => {
        const date = new Date();
        date.setMonth(date.getMonth() - (5 - i));
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        
        const monthUsers = users.filter(u => {
          const joinDate = new Date(u.date_joined || u.created_at);
          return joinDate >= monthStart && joinDate <= monthEnd;
        }).length;
        
        return {
          month: date.toLocaleDateString('en', { month: 'short' }),
          users: monthUsers,
          total: users.filter(u => new Date(u.date_joined || u.created_at) <= monthEnd).length
        };
      });

      // User roles distribution from actual data
      const roleData = {};
      users.forEach(user => {
        const role = user.role?.name || user.role || 'Unknown';
        roleData[role] = (roleData[role] || 0) + 1;
      });

      const userRoles = Object.entries(roleData).map(([name, value]) => ({
        name,
        value,
        color: name === 'Patient' ? '#3B82F6' : 
               name === 'Doctor' ? '#10B981' : 
               name === 'Nurse' ? '#8B5CF6' : 
               name === 'Admin' ? '#EF4444' : '#6B7280'
      }));

      // Appointment trends by status
      const appointmentsByStatus = {};
      appointments.forEach(apt => {
        const status = apt.status || 'Unknown';
        appointmentsByStatus[status] = (appointmentsByStatus[status] || 0) + 1;
      });

      const appointmentTrends = Object.entries(appointmentsByStatus).map(([status, count]) => ({
        status: status === 'P' ? 'Pending' : 
                status === 'A' ? 'Approved' : 
                status === 'C' ? 'Cancelled' : 
                status === 'D' ? 'Completed' : status,
        count
      }));

      // Prevention tips by disease - FIXED
      const tipsByDisease = {};
      console.log('Processing tips:', tips);
      
      if (tips && tips.length > 0) {
        tips.forEach(tip => {
          console.log('Processing tip:', tip);
          const disease = tip.disease || 'Other';
          tipsByDisease[disease] = (tipsByDisease[disease] || 0) + 1;
        });
      }

      const preventionTips = Object.entries(tipsByDisease).length > 0 ? 
        Object.entries(tipsByDisease).map(([disease, count]) => ({
          disease: disease.charAt(0).toUpperCase() + disease.slice(1),
          count,
          priority: tips.filter(t => t.disease === disease && (t.priority || 5) <= 3).length
        })) : 
        [{ disease: 'No Data', count: 0, priority: 0 }];

      console.log('Prevention tips processed:', preventionTips);

      // Clinic statistics
      const clinicStats = clinics.length > 0 ? 
        clinics.map(clinic => ({
          name: clinic.name?.substring(0, 15) + (clinic.name?.length > 15 ? '...' : '') || 'Unnamed Clinic',
          staff: clinic.staff_count || clinic.staff?.length || 0,
          location: clinic.address?.split(',')[0] || 'Unknown'
        })).slice(0, 6) : 
        [{ name: 'No Data', staff: 0, location: 'N/A' }];

      // Emergency requests by status - FIXED
      const emergencyStats = {};
      console.log('Processing emergencies:', emergencies);
      
      if (emergencies && emergencies.length > 0) {
        emergencies.forEach(emergency => {
          console.log('Processing emergency:', emergency);
          const status = emergency.status || emergency.approval_status || 'Unknown';
          emergencyStats[status] = (emergencyStats[status] || 0) + 1;
        });
      }

      const emergencyRequests = Object.entries(emergencyStats).length > 0 ? 
        Object.entries(emergencyStats).map(([status, count]) => ({
          status: status === 'P' ? 'Pending' : 
                  status === 'D' ? 'Dispatched' : 
                  status === 'A' ? 'Arrived' : 
                  status === 'C' ? 'Completed' : 
                  status === 'pending' ? 'Pending' :
                  status === 'approved' ? 'Approved' :
                  status === 'rejected' ? 'Rejected' : status,
          count
        })) : 
        [{ status: 'No Data', count: 0 }];

      console.log('Emergency requests processed:', emergencyRequests);

      // Calculate total stats
      setTotalStats({
        totalUsers: users.length,
        totalAppointments: appointments.length,
        totalClinics: clinics.length,
        totalTips: tips.length,
        totalEmergencies: emergencies.length
      });

      setData({ 
        userGrowth, 
        userRoles, 
        appointmentTrends, 
        clinicStats, 
        preventionTips,
        emergencyRequests 
      });

    } catch (error) {
      console.error('Analytics loading error:', error);
      setError('Failed to load analytics data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ icon: Icon, title, value, subtitle, color = "blue" }) => (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <Icon className={`w-8 h-8 text-${color}-500`} />
      </div>
    </div>
  );

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading analytics...</p>
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
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Analytics</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={loadAnalyticsData}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center mx-auto"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
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
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
              <p className="text-blue-100">Real-time healthcare system insights</p>
            </div>
            <button
              onClick={loadAnalyticsData}
              className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-4 py-2 rounded-lg transition-colors flex items-center"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <StatCard 
            icon={Users} 
            title="Total Users" 
            value={totalStats.totalUsers} 
            subtitle={`${data.userRoles.find(r => r.name === 'Patient')?.value || 0} patients`}
            color="blue" 
          />
          <StatCard 
            icon={Calendar} 
            title="Appointments" 
            value={totalStats.totalAppointments} 
            subtitle={`${data.appointmentTrends.find(a => a.status === 'Pending')?.count || 0} pending`}
            color="green" 
          />
          <StatCard 
            icon={Shield} 
            title="Clinics" 
            value={totalStats.totalClinics} 
            subtitle="Healthcare centers"
            color="purple" 
          />
          <StatCard 
            icon={Heart} 
            title="Prevention Tips" 
            value={totalStats.totalTips} 
            subtitle={`${data.preventionTips.reduce((sum, tip) => sum + tip.priority, 0)} high priority`}
            color="pink" 
          />
          <StatCard 
            icon={AlertTriangle} 
            title="Emergency Requests" 
            value={totalStats.totalEmergencies} 
            subtitle={`${data.emergencyRequests.find(e => e.status === 'Pending')?.count || 0} pending`}
            color="red" 
          />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User Roles Pie Chart */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">User Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.userRoles}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({name, value}) => `${name}: ${value}`}
                >
                  {data.userRoles.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* User Growth Line Chart */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">User Growth (6 Months)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.userGrowth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="users" stroke="#3B82F6" strokeWidth={2} name="New Users" />
                <Line type="monotone" dataKey="total" stroke="#10B981" strokeWidth={2} name="Total Users" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Appointment Status Bar Chart */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Appointment Status</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.appointmentTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="status" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#8B5CF6" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Clinic Staff Distribution */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Clinic Staff Distribution</h3>
            {data.clinicStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.clinicStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="staff" fill="#10B981" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-72 text-gray-500">
                <p>No clinic data available</p>
              </div>
            )}
          </div>

          {/* Prevention Tips by Disease */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Prevention Tips by Disease</h3>
            {data.preventionTips.length > 0 && data.preventionTips[0].disease !== 'No Data' ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={data.preventionTips}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="disease" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="count" stackId="1" stroke="#EF4444" fill="#EF4444" name="Total Tips" />
                  <Area type="monotone" dataKey="priority" stackId="1" stroke="#F59E0B" fill="#F59E0B" name="High Priority" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-72 text-gray-500">
                <Heart className="w-12 h-12 mb-2" />
                <p>No prevention tips data available</p>
                <p className="text-sm mt-1">Total tips found: {totalStats.totalTips}</p>
              </div>
            )}
          </div>

          {/* Emergency Requests Status */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Emergency Requests</h3>
            {data.emergencyRequests.length > 0 && data.emergencyRequests[0].status !== 'No Data' ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={data.emergencyRequests}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="count"
                    label={({status, count}) => `${status}: ${count}`}
                  >
                    {data.emergencyRequests.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#EF4444', '#F59E0B', '#10B981', '#3B82F6'][index % 4]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-72 text-gray-500">
                <AlertTriangle className="w-12 h-12 mb-2" />
                <p>No emergency requests data available</p>
                <p className="text-sm mt-1">Total emergencies found: {totalStats.totalEmergencies}</p>
              </div>
            )}
          </div>
        </div>

        {/* Data Summary */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">System Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">{data.userRoles.find(r => r.name === 'Patient')?.value || 0}</div>
              <div className="text-sm text-gray-600">Patients</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{data.userRoles.find(r => r.name === 'Doctor')?.value || 0}</div>
              <div className="text-sm text-gray-600">Doctors</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">{data.userRoles.find(r => r.name === 'Nurse')?.value || 0}</div>
              <div className="text-sm text-gray-600">Nurses</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">{data.appointmentTrends.reduce((sum, apt) => sum + apt.count, 0)}</div>
              <div className="text-sm text-gray-600">Total Appointments</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">{data.emergencyRequests.reduce((sum, emr) => sum + emr.count, 0)}</div>
              <div className="text-sm text-gray-600">Emergency Cases</div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AnalyticsDashboard;
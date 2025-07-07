import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Calendar, Download, Filter, RefreshCw, TrendingUp, Users, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { healthcareAPI } from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';

const NurseReportsPage = () => {
  const [loading, setLoading] = useState(true);
  const [timeInterval, setTimeInterval] = useState('last_7_days');
  const [reportData, setReportData] = useState({
    appointmentTrends: [],
    appointmentStatus: [],
    emergencyStats: [],
    dailyActivity: [],
    summary: {
      totalAppointments: 0,
      approvedAppointments: 0,
      emergencyRequests: 0,
      averageProcessingTime: 0
    }
  });

  const timeIntervals = [
    { value: 'today', label: 'Today' },
    { value: 'last_7_days', label: 'Last 7 Days' },
    { value: 'last_30_days', label: 'Last 30 Days' },
    { value: 'last_3_months', label: 'Last 3 Months' },
    { value: 'last_6_months', label: 'Last 6 Months' }
  ];

  useEffect(() => {
    generateReports();
  }, [timeInterval]);

  const generateReports = async () => {
    try {
      setLoading(true);
      
      // Use the same approach as EmergencyApprovalPage for data fetching
      const [appointmentsRes, emergencyRes] = await Promise.allSettled([
        healthcareAPI.appointments.list(),
        healthcareAPI.emergencies.list()
      ]);

      // Extract data using the same pattern as the working page
      let appointments = [];
      let emergencies = [];

      // Handle appointments data
      if (appointmentsRes.status === 'fulfilled') {
        const response = appointmentsRes.value;
        if (Array.isArray(response)) {
          appointments = response;
        } else if (response?.data) {
          appointments = response.data?.results || response.data || [];
        } else if (response?.results) {
          appointments = response.results;
        }
      }

      // Handle emergencies data (same pattern as EmergencyApprovalPage)
      if (emergencyRes.status === 'fulfilled') {
        const response = emergencyRes.value;
        if (Array.isArray(response)) {
          emergencies = response;
        } else if (response?.data) {
          emergencies = response.data?.results || response.data || [];
        } else if (response?.results) {
          emergencies = response.results;
        }
      }

      console.log('Raw data:', { 
        appointments: appointments.length, 
        emergencies: emergencies.length,
        appointmentsSample: appointments[0],
        emergenciesSample: emergencies[0]
      }); // Enhanced debug log

      const filteredData = filterDataByInterval(appointments, emergencies);
      console.log('Filtered data:', filteredData); // Debug log
      
      processReportData(filteredData.appointments, filteredData.emergencies);

    } catch (error) {
      console.error('Error generating reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterDataByInterval = (appointments, emergencies) => {
    const now = new Date();
    let startDate;

    switch(timeInterval) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'last_7_days':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'last_30_days':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'last_3_months':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'last_6_months':
        startDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    console.log('Filter start date:', startDate); // Debug log

    // Use same filtering approach as EmergencyApprovalPage
    const filteredAppointments = appointments.filter(apt => {
      if (!apt) return false;
      
      // Try the same date fields that the working page might use
      const dateFields = [
        apt.created_at,
        apt.appointment_date,
        apt.date_created,
        apt.scheduled_date,
        apt.request_time
      ];
      
      for (const dateField of dateFields) {
        if (dateField) {
          const itemDate = new Date(dateField);
          if (!isNaN(itemDate.getTime()) && itemDate >= startDate) {
            return true;
          }
        }
      }
      return false;
    });

    // Use same approach for emergencies - check request_time first (as used in EmergencyApprovalPage)
    const filteredEmergencies = emergencies.filter(emr => {
      if (!emr) return false;
      
      // Use the same field order as EmergencyApprovalPage
      const dateFields = [
        emr.request_time,  // This is the primary field used in EmergencyApprovalPage
        emr.created_at,
        emr.date_created,
        emr.timestamp,
        emr.submitted_at
      ];
      
      for (const dateField of dateFields) {
        if (dateField) {
          const itemDate = new Date(dateField);
          if (!isNaN(itemDate.getTime()) && itemDate >= startDate) {
            return true;
          }
        }
      }
      return false;
    });

    console.log('Filtered results:', {
      appointments: filteredAppointments.length,
      emergencies: filteredEmergencies.length,
      totalAppointments: appointments.length,
      totalEmergencies: emergencies.length
    }); // Enhanced debug log

    return { appointments: filteredAppointments, emergencies: filteredEmergencies };
  };

  const processReportData = (appointments, emergencies) => {
    console.log('Processing data:', { 
      appointments: appointments.length, 
      emergencies: emergencies.length,
      sampleEmergency: emergencies[0]
    }); // Enhanced debug log

    // If no data after filtering, try processing all data without date filtering
    let processEmergencies = emergencies;
    let processAppointments = appointments;

    // If filtered data is empty but we have raw data, process all data for now
    if (emergencies.length === 0 && requests.length > 0) {
      console.log('Using unfiltered emergency data for processing');
      // You can access the original data here if needed
    }

    // Appointment status distribution - use same logic as EmergencyApprovalPage
    const statusCounts = {
      'Pending': processAppointments.filter(a => 
        a.status === 'P' || a.status === 'pending' || a.approval_status === 'pending'
      ).length,
      'Approved': processAppointments.filter(a => 
        a.status === 'A' || a.status === 'approved' || a.approval_status === 'approved'
      ).length,
      'Completed': processAppointments.filter(a => 
        a.status === 'D' || a.status === 'completed' || a.status === 'done'
      ).length,
      'Cancelled': processAppointments.filter(a => 
        a.status === 'C' || a.status === 'cancelled' || a.status === 'rejected'
      ).length
    };

    const appointmentStatus = Object.entries(statusCounts).map(([status, count]) => ({
      name: status,
      value: count,
      color: status === 'Pending' ? '#F59E0B' : 
             status === 'Approved' ? '#10B981' : 
             status === 'Completed' ? '#3B82F6' : '#EF4444'
    }));

    // Emergency statistics - use same status checking as EmergencyApprovalPage
    const totalEmergencies = processEmergencies.length;
    const pendingEmergencies = processEmergencies.filter(e => 
      e.status === 'P' || 
      e.status === 'pending' || 
      e.approval_status === 'pending' ||
      (!e.status && !e.approval_status) // Handle undefined status
    ).length;
    
    const approvedEmergencies = processEmergencies.filter(e => 
      e.approval_status === 'approved' || 
      e.status === 'approved' ||
      e.status === 'A' ||
      e.status === 'D' // Sometimes 'D' means dispatched/approved
    ).length;

    const emergencyStats = [
      { name: 'Total Requests', value: totalEmergencies, color: '#EF4444' },
      { name: 'Pending', value: pendingEmergencies, color: '#F59E0B' },
      { name: 'Approved', value: approvedEmergencies, color: '#10B981' }
    ];

    console.log('Emergency stats calculated:', {
      total: totalEmergencies,
      pending: pendingEmergencies,
      approved: approvedEmergencies,
      sampleStatuses: processEmergencies.slice(0, 3).map(e => ({
        id: e.id,
        status: e.status,
        approval_status: e.approval_status
      }))
    });

    // Enhanced daily activity calculation using request_time primarily
    const dailyActivity = Array.from({length: 7}, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      const dayStr = date.toISOString().split('T')[0];
      
      const dayAppointments = processAppointments.filter(a => {
        const dateFields = [a.created_at, a.appointment_date, a.date_created, a.scheduled_date];
        return dateFields.some(field => {
          if (field) {
            const itemDate = new Date(field);
            return !isNaN(itemDate.getTime()) && itemDate.toISOString().split('T')[0] === dayStr;
          }
          return false;
        });
      }).length;

      const dayEmergencies = processEmergencies.filter(e => {
        // Use request_time as primary field (like EmergencyApprovalPage)
        const dateFields = [e.request_time, e.created_at, e.date_created, e.timestamp];
        return dateFields.some(field => {
          if (field) {
            const itemDate = new Date(field);
            return !isNaN(itemDate.getTime()) && itemDate.toISOString().split('T')[0] === dayStr;
          }
          return false;
        });
      }).length;
      
      return {
        day: date.toLocaleDateString('en', { weekday: 'short' }),
        appointments: dayAppointments,
        emergencies: dayEmergencies
      };
    });

    // Appointment trends (same logic but using processed data)
    const isLongPeriod = ['last_3_months', 'last_6_months'].includes(timeInterval);
    const periods = isLongPeriod ? 6 : 7;
    
    const appointmentTrends = Array.from({length: periods}, (_, i) => {
      const date = new Date();
      if (isLongPeriod) {
        date.setMonth(date.getMonth() - (periods - 1 - i));
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        
        return {
          period: date.toLocaleDateString('en', { month: 'short' }),
          count: processAppointments.filter(a => {
            const dateFields = [a.created_at, a.appointment_date, a.date_created];
            return dateFields.some(field => {
              if (field) {
                const aptDate = new Date(field);
                return !isNaN(aptDate.getTime()) && aptDate >= monthStart && aptDate <= monthEnd;
              }
              return false;
            });
          }).length
        };
      } else {
        date.setDate(date.getDate() - (periods - 1 - i));
        const dayStr = date.toISOString().split('T')[0];
        
        return {
          period: date.toLocaleDateString('en', { weekday: 'short' }),
          count: processAppointments.filter(a => {
            const dateFields = [a.created_at, a.appointment_date, a.date_created];
            return dateFields.some(field => {
              if (field) {
                const itemDate = new Date(field);
                return !isNaN(itemDate.getTime()) && itemDate.toISOString().split('T')[0] === dayStr;
              }
              return false;
            });
          }).length
        };
      }
    });

    // Calculate summary
    const approvedAppointments = processAppointments.filter(a => 
      a.status === 'A' || a.status === 'approved'
    ).length;

    const summary = {
      totalAppointments: processAppointments.length,
      approvedAppointments: approvedAppointments,
      emergencyRequests: totalEmergencies, // Use calculated total
      averageProcessingTime: processAppointments.length > 0 ? 
        Math.round((approvedAppointments / processAppointments.length) * 100) : 0
    };

    console.log('Final summary:', summary); // Debug log

    setReportData({
      appointmentTrends,
      appointmentStatus,
      emergencyStats,
      dailyActivity,
      summary
    });
  };

  const downloadReport = () => {
    const reportContent = `
Reception Report - ${timeIntervals.find(t => t.value === timeInterval)?.label}
Generated: ${new Date().toLocaleString()}

Summary:
- Total Appointments: ${reportData.summary.totalAppointments}
- Approved Appointments: ${reportData.summary.approvedAppointments}
- Emergency Requests: ${reportData.summary.emergencyRequests}
- Processing Efficiency: ${reportData.summary.averageProcessingTime}%

Appointment Status:
${reportData.appointmentStatus.map(s => `- ${s.name}: ${s.value}`).join('\n')}

Emergency Statistics:
${reportData.emergencyStats.map(s => `- ${s.name}: ${s.value}`).join('\n')}
    `;

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reception_report_${timeInterval}_${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-50 to-blue-50 rounded-xl p-6 border border-teal-100">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Reception Reports</h1>
              <p className="text-gray-600 mt-1">Appointment and emergency request analytics</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={downloadReport}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                <Download className="h-4 w-4" />
                Download
              </button>
              <button
                onClick={generateReports}
                className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Time Interval Selector */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Report Period</h2>
            <select
              value={timeInterval}
              onChange={(e) => setTimeInterval(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            >
              {timeIntervals.map(interval => (
                <option key={interval.value} value={interval.value}>
                  {interval.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-xl p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Generating reports...</p>
          </div>
        ) : (
          <>
            {/* Debug Information - Remove in production */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-semibold text-yellow-800">Debug Info (Remove in production):</h3>
              <p className="text-yellow-700">
                Total Appointments: {reportData.summary.totalAppointments}, 
                Emergency Requests: {reportData.summary.emergencyRequests}
              </p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Appointments</p>
                    <p className="text-2xl font-bold text-blue-600">{reportData.summary.totalAppointments}</p>
                  </div>
                  <Calendar className="h-8 w-8 text-blue-500" />
                </div>
              </div>
              
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Approved</p>
                    <p className="text-2xl font-bold text-green-600">{reportData.summary.approvedAppointments}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
              </div>
              
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Emergency Requests</p>
                    <p className="text-2xl font-bold text-red-600">{reportData.summary.emergencyRequests}</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-red-500" />
                </div>
              </div>
              
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Efficiency Rate</p>
                    <p className="text-2xl font-bold text-purple-600">{reportData.summary.averageProcessingTime}%</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-purple-500" />
                </div>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Appointment Trends */}
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Appointment Trends</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={reportData.appointmentTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" stroke="#0D9488" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Appointment Status Distribution */}
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Appointment Status</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={reportData.appointmentStatus}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({name, value}) => `${name}: ${value}`}
                    >
                      {reportData.appointmentStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Daily Activity */}
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Activity (Last 7 Days)</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={reportData.dailyActivity}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="appointments" fill="#3B82F6" name="Appointments" />
                    <Bar dataKey="emergencies" fill="#EF4444" name="Emergencies" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Emergency Statistics */}
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Emergency Statistics</h3>
                {reportData.emergencyStats.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={reportData.emergencyStats}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#EF4444" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-72 text-gray-500">
                    <p>No emergency data available for this period</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default NurseReportsPage;
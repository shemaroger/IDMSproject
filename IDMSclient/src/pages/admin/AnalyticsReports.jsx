import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { 
  Download, 
  Printer, 
  FileText, 
  Calendar, 
  Filter,
  Users,
  Activity,
  TrendingUp,
  Heart,
  Shield,
  AlertTriangle,
  Building,
  Clock,
  RefreshCw,
  Eye,
  Share2
} from 'lucide-react';
import { healthcareAPI } from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';

const AnalyticsReports = () => {
  const [data, setData] = useState({
    userStats: [],
    appointmentStats: [],
    clinicStats: [],
    preventionStats: [],
    emergencyStats: [],
    monthlyTrends: []
  });
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState('overview');
  const [dateRange, setDateRange] = useState('last_30_days');
  const [reportData, setReportData] = useState(null);
  const printRef = useRef();

  const reportTypes = [
    { id: 'overview', name: 'System Overview', icon: Activity, description: 'Complete system statistics' },
    { id: 'users', name: 'User Analytics', icon: Users, description: 'User registration and activity trends' },
    { id: 'appointments', name: 'Appointment Report', icon: Calendar, description: 'Appointment statistics and trends' },
    { id: 'clinics', name: 'Clinic Performance', icon: Building, description: 'Clinic utilization and staff metrics' },
    { id: 'prevention', name: 'Prevention Tips', icon: Heart, description: 'Prevention tip usage and effectiveness' },
    { id: 'emergency', name: 'Emergency Services', icon: AlertTriangle, description: 'Emergency request analytics' }
  ];

  const dateRangeOptions = [
    { value: 'last_7_days', label: 'Last 7 Days' },
    { value: 'last_30_days', label: 'Last 30 Days' },
    { value: 'last_3_months', label: 'Last 3 Months' },
    { value: 'last_6_months', label: 'Last 6 Months' },
    { value: 'last_year', label: 'Last Year' }
  ];

  useEffect(() => {
    loadReportData();
  }, [selectedReport, dateRange]);

  const loadReportData = async () => {
    try {
      setLoading(true);
      
      // Fetch data based on selected report type
      const [usersRes, appointmentsRes, clinicsRes, tipsRes, emergenciesRes] = await Promise.allSettled([
        healthcareAPI.users.list(),
        healthcareAPI.appointments?.list().catch(() => ({ data: [] })),
        healthcareAPI.clinics?.list().catch(() => ({ data: [] })),
        healthcareAPI.preventionTips.list(),
        healthcareAPI.emergencies?.list().catch(() => ({ data: [] }))
      ]);

      const users = usersRes.status === 'fulfilled' ? 
        (usersRes.value?.results || usersRes.value?.data?.results || usersRes.value?.data || []) : [];
      const appointments = appointmentsRes.status === 'fulfilled' ? 
        (appointmentsRes.value?.results || appointmentsRes.value?.data?.results || appointmentsRes.value?.data || []) : [];
      const clinics = clinicsRes.status === 'fulfilled' ? 
        (clinicsRes.value?.results || clinicsRes.value?.data?.results || clinicsRes.value?.data || []) : [];
      const tips = tipsRes.status === 'fulfilled' ? 
        (tipsRes.value?.results || tipsRes.value?.data?.results || tipsRes.value?.data || []) : [];
      const emergencies = emergenciesRes.status === 'fulfilled' ? 
        (emergenciesRes.value?.results || emergenciesRes.value?.data?.results || emergenciesRes.value?.data || []) : [];

      // Process data based on report type and date range
      const processedData = processReportData(users, appointments, clinics, tips, emergencies);
      setData(processedData);
      generateReportSummary(processedData);

    } catch (error) {
      console.error('Report data loading error:', error);
    } finally {
      setLoading(false);
    }
  };

  const processReportData = (users, appointments, clinics, tips, emergencies) => {
    // Filter data by date range
    const filterByDateRange = (items, dateField = 'created_at') => {
      const now = new Date();
      let startDate;
      
      switch(dateRange) {
        case 'last_7_days': startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
        case 'last_30_days': startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
        case 'last_3_months': startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); break;
        case 'last_6_months': startDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000); break;
        case 'last_year': startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000); break;
        default: startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }
      
      return items.filter(item => {
        const itemDate = new Date(item[dateField] || item.date_joined);
        return itemDate >= startDate;
      });
    };

    // User statistics
    const userStats = [
      { name: 'Total Users', value: users.length, color: '#3B82F6' },
      { name: 'Patients', value: users.filter(u => u.role?.name === 'Patient').length, color: '#10B981' },
      { name: 'Doctors', value: users.filter(u => u.role?.name === 'Doctor').length, color: '#8B5CF6' },
      { name: 'Nurses', value: users.filter(u => u.role?.name === 'Nurse').length, color: '#F59E0B' },
      { name: 'Admins', value: users.filter(u => u.role?.name === 'Admin').length, color: '#EF4444' }
    ];

    // Appointment statistics
    const appointmentStats = [
      { name: 'Total', value: appointments.length, color: '#3B82F6' },
      { name: 'Pending', value: appointments.filter(a => a.status === 'P').length, color: '#F59E0B' },
      { name: 'Approved', value: appointments.filter(a => a.status === 'A').length, color: '#10B981' },
      { name: 'Completed', value: appointments.filter(a => a.status === 'D').length, color: '#8B5CF6' },
      { name: 'Cancelled', value: appointments.filter(a => a.status === 'C').length, color: '#EF4444' }
    ];

    // Clinic statistics
    const clinicStats = clinics.map(clinic => ({
      name: clinic.name?.substring(0, 20) || 'Unnamed Clinic',
      staff: clinic.staff_count || 0,
      appointments: appointments.filter(a => a.clinic === clinic.id).length
    }));

    // Prevention tips statistics
    const preventionStats = [
      { name: 'Malaria', value: tips.filter(t => t.disease === 'malaria').length, color: '#EF4444' },
      { name: 'Pneumonia', value: tips.filter(t => t.disease === 'pneumonia').length, color: '#3B82F6' },
      { name: 'High Priority', value: tips.filter(t => t.priority <= 3).length, color: '#F59E0B' }
    ];

    // Emergency statistics
    const emergencyStats = [
      { name: 'Total', value: emergencies.length, color: '#EF4444' },
      { name: 'Pending', value: emergencies.filter(e => e.status === 'P' || e.approval_status === 'pending').length, color: '#F59E0B' },
      { name: 'Approved', value: emergencies.filter(e => e.approval_status === 'approved').length, color: '#10B981' },
      { name: 'Completed', value: emergencies.filter(e => e.status === 'C').length, color: '#8B5CF6' }
    ];

    // Monthly trends
    const monthlyTrends = Array.from({length: 6}, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (5 - i));
      const month = date.toLocaleDateString('en', { month: 'short' });
      
      return {
        month,
        users: filterByDateRange(users, 'date_joined').filter(u => 
          new Date(u.date_joined).getMonth() === date.getMonth()
        ).length,
        appointments: filterByDateRange(appointments, 'created_at').filter(a => 
          new Date(a.created_at).getMonth() === date.getMonth()
        ).length,
        emergencies: filterByDateRange(emergencies, 'created_at').filter(e => 
          new Date(e.created_at || e.request_time).getMonth() === date.getMonth()
        ).length
      };
    });

    return {
      userStats,
      appointmentStats,
      clinicStats,
      preventionStats,
      emergencyStats,
      monthlyTrends
    };
  };

  const generateReportSummary = (data) => {
    const summary = {
      title: `${reportTypes.find(r => r.id === selectedReport)?.name} Report`,
      dateRange: dateRangeOptions.find(d => d.value === dateRange)?.label,
      generatedAt: new Date().toLocaleString(),
      totalUsers: data.userStats.find(s => s.name === 'Total Users')?.value || 0,
      totalAppointments: data.appointmentStats.find(s => s.name === 'Total')?.value || 0,
      totalClinics: data.clinicStats.length,
      totalTips: data.preventionStats.reduce((sum, stat) => sum + stat.value, 0),
      totalEmergencies: data.emergencyStats.find(s => s.name === 'Total')?.value || 0,
      keyInsights: generateKeyInsights(data)
    };
    setReportData(summary);
  };

  const generateKeyInsights = (data) => {
    const insights = [];
    
    const totalUsers = data.userStats.find(s => s.name === 'Total Users')?.value || 0;
    const patients = data.userStats.find(s => s.name === 'Patients')?.value || 0;
    const doctors = data.userStats.find(s => s.name === 'Doctors')?.value || 0;
    
    if (totalUsers > 0) {
      insights.push(`${((patients / totalUsers) * 100).toFixed(1)}% of users are patients`);
    }
    
    const pendingAppointments = data.appointmentStats.find(s => s.name === 'Pending')?.value || 0;
    if (pendingAppointments > 0) {
      insights.push(`${pendingAppointments} appointments are pending approval`);
    }
    
    const highPriorityTips = data.preventionStats.find(s => s.name === 'High Priority')?.value || 0;
    if (highPriorityTips > 0) {
      insights.push(`${highPriorityTips} high priority prevention tips available`);
    }
    
    return insights;
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    // Create a printable version and trigger download
    const printContent = printRef.current;
    const originalContent = document.body.innerHTML;
    
    document.body.innerHTML = printContent.innerHTML;
    window.print();
    document.body.innerHTML = originalContent;
    window.location.reload();
  };

  const handleDownloadCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    
    // Add report header
    csvContent += `${reportData?.title}\n`;
    csvContent += `Generated: ${reportData?.generatedAt}\n`;
    csvContent += `Date Range: ${reportData?.dateRange}\n\n`;
    
    // Add statistics based on selected report
    switch(selectedReport) {
      case 'users':
        csvContent += "User Type,Count\n";
        data.userStats.forEach(stat => {
          csvContent += `${stat.name},${stat.value}\n`;
        });
        break;
      case 'appointments':
        csvContent += "Status,Count\n";
        data.appointmentStats.forEach(stat => {
          csvContent += `${stat.name},${stat.value}\n`;
        });
        break;
      case 'clinics':
        csvContent += "Clinic Name,Staff Count,Appointments\n";
        data.clinicStats.forEach(stat => {
          csvContent += `${stat.name},${stat.staff},${stat.appointments}\n`;
        });
        break;
      default:
        csvContent += "Metric,Value\n";
        csvContent += `Total Users,${reportData?.totalUsers}\n`;
        csvContent += `Total Appointments,${reportData?.totalAppointments}\n`;
        csvContent += `Total Clinics,${reportData?.totalClinics}\n`;
    }
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${selectedReport}_report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderChart = () => {
    switch(selectedReport) {
      case 'users':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data.userStats.filter(s => s.name !== 'Total Users')}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="value"
                label={({name, value}) => `${name}: ${value}`}
              >
                {data.userStats.filter(s => s.name !== 'Total Users').map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        );
      case 'appointments':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.appointmentStats.filter(s => s.name !== 'Total')}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        );
      case 'clinics':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.clinicStats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="staff" fill="#10B981" name="Staff" />
              <Bar dataKey="appointments" fill="#3B82F6" name="Appointments" />
            </BarChart>
          </ResponsiveContainer>
        );
      case 'prevention':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data.preventionStats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="value" stroke="#EF4444" fill="#EF4444" />
            </AreaChart>
          </ResponsiveContainer>
        );
      default:
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.monthlyTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="users" stroke="#3B82F6" name="Users" />
              <Line type="monotone" dataKey="appointments" stroke="#10B981" name="Appointments" />
              <Line type="monotone" dataKey="emergencies" stroke="#EF4444" name="Emergencies" />
            </LineChart>
          </ResponsiveContainer>
        );
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-6 text-white">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold flex items-center">
                <FileText className="w-8 h-8 mr-3" />
                Analytics & Reports
              </h1>
              <p className="text-indigo-100 mt-2">Generate comprehensive reports with export capabilities</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handlePrint}
                className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-4 py-2 rounded-lg transition-colors flex items-center"
              >
                <Printer className="w-4 h-4 mr-2" />
                Print
              </button>
              <button
                onClick={handleDownloadPDF}
                className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-4 py-2 rounded-lg transition-colors flex items-center"
              >
                <Download className="w-4 h-4 mr-2" />
                PDF
              </button>
              <button
                onClick={handleDownloadCSV}
                className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-4 py-2 rounded-lg transition-colors flex items-center"
              >
                <Download className="w-4 h-4 mr-2" />
                CSV
              </button>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
              <select
                value={selectedReport}
                onChange={(e) => setSelectedReport(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                {reportTypes.map(type => (
                  <option key={type.id} value={type.id}>{type.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                {dateRangeOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={loadReportData}
                className="w-full bg-indigo-600 text-white px-4 py-3 rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Generate Report
              </button>
            </div>
          </div>
        </div>

        {/* Report Content */}
        <div ref={printRef} className="print:shadow-none">
          {loading ? (
            <div className="bg-white rounded-xl p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Generating report...</p>
            </div>
          ) : (
            <>
              {/* Report Header */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{reportData?.title}</h2>
                    <p className="text-gray-600">Generated on {reportData?.generatedAt}</p>
                    <p className="text-gray-600">Period: {reportData?.dateRange}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">HealthLink Analytics</div>
                    <div className="text-sm text-gray-500">Report ID: {Date.now()}</div>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{reportData?.totalUsers}</div>
                    <div className="text-sm text-gray-600">Total Users</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{reportData?.totalAppointments}</div>
                    <div className="text-sm text-gray-600">Appointments</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{reportData?.totalClinics}</div>
                    <div className="text-sm text-gray-600">Clinics</div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">{reportData?.totalTips}</div>
                    <div className="text-sm text-gray-600">Prevention Tips</div>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">{reportData?.totalEmergencies}</div>
                    <div className="text-sm text-gray-600">Emergencies</div>
                  </div>
                </div>

                {/* Key Insights */}
                {reportData?.keyInsights && reportData.keyInsights.length > 0 && (
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-semibold text-gray-900 mb-2">Key Insights</h3>
                    <ul className="list-disc list-inside space-y-1 text-gray-700">
                      {reportData.keyInsights.map((insight, index) => (
                        <li key={index}>{insight}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Chart Section */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {reportTypes.find(r => r.id === selectedReport)?.name} Visualization
                </h3>
                {renderChart()}
              </div>

              {/* Detailed Data Table */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Detailed Statistics</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Metric</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Value</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Percentage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        let tableData = [];
                        switch(selectedReport) {
                          case 'users': tableData = data.userStats; break;
                          case 'appointments': tableData = data.appointmentStats; break;
                          case 'prevention': tableData = data.preventionStats; break;
                          case 'emergency': tableData = data.emergencyStats; break;
                          default: tableData = data.userStats;
                        }
                        const total = tableData.reduce((sum, item) => sum + item.value, 0);
                        return tableData.map((item, index) => (
                          <tr key={index} className="border-b border-gray-100">
                            <td className="py-3 px-4">{item.name}</td>
                            <td className="py-3 px-4 font-semibold">{item.value}</td>
                            <td className="py-3 px-4">
                              {total > 0 ? ((item.value / total) * 100).toFixed(1) : 0}%
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Print Styles */}
      <style jsx>{`
        @media print {
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </DashboardLayout>
  );
};

export default AnalyticsReports;
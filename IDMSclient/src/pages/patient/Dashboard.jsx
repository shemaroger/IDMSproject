import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { 
  Calendar,
  Activity,
  Phone,
  Shield,
  Pill,
  Clock,
  ChevronRight
} from 'lucide-react';

const MinimalPatientDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  const quickActions = [
    {
      name: 'My Appointments',
      href: '/patient/appointments',
      icon: Calendar,
      badge: '2',
      color: 'from-blue-500 to-blue-600',
      description: 'View & schedule appointments'
    },
    {
      name: 'Symptom Checker',
      href: '/patient/symptom-checker',
      icon: Activity,
      color: 'from-green-500 to-green-600',
      description: 'Check your symptoms'
    },
    {
      name: 'Emergency Services',
      href: '/patient/emergency',
      icon: Phone,
      highlight: true,
      color: 'from-red-500 to-red-600',
      description: 'Request emergency help'
    },
    {
      name: 'Health Tips',
      href: '/patient/prevention-tips',
      icon: Shield,
      color: 'from-purple-500 to-purple-600',
      description: 'Prevention & wellness tips'
    },
    {
      name: 'Diagnoses',
      href: '/patient/diagnoses',
      icon: Pill,
      color: 'from-orange-500 to-orange-600',
      description: 'View your diagnoses'
    },
    {
      name: 'Symptom History',
      href: '/patient/symptom-history',
      icon: Clock,
      color: 'from-indigo-500 to-indigo-600',
      description: 'Track symptom patterns'
    }
  ];

  useEffect(() => {
    // Simulate loading
    setTimeout(() => setLoading(false), 500);
  }, []);

  const handleActionClick = (href) => {
    navigate(href);
  };

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
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Welcome Section */}
        <div className="text-center">
          <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 rounded-2xl p-8 text-white relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
            <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 bg-white/20 rounded-full"></div>
            <div className="absolute bottom-0 left-0 -mb-6 -ml-6 h-32 w-32 bg-white/10 rounded-full"></div>
            
            <div className="relative z-10">
              <h1 className="text-3xl font-bold mb-2">
                Welcome back, {user?.first_name}! 👋
              </h1>
              <p className="text-blue-100 text-lg">
                Your health, our priority. What can we help you with today?
              </p>
            </div>
          </div>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quickActions.map((action) => {
            const IconComponent = action.icon;
            return (
              <div
                key={action.name}
                onClick={() => handleActionClick(action.href)}
                className={`group relative cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-xl ${
                  action.highlight ? 'ring-2 ring-red-200 ring-opacity-60' : ''
                }`}
              >
                <div className="bg-white rounded-2xl p-6 h-full shadow-lg border border-gray-100 group-hover:border-transparent">
                  {/* Gradient background overlay on hover */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${action.color} opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity duration-300`}></div>
                  
                  <div className="relative z-10">
                    {/* Icon and badge */}
                    <div className="flex items-start justify-between mb-4">
                      <div className={`p-3 rounded-xl bg-gradient-to-br ${action.color} shadow-lg`}>
                        <IconComponent className="h-6 w-6 text-white" />
                      </div>
                      {action.badge && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          {action.badge}
                        </span>
                      )}
                      {action.highlight && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 animate-pulse">
                          Priority
                        </span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold text-gray-900 group-hover:text-gray-800">
                        {action.name}
                      </h3>
                      <p className="text-sm text-gray-600 group-hover:text-gray-700">
                        {action.description}
                      </p>
                    </div>

                    {/* Arrow indicator */}
                    <div className="flex justify-end mt-4">
                      <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 transform group-hover:translate-x-1 transition-all duration-200" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Emergency Notice */}
        <div className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-2xl p-6">
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0">
              <div className="p-3 bg-red-100 rounded-full">
                <Phone className="h-6 w-6 text-red-600" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-900">
                24/7 Emergency Support
              </h3>
              <p className="text-red-700 mt-1">
                For life-threatening emergencies, call 911 immediately or use our emergency services.
              </p>
            </div>
            <div className="flex-shrink-0">
              <button
                onClick={() => handleActionClick('/patient/emergency')}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-medium transition-colors duration-200 shadow-lg hover:shadow-xl"
              >
                Get Help
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default MinimalPatientDashboard;
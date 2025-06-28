// src/components/layout/Sidebar.jsx
import { useAuth } from '../../contexts/AuthContext';
import { Link, useLocation, useNavigate } from 'react-router-dom'; // Add these imports
import { 
  LayoutDashboard,
  Calendar,
  Users,
  FileText,
  Activity,
  Shield,
  AlertTriangle,
  Pill,
  MapPin,
  BarChart3,
  Settings,
  UserPlus,
  Stethoscope,
  Heart,
  Phone,
  Building,
  UserCheck,
  BookOpen,
  TrendingUp,
  Database,
  Bell
} from 'lucide-react';

// Define navigation items for each role
const getNavigationItems = (userRole) => {
  const baseItems = [
    {
      name: 'Dashboard',
      href: `/${userRole.toLowerCase()}/dashboard`,
      icon: LayoutDashboard,
      roles: ['Patient', 'Doctor', 'Health Provider', 'Public Health Provider', 'Admin']
    }
  ];

  const roleBasedItems = {
    Patient: [
      {
        name: 'My Appointments',
        href: '/patient/appointments',
        icon: Calendar,
        badge: '2'
      },
      {
        name: 'Medical Records',
        href: '/patient/records',
        icon: FileText
      },
      {
        name: 'Symptom Checker',
        href: '/patient/symptom-checker',
        icon: Activity
      },
      {
        name: 'Emergency Services',
        href: '/patient/emergency',
        icon: Phone,
        highlight: true
      },
      {
        name: 'Health Tips',
        href: '/patient/prevention',
        icon: Shield
      },
      {
        name: 'Medications',
        href: '/patient/medications',
        icon: Pill
      },
      {
        name: 'Family Health',
        href: '/patient/family',
        icon: Users
      }
    ],

    Doctor: [
      {
        name: 'Patient List',
        href: '/doctor/patients',
        icon: Users,
        badge: '24'
      },
      {
        name: 'Appointments',
        href: '/doctor/appointments',
        icon: Calendar,
        badge: '8'
      },
      {
        name: 'Medical Records',
        href: '/doctor/records',
        icon: FileText
      },
      {
        name: 'Emergency Cases',
        href: '/doctor/emergencies',
        icon: AlertTriangle,
        badge: '3',
        highlight: true
      },
      {
        name: 'Consultations',
        href: '/doctor/consultations',
        icon: Stethoscope
      },
      {
        name: 'Prescriptions',
        href: '/doctor/prescriptions',
        icon: Pill
      },
      {
        name: 'Clinical Reports',
        href: '/doctor/reports',
        icon: BarChart3
      }
    ],

    'Health Provider': [
      {
        name: 'Practice Overview',
        href: '/provider/overview',
        icon: Building
      },
      {
        name: 'Staff Management',
        href: '/provider/staff',
        icon: UserCheck,
        badge: '12'
      },
      {
        name: 'Doctor Accounts',
        href: '/provider/doctors',
        icon: UserPlus
      },
      {
        name: 'Patient Management',
        href: '/provider/patients',
        icon: Users,
        badge: '150'
      },
      {
        name: 'Appointments',
        href: '/provider/appointments',
        icon: Calendar
      },
      {
        name: 'Financial Reports',
        href: '/provider/finance',
        icon: TrendingUp
      },
      {
        name: 'Quality Control',
        href: '/provider/quality',
        icon: Shield
      },
      {
        name: 'Inventory',
        href: '/provider/inventory',
        icon: Database
      }
    ],

    'Public Health Provider': [
      {
        name: 'Disease Surveillance',
        href: '/public-health/surveillance',
        icon: TrendingUp,
        badge: '5'
      },
      {
        name: 'Outbreak Management',
        href: '/public-health/outbreaks',
        icon: AlertTriangle,
        highlight: true
      },
      {
        name: 'Prevention Campaigns',
        href: '/public-health/campaigns',
        icon: Shield
      },
      {
        name: 'Population Health',
        href: '/public-health/population',
        icon: Users
      },
      {
        name: 'Geographic Mapping',
        href: '/public-health/mapping',
        icon: MapPin
      },
      {
        name: 'Health Analytics',
        href: '/public-health/analytics',
        icon: BarChart3
      },
      {
        name: 'Emergency Response',
        href: '/public-health/emergency',
        icon: Phone
      },
      {
        name: 'Provider Oversight',
        href: '/public-health/providers',
        icon: Building
      }
    ],

    Admin: [
      {
        name: 'System Overview',
        href: '/admin/dashboard', // Changed from /admin/overview to match your routing
        icon: BarChart3
      },
      {
        name: 'User Management',
        href: '/admin/users',
        icon: Users,
        badge: '1,234',
        description: 'Manage users, roles, and permissions'
      },
      {
        name: 'Role Management',
        href: '/admin/roles',
        icon: UserCheck
      },
      {
        name: 'Healthcare Providers',
        href: '/admin/clinic',
        icon: Building,
        badge: '98'
      },
      {
        name: 'Patient Records',
        href: '/admin/patients',
        icon: Heart,
        badge: '2,456'
      },
      {
        name: 'Appointments',
        href: '/admin/appointments',
        icon: Calendar
      },
      {
        name: 'Emergency Services',
        href: '/admin/emergency',
        icon: AlertTriangle,
        badge: '5'
      },
      {
        name: 'System Alerts',
        href: '/admin/alerts',
        icon: Bell,
        badge: '12',
        badgeColor: 'bg-red-100 text-red-800'
      },
      {
        name: 'Analytics & Reports',
        href: '/admin/analytics',
        icon: TrendingUp
      },
      {
        name: 'System Health',
        href: '/admin/health',
        icon: Activity
      },
      {
        name: 'Backup & Security',
        href: '/admin/security',
        icon: Shield
      }
    ]
  };

  return [...baseItems, ...(roleBasedItems[userRole] || [])];
};

const Sidebar = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const location = useLocation(); // Use React Router's location
  const navigate = useNavigate(); // Use React Router's navigate
  const userRole = user?.role?.name || 'Patient';
  
  const navigationItems = getNavigationItems(userRole);

  const isActiveLink = (href) => {
    return location.pathname === href || location.pathname.startsWith(href + '/');
  };

  const handleNavigation = (href) => {
    console.log('Navigating to:', href);
    navigate(href); // Actually navigate using React Router
    onClose(); // Close sidebar on mobile
  };

  // Navigation Item Component using Link
  const NavigationItem = ({ item }) => {
    const isActive = isActiveLink(item.href);
    
    return (
      <Link
        to={item.href}
        onClick={onClose} // Close sidebar on mobile when clicking
        className={`
          group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors w-full text-left
          ${isActive 
            ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-700' 
            : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
          }
          ${item.highlight ? 'ring-2 ring-red-200 bg-red-50' : ''}
        `}
      >
        <item.icon className={`
          mr-3 flex-shrink-0 h-5 w-5
          ${isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'}
          ${item.highlight ? 'text-red-500' : ''}
        `} />
        
        <span className="flex-1">{item.name}</span>
        
        {/* Badge */}
        {item.badge && (
          <span className={`
            inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
            ${item.badgeColor || (
              item.highlight 
                ? 'bg-red-100 text-red-800' 
                : isActive 
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-800'
            )}
          `}>
            {item.badge}
          </span>
        )}
      </Link>
    );
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-75 z-20 lg:hidden" 
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:static lg:inset-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Sidebar Header */}
        <div className="flex items-center justify-center h-16 px-4 bg-blue-600 text-white">
          <Heart className="h-8 w-8 mr-3" />
          <div>
            <h2 className="text-lg font-semibold">HealthLink</h2>
            <p className="text-xs text-blue-100">{userRole}</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="mt-6 px-3">
          <div className="space-y-1">
            {navigationItems.map((item) => (
              <NavigationItem key={item.name} item={item} />
            ))}
          </div>

          {/* Settings Section */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="space-y-1">
              <Link
                to={`/${userRole.toLowerCase()}/settings`}
                onClick={onClose}
                className="group flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:text-gray-900 hover:bg-gray-50 w-full text-left"
              >
                <Settings className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" />
                Settings
              </Link>
            </div>
          </div>

          {/* Debug Panel (remove in production) */}
          <div className="mt-4 p-3 bg-gray-50 rounded-lg border">
            <p className="text-xs text-gray-600 mb-2">Debug Info:</p>
            <p className="text-xs text-gray-800">Current: {location.pathname}</p>
            <p className="text-xs text-gray-800">Role: {userRole}</p>
            <button
              onClick={() => {
                console.log('Test navigation to /admin/users');
                navigate('/admin/users');
                onClose();
              }}
              className="mt-2 w-full bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700"
            >
              Test: Go to User Management
            </button>
          </div>
        </nav>
      </div>
    </>
  );
};

export default Sidebar;
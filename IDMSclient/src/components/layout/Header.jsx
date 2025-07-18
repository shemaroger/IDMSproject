// src/components/layout/Header.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { healthcareAPI } from '../../services/api';
import { 
  Menu, 
  X, 
  Bell, 
  User, 
  LogOut, 
  Settings,
  ChevronDown,
  Loader2,
  Sun,
  Moon
} from 'lucide-react';
import logo from '../../assets/healthlink-logo.png';

const Header = ({ onToggleSidebar, sidebarOpen }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false); // Default to light mode

  // Load user profile data
  useEffect(() => {
    const loadUserProfile = async () => {
      if (!user?.id) return;
      
      try {
        setProfileLoading(true);
        
        let profileData = null;
        try {
          const profileResponse = await healthcareAPI.profiles.getMyProfile();
          profileData = profileResponse.data;
        } catch (profileError) {
          const profileResponse = await healthcareAPI.profiles.list({ user: user.id });
          profileData = profileResponse.data?.results?.[0] || profileResponse.data?.[0];
        }
        
        setUserProfile(profileData);
      } catch (error) {
        console.error('Error loading user profile:', error);
        setUserProfile(null);
      } finally {
        setProfileLoading(false);
      }
    };

    loadUserProfile();
  }, [user?.id]);

  // Initialize theme (default to light)
  useEffect(() => {
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode !== null) {
      setDarkMode(savedMode === 'true');
    } else {
      // Default to light mode if no preference saved
      setDarkMode(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    document.documentElement.classList.toggle('dark', newMode);
    localStorage.setItem('darkMode', newMode);
  };

  // Get profile image URL
  const getProfileImageUrl = () => {
    if (userProfile?.profile_picture_url) {
      if (userProfile.profile_picture_url.startsWith('/media/')) {
        return `http://localhost:8000${userProfile.profile_picture_url}`;
      }
      if (userProfile.profile_picture_url.startsWith('http')) {
        return userProfile.profile_picture_url;
      }
      return `http://localhost:8000${userProfile.profile_picture_url}`;
    }
    
    if (userProfile?.profile_picture) {
      if (userProfile.profile_picture.startsWith('http')) {
        return userProfile.profile_picture;
      }
      if (userProfile.profile_picture.startsWith('/media/')) {
        return `http://localhost:8000${userProfile.profile_picture}`;
      }
      return `http://localhost:8000${userProfile.profile_picture}`;
    }
    
    return null;
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleProfileClick = () => {
    setShowUserMenu(false);
    navigate('/profile');
  };

  const handleSettingsClick = () => {
    setShowUserMenu(false);
    navigate('/settings');
  };

  // Profile Avatar Component
  const ProfileAvatar = ({ size = 'sm', className = '' }) => {
    const [imageError, setImageError] = useState(false);
    const imageUrl = getProfileImageUrl();
    
    const sizeClasses = {
      sm: 'h-8 w-8',
      md: 'h-10 w-10',
      lg: 'h-12 w-12'
    };
    
    const iconSizes = {
      sm: 'h-5 w-5',
      md: 'h-6 w-6',
      lg: 'h-7 w-7'
    };

    return (
      <div className={`${sizeClasses[size]} rounded-full overflow-hidden bg-blue-100 flex items-center justify-center relative ${className}`}>
        {imageUrl && !imageError ? (
          <img
            src={imageUrl}
            alt="Profile"
            className="h-full w-full object-cover"
            onError={() => setImageError(true)}
            onLoad={() => setImageError(false)}
          />
        ) : (
          <User className={`${iconSizes[size]} text-blue-600`} />
        )}
      </div>
    );
  };

  return (
    <header className={`bg-white border-gray-200 shadow-sm border-b sticky top-0 z-40`}>
      <div className="flex items-center justify-between h-16 px-4">
        {/* Left side - Logo and mobile menu toggle */}
        <div className="flex items-center">
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 lg:hidden"
          >
            {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
          
          <div className="flex items-center ml-2 lg:ml-0">
            <img 
              src={logo} 
              alt="HealthLink Logo" 
              className="h-8 w-auto mr-3" 
            />
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                HealthLink
              </h1>
              <p className="text-xs text-gray-500 hidden sm:block">
                {user?.role?.name} Portal
              </p>
            </div>
          </div>
        </div>

        {/* Right side - Theme toggle, notifications and user menu */}
        <div className="flex items-center space-x-4">
          {/* Dark Mode Toggle */}
          <button 
            onClick={toggleDarkMode}
            className="p-2 rounded-full text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            aria-label="Toggle dark mode"
          >
            {darkMode ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </button>

          {/* Notifications */}
          <button className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full">
            <Bell className="h-6 w-6" />
            <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
          </button>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-2 p-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
              disabled={isLoggingOut}
            >
              <ProfileAvatar size="sm" />
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-gray-900">
                  {user?.first_name} {user?.last_name}
                </p>
                <p className="text-xs text-gray-500">
                  {user?.role?.name}
                </p>
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
            </button>

            {/* User Dropdown */}
            {showUserMenu && (
              <>
                {/* Backdrop */}
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowUserMenu(false)}
                />
                
                {/* Dropdown Menu */}
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50 py-1">
                  {/* User Info Header */}
                  <div className="px-4 py-3 border-b border-gray-100">
                    <div className="flex items-center space-x-3">
                      <ProfileAvatar size="md" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {user?.first_name} {user?.last_name}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {user?.email}
                        </p>
                        <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full mt-1 ${
                          user?.role?.name === 'Admin' ? 'bg-red-100 text-red-800' :
                          user?.role?.name === 'Doctor' ? 'bg-blue-100 text-blue-800' :
                          user?.role?.name === 'Nurse' ? 'bg-green-100 text-green-800' :
                          user?.role?.name === 'Patient' ? 'bg-purple-100 text-purple-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {user?.role?.name || 'No Role'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Menu Items */}
                  <div className="py-1">
                    <button 
                      onClick={handleProfileClick}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                    >
                      <User className="h-4 w-4 mr-3 text-gray-400" />
                      View Profile
                    </button>
                    
                    <button 
                      onClick={handleSettingsClick}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                    >
                      <Settings className="h-4 w-4 mr-3 text-gray-400" />
                      Settings
                    </button>
                  </div>

                  {/* Logout Section */}
                  <div className="border-t border-gray-100 py-1">
                    <button 
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoggingOut ? (
                        <Loader2 className="h-4 w-4 mr-3 animate-spin" />
                      ) : (
                        <LogOut className="h-4 w-4 mr-3" />
                      )}
                      {isLoggingOut ? 'Signing Out...' : 'Sign Out'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
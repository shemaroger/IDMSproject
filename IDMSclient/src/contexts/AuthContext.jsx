// src/contexts/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check if user is already logged in on app load
    const initializeAuth = () => {
      try {
        const token = localStorage.getItem('authToken');
        const userData = localStorage.getItem('user');
        
        if (token && userData) {
          const parsedUser = JSON.parse(userData);
          setUser(parsedUser);
          setIsAuthenticated(true);
          
          // Optional: Verify token validity with backend
          verifyToken(token);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        // Clear invalid data
        clearAuthData();
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const verifyToken = async (token) => {
    try {
      // You can implement token verification here
      // const response = await authAPI.verifyToken(token);
      // if (!response.valid) {
      //   clearAuthData();
      // }
    } catch (error) {
      console.error('Token verification failed:', error);
      clearAuthData();
    }
  };

  const clearAuthData = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    setUser(null);
    setIsAuthenticated(false);
  };

  const login = async (email, password) => {
    try {
      setIsLoading(true);
      const response = await authAPI.login(email, password);
      
      if (response.user && response.token) {
        setUser(response.user);
        setIsAuthenticated(true);
        
        // Store in localStorage (already done in authAPI.login)
        localStorage.setItem('authToken', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        
        return response;
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData) => {
    try {
      setIsLoading(true);
      const response = await authAPI.register(userData);
      
      // Note: Registration doesn't automatically log in
      // User needs to verify email or admin approval
      return response;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    try {
      clearAuthData();
      // Redirect to login page
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
      // Force clear even if there's an error
      clearAuthData();
      window.location.href = '/login';
    }
  };

  const updateUser = (updatedUserData) => {
    try {
      const updatedUser = { ...user, ...updatedUserData };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    } catch (error) {
      console.error('Update user error:', error);
    }
  };

  // Role-based helper functions for your healthcare system
  const hasRole = (requiredRole) => {
    if (!user || !user.role) return false;
    return user.role.name === requiredRole;
  };

  const hasAnyRole = (requiredRoles) => {
    if (!user || !user.role) return false;
    return requiredRoles.includes(user.role.name);
  };

  // Specific role checkers for your healthcare system
  const isPatient = () => hasRole('Patient');
  
  const isDoctor = () => hasRole('Doctor');
  
  const isHealthProvider = () => hasRole('Health Provider');
  
  const isPublicHealthProvider = () => hasRole('Public Health Provider');
  
  const isAdmin = () => hasRole('Admin');

  // Combined role checkers
  const isHealthcareWorker = () => hasAnyRole(['Doctor', 'Health Provider']);
  
  const isProviderLevel = () => hasAnyRole(['Doctor', 'Health Provider', 'Public Health Provider']);
  
  const isSystemManager = () => hasAnyRole(['Admin', 'Public Health Provider']);

  // Permission checkers (based on your role permissions)
  const canManagePatients = () => {
    return hasAnyRole(['Doctor', 'Health Provider', 'Admin']);
  };

  const canViewEmergencies = () => {
    return hasAnyRole(['Doctor', 'Health Provider', 'Public Health Provider', 'Admin']);
  };

  const canManageSystem = () => {
    return hasRole('Admin');
  };

  const canCreateUsers = () => {
    return hasAnyRole(['Health Provider', 'Admin']); // Health Providers can create Doctors
  };

  const canViewAnalytics = () => {
    return hasAnyRole(['Health Provider', 'Public Health Provider', 'Admin']);
  };

  // Get user display information
  const getUserDisplayName = () => {
    if (!user) return 'Unknown User';
    return `${user.first_name} ${user.last_name}`.trim() || user.email;
  };

  const getUserInitials = () => {
    if (!user) return 'UU';
    const firstName = user.first_name || '';
    const lastName = user.last_name || '';
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || user.email.charAt(0).toUpperCase();
  };

  // Get role-specific dashboard path
  const getDashboardPath = () => {
    if (!user || !user.role) return '/login';
    
    switch (user.role.name) {
      case 'Patient':
        return '/patient/dashboard';
      case 'Doctor':
        return '/doctor/dashboard';
      case 'Health Provider':
        return '/health-provider/dashboard';
      case 'Public Health Provider':
        return '/public-health/dashboard';
      case 'Admin':
        return '/admin/dashboard';
      default:
        return '/login';
    }
  };

  // Check if user can self-register (based on role configuration)
  const canSelfRegister = () => {
    // Only patients can self-register in your system
    return true; // This allows access to signup page for patients
  };

  const value = {
    // State
    user,
    isLoading,
    isAuthenticated,
    
    // Actions
    login,
    register,
    logout,
    updateUser,
    
    // Basic role checkers
    hasRole,
    hasAnyRole,
    
    // Specific role checkers
    isPatient,
    isDoctor,
    isHealthProvider,
    isPublicHealthProvider,
    isAdmin,
    
    // Combined role checkers
    isHealthcareWorker,
    isProviderLevel,
    isSystemManager,
    
    // Permission checkers
    canManagePatients,
    canViewEmergencies,
    canManageSystem,
    canCreateUsers,
    canViewAnalytics,
    canSelfRegister,
    
    // Utility functions
    getUserDisplayName,
    getUserInitials,
    getDashboardPath,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
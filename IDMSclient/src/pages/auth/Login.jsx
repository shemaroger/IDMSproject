// src/pages/auth/Login.jsx
import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { authAPI, apiUtils } from '../../services/api';
import { Eye, EyeOff, Heart, Mail, Lock, AlertCircle, CheckCircle } from 'lucide-react';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    remember: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();

  // Get the intended destination or default redirect
  const from = location.state?.from?.pathname || '/dashboard';

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  // Check for success messages from registration or password reset
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const success = urlParams.get('success');
    const message = urlParams.get('message');
    
    if (success && message) {
      setSuccessMessage(decodeURIComponent(message));
      // Clear URL parameters
      window.history.replaceState({}, '', location.pathname);
    }
  }, [location]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    // Clear messages when user starts typing
    if (error) setError('');
    if (successMessage) setSuccessMessage('');
  };

  const getRedirectPath = (user) => {
    const userRole = user.role?.name;
    const isStaff = user.is_staff;
    const isSuperuser = user.is_superuser;
    
    // Handle users without roles but with staff/admin privileges
    if (!userRole) {
      if (isSuperuser) {
        return '/admin/dashboard';
      } else if (isStaff) {
        return '/provider/dashboard';
      } else {
        throw new Error('Account setup incomplete. Please contact support to assign your role.');
      }
    }
    
    // Route based on role with fallbacks for staff users
    switch (userRole) {
      case 'Patient':
        return '/patient/dashboard';
        
      case 'Doctor':
      case 'Nurse':
      case 'Health Provider':
        return '/provider/dashboard';
        
      case 'Admin':
        return '/admin/dashboard';
        
      case 'Public Health Provider':
        return '/public-health/dashboard';
        
      default:
        console.warn(`Unrecognized role: ${userRole}`);
        
        // Fallback based on staff status
        if (isSuperuser || isStaff) {
          return '/admin/dashboard';
        } else {
          return '/patient/dashboard';
        }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      // Use AuthContext login method instead of direct API call
      const response = await login(formData.email, formData.password);
      
      console.log('Login successful:', response);
      
      // Get redirect path based on user role
      const redirectPath = getRedirectPath(response.user);
      
      // Handle remember me functionality
      if (formData.remember) {
        localStorage.setItem('rememberUser', formData.email);
      } else {
        localStorage.removeItem('rememberUser');
      }
      
      console.log(`Redirecting to: ${redirectPath}`);
      navigate(redirectPath, { replace: true });
      
    } catch (err) {
      console.error('Login error:', err);
      setError(apiUtils.formatErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  // Enhanced quick login function
  const handleQuickLogin = async (email, password, roleType = '') => {
    setFormData({ email, password, remember: false });
    setIsLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await login(email, password);
      const redirectPath = getRedirectPath(response.user);
      
      console.log(`Quick login successful for ${roleType}:`, response.user.email);
      navigate(redirectPath, { replace: true });
      
    } catch (err) {
      console.error('Quick login error:', err);
      setError(apiUtils.formatErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  // Load remembered email on component mount
  useEffect(() => {
    const rememberedEmail = localStorage.getItem('rememberUser');
    if (rememberedEmail) {
      setFormData(prev => ({ ...prev, email: rememberedEmail, remember: true }));
    }
  }, []);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-blue-600 p-3 rounded-full">
              <Heart className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h1>
          <p className="text-gray-600">Sign in to your HealthLink account</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Success Message */}
          {successMessage && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
              <p className="text-green-700 text-sm">{successMessage}</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="Enter your email"
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex="-1"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember"
                  name="remember"
                  type="checkbox"
                  checked={formData.remember}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="remember" className="ml-2 text-sm text-gray-600">
                  Remember me
                </label>
              </div>
              <Link
                to="/forgot-password"
                className="text-sm text-blue-600 hover:text-blue-500 font-medium"
              >
                Forgot password?
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Signing in...
                </div>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-center text-sm text-gray-600">
              Don't have an account?{' '}
              <Link
                to="/signup"
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                Create account
              </Link>
            </p>
          </div>

          {/* Enhanced Demo Accounts */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Quick Demo Login:</h4>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('patient@demo.com', 'password123', 'Patient')}
                disabled={isLoading}
                className="w-full text-left p-3 bg-white border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-sm font-medium text-gray-700">Patient Portal</span>
                    <div className="text-xs text-gray-500">patient@demo.com</div>
                  </div>
                  <div className="text-xs text-blue-600 font-medium">
                    {isLoading ? 'Loading...' : 'Quick Login'}
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('doctor@demo.com', 'password123', 'Doctor')}
                disabled={isLoading}
                className="w-full text-left p-3 bg-white border border-gray-200 rounded-lg hover:bg-green-50 hover:border-green-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-sm font-medium text-gray-700">Healthcare Provider</span>
                    <div className="text-xs text-gray-500">doctor@demo.com</div>
                  </div>
                  <div className="text-xs text-green-600 font-medium">
                    {isLoading ? 'Loading...' : 'Quick Login'}
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('admin@demo.com', 'password123', 'Admin')}
                disabled={isLoading}
                className="w-full text-left p-3 bg-white border border-gray-200 rounded-lg hover:bg-purple-50 hover:border-purple-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-sm font-medium text-gray-700">Admin Dashboard</span>
                    <div className="text-xs text-gray-500">admin@demo.com</div>
                  </div>
                  <div className="text-xs text-purple-600 font-medium">
                    {isLoading ? 'Loading...' : 'Quick Login'}
                  </div>
                </div>
              </button>
            </div>

            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-500 text-center">
                💡 Click any demo account above for instant access
              </p>
            </div>
          </div>

          {/* Login Status Indicator */}
          {formData.email && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-sm text-blue-700">
                <strong>Ready to sign in:</strong> {formData.email}
              </div>
              {formData.email.includes('demo.com') && (
                <div className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                  🎭 Demo account detected
                  {formData.remember && <span>• Will be remembered</span>}
                </div>
              )}
            </div>
          )}

          {/* Security Notice */}
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="text-xs text-yellow-700">
              🔒 <strong>Security Notice:</strong> Never share your login credentials. 
              Always log out when using shared devices.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-500">
            Powered by HealthLink Rwanda - Improving Healthcare Access
          </p>
          <div className="mt-2 flex items-center justify-center gap-4 text-xs text-gray-400">
            <span>🔒 Secure Login</span>
            <span>•</span>
            <span>🏥 Trusted Healthcare Platform</span>
            <span>•</span>
            <span>⚡ Fast & Reliable</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
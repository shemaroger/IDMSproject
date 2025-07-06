// src/pages/auth/SignUp.jsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI, apiUtils } from '../../services/api';
import { 
  FiMail, 
  FiLock, 
  FiUser, 
  FiPhone, 
  FiMapPin, 
  FiAlertCircle,
  FiCheckCircle,
  FiEye,
  FiEyeOff
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import logo from '../../assets/healthlink-logo.png';

const SignUp = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    // Step 1: Basic Info
    email: '',
    password: '',
    confirmPassword: '',
    first_name: '',
    last_name: '',
    
    // Step 2: Profile Info
    phone_number: '',
    address: '',
    date_of_birth: '',
    gender: '',
    
    // Step 3: Medical Info (for patients)
    blood_group: '',
    allergies: '',
    chronic_conditions: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    insurance_provider: '',
    insurance_number: '',
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const genderOptions = [
    { value: 'M', label: 'Male' },
    { value: 'F', label: 'Female' },
    { value: 'O', label: 'Other' },
    { value: 'U', label: 'Prefer not to say' }
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateStep = (step) => {
    switch (step) {
      case 1:
        if (!formData.email || !formData.password || !formData.first_name || !formData.last_name) {
          toast.error('Please fill in all required fields');
          return false;
        }
        if (formData.password !== formData.confirmPassword) {
          toast.error('Passwords do not match');
          return false;
        }
        if (formData.password.length < 8) {
          toast.error('Password must be at least 8 characters long');
          return false;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
          toast.error('Please enter a valid email address');
          return false;
        }
        break;
        
      case 2:
        if (!formData.phone_number || !formData.address) {
          toast.error('Please fill in all required fields');
          return false;
        }
        if (formData.phone_number.length < 10) {
          toast.error('Please enter a valid phone number');
          return false;
        }
        break;
        
      case 3:
        // Step 3 is optional, so no required validations
        break;
        
      default:
        return true;
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

    setIsLoading(true);
    const toastId = toast.loading('Creating your account...');

    try {
      const registrationData = {
        email: formData.email,
        password: formData.password,
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone_number: formData.phone_number || '',
        address: formData.address || '',
        date_of_birth: formData.date_of_birth || null,
        gender: formData.gender || '',
        blood_group: formData.blood_group || '',
        allergies: formData.allergies || '',
        chronic_conditions: formData.chronic_conditions || '',
        emergency_contact_name: formData.emergency_contact_name || '',
        emergency_contact_phone: formData.emergency_contact_phone || '',
        insurance_provider: formData.insurance_provider || '',
        insurance_number: formData.insurance_number || '',
      };

      await authAPI.register(registrationData);
      toast.success('Account created successfully!', { id: toastId });
      
      // Redirect to login after success
      setTimeout(() => {
        window.location.href = '/login?success=true&message=Registration+successful!+Please+sign+in+with+your+credentials.';
      }, 2000);

    } catch (err) {
      console.error('Registration error:', err);
      toast.error(apiUtils.formatErrorMessage(err), { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-700">
        {/* Card Header */}
        <div className="bg-gray-800 px-8 py-6 border-b border-gray-700">
          <div className="flex justify-center mb-4">
            <img 
              src={logo} 
              alt="HealthLink Logo" 
              className="h-10 w-auto" 
            />
          </div>
          <h1 className="text-2xl font-bold text-white text-center">Create Your Account</h1>
        </div>

        {/* Progress Bar */}
        <div className="px-8 pt-6">
          <div className="flex items-center justify-center">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                  ${currentStep >= step 
                    ? 'bg-red-600 text-white' 
                    : 'bg-gray-700 text-gray-400 border border-gray-600'
                  }`}>
                  {step}
                </div>
                {step < 3 && (
                  <div className={`w-12 h-1 mx-2 
                    ${currentStep > step ? 'bg-red-600' : 'bg-gray-700'}`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-center mt-2 text-sm text-gray-400">
            <span className="mx-4">Basic Info</span>
            <span className="mx-4">Contact</span>
            <span className="mx-4">Medical</span>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-6">
          <div>
            {/* Step 1: Basic Information */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      First Name *
                    </label>
                    <div className="relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FiUser className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        name="first_name"
                        type="text"
                        required
                        value={formData.first_name}
                        onChange={handleInputChange}
                        className="block w-full pl-10 pr-3 py-2.5 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent text-white placeholder-gray-400"
                        placeholder="First name"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Last Name *
                    </label>
                    <div className="relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FiUser className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        name="last_name"
                        type="text"
                        required
                        value={formData.last_name}
                        onChange={handleInputChange}
                        className="block w-full pl-10 pr-3 py-2.5 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent text-white placeholder-gray-400"
                        placeholder="Last name"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Email Address *
                  </label>
                  <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FiMail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      name="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={handleInputChange}
                      className="block w-full pl-10 pr-3 py-2.5 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent text-white placeholder-gray-400"
                      placeholder="your@email.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Password *
                    </label>
                    <div className="relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FiLock className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={formData.password}
                        onChange={handleInputChange}
                        className="block w-full pl-10 pr-10 py-2.5 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent text-white placeholder-gray-400"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <FiEyeOff className="h-5 w-5 text-gray-400 hover:text-gray-300" />
                        ) : (
                          <FiEye className="h-5 w-5 text-gray-400 hover:text-gray-300" />
                        )}
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Confirm Password *
                    </label>
                    <div className="relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FiLock className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        name="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        className="block w-full pl-10 pr-10 py-2.5 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent text-white placeholder-gray-400"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
                          <FiEyeOff className="h-5 w-5 text-gray-400 hover:text-gray-300" />
                        ) : (
                          <FiEye className="h-5 w-5 text-gray-400 hover:text-gray-300" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Contact Information */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Phone Number *
                  </label>
                  <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FiPhone className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      name="phone_number"
                      type="tel"
                      required
                      value={formData.phone_number}
                      onChange={handleInputChange}
                      className="block w-full pl-10 pr-3 py-2.5 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent text-white placeholder-gray-400"
                      placeholder="+250 xxx xxx xxx"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Address *
                  </label>
                  <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FiMapPin className="h-5 w-5 text-gray-400" />
                    </div>
                    <textarea
                      name="address"
                      required
                      value={formData.address}
                      onChange={handleInputChange}
                      rows={3}
                      className="block w-full pl-10 pr-3 py-2.5 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent text-white placeholder-gray-400"
                      placeholder="Enter your full address"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Date of Birth
                    </label>
                    <input
                      name="date_of_birth"
                      type="date"
                      value={formData.date_of_birth}
                      onChange={handleInputChange}
                      className="block w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Gender
                    </label>
                    <select
                      name="gender"
                      value={formData.gender}
                      onChange={handleInputChange}
                      className="block w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent text-white"
                    >
                      <option value="">Select gender</option>
                      {genderOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Medical Information */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Blood Group
                    </label>
                    <select
                      name="blood_group"
                      value={formData.blood_group}
                      onChange={handleInputChange}
                      className="block w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent text-white"
                    >
                      <option value="">Select blood group</option>
                      {bloodGroups.map(group => (
                        <option key={group} value={group}>{group}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Insurance Provider
                    </label>
                    <input
                      name="insurance_provider"
                      type="text"
                      value={formData.insurance_provider}
                      onChange={handleInputChange}
                      className="block w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent text-white placeholder-gray-400"
                      placeholder="e.g., RAMA, MMI"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Insurance Number
                  </label>
                  <input
                    name="insurance_number"
                    type="text"
                    value={formData.insurance_number}
                    onChange={handleInputChange}
                    className="block w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent text-white placeholder-gray-400"
                    placeholder="Enter insurance number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Known Allergies
                  </label>
                  <textarea
                    name="allergies"
                    value={formData.allergies}
                    onChange={handleInputChange}
                    rows={3}
                    className="block w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent text-white placeholder-gray-400"
                    placeholder="List any known allergies (medications, food, etc.)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Chronic Conditions
                  </label>
                  <textarea
                    name="chronic_conditions"
                    value={formData.chronic_conditions}
                    onChange={handleInputChange}
                    rows={3}
                    className="block w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent text-white placeholder-gray-400"
                    placeholder="List any chronic conditions (diabetes, hypertension, etc.)"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Emergency Contact Name
                    </label>
                    <input
                      name="emergency_contact_name"
                      type="text"
                      value={formData.emergency_contact_name}
                      onChange={handleInputChange}
                      className="block w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent text-white placeholder-gray-400"
                      placeholder="Full name of emergency contact"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Emergency Contact Phone
                    </label>
                    <input
                      name="emergency_contact_phone"
                      type="tel"
                      value={formData.emergency_contact_phone}
                      onChange={handleInputChange}
                      className="block w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent text-white placeholder-gray-400"
                      placeholder="+250 xxx xxx xxx"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between items-center mt-8">
              {currentStep > 1 ? (
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-6 py-2.5 border border-gray-600 text-gray-300 rounded-md hover:bg-gray-700 transition-colors"
                >
                  Back
                </button>
              ) : (
                <div></div>
              )}

              {currentStep < 3 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-6 py-2.5 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                >
                  Next
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="px-6 py-2.5 bg-red-600 text-white rounded-md hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating Account...
                    </div>
                  ) : (
                    'Create Account'
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Login Link */}
          <div className="mt-8 pt-6 border-t border-gray-700 text-center">
            <p className="text-sm text-gray-400">
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-medium text-red-400 hover:text-red-300"
              >
                Sign in here
              </Link>
            </p>
          </div>
        </div>

        {/* Card Footer */}
        <div className="bg-gray-800/50 px-6 py-4 border-t border-gray-700">
          <div className="text-center text-xs text-gray-500">
            By creating an account, you agree to our{' '}
            <Link to="/terms" className="text-red-400 hover:underline">Terms</Link> and{' '}
            <Link to="/privacy" className="text-red-400 hover:underline">Privacy Policy</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
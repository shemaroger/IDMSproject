import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AuthAPI from '../services/api'; // Adjust path as needed

const SignUp = ({ navigation }) => {
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
  const [error, setError] = useState('');

  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const genderOptions = [
    { value: 'M', label: 'Male' },
    { value: 'F', label: 'Female' },
    { value: 'O', label: 'Other' },
    { value: 'U', label: 'Prefer not to say' }
  ];

  const handleInputChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) setError('');
  };

  const validateStep = (step) => {
    setError('');
    
    switch (step) {
      case 1:
        if (!formData.email || !formData.password || !formData.first_name || !formData.last_name) {
          setError('Please fill in all required fields');
          return false;
        }
        if (formData.password !== formData.confirmPassword) {
          setError('Passwords do not match');
          return false;
        }
        if (formData.password.length < 8) {
          setError('Password must be at least 8 characters long');
          return false;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
          setError('Please enter a valid email address');
          return false;
        }
        break;
        
      case 2:
        if (!formData.phone_number || !formData.address) {
          setError('Please fill in all required fields');
          return false;
        }
        if (formData.phone_number.length < 10) {
          setError('Please enter a valid phone number');
          return false;
        }
        break;
        
      case 3:
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
    setError('');
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) {
      return;
    }

    setIsLoading(true);
    setError('');

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

      await AuthAPI.register(registrationData);
      
      Alert.alert(
        'Success!',
        'Your account has been created successfully. Please sign in with your credentials.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Login')
          }
        ]
      );

    } catch (err) {
      console.error('Registration error:', err);
      setError(err.response?.data?.message || err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderProgressBar = () => (
    <View style={styles.progressContainer}>
      <View style={styles.progressBar}>
        {[1, 2, 3].map((step) => (
          <View key={step} style={styles.progressStep}>
            <View style={[
              styles.progressCircle,
              currentStep >= step ? styles.progressCircleActive : styles.progressCircleInactive
            ]}>
              <Text style={[
                styles.progressText,
                currentStep >= step ? styles.progressTextActive : styles.progressTextInactive
              ]}>
                {step}
              </Text>
            </View>
            {step < 3 && (
              <View style={[
                styles.progressLine,
                currentStep > step ? styles.progressLineActive : styles.progressLineInactive
              ]} />
            )}
          </View>
        ))}
      </View>
      <View style={styles.progressLabels}>
        <Text style={styles.progressLabel}>Basic Info</Text>
        <Text style={styles.progressLabel}>Contact</Text>
        <Text style={styles.progressLabel}>Medical</Text>
      </View>
    </View>
  );

  const renderInputField = (name, placeholder, icon, options = {}) => (
    <View style={styles.inputContainer}>
      <View style={styles.inputWrapper}>
        <Ionicons 
          name={icon} 
          size={20} 
          color="#9CA3AF" 
          style={styles.inputIcon}
        />
        <TextInput
          style={[styles.input, options.multiline && styles.textArea]}
          placeholder={placeholder}
          value={formData[name]}
          onChangeText={(value) => handleInputChange(name, value)}
          secureTextEntry={options.secure && !options.showPassword}
          keyboardType={options.keyboardType || 'default'}
          multiline={options.multiline}
          numberOfLines={options.numberOfLines}
          placeholderTextColor="#9CA3AF"
        />
        {options.togglePassword && (
          <TouchableOpacity 
            style={styles.eyeIcon}
            onPress={() => options.togglePassword()}
          >
            <Ionicons 
              name={options.showPassword ? 'eye-off' : 'eye'} 
              size={20} 
              color="#9CA3AF" 
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderPickerField = (name, placeholder, options, currentValue) => (
    <View style={styles.inputContainer}>
      <TouchableOpacity 
        style={styles.pickerButton}
        onPress={() => {
          Alert.alert(
            'Select ' + placeholder,
            '',
            [
              ...options.map(option => ({
                text: option.label || option,
                onPress: () => handleInputChange(name, option.value || option)
              })),
              { text: 'Cancel', style: 'cancel' }
            ]
          );
        }}
      >
        <Text style={[
          styles.pickerText,
          !currentValue && styles.pickerPlaceholder
        ]}>
          {currentValue ? 
            (options.find(o => (o.value || o) === currentValue)?.label || currentValue) : 
            placeholder
          }
        </Text>
        <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
      </TouchableOpacity>
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Basic Information</Text>
      
      <View style={styles.row}>
        <View style={styles.halfWidth}>
          <Text style={styles.label}>First Name *</Text>
          {renderInputField('first_name', 'Enter first name', 'person')}
        </View>
        <View style={styles.halfWidth}>
          <Text style={styles.label}>Last Name *</Text>
          {renderInputField('last_name', 'Enter last name', 'person')}
        </View>
      </View>

      <Text style={styles.label}>Email Address *</Text>
      {renderInputField('email', 'Enter your email', 'mail', { keyboardType: 'email-address' })}

      <View style={styles.row}>
        <View style={styles.halfWidth}>
          <Text style={styles.label}>Password *</Text>
          {renderInputField('password', 'Create password', 'lock-closed', {
            secure: true,
            showPassword: showPassword,
            togglePassword: () => setShowPassword(!showPassword)
          })}
        </View>
        <View style={styles.halfWidth}>
          <Text style={styles.label}>Confirm Password *</Text>
          {renderInputField('confirmPassword', 'Confirm password', 'lock-closed', {
            secure: true,
            showPassword: showConfirmPassword,
            togglePassword: () => setShowConfirmPassword(!showConfirmPassword)
          })}
        </View>
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Contact Information</Text>
      
      <Text style={styles.label}>Phone Number *</Text>
      {renderInputField('phone_number', '+250 xxx xxx xxx', 'call', { keyboardType: 'phone-pad' })}

      <Text style={styles.label}>Address *</Text>
      {renderInputField('address', 'Enter your full address', 'location', {
        multiline: true,
        numberOfLines: 3
      })}

      <View style={styles.row}>
        <View style={styles.halfWidth}>
          <Text style={styles.label}>Date of Birth</Text>
          {renderInputField('date_of_birth', 'YYYY-MM-DD', 'calendar')}
        </View>
        <View style={styles.halfWidth}>
          <Text style={styles.label}>Gender</Text>
          {renderPickerField('gender', 'Select gender', genderOptions, formData.gender)}
        </View>
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Medical Information</Text>
      
      <View style={styles.row}>
        <View style={styles.halfWidth}>
          <Text style={styles.label}>Blood Group</Text>
          {renderPickerField('blood_group', 'Select blood group', bloodGroups, formData.blood_group)}
        </View>
        <View style={styles.halfWidth}>
          <Text style={styles.label}>Insurance Provider</Text>
          {renderInputField('insurance_provider', 'e.g., RAMA, MMI', 'card')}
        </View>
      </View>

      <Text style={styles.label}>Insurance Number</Text>
      {renderInputField('insurance_number', 'Enter insurance number', 'card')}

      <Text style={styles.label}>Known Allergies</Text>
      {renderInputField('allergies', 'List any known allergies', 'alert-circle', {
        multiline: true,
        numberOfLines: 3
      })}

      <Text style={styles.label}>Chronic Conditions</Text>
      {renderInputField('chronic_conditions', 'List any chronic conditions', 'medical', {
        multiline: true,
        numberOfLines: 3
      })}

      <View style={styles.row}>
        <View style={styles.halfWidth}>
          <Text style={styles.label}>Emergency Contact Name</Text>
          {renderInputField('emergency_contact_name', 'Full name', 'person')}
        </View>
        <View style={styles.halfWidth}>
          <Text style={styles.label}>Emergency Contact Phone</Text>
          {renderInputField('emergency_contact_phone', '+250 xxx xxx xxx', 'call', { keyboardType: 'phone-pad' })}
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#DBEAFE', '#FFFFFF', '#DCFCE7']}
        style={styles.gradient}
      >
        <KeyboardAvoidingView
          style={styles.keyboardAvoid}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.logoContainer}>
                <Ionicons name="heart" size={32} color="#FFFFFF" />
              </View>
              <Text style={styles.title}>Join HealthLink</Text>
              <Text style={styles.subtitle}>Create your account to access healthcare services</Text>
            </View>

            {/* Progress Bar */}
            {renderProgressBar()}

            {/* Form */}
            <View style={styles.formContainer}>
              {error ? (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={20} color="#EF4444" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              {currentStep === 1 && renderStep1()}
              {currentStep === 2 && renderStep2()}
              {currentStep === 3 && renderStep3()}

              {/* Navigation Buttons */}
              <View style={styles.buttonContainer}>
                {currentStep > 1 && (
                  <TouchableOpacity
                    style={styles.backButton}
                    onPress={handleBack}
                  >
                    <Text style={styles.backButtonText}>Back</Text>
                  </TouchableOpacity>
                )}

                {currentStep < 3 ? (
                  <TouchableOpacity
                    style={[styles.nextButton, currentStep === 1 && styles.fullWidth]}
                    onPress={handleNext}
                  >
                    <Text style={styles.nextButtonText}>Next</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.submitButton, isLoading && styles.disabledButton]}
                    onPress={handleSubmit}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <View style={styles.loadingContainer}>
                        <ActivityIndicator size="small" color="#FFFFFF" />
                        <Text style={styles.loadingText}>Creating Account...</Text>
                      </View>
                    ) : (
                      <Text style={styles.submitButtonText}>Create Account</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>

              {/* Login Link */}
              <View style={styles.loginLinkContainer}>
                <Text style={styles.loginLinkText}>Already have an account? </Text>
                <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                  <Text style={styles.loginLink}>Sign in here</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                By creating an account, you agree to our{' '}
                <Text style={styles.footerLink}>Terms of Service</Text> and{' '}
                <Text style={styles.footerLink}>Privacy Policy</Text>
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  logoContainer: {
    backgroundColor: '#2563EB',
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  progressContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  progressBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressStep: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressCircleActive: {
    backgroundColor: '#2563EB',
  },
  progressCircleInactive: {
    backgroundColor: '#E5E7EB',
  },
  progressText: {
    fontSize: 14,
    fontWeight: '500',
  },
  progressTextActive: {
    color: '#FFFFFF',
  },
  progressTextInactive: {
    color: '#6B7280',
  },
  progressLine: {
    width: 48,
    height: 2,
    marginHorizontal: 8,
  },
  progressLineActive: {
    backgroundColor: '#2563EB',
  },
  progressLineInactive: {
    backgroundColor: '#E5E7EB',
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 200,
  },
  progressLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  formContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  stepContainer: {
    marginBottom: 24,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    paddingLeft: 44,
    fontSize: 16,
    color: '#111827',
  },
  textArea: {
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  inputIcon: {
    position: 'absolute',
    left: 12,
    zIndex: 1,
  },
  eyeIcon: {
    position: 'absolute',
    right: 12,
    zIndex: 1,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  pickerText: {
    fontSize: 16,
    color: '#111827',
  },
  pickerPlaceholder: {
    color: '#9CA3AF',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    width: '48%',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 32,
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#374151',
  },
  nextButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#2563EB',
    borderRadius: 8,
  },
  nextButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  submitButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    backgroundColor: '#2563EB',
    borderRadius: 8,
  },
  submitButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  fullWidth: {
    flex: 1,
  },
  disabledButton: {
    opacity: 0.5,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#FFFFFF',
    marginLeft: 8,
  },
  loginLinkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  loginLinkText: {
    fontSize: 14,
    color: '#6B7280',
  },
  loginLink: {
    fontSize: 14,
    color: '#2563EB',
    fontWeight: '500',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 32,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
  },
  footerLink: {
    color: '#2563EB',
  },
});

export default SignUp;
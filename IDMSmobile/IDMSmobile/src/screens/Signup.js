// screens/SignUpScreen.js
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, ActivityIndicator, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import RNPickerSelect from 'react-native-picker-select';
import { authAPI } from '../services/api'; // Adjust the import path as necessary

const SignUpScreen = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    first_name: '',
    last_name: '',
    phone_number: '',
    address: '',
    date_of_birth: '',
    gender: '',
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

  const bloodGroups = [
    { label: 'A+', value: 'A+' },
    { label: 'A-', value: 'A-' },
    { label: 'B+', value: 'B+' },
    { label: 'B-', value: 'B-' },
    { label: 'AB+', value: 'AB+' },
    { label: 'AB-', value: 'AB-' },
    { label: 'O+', value: 'O+' },
    { label: 'O-', value: 'O-' },
  ];

  const genderOptions = [
    { label: 'Male', value: 'M' },
    { label: 'Female', value: 'F' },
    { label: 'Other', value: 'O' },
    { label: 'Prefer not to say', value: 'U' },
  ];

  const navigation = useNavigation();

  const handleInputChange = (name, value) => {
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const validateStep = (step) => {
    switch (step) {
      case 1:
        if (!formData.email || !formData.password || !formData.first_name || !formData.last_name) {
          Alert.alert('Error', 'Please fill in all required fields');
          return false;
        }
        if (formData.password !== formData.confirmPassword) {
          Alert.alert('Error', 'Passwords do not match');
          return false;
        }
        if (formData.password.length < 8) {
          Alert.alert('Error', 'Password must be at least 8 characters long');
          return false;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
          Alert.alert('Error', 'Please enter a valid email address');
          return false;
        }
        break;

      case 2:
        if (!formData.phone_number || !formData.address) {
          Alert.alert('Error', 'Please fill in all required fields');
          return false;
        }
        if (formData.phone_number.length < 10) {
          Alert.alert('Error', 'Please enter a valid phone number');
          return false;
        }
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

      Alert.alert('Success', 'Account created successfully!');
      navigation.navigate('Login');
    } catch (err) {
      console.error('Registration error:', err);
      Alert.alert('Error', err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Image source={require('../assets/healthlink-logo.png')} style={styles.logo} />
            <Text style={styles.headerText}>Create Your Account</Text>
          </View>

          <View style={styles.progressBar}>
            {[1, 2, 3].map((step) => (
              <View key={step} style={styles.progressStep}>
                <View style={[
                  styles.progressCircle,
                  currentStep >= step ? styles.progressCircleActive : styles.progressCircleInactive
                ]}>
                  <Text style={currentStep >= step ? styles.progressTextActive : styles.progressTextInactive}>
                    {step}
                  </Text>
                </View>
                {step < 3 && <View style={[
                  styles.progressLine,
                  currentStep > step ? styles.progressLineActive : styles.progressLineInactive
                ]} />}
              </View>
            ))}
          </View>

          <View style={styles.progressLabels}>
            <Text style={styles.progressLabel}>Basic Info</Text>
            <Text style={styles.progressLabel}>Contact</Text>
            <Text style={styles.progressLabel}>Medical</Text>
          </View>

          <View style={styles.cardBody}>
            {currentStep === 1 && (
              <View style={styles.stepContainer}>
                <View style={styles.inputGroup}>
                  <View style={styles.inputRow}>
                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>First Name *</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="First name"
                        placeholderTextColor="#aaa"
                        value={formData.first_name}
                        onChangeText={(text) => handleInputChange('first_name', text)}
                      />
                    </View>
                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>Last Name *</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Last name"
                        placeholderTextColor="#aaa"
                        value={formData.last_name}
                        onChangeText={(text) => handleInputChange('last_name', text)}
                      />
                    </View>
                  </View>
                  <Text style={styles.label}>Email Address *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="your@email.com"
                    placeholderTextColor="#aaa"
                    value={formData.email}
                    onChangeText={(text) => handleInputChange('email', text)}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  <View style={styles.inputRow}>
                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>Password *</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="••••••••"
                        placeholderTextColor="#aaa"
                        value={formData.password}
                        onChangeText={(text) => handleInputChange('password', text)}
                        secureTextEntry={!showPassword}
                      />
                      <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                        <Text style={styles.showPasswordText}>{showPassword ? 'Hide' : 'Show'}</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>Confirm Password *</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="••••••••"
                        placeholderTextColor="#aaa"
                        value={formData.confirmPassword}
                        onChangeText={(text) => handleInputChange('confirmPassword', text)}
                        secureTextEntry={!showConfirmPassword}
                      />
                      <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                        <Text style={styles.showPasswordText}>{showConfirmPassword ? 'Hide' : 'Show'}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {currentStep === 2 && (
              <View style={styles.stepContainer}>
                <Text style={styles.label}>Phone Number *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="+250 xxx xxx xxx"
                  placeholderTextColor="#aaa"
                  value={formData.phone_number}
                  onChangeText={(text) => handleInputChange('phone_number', text)}
                  keyboardType="phone-pad"
                />
                <Text style={styles.label}>Address *</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Enter your full address"
                  placeholderTextColor="#aaa"
                  value={formData.address}
                  onChangeText={(text) => handleInputChange('address', text)}
                  multiline
                />
                <View style={styles.inputRow}>
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Date of Birth</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor="#aaa"
                      value={formData.date_of_birth}
                      onChangeText={(text) => handleInputChange('date_of_birth', text)}
                    />
                  </View>
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Gender</Text>
                    <RNPickerSelect
                      onValueChange={(value) => handleInputChange('gender', value)}
                      items={genderOptions}
                      style={pickerSelectStyles}
                      value={formData.gender}
                      placeholder={{ label: 'Select gender', value: null }}
                    />
                  </View>
                </View>
              </View>
            )}

            {currentStep === 3 && (
              <View style={styles.stepContainer}>
                <View style={styles.inputRow}>
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Blood Group</Text>
                    <RNPickerSelect
                      onValueChange={(value) => handleInputChange('blood_group', value)}
                      items={bloodGroups}
                      style={pickerSelectStyles}
                      value={formData.blood_group}
                      placeholder={{ label: 'Select blood group', value: null }}
                    />
                  </View>
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Insurance Provider</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g., RAMA, MMI"
                      placeholderTextColor="#aaa"
                      value={formData.insurance_provider}
                      onChangeText={(text) => handleInputChange('insurance_provider', text)}
                    />
                  </View>
                </View>
                <Text style={styles.label}>Insurance Number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter insurance number"
                  placeholderTextColor="#aaa"
                  value={formData.insurance_number}
                  onChangeText={(text) => handleInputChange('insurance_number', text)}
                />
                <Text style={styles.label}>Known Allergies</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="List any known allergies"
                  placeholderTextColor="#aaa"
                  value={formData.allergies}
                  onChangeText={(text) => handleInputChange('allergies', text)}
                  multiline
                />
                <Text style={styles.label}>Chronic Conditions</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="List any chronic conditions"
                  placeholderTextColor="#aaa"
                  value={formData.chronic_conditions}
                  onChangeText={(text) => handleInputChange('chronic_conditions', text)}
                  multiline
                />
                <View style={styles.inputRow}>
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Emergency Contact Name</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Full name of emergency contact"
                      placeholderTextColor="#aaa"
                      value={formData.emergency_contact_name}
                      onChangeText={(text) => handleInputChange('emergency_contact_name', text)}
                    />
                  </View>
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Emergency Contact Phone</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="+250 xxx xxx xxx"
                      placeholderTextColor="#aaa"
                      value={formData.emergency_contact_phone}
                      onChangeText={(text) => handleInputChange('emergency_contact_phone', text)}
                      keyboardType="phone-pad"
                    />
                  </View>
                </View>
              </View>
            )}

            <View style={styles.navigationButtons}>
              {currentStep > 1 ? (
                <TouchableOpacity style={styles.button} onPress={handleBack}>
                  <Text style={styles.buttonText}>Back</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.emptySpace} />
              )}
              {currentStep < 3 ? (
                <TouchableOpacity style={styles.button} onPress={handleNext}>
                  <Text style={styles.buttonText}>Next</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={isLoading}>
                  {isLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Create Account</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.loginLink}>
            <Text style={styles.loginText}>
              Already have an account?{' '}
              <Text style={styles.loginLinkText} onPress={() => navigation.navigate('Login')}>
                Sign in here
              </Text>
            </Text>
          </View>

          <View style={styles.cardFooter}>
            <Text style={styles.footerText}>
              By creating an account, you agree to our{' '}
              <Text style={styles.footerLink}>Terms</Text> and{' '}
              <Text style={styles.footerLink}>Privacy Policy</Text>
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const pickerSelectStyles = StyleSheet.create({
  inputIOS: {
    backgroundColor: '#374151',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4B5563',
    padding: 12,
    color: '#fff',
    marginBottom: 16,
  },
  inputAndroid: {
    backgroundColor: '#374151',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4B5563',
    padding: 12,
    color: '#fff',
    marginBottom: 16,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: '#111827',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
    overflow: 'hidden',
  },
  cardHeader: {
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  logo: {
    height: 40,
    width: 40,
    marginBottom: 16,
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  progressBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
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
    backgroundColor: '#DC2626',
  },
  progressCircleInactive: {
    backgroundColor: '#374151',
    borderWidth: 1,
    borderColor: '#4B5563',
  },
  progressTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  progressTextInactive: {
    color: '#9CA3AF',
  },
  progressLine: {
    height: 2,
    flex: 1,
    marginHorizontal: 8,
  },
  progressLineActive: {
    backgroundColor: '#DC2626',
  },
  progressLineInactive: {
    backgroundColor: '#374151',
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  progressLabel: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  cardBody: {
    padding: 24,
  },
  stepContainer: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  inputContainer: {
    width: '48%',
  },
  label: {
    color: '#D1D5DB',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#374151',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4B5563',
    padding: 12,
    color: '#fff',
    marginBottom: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  showPasswordText: {
    color: '#9CA3AF',
    textAlign: 'right',
    marginTop: -30,
    marginBottom: 16,
    paddingRight: 10,
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  button: {
    backgroundColor: '#DC2626',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    width: '48%',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  emptySpace: {
    width: '48%',
  },
  loginLink: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#374151',
    alignItems: 'center',
  },
  loginText: {
    color: '#9CA3AF',
  },
  loginLinkText: {
    color: '#F87171',
    fontWeight: 'bold',
  },
  cardFooter: {
    padding: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  footerText: {
    color: '#6B7280',
    fontSize: 12,
    textAlign: 'center',
  },
  footerLink: {
    color: '#F87171',
    textDecorationLine: 'underline',
  },
});

export default SignUpScreen;

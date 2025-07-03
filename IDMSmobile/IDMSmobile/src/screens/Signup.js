import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import ApiService from '../services/api';

const SignupScreen = ({ navigation }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    phone: '',
    gender: '',
    meter_number: '',
    province: '',
    district: '',
    sector: '',
  });
  
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideUp, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.username.trim()) newErrors.username = 'Username is required';
    else if (formData.username.length < 3) newErrors.username = 'Username must be at least 3 characters';
    
    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 6) newErrors.password = 'Must be at least 6 characters';
    
    if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
    else if (!/^\+?\d{10,15}$/.test(formData.phone)) newErrors.phone = 'Invalid phone number format';
    
    if (!formData.gender) newErrors.gender = 'Gender is required';
    
    if (!formData.meter_number) newErrors.meter_number = 'Meter number is required';
    else if (formData.meter_number < 13) newErrors.meter_number = 'Invalid meter number format ';
    
    if (!formData.province) newErrors.province = 'Province is required';
    if (!formData.district) newErrors.district = 'District is required';
    if (!formData.sector) newErrors.sector = 'Sector is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    
    try {
      const userData = {
        username: formData.username,
        password: formData.password,
        phone: formData.phone,
        gender: formData.gender,
        meter_number: formData.meter_number,
        province: formData.province,
        district: formData.district,
        sector: formData.sector,
        role: 'user',
        current_power: 0.0
      };

      const response = await ApiService.register(userData);
      
      if (response && response.success) {
        Alert.alert(
          'Success', 
          'Account created successfully!',
          [{ text: 'Continue to Login', onPress: () => navigation.replace('Login') }]
        );
      } else {
        throw new Error(response?.message || 'Registration failed');
      }
    } catch (error) {
      console.error('Signup error:', error);
      
      if (error.response) {
        if (error.response.status === 409) {
          Alert.alert('Error', 'Username or Meter Number already exists');
        } else if (error.response.status === 400) {
          Alert.alert('Error', 'Invalid registration data');
        } else {
          Alert.alert('Error', error.response.data.message || 'Registration failed');
        }
      } else if (error.message.includes('Network Error')) {
        Alert.alert(
          'Connection Error',
          'Could not complete registration. Please check your internet connection.'
        );
      } else {
        Alert.alert('Error', 'An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#f8f9fa', '#e9ecef']}
      style={styles.background}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View 
            style={[
              styles.header,
              { opacity: fadeAnim }
            ]}
          >
            <Image 
              source={require('../../assets/logo.png')} 
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.title}>CashPower Registration</Text>
            <Text style={styles.subtitle}>Register your prepaid electricity account</Text>
          </Animated.View>

          <Animated.View 
            style={[
              styles.formContainer,
              { 
                opacity: fadeAnim,
                transform: [{ translateY: slideUp }] 
              }
            ]}
          >
            {/* Username Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Username*</Text>
              <View style={[
                styles.inputContainer, 
                errors.username && styles.errorInput
              ]}>
                <Ionicons name="person-outline" size={20} color={errors.username ? '#dc3545' : '#6c757d'} />
                <TextInput
                  style={styles.input}
                  placeholder="Choose a username (min 3 chars)"
                  placeholderTextColor="#adb5bd"
                  value={formData.username}
                  onChangeText={(text) => {
                    setFormData({...formData, username: text});
                    if (errors.username) setErrors({...errors, username: ''});
                  }}
                  autoCapitalize="none"
                  maxLength={30}
                />
              </View>
              {errors.username && <Text style={styles.errorText}>{errors.username}</Text>}
            </View>

            {/* Phone Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number*</Text>
              <View style={[
                styles.inputContainer, 
                errors.phone && styles.errorInput
              ]}>
                <Ionicons name="phone-portrait-outline" size={20} color={errors.phone ? '#dc3545' : '#6c757d'} />
                <TextInput
                  style={styles.input}
                  placeholder="+250 78X XXX XXX"
                  placeholderTextColor="#adb5bd"
                  keyboardType="phone-pad"
                  value={formData.phone}
                  onChangeText={(text) => {
                    setFormData({...formData, phone: text});
                    if (errors.phone) setErrors({...errors, phone: ''});
                  }}
                  maxLength={15}
                />
              </View>
              {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
            </View>

            {/* Gender Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Gender*</Text>
              <View style={[
                styles.inputContainer, 
                errors.gender && styles.errorInput
              ]}>
                <Ionicons name="people-outline" size={20} color={errors.gender ? '#dc3545' : '#6c757d'} />
                <TextInput
                  style={styles.input}
                  placeholder="Male/Female/Other"
                  placeholderTextColor="#adb5bd"
                  value={formData.gender}
                  onChangeText={(text) => {
                    setFormData({...formData, gender: text});
                    if (errors.gender) setErrors({...errors, gender: ''});
                  }}
                />
              </View>
              {errors.gender && <Text style={styles.errorText}>{errors.gender}</Text>}
            </View>

            {/* Meter Number Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Meter Number*</Text>
              <View style={[
                styles.inputContainer, 
                errors.meter_number && styles.errorInput
              ]}>
                <Ionicons name="speedometer-outline" size={20} color={errors.meter_number ? '#dc3545' : '#6c757d'} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your meter number"
                  placeholderTextColor="#adb5bd"
                  value={formData.meter_number}
                  onChangeText={(text) => {
                    setFormData({...formData, meter_number: text});
                    if (errors.meter_number) setErrors({...errors, meter_number: ''});
                  }}
                  keyboardType="default"
                  maxLength={20}
                />
              </View>
              {errors.meter_number && <Text style={styles.errorText}>{errors.meter_number}</Text>}
            </View>

            {/* Password Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password*</Text>
              <View style={[
                styles.inputContainer, 
                errors.password && styles.errorInput
              ]}>
                <Ionicons name="lock-closed-outline" size={20} color={errors.password ? '#dc3545' : '#6c757d'} />
                <TextInput
                  style={styles.input}
                  placeholder="Create a password (min 6 chars)"
                  placeholderTextColor="#adb5bd"
                  secureTextEntry={!showPassword}
                  value={formData.password}
                  onChangeText={(text) => {
                    setFormData({...formData, password: text});
                    if (errors.password) setErrors({...errors, password: ''});
                  }}
                />
                <TouchableOpacity 
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                >
                  <Ionicons 
                    name={showPassword ? "eye-off-outline" : "eye-outline"} 
                    size={20} 
                    color={errors.password ? '#dc3545' : '#6c757d'} 
                  />
                </TouchableOpacity>
              </View>
              {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
            </View>

            {/* Location Fields */}
            <Text style={[styles.label, { marginTop: 10 }]}>Location Details*</Text>
            
            {/* Province Field */}
            <View style={styles.inputGroup}>
              <View style={[
                styles.inputContainer, 
                errors.province && styles.errorInput
              ]}>
                <Ionicons name="map-outline" size={20} color={errors.province ? '#dc3545' : '#6c757d'} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your province"
                  placeholderTextColor="#adb5bd"
                  value={formData.province}
                  onChangeText={(text) => {
                    setFormData({...formData, province: text});
                    if (errors.province) setErrors({...errors, province: ''});
                  }}
                />
              </View>
              {errors.province && <Text style={styles.errorText}>{errors.province}</Text>}
            </View>

            {/* District Field */}
            <View style={styles.inputGroup}>
              <View style={[
                styles.inputContainer, 
                errors.district && styles.errorInput
              ]}>
                <Ionicons name="location-outline" size={20} color={errors.district ? '#dc3545' : '#6c757d'} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your district"
                  placeholderTextColor="#adb5bd"
                  value={formData.district}
                  onChangeText={(text) => {
                    setFormData({...formData, district: text});
                    if (errors.district) setErrors({...errors, district: ''});
                  }}
                />
              </View>
              {errors.district && <Text style={styles.errorText}>{errors.district}</Text>}
            </View>

            {/* Sector Field */}
            <View style={styles.inputGroup}>
              <View style={[
                styles.inputContainer, 
                errors.sector && styles.errorInput
              ]}>
                <Ionicons name="navigate-outline" size={20} color={errors.sector ? '#dc3545' : '#6c757d'} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your sector"
                  placeholderTextColor="#adb5bd"
                  value={formData.sector}
                  onChangeText={(text) => {
                    setFormData({...formData, sector: text});
                    if (errors.sector) setErrors({...errors, sector: ''});
                  }}
                />
              </View>
              {errors.sector && <Text style={styles.errorText}>{errors.sector}</Text>}
            </View>

            {/* Submit Button */}
            <TouchableOpacity 
              style={[
                styles.submitButton,
                loading && styles.buttonDisabled
              ]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Register Account</Text>
              )}
            </TouchableOpacity>

            {/* Login Link */}
            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Already have an account?</Text>
              <TouchableOpacity 
                onPress={() => navigation.navigate('Login')}
                activeOpacity={0.6}
              >
                <Text style={styles.loginLink}> Sign In</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 20,
    paddingHorizontal: 30,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#007bff',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
  },
  formContainer: {
    paddingHorizontal: 25,
    marginTop: 10,
  },
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 6,
    marginLeft: 5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#dee2e6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  errorInput: {
    borderColor: '#dc3545',
  },
  successInput: {
    borderColor: '#28a745',
  },
  input: {
    flex: 1,
    marginLeft: 10,
    color: '#212529',
    fontSize: 15,
    paddingVertical: 0,
  },
  eyeIcon: {
    padding: 5,
    marginLeft: 5,
  },
  errorText: {
    color: '#dc3545',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 8,
  },
  successText: {
    color: '#28a745',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 8,
  },
  submitButton: {
    backgroundColor: '#007bff',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
    shadowColor: '#007bff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  loginText: {
    color: '#6c757d',
    fontSize: 14,
  },
  loginLink: {
    color: '#007bff',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default SignupScreen;
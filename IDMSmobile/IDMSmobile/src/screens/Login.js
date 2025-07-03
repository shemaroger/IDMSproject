import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
  Alert,
  Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import ApiService from '../services/api';
import theme from '../constants/theme';

const LoginScreen = ({ navigation }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideUpAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.username.trim()) newErrors.username = 'Username is required';
    if (!formData.password) newErrors.password = 'Password is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
  if (!validateForm()) return;

  setLoading(true);
  
  try {
    console.log('Attempting login with:', {
      username: formData.username.trim(),
      password: formData.password
    });

    const response = await ApiService.login({
      username: formData.username.trim(),
      password: formData.password
    });

    console.log('Login response:', response);

    if (response.success) {
      if (response.user.role === 'user') {
        navigation.replace('Dashboard');
      } else {
        navigation.replace('Dashboard', { 
          userId: response.user.id,
          meterNumber: response.user.meter_number 
        });
      }
    } else {
      Alert.alert('Login Failed', response.error || 'Unknown error occurred');
    }
  } catch (error) {
    console.error('Login error:', error);
    Alert.alert(
      'Login Failed', 
      error.message || 'Could not connect to server. Please try again.'
    );
  } finally {
    setLoading(false);
  }
};

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.secondary]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          <Image 
            source={require('../../assets/logo.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>
        <Animated.Text style={[styles.title, { opacity: fadeAnim }]}>
          CashPower Login
        </Animated.Text>
        <Animated.Text style={[styles.subtitle, { opacity: fadeAnim }]}>
          Sign in to manage your electricity account
        </Animated.Text>
      </LinearGradient>

      <Animated.View 
        style={[
          styles.formContainer,
          { 
            transform: [{ translateY: slideUpAnim }],
            opacity: fadeAnim
          }
        ]}
      >
        {/* Username Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Username</Text>
          <View style={[
            styles.inputContainer, 
            errors.username && styles.errorInput
          ]}>
            <Ionicons 
              name="person-outline" 
              size={20} 
              color={errors.username ? theme.colors.danger : theme.colors.text} 
            />
            <TextInput
              style={styles.input}
              placeholder="Enter your username"
              placeholderTextColor={theme.colors.text + '80'}
              value={formData.username}
              onChangeText={(text) => {
                setFormData({...formData, username: text});
                if (errors.username) setErrors({...errors, username: ''});
              }}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          {errors.username && (
            <Text style={styles.errorText}>{errors.username}</Text>
          )}
        </View>

        {/* Password Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password</Text>
          <View style={[
            styles.inputContainer, 
            errors.password && styles.errorInput
          ]}>
            <Ionicons 
              name="lock-closed-outline" 
              size={20} 
              color={errors.password ? theme.colors.danger : theme.colors.text} 
            />
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              placeholderTextColor={theme.colors.text + '80'}
              value={formData.password}
              onChangeText={(text) => {
                setFormData({...formData, password: text});
                if (errors.password) setErrors({...errors, password: ''});
              }}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity 
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeIcon}
            >
              <Ionicons 
                name={showPassword ? "eye-off-outline" : "eye-outline"} 
                size={20} 
                color={errors.password ? theme.colors.danger : theme.colors.text} 
              />
            </TouchableOpacity>
          </View>
          {errors.password && (
            <Text style={styles.errorText}>{errors.password}</Text>
          )}
        </View>

        {/* Forgot Password */}
        <TouchableOpacity 
          style={styles.forgotPassword}
          onPress={() => navigation.navigate('ForgotPassword')}
        >
          <Text style={styles.linkText}>Forgot Password?</Text>
        </TouchableOpacity>

        {/* Login Button */}
        <TouchableOpacity 
          style={[
            styles.loginButton,
            loading && styles.buttonDisabled
          ]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Login</Text>
          )}
        </TouchableOpacity>

        {/* Signup Link */}
        <View style={styles.signupContainer}>
          <Text style={styles.signupText}>Don't have an account?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
            <Text style={styles.signupLink}> Register Meter</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.light,
  },
  header: {
    paddingHorizontal: 30,
    paddingTop: 50,
    paddingBottom: 80,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  logo: {
    width: 80,
    height: 80,
    alignSelf: 'center',
    marginBottom: 15,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.white,
    textAlign: 'center',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.white,
    opacity: 0.9,
    textAlign: 'center',
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: 30,
    marginTop: -30,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: theme.colors.light,
    ...theme.shadow,
  },
  errorInput: {
    borderColor: theme.colors.danger,
  },
  input: {
    flex: 1,
    marginLeft: 10,
    color: theme.colors.text,
    fontSize: 16,
    paddingVertical: 0,
  },
  eyeIcon: {
    padding: 5,
  },
  errorText: {
    color: theme.colors.danger,
    fontSize: 12,
    marginTop: 5,
    marginLeft: 5,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginTop: -10,
    marginBottom: 20,
  },
  linkText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  loginButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    ...theme.shadow,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 'auto',
    marginBottom: 30,
  },
  signupText: {
    color: theme.colors.text,
  },
  signupLink: {
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
});

export default LoginScreen;
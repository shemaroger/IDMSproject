// App.js or screens/LoginScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, ActivityIndicator, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LoginScreen = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    remember: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const navigation = useNavigation();

  const handleInputChange = (name, value) => {
    setFormData({
      ...formData,
      [name]: value,
    });
    if (error) setError('');
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setError('');

    try {
      // Replace with your actual login logic
      // await login(formData.email, formData.password);

      if (formData.remember) {
        await AsyncStorage.setItem('rememberUser', formData.email);
      } else {
        await AsyncStorage.removeItem('rememberUser');
      }

      Alert.alert('Success', 'Login successful');
      navigation.navigate('Dashboard');
    } catch (err) {
      console.error('Login error:', err);
      setError('Login failed. Please check your credentials.');
      Alert.alert('Error', 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const loadRememberedEmail = async () => {
      const rememberedEmail = await AsyncStorage.getItem('rememberUser');
      if (rememberedEmail) {
        setFormData(prev => ({ ...prev, email: rememberedEmail, remember: true }));
      }
    };

    loadRememberedEmail();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Image source={require('./assets/healthlink-logo.png')} style={styles.logo} />
          <Text style={styles.headerText}>Welcome Back</Text>
        </View>

        <View style={styles.cardBody}>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Text style={styles.label}>Email Address</Text>
          <TextInput
            style={styles.input}
            placeholder="your@email.com"
            placeholderTextColor="#aaa"
            value={formData.email}
            onChangeText={(text) => handleInputChange('email', text)}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
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

          <View style={styles.rememberForgotContainer}>
            <View style={styles.rememberMeContainer}>
              <TouchableOpacity onPress={() => handleInputChange('remember', !formData.remember)}>
                <View style={styles.checkbox}>
                  {formData.remember && <View style={styles.checkedBox} />}
                </View>
              </TouchableOpacity>
              <Text style={styles.rememberMeText}>Remember me</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
              <Text style={styles.forgotPasswordText}>Forgot password?</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Sign in</Text>
            )}
          </TouchableOpacity>

          <View style={styles.signupContainer}>
            <Text style={styles.signupText}>Don't have an account?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
              <Text style={styles.signupLink}>Create new account</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.footerText}>© {new Date().getFullYear()} HealthLink Rwanda. All rights reserved.</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  cardBody: {
    padding: 24,
  },
  errorText: {
    color: '#F87171',
    marginBottom: 16,
    textAlign: 'center',
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
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
    backgroundColor: '#374151',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4B5563',
    padding: 12,
    color: '#fff',
    marginBottom: 16,
  },
  showPasswordText: {
    color: '#9CA3AF',
    marginLeft: 8,
  },
  rememberForgotContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: '#9CA3AF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  checkedBox: {
    width: 12,
    height: 12,
    backgroundColor: '#DC2626',
  },
  rememberMeText: {
    color: '#9CA3AF',
  },
  forgotPasswordText: {
    color: '#F87171',
  },
  button: {
    backgroundColor: '#DC2626',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  signupContainer: {
    alignItems: 'center',
  },
  signupText: {
    color: '#9CA3AF',
    marginBottom: 8,
  },
  signupLink: {
    color: '#F87171',
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
  },
});

export default LoginScreen;

import React, { useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Image, 
  Animated, 
  ScrollView,
  Dimensions 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../constants/theme';
import * as Animatable from 'react-native-animatable';

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(100)).current;
  const cardScale = useRef(new Animated.Value(0.9)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideUpAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(cardScale, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  const features = [
    {
      id: 1,
      title: "Instant Power",
      description: "Buy electricity in seconds",
      icon: "flash",
      color: theme.colors.accent,
      action: () => navigation.navigate('BuyPower')
    },
    {
      id: 2,
      title: "Usage Stats",
      description: "Track your consumption",
      icon: "analytics",
      color: theme.colors.white,
      bgColor: theme.colors.secondary,
      action: () => navigation.navigate('Dashboard')
    },
    {
      id: 3,
      title: "Relay Control",
      description: "Manage power relay",
      icon: "power",
      color: theme.colors.white,
      bgColor: theme.colors.primary,
      action: () => navigation.navigate('RelayControlScreen') // Fixed this line
    },
    {
      id: 4,
      title: "Payment History",
      description: "View past transactions",
      icon: "receipt",
      color: theme.colors.primary,
      action: () => navigation.navigate('MeterReportScreen')
    }
  ];

  return (
    <ScrollView 
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* Animated Header */}
      <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
        <Animatable.Image 
          animation="bounceIn"
          duration={1500}
          source={require('../../assets/logo.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>PowerWallet</Text>
        <Text style={styles.subtitle}>Smart energy management</Text>
      </Animated.View>

      {/* Features Grid */}
      <Animated.View 
        style={[
          styles.featuresContainer,
          { transform: [{ scale: cardScale }] }
        ]}
      >
        {features.map((feature, index) => (
          <Animatable.View
            key={feature.id}
            animation="fadeInUp"
            duration={800}
            delay={200 + (index * 100)}
            style={[
              styles.featureCard, 
              feature.bgColor && { backgroundColor: feature.bgColor }
            ]}
          >
            <Ionicons 
              name={feature.icon} 
              size={32} 
              color={feature.color} 
              style={styles.featureIcon}
            />
            <Text style={[
              styles.cardTitle,
              feature.bgColor && { color: theme.colors.white }
            ]}>
              {feature.title}
            </Text>
            <Text style={[
              styles.cardText,
              feature.bgColor && { color: theme.colors.white }
            ]}>
              {feature.description}
            </Text>
            <TouchableOpacity 
              style={[
                styles.primaryButton,
                feature.bgColor && { backgroundColor: theme.colors.white }
              ]}
              onPress={feature.action}
            >
              <Text style={[
                styles.buttonText,
                feature.bgColor && { color: feature.bgColor }
              ]}>
                {index % 2 === 0 ? 'Get Started' : 'View More'}
              </Text>
              <Ionicons 
                name="arrow-forward" 
                size={16} 
                color={feature.bgColor ? feature.bgColor : theme.colors.white}
                style={styles.buttonIcon}
              />
            </TouchableOpacity>
          </Animatable.View>
        ))}
      </Animated.View>

      {/* Auth Section */}
      <Animated.View 
        style={[
          styles.authContainer, 
          { 
            opacity: fadeAnim,
            transform: [{ translateY: slideUpAnim }] 
          }
        ]}
      >
        <Text style={styles.authTitle}>Get Started</Text>
        <TouchableOpacity 
          style={styles.loginButton}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.loginButtonText}>Login</Text>
          <Ionicons 
            name="log-in" 
            size={20} 
            color={theme.colors.primary} 
            style={styles.buttonIcon}
          />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.signupButton}
          onPress={() => navigation.navigate('Signup')}
        >
          <Text style={styles.signupButtonText}>Create Account</Text>
          <Ionicons 
            name="arrow-forward" 
            size={20} 
            color={theme.colors.primary} 
            style={styles.buttonIcon}
          />
        </TouchableOpacity>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: theme.colors.light,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  header: {
    alignItems: 'center',
    paddingTop: theme.spacing.xl * 1.5,
    paddingBottom: theme.spacing.lg,
  },
  logo: {
    width: 140,
    height: 140,
    marginBottom: theme.spacing.md,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.text,
    opacity: 0.8,
    textAlign: 'center',
  },
  featuresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xl,
  },
  featureCard: {
    width: width * 0.43,
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    elevation: 3,
    shadowColor: theme.colors.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  featureIcon: {
    marginBottom: theme.spacing.sm,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginVertical: theme.spacing.xs,
    textAlign: 'center',
  },
  cardText: {
    fontSize: 14,
    color: theme.colors.text,
    opacity: 0.7,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
    lineHeight: 20,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    width: '100%',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  buttonText: {
    color: theme.colors.white,
    fontWeight: '600',
  },
  buttonIcon: {
    marginLeft: theme.spacing.xs,
  },
  authContainer: {
    marginTop: 'auto',
    paddingHorizontal: theme.spacing.md,
  },
  authTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  loginButton: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  loginButtonText: {
    color: theme.colors.primary,
    fontWeight: 'bold',
    fontSize: 16,
  },
  signupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary + '20',
  },
  signupButtonText: {
    color: theme.colors.primary,
    fontWeight: 'bold',
    fontSize: 16,
  },
});
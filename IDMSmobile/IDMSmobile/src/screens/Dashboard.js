import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import theme from '../constants/theme';
import Card from '../components/Card';
import QuickAction from '../components/QuickAction';
import ApiService from '../services/api';

export default function DashboardScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [meterData, setMeterData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDashboardData();
    
    // Refresh data when screen is focused
    const unsubscribe = navigation.addListener('focus', () => {
      loadDashboardData();
    });

    return unsubscribe;
  }, [navigation]);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Get meter number from AsyncStorage
      const meterNumber = await AsyncStorage.getItem('meterNumber');
      const username = await AsyncStorage.getItem('username');
      
      if (!meterNumber) {
        setError('Meter number not found. Please log in again.');
        setLoading(false);
        return;
      }
      
      // Set basic user data
      setUserData({
        username: username || 'User',
        meterNumber
      });
      
      // Fetch latest meter reading
      const readingResponse = await ApiService.getLatestReading(meterNumber);
      
      // Fetch recent transactions
      const transactionsResponse = await ApiService.getTransactions({ 
        meter_number: meterNumber,
        limit: 3 
      });
      
      setMeterData(readingResponse);
      setTransactions(transactionsResponse.transactions || []);
    } catch (err) {
      console.error('Dashboard data loading error:', err);
      setError('Failed to load dashboard data. Pull down to refresh.');
    } finally {
      setLoading(false);
    }
  };

  // Calculate percentage of power remaining based on latest purchase and consumption
  const calculateUsagePercentage = () => {
    if (!meterData || !meterData.power) return 0;
    
    // This is a simplified calculation - you'll need to adjust based on your business logic
    // For example, if 1 unit costs 500 as in your backend, we can estimate usage percentage
    const maxPower = 10; // Set a default maximum power value or get it from your backend
    const currentPower = parseFloat(meterData.power);
    const percentage = Math.min(Math.max((currentPower / maxPower) * 100, 0), 100);
    
    return Math.round(percentage);
  };

  // Estimate days remaining based on current power and average daily consumption
  const estimateDaysRemaining = () => {
    if (!meterData || !meterData.power) return 0;
    
    // This is a simplified calculation - you'll need to adjust based on your business logic
    const currentPower = parseFloat(meterData.power);
    const avgDailyConsumption = 0.5; // This should be calculated from historical data
    
    const daysRemaining = currentPower / avgDailyConsumption;
    return Math.round(daysRemaining);
  };

  // Format date to a more readable format
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    
    // Check if the date is today
    if (date.toDateString() === today.toDateString()) {
      return `Today, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    // Check if the date is yesterday
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    // Otherwise, return the date and time
    return `${date.toLocaleDateString()}, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading dashboard data...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={theme.colors.danger} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadDashboardData}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const usage = calculateUsagePercentage();
  const daysRemaining = estimateDaysRemaining();

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={loadDashboardData} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>Hello, {userData?.username || 'User'}!</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
          <Ionicons name="person-circle-outline" size={28} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      {/* Balance Card */}
      <Card style={styles.balanceCard}>
        <Text style={styles.cardTitle}>Current Power Balance</Text>
        <Text style={styles.balanceAmount}>{meterData?.power || '0.00'} kWh</Text>
        
        <View style={styles.usageContainer}>
          <View style={styles.usageBarContainer}>
            <View 
              style={[
                styles.usageBar, 
                { width: `${100 - usage}%`, backgroundColor: usage > 80 ? theme.colors.danger : theme.colors.success }
              ]}
            />
          </View>
          <Text style={styles.usageText}>{100 - usage}% remaining</Text>
        </View>
        
        <Text style={styles.daysRemaining}>~{daysRemaining} days remaining</Text>
        
        {meterData && (
          <View style={styles.meterInfoContainer}>
            <View style={styles.meterInfoItem}>
              <Text style={styles.meterInfoLabel}>Voltage</Text>
              <Text style={styles.meterInfoValue}>{meterData.voltage || '0'} V</Text>
            </View>
            <View style={styles.meterInfoItem}>
              <Text style={styles.meterInfoLabel}>Current</Text>
              <Text style={styles.meterInfoValue}>{meterData.current || '0'} A</Text>
            </View>
            <View style={styles.meterInfoItem}>
              <Text style={styles.meterInfoLabel}>Last Updated</Text>
              <Text style={styles.meterInfoValue}>
                {meterData.reading_time ? formatDate(meterData.reading_time) : 'N/A'}
              </Text>
            </View>
          </View>
        )}
      </Card>

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.quickActions}>
        <QuickAction 
          icon="flash" 
          color={theme.colors.accent} 
          label="Buy Power" 
          onPress={() => navigation.navigate('BuyPower', { meterNumber: userData?.meterNumber })}
        />
        <QuickAction 
          icon="receipt" 
          color={theme.colors.success} 
          label="Meter Report" 
          onPress={() => navigation.navigate('MeterReportScreen', { meterNumber: userData?.meterNumber })}
        />
        <QuickAction 
          icon="list" 
          color={theme.colors.primary} 
          label="Transactions" 
          onPress={() => navigation.navigate('TransactionsScreen', { meterNumber: userData?.meterNumber })}
        />
      </View>

      {/* Recent Transactions */}
      <Text style={styles.sectionTitle}>Recent Transactions</Text>
      <Card style={styles.transactionsCard}>
        {transactions.length > 0 ? (
          transactions.map((transaction, index) => (
            <View 
              key={transaction.id || index} 
              style={[
                styles.transactionItem, 
                index < transactions.length - 1 && styles.transactionBorder
              ]}
            >
              <View style={styles.transactionIcon}>
                <Ionicons name="flash" size={20} color={theme.colors.accent} />
              </View>
              <View style={styles.transactionDetails}>
                <Text style={styles.transactionTitle}>Power Purchase</Text>
                <Text style={styles.transactionDate}>
                  {formatDate(transaction.date)}
                </Text>
              </View>
              <Text style={styles.transactionAmount}>
                ${parseFloat(transaction.amount).toFixed(2)}
              </Text>
            </View>
          ))
        ) : (
          <View style={styles.noTransactionsContainer}>
            <Text style={styles.noTransactionsText}>No recent transactions</Text>
          </View>
        )}
        
        <TouchableOpacity 
          style={styles.viewAllButton}
          onPress={() => navigation.navigate('TransactionsScreen', { meterNumber: userData?.meterNumber })}
        >
          <Text style={styles.viewAllText}>View All Transactions</Text>
        </TouchableOpacity>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.light,
  },
  content: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.light,
  },
  loadingText: {
    marginTop: theme.spacing.md,
    color: theme.colors.text,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.light,
    padding: theme.spacing.lg,
  },
  errorText: {
    marginTop: theme.spacing.md,
    color: theme.colors.danger,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  greeting: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  balanceCard: {
    marginBottom: theme.spacing.lg,
  },
  cardTitle: {
    fontSize: 16,
    color: theme.colors.text,
    opacity: 0.8,
    marginBottom: theme.spacing.xs,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: theme.spacing.md,
  },
  usageContainer: {
    marginBottom: theme.spacing.sm,
  },
  usageBarContainer: {
    height: 8,
    backgroundColor: theme.colors.light,
    borderRadius: theme.borderRadius.full,
    overflow: 'hidden',
    marginBottom: theme.spacing.xs,
  },
  usageBar: {
    height: '100%',
    borderRadius: theme.borderRadius.full,
  },
  usageText: {
    fontSize: 14,
    color: theme.colors.text,
    opacity: 0.8,
  },
  daysRemaining: {
    fontSize: 14,
    color: theme.colors.success,
    fontWeight: '600',
    marginBottom: theme.spacing.md,
  },
  meterInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.light,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  meterInfoItem: {
    alignItems: 'center',
  },
  meterInfoLabel: {
    fontSize: 12,
    color: theme.colors.text,
    opacity: 0.7,
    marginBottom: 2,
  },
  meterInfoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg,
  },
  transactionsCard: {
    padding: 0,
    overflow: 'hidden',
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  transactionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.light,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.light,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 12,
    color: theme.colors.text,
    opacity: 0.6,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  noTransactionsContainer: {
    padding: theme.spacing.lg,
    alignItems: 'center',
  },
  noTransactionsText: {
    color: theme.colors.text,
    opacity: 0.6,
  },
  viewAllButton: {
    padding: theme.spacing.md,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: theme.colors.light,
  },
  viewAllText: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
});
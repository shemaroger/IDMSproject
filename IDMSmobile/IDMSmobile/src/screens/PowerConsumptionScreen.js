import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  Alert,
  ScrollView,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ApiService from '../services/api';
import theme from '../constants/theme';

const PowerConsumptionScreen = ({ route }) => {
  const { meterNumber } = route.params;
  const [consumptionData, setConsumptionData] = useState(null);
  const [remainingPower, setRemainingPower] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentStats, setCurrentStats] = useState({
    voltage: 0,
    current: 0,
    power: 0
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Get current power status
      const powerResponse = await ApiService.getLatestReading(meterNumber);
      if (powerResponse) {
        setRemainingPower(powerResponse.current_power || 0);
        setCurrentStats({
          voltage: powerResponse.voltage || 0,
          current: powerResponse.current || 0,
          power: powerResponse.power || 0
        });
      }
      
      // Get consumption report
      const reportResponse = await ApiService.getPortReport(meterNumber);
      if (reportResponse) {
        setConsumptionData(reportResponse);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      Alert.alert('Error', 'Failed to load consumption data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  useEffect(() => {
    fetchData();
    
    // Set up polling for real-time updates (every 30 seconds)
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [meterNumber]);

  const renderStatusIndicator = () => {
    const powerPercentage = (remainingPower / (consumptionData?.latest_purchased_power || 1)) * 100;
    const isLowPower = powerPercentage < 20;

    return (
      <View style={styles.statusContainer}>
        <View style={styles.powerMeter}>
          <View 
            style={[
              styles.powerFill,
              { 
                width: `${Math.min(100, powerPercentage)}%`,
                backgroundColor: isLowPower ? theme.colors.danger : theme.colors.primary
              }
            ]}
          />
          <Text style={styles.powerText}>
            {remainingPower.toFixed(2)} W / {consumptionData?.latest_purchased_power?.toFixed(2) || 0} W
          </Text>
        </View>
        {isLowPower && (
          <View style={styles.warningContainer}>
            <Ionicons name="warning" size={20} color={theme.colors.danger} />
            <Text style={styles.warningText}>Low power remaining!</Text>
          </View>
        )}
      </View>
    );
  };

  const renderCurrentStats = () => (
    <View style={styles.statsContainer}>
      <Text style={styles.sectionTitle}>Current Readings</Text>
      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Voltage</Text>
          <Text style={styles.statValue}>{currentStats.voltage.toFixed(2)} V</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Current</Text>
          <Text style={styles.statValue}>{currentStats.current.toFixed(2)} A</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Power</Text>
          <Text style={styles.statValue}>{currentStats.power.toFixed(2)} W</Text>
        </View>
      </View>
    </View>
  );

  const renderConsumptionHistory = () => (
    <View style={styles.historyContainer}>
      <Text style={styles.sectionTitle}>Consumption History</Text>
      <View style={styles.historyItem}>
        <Text>Total Purchased:</Text>
        <Text>{consumptionData?.latest_purchased_power?.toFixed(2) || 0} W</Text>
      </View>
      <View style={styles.historyItem}>
        <Text>Power Consumed:</Text>
        <Text>{consumptionData?.consumed_power?.toFixed(2) || 0} W</Text>
      </View>
      <View style={styles.historyItem}>
        <Text>Power Remaining:</Text>
        <Text>{remainingPower.toFixed(2)} W</Text>
      </View>
      <View style={styles.historyItem}>
        <Text>Last Updated:</Text>
        <Text>{consumptionData?.latest_date || 'N/A'}</Text>
      </View>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={[theme.colors.primary]}
        />
      }
    >
      <Text style={styles.header}>Meter: {meterNumber}</Text>
      
      {renderStatusIndicator()}
      {renderCurrentStats()}
      {consumptionData && renderConsumptionHistory()}

      <View style={styles.noteContainer}>
        <Text style={styles.noteText}>
          <Ionicons name="information-circle" size={16} /> 
          {' '}Data updates automatically every 30 seconds
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  statusContainer: {
    marginBottom: 25,
  },
  powerMeter: {
    height: 30,
    backgroundColor: theme.colors.lightGray,
    borderRadius: 15,
    overflow: 'hidden',
    justifyContent: 'center',
    marginBottom: 10,
  },
  powerFill: {
    height: '100%',
    borderRadius: 15,
  },
  powerText: {
    position: 'absolute',
    alignSelf: 'center',
    color: 'white',
    fontWeight: 'bold',
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF3E0',
    padding: 10,
    borderRadius: 8,
  },
  warningText: {
    color: theme.colors.danger,
    marginLeft: 5,
    fontWeight: '500',
  },
  statsContainer: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 15,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    width: '30%',
    alignItems: 'center',
    ...theme.shadow,
  },
  statLabel: {
    color: theme.colors.gray,
    marginBottom: 5,
  },
  statValue: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  historyContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
    ...theme.shadow,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.lightGray,
  },
  noteContainer: {
    padding: 10,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
  },
  noteText: {
    color: theme.colors.primary,
    fontSize: 14,
  },
});

export default PowerConsumptionScreen;
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator,
  Alert,
  Switch
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ApiService from '../services/api';

const RelayControlScreen = ({ route }) => {
  // Add a fallback if route or route.params is undefined
  const meterNumber = route?.params?.meterNumber;
  const [relayStatus, setRelayStatus] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentPower, setCurrentPower] = useState(0);
  const [consumptionData, setConsumptionData] = useState(null);

  // Fetch initial data when component mounts
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        // Get current power status
        const powerResponse = await ApiService.getLatestReading(meterNumber);
        if (powerResponse && powerResponse.power !== undefined) {
          setRelayStatus(powerResponse.power > 0);
          setCurrentPower(powerResponse.power);
        }
        
        // Get consumption report
        const reportResponse = await ApiService.getPortReport(meterNumber);
        if (reportResponse) {
          setConsumptionData(reportResponse);
        }
      } catch (error) {
        console.error('Failed to fetch initial data:', error);
        Alert.alert('Error', 'Failed to load meter data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (meterNumber) {
      fetchInitialData();
    } else {
      console.warn('No meter number provided in route params');
      // Consider adding navigation to a meter selection screen
      // or displaying a message to the user
    }
  }, [meterNumber]);

  const controlRelay = async (newStatus) => {
    if (!meterNumber) {
      Alert.alert('Error', 'No meter number specified');
      return;
    }

    setLoading(true);
    try {
      // Updated to match the backend API structure
      // The state is now passed directly without meter_number
      const response = await ApiService.relayControl(newStatus ? 'on' : 'off');

      if (response && response.success) {
        setRelayStatus(newStatus);
        Alert.alert('Success', response.message || 'Relay command sent successfully');
        
        // Update power status after relay change
        try {
          const updatedReading = await ApiService.getLatestReading(meterNumber);
          if (updatedReading && updatedReading.power !== undefined) {
            setCurrentPower(updatedReading.power);
          }
        } catch (updateError) {
          console.error('Failed to update power reading:', updateError);
        }
      } else {
        throw new Error(response?.error || 'Failed to control relay');
      }
    } catch (error) {
      console.error('Relay control error:', error);
      Alert.alert(
        'Error', 
        error.message || 'Failed to control relay. Please try again.'
      );
      // Revert switch state if operation failed
      setRelayStatus(!newStatus);
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchToggle = async (newStatus) => {
    if (loading) return;
    await controlRelay(newStatus);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Power Control</Text>
      {meterNumber ? (
        <>
          <Text style={styles.meterNumber}>Meter: {meterNumber}</Text>
          
          {/* Status Indicator */}
          <View style={[
            styles.statusIndicator,
            relayStatus ? styles.statusOn : styles.statusOff
          ]}>
            <Ionicons 
              name={relayStatus ? "flash" : "flash-off"} 
              size={48} 
              color="white" 
            />
            <Text style={styles.statusText}>
              {relayStatus ? 'POWER ON' : 'POWER OFF'}
            </Text>
            <Text style={styles.powerText}>
              {currentPower.toFixed(2)} W remaining
            </Text>
          </View>

      {/* Control Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.controlButton,
            styles.onButton,
            (loading || relayStatus) && styles.disabledButton
          ]}
          onPress={() => controlRelay(true)}
          disabled={loading || relayStatus}
        >
          {loading && relayStatus ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Ionicons name="flash" size={24} color="white" />
              <Text style={styles.buttonText}>Turn ON</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.controlButton,
            styles.offButton,
            (loading || !relayStatus) && styles.disabledButton
          ]}
          onPress={() => controlRelay(false)}
          disabled={loading || !relayStatus}
        >
          {loading && !relayStatus ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Ionicons name="flash-off" size={24} color="white" />
              <Text style={styles.buttonText}>Turn OFF</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Toggle Switch */}
      <View style={styles.switchContainer}>
        <Text style={styles.switchLabel}>
          {relayStatus ? 'Power Connected' : 'Power Disconnected'}
        </Text>
        <Switch
          value={relayStatus}
          onValueChange={handleSwitchToggle}
          disabled={loading}
          trackColor={{ false: "#767577", true: "#4CAF50" }}
          thumbColor={relayStatus ? "#f5dd4b" : "#f4f3f4"}
        />
      </View>

      {/* Consumption Data */}
      {consumptionData && (
        <View style={styles.dataContainer}>
          <Text style={styles.dataTitle}>Consumption Report</Text>
          <View style={styles.dataRow}>
            <Text>Purchased Power:</Text>
            <Text>{consumptionData.latest_purchased_power?.toFixed(2) || '0.00'} W</Text>
          </View>
          <View style={styles.dataRow}>
            <Text>Current Power:</Text>
            <Text>{consumptionData.current_power?.toFixed(2) || '0.00'} W</Text>
          </View>
          <View style={styles.dataRow}>
            <Text>Consumed Power:</Text>
            <Text>{consumptionData.consumed_power?.toFixed(2) || '0.00'} W</Text>
          </View>
          <View style={styles.dataRow}>
            <Text>Last Updated:</Text>
            <Text>{consumptionData.latest_date || 'N/A'}</Text>
          </View>
        </View>
      )}
      </>
      ) : (
        <View style={styles.noMeterContainer}>
          <Ionicons name="warning-outline" size={48} color="#F44336" />
          <Text style={styles.noMeterText}>No meter number provided</Text>
          <Text style={styles.noMeterSubtext}>Please select a meter to continue</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  meterNumber: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  noMeterContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  noMeterText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F44336',
    marginTop: 10,
  },
  noMeterSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
    textAlign: 'center',
  },
  statusIndicator: {
    width: 180,
    height: 180,
    borderRadius: 90,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 30,
    elevation: 5,
  },
  statusOn: {
    backgroundColor: '#4CAF50',
  },
  statusOff: {
    backgroundColor: '#F44336',
  },
  statusText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
    marginTop: 10,
  },
  powerText: {
    color: 'white',
    fontSize: 16,
    marginTop: 5,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 30,
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
    width: '48%',
    elevation: 3,
  },
  onButton: {
    backgroundColor: '#4CAF50',
  },
  offButton: {
    backgroundColor: '#F44336',
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 10,
    fontSize: 16,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 10,
    marginBottom: 30,
  },
  switchLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  dataContainer: {
    width: '100%',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    elevation: 3,
  },
  dataTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
});

export default RelayControlScreen;
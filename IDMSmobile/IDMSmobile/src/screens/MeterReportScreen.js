import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator,
  ScrollView,
  TouchableOpacity
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MeterService from '../services/api';
import theme from '../constants/theme';
import Card from '../components/Card';

const MeterReportScreen = ({ navigation }) => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        setLoading(true);
        const result = await MeterService.getMeterReport();
        if (result.success) {
          setReport(result.data);
        } else {
          setError(result.error || 'Failed to load meter report');
        }
      } catch (err) {
        setError(err.message || 'Failed to load meter report');
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, []);

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    fetchReport();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={handleRetry}
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!report) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>No meter data available</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={handleRetry}
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <View style={styles.header}>
          <Ionicons name="speedometer" size={24} color={theme.colors.primary} />
          <Text style={styles.meterNumber}>Meter: {report.meterNumber}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.row}>
          <Text style={styles.label}>Current Balance:</Text>
          <Text style={styles.value}>{report.currentPower} W</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Last Purchase:</Text>
          <Text style={styles.value}>{report.latestPurchasedPower} W</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Purchase Date:</Text>
          <Text style={styles.value}>{report.purchasedDate}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Power Consumed:</Text>
          <Text style={styles.value}>{report.consumedPower} W</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Last Reading:</Text>
          <Text style={styles.value}>{report.latestReadingDate}</Text>
        </View>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: theme.colors.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  meterNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
    color: theme.colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  label: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  value: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 16,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    padding: 12,
    borderRadius: 8,
  },
  retryText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default MeterReportScreen;
import ApiService from '../services/api';
import { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../constants/theme';
import Card from '../components/Card';

export default function BuyPowerScreen({ navigation, route }) {
  const { user } = route.params || {};
  const [amount, setAmount] = useState('');
  const [meterNumber, setMeterNumber] = useState('');
  const [purchaseType, setPurchaseType] = useState('self');
  const [loading, setLoading] = useState(false);

  const presetAmounts = [1000, 2000, 5000, 10000, 20000, 50000]; // RWF amounts

  const handlePurchase = async () => {
    // Validate amount
    const amountValue = parseFloat(amount);
    if (isNaN(amountValue)) {
      Alert.alert('Invalid Amount', 'Please enter a valid number');
      return;
    }
    
    if (amountValue <= 0) {
      Alert.alert('Invalid Amount', 'Amount must be greater than 0');
      return;
    }

    // Validate recipient meter if gifting
    if (purchaseType === 'other' && !meterNumber.trim()) {
      Alert.alert('Missing Information', 'Please enter recipient meter number');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        amount: amountValue,
        buy_for: purchaseType,
        ...(purchaseType === 'other' && { meter_number: meterNumber.trim() })
      };

      const response = await ApiService.buyElectricity(payload);
      
      Alert.alert(
        'Purchase Successful',
        `Successfully purchased ${response.data.power.toFixed(2)} W`,
        [
          { 
            text: 'OK', 
            onPress: () => navigation.navigate('Home', { refresh: true }) 
          }
        ]
      );
    } catch (error) {
      console.error('Purchase error:', error);
      const errorMessage = error.response?.data?.error || 
                         error.message || 
                         'Failed to complete purchase. Please try again.';
      Alert.alert('Purchase Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Buy Electricity</Text>
      
      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Purchase Type</Text>
        
        <View style={styles.toggleContainer}>
          <TouchableOpacity 
            style={[
              styles.toggleButton,
              purchaseType === 'self' && styles.activeToggle
            ]}
            onPress={() => setPurchaseType('self')}
          >
            <Text style={[
              styles.toggleText,
              purchaseType === 'self' && styles.activeToggleText
            ]}>
              For Myself
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.toggleButton,
              purchaseType === 'other' && styles.activeToggle
            ]}
            onPress={() => setPurchaseType('other')}
          >
            <Text style={[
              styles.toggleText,
              purchaseType === 'other' && styles.activeToggleText
            ]}>
              Gift Someone
            </Text>
          </TouchableOpacity>
        </View>
        
        {purchaseType === 'other' && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Recipient Meter Number</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter meter number"
              value={meterNumber}
              onChangeText={setMeterNumber}
              keyboardType="default"
            />
          </View>
        )}
      </Card>
      
      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Amount (RWF)</Text>
        
        <View style={styles.presetContainer}>
          {presetAmounts.map((preset) => (
            <TouchableOpacity 
              key={preset} 
              style={[
                styles.presetButton,
                amount === preset.toString() && styles.selectedPreset
              ]}
              onPress={() => setAmount(preset.toString())}
            >
              <Text style={styles.presetText}>{preset.toLocaleString()} RWF</Text>
            </TouchableOpacity>
          ))}
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Custom Amount</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter amount in RWF"
            placeholderTextColor={theme.colors.text + '80'}
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color={theme.colors.primary} />
          <Text style={styles.infoText}>1 RWF = 500 W (0.002 W/RWF)</Text>
        </View>
      </Card>
      
      <TouchableOpacity 
        style={styles.confirmButton}
        onPress={handlePurchase}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={theme.colors.white} />
        ) : (
          <>
            <Ionicons name="flash" size={20} color={theme.colors.white} />
            <Text style={styles.confirmButtonText}>Confirm Purchase</Text>
          </>
        )}
      </TouchableOpacity>
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
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
  },
  card: {
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.white,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.light,
    borderRadius: theme.borderRadius.sm,
    overflow: 'hidden',
  },
  toggleButton: {
    flex: 1,
    padding: theme.spacing.sm,
    alignItems: 'center',
  },
  activeToggle: {
    backgroundColor: theme.colors.primary,
  },
  toggleText: {
    fontWeight: '500',
    color: theme.colors.text,
  },
  activeToggleText: {
    color: theme.colors.white,
  },
  inputGroup: {
    marginBottom: theme.spacing.sm,
  },
  label: {
    marginBottom: theme.spacing.xs,
    color: theme.colors.text,
    fontWeight: '500',
  },
  input: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.light,
    color: theme.colors.text,
    fontSize: 16,
  },
  presetContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  presetButton: {
    width: '30%',
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.light,
    alignItems: 'center',
  },
  selectedPreset: {
    backgroundColor: theme.colors.primary + '20',
    borderColor: theme.colors.primary,
    borderWidth: 1,
  },
  presetText: {
    color: theme.colors.text,
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary + '10',
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    marginTop: theme.spacing.sm,
  },
  infoText: {
    marginLeft: theme.spacing.sm,
    color: theme.colors.primary,
  },
  confirmButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  confirmButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: theme.spacing.sm,
  },
});
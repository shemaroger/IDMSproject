import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const Dashboard = () => {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Dashboard</Text>
      
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Upcoming Appointments</Text>
        <Text style={styles.cardText}>No upcoming appointments</Text>
        <TouchableOpacity 
          style={styles.cardButton}
          onPress={() => navigation.navigate('Appointments')}
        >
          <Text style={styles.cardButtonText}>Schedule Appointment</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Medical Records</Text>
        <Text style={styles.cardText}>View your health history</Text>
        <TouchableOpacity 
          style={styles.cardButton}
          onPress={() => navigation.navigate('Records')}
        >
          <Text style={styles.cardButtonText}>View Records</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#2c3e50',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#3498db',
  },
  cardText: {
    fontSize: 16,
    marginBottom: 15,
    color: '#7f8c8d',
  },
  cardButton: {
    backgroundColor: '#3498db',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  cardButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default Dashboard;
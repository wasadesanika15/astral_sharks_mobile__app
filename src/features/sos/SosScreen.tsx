import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import * as Location from 'expo-location';
import * as Battery from 'expo-battery';
import * as Network from 'expo-network';
import { Accelerometer } from 'expo-sensors';
import { apiService } from '../../services/apiService';

export default function SosScreen() {
  const [isSending, setIsSending] = useState(false);
  const [networkStatus, setNetworkStatus] = useState<string>('Checking...');

  useEffect(() => {
    checkNetwork();
    
    let sub: any = null;
    if (Platform.OS !== 'web') {
      sub = Accelerometer.addListener(accelerometerData => {
        const { x, y, z } = accelerometerData;
        const acceleration = Math.sqrt(x * x + y * y + z * z);
        if (acceleration > 3.0) { // Shake detected
          triggerSos('Shake Detection');
        }
      });
      Accelerometer.setUpdateInterval(1000);
    }
    
    return () => sub?.remove();
  }, []);

  const checkNetwork = async () => {
    const net = await Network.getNetworkStateAsync();
    setNetworkStatus(net.isConnected ? 'Online' : 'Offline');
  };

  const triggerSos = async (triggerType: string = 'Manual Button') => {
    if (isSending) return;
    setIsSending(true);

    try {
      let location = null;
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        location = await Location.getCurrentPositionAsync({});
      }

      const batteryLevel = await Battery.getBatteryLevelAsync();
      const network = await Network.getNetworkStateAsync();

      const payload = {
        trigger: triggerType,
        location: location ? { lat: location.coords.latitude, lng: location.coords.longitude } : null,
        battery: batteryLevel,
        network: network.isConnected,
        timestamp: new Date().toISOString()
      };

      const result = await apiService.postSOS(payload);
      
      if (result.queued) {
        Alert.alert('Offline Mode', 'Network unavailable. SOS queued locally and will be sent upon reconnection.');
      } else {
        Alert.alert('SOS Sent', `Successfully sent to backend. Hold tight!`);
      }
    } catch (error) {
       Alert.alert('Error', 'Failed to process SOS, queued locally.');
       await apiService.postSOS({ trigger: triggerType, error: true });
    } finally {
      setIsSending(false);
    }
  };

  const startVoiceDetection = () => {
    Alert.alert('Voice Detection', 'Listening for "Help"...');
    // Mocking voice trigger after 3 seconds
    setTimeout(() => {
      triggerSos('Voice Trigger');
    }, 3000);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>RescueNet SOS</Text>
      <Text style={styles.status}>Network: {networkStatus}</Text>
      
      <TouchableOpacity 
        style={[styles.sosButton, isSending && styles.sosButtonDisabled]} 
        onPress={() => triggerSos('Manual Button')}
        disabled={isSending}
      >
        <Text style={styles.sosText}>{isSending ? 'SENDING...' : 'S O S'}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.voiceButton} onPress={startVoiceDetection}>
        <Text style={styles.voiceText}>🎙️ Tap & Shout "Help"</Text>
      </TouchableOpacity>
      
      <Text style={styles.shakeText}>Or vigorously shake your phone</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1C1C1E',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 10,
  },
  status: {
    color: '#A1A1A6',
    marginBottom: 40,
  },
  sosButton: {
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 0px 20px rgba(255, 59, 48, 0.8)',
    elevation: 10,
  },
  sosButtonDisabled: {
    backgroundColor: '#8E1D16',
  },
  sosText: {
    fontSize: 48,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 4,
  },
  voiceButton: {
    marginTop: 50,
    paddingVertical: 15,
    paddingHorizontal: 30,
    backgroundColor: '#2C2C2E',
    borderRadius: 30,
  },
  voiceText: {
    color: '#0A84FF',
    fontSize: 18,
    fontWeight: '600'
  },
  shakeText: {
    marginTop: 20,
    color: '#636366',
    fontSize: 14,
  }
});

import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';

const INITIAL_INCIDENTS = [
  { id: 1, latitude: 28.7041, longitude: 77.1025, title: "Fire حادث", type: 'fire' },
  { id: 2, latitude: 28.71, longitude: 77.12, title: "Flood Alert", type: 'flood' }
];

export default function MapScreen() {
  const [location, setLocation] = useState<any>(null);
  const [incidents, setIncidents] = useState<any[]>(INITIAL_INCIDENTS);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      let loc = await Location.getCurrentPositionAsync({});
      setLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      });
    })();
  }, []);

  const reportIncident = () => {
    if (!location) return;
    
    const newIncident = {
      id: Date.now(),
      latitude: location.latitude + (Math.random() - 0.5) * 0.01,
      longitude: location.longitude + (Math.random() - 0.5) * 0.01,
      title: "New Incident Reported",
      type: 'manual'
    };

    setIncidents([...incidents, newIncident]);
    Alert.alert('Success', 'New incident reported at your location!');
  };

  if (!location) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF3B30" />
        <Text style={styles.loadingText}>Fetching Location...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={location}
        showsUserLocation={true}
      >
        {incidents.map((incident) => (
          <Marker
            key={incident.id}
            coordinate={{ latitude: incident.latitude, longitude: incident.longitude }}
            title={incident.title}
            pinColor={incident.type === 'fire' ? '#FF3B30' : incident.type === 'flood' ? '#007AFF' : '#FF9500'}
          />
        ))}

        {/* User Presence Safe Zone */}
        <Circle
           center={{ latitude: location.latitude, longitude: location.longitude }}
           radius={1000}
           fillColor="rgba(52, 199, 89, 0.2)"
           strokeColor="rgba(52, 199, 89, 0.5)"
        />
      </MapView>

      <TouchableOpacity style={styles.reportButton} onPress={reportIncident}>
        <Text style={styles.reportButtonText}>🚨 Report Incident</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1C1C1E' },
  loadingText: { color: '#FFF', fontSize: 18, marginTop: 15 },
  reportButton: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    backgroundColor: '#FF3B30',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 30,
    elevation: 5,
    shadowColor: '#000',
    boxShadow: '0px 4px 10px rgba(0,0,0,0.3)',
  },
  reportButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 18 },
});

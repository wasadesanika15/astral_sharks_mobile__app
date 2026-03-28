import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, ActivityIndicator, TouchableOpacity, Platform } from 'react-native';
import * as Location from 'expo-location';

// Conditional imports for Web
let MapContainer: any, TileLayer: any, Marker: any, Popup: any, L: any;
if (Platform.OS === 'web') {
  MapContainer = require('react-leaflet').MapContainer;
  TileLayer = require('react-leaflet').TileLayer;
  Marker = require('react-leaflet').Marker;
  Popup = require('react-leaflet').Popup;
  L = require('leaflet');

  // Fix Leaflet icons
  import('leaflet/dist/leaflet.css');
  import('leaflet/dist/images/marker-icon.png');
  import('leaflet/dist/images/marker-shadow.png');

  // Manual fix for leaflet default marker icon issue in Webpack/Bundlers
  if (L) {
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    });
  }
}

const INITIAL_INCIDENTS = [
  { id: 1, lat: 28.7041, lng: 77.1025, title: "Fire حادث", type: 'fire' },
  { id: 2, lat: 28.71, lng: 77.12, title: "Flood Alert", type: 'flood' }
];

export default function MapScreen() {
  const [location, setLocation] = useState<any>(null);
  const [incidents, setIncidents] = useState<any[]>(INITIAL_INCIDENTS);
  const [isWeb, setIsWeb] = useState(false);

  useEffect(() => {
    setIsWeb(Platform.OS === 'web');
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      let loc = await Location.getCurrentPositionAsync({});
      setLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
    })();
  }, []);

  const reportIncident = () => {
    if (!location) return;
    const newIncident = {
      id: Date.now(),
      lat: location.latitude + (Math.random() - 0.5) * 0.01,
      lng: location.longitude + (Math.random() - 0.5) * 0.01,
      title: "New Incident Reported",
      type: 'manual'
    };
    setIncidents([...incidents, newIncident]);
    if (Platform.OS !== 'web') {
       // Alert is handled in native, on web we can just log or use window.alert
    } else {
       alert('New incident reported at your location!');
    }
  };

  if (!location) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF3B30" />
        <Text style={styles.loadingText}>Initializing Web Map...</Text>
      </View>
    );
  }

  if (Platform.OS !== 'web') return null; // Should not happen with MapScreen.web.tsx naming

  return (
    <View style={styles.container}>
      <View style={styles.webContainer}>
        <MapContainer 
            center={[location.latitude, location.longitude]} 
            zoom={13} 
            scrollWheelZoom={true}
            style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {/* User Location Marker */}
          <Marker position={[location.latitude, location.longitude]}>
            <Popup>
              You are here.
            </Popup>
          </Marker>

          {/* Incident Markers */}
          {incidents.map((incident) => (
            <Marker key={incident.id} position={[incident.lat, incident.lng]}>
              <Popup>
                <div style={{ color: incident.type === 'fire' ? 'red' : 'blue' }}>
                  <strong>{incident.title}</strong><br/>
                  Type: {incident.type}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </View>

      <TouchableOpacity style={styles.reportButton} onPress={reportIncident}>
        <Text style={styles.reportButtonText}>🚨 Report Incident</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1C1C1E' },
  webContainer: { flex: 1, height: '100%', width: '100%' },
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
    zIndex: 1000,
    boxShadow: '0px 4px 10px rgba(0,0,0,0.5)',
  },
  reportButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 18 },
});

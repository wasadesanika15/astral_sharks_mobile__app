import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import * as Location from 'expo-location';
import { socketService } from '../../services/socketService';

const MOCK_CONTACTS = [
  { id: '1', name: 'Mom', phone: '+1234567890', status: 'Safe', location: 'Home' },
  { id: '2', name: 'Brother', phone: '+0987654321', status: 'Unknown', location: null }
];

export default function FamilyScreen() {
  const [contacts, setContacts] = useState(MOCK_CONTACTS);
  const [myStatus, setMyStatus] = useState('Safe');

  useEffect(() => {
    socketService.connect();
    
    // Listen for family status updates
    socketService.on('family_status_update', (data: any) => {
      setContacts(prev => prev.map(c => 
        c.id === data.userId ? { ...c, status: data.status, location: data.location } : c
      ));
    });

    return () => {
      socketService.off('family_status_update');
    };
  }, []);

  const broadcastMyStatus = async (status: string) => {
    setMyStatus(status);
    let locationStr = 'Unknown';
    let { status: locStatus } = await Location.requestForegroundPermissionsAsync();
    if (locStatus === 'granted') {
      let loc = await Location.getCurrentPositionAsync({});
      locationStr = `${loc.coords.latitude.toFixed(4)}, ${loc.coords.longitude.toFixed(4)}`;
    }

    socketService.emit('update_status', {
      userId: 'my_id',
      status: status,
      location: locationStr
    });
    Alert.alert('Status Updated', `Broadcasted to family: ${status}`);
  };

  const renderContact = ({ item }: { item: any }) => (
    <View style={styles.contactCard}>
      <View>
        <Text style={styles.contactName}>{item.name}</Text>
        <Text style={styles.contactPhone}>{item.phone}</Text>
      </View>
      <View style={styles.statusBox}>
        <Text style={[styles.statusText, item.status === 'Safe' ? {color: '#32D74B'} : {color: '#FFD60A'}]}>
          {item.status}
        </Text>
        <Text style={styles.locationText}>{item.location || 'Loc unknown'}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Family Safety Tracker</Text>

      <View style={styles.myStatusCard}>
        <Text style={styles.myStatusTitle}>My Status: <Text style={{color: myStatus === 'Safe' ? '#32D74B' : '#FF453A'}}>{myStatus}</Text></Text>
        <View style={styles.statusBtns}>
          <TouchableOpacity style={[styles.statusBtn, {backgroundColor: '#32D74B'}]} onPress={() => broadcastMyStatus('Safe')}>
            <Text style={styles.btnText}>I'm Safe</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.statusBtn, {backgroundColor: '#FF453A'}]} onPress={() => broadcastMyStatus('Need Help')}>
            <Text style={styles.btnText}>Need Help</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.contactsHeader}>Family Members</Text>
      <FlatList
        data={contacts}
        keyExtractor={item => item.id}
        renderItem={renderContact}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1C1C1E', padding: 20, paddingTop: 60 },
  header: { fontSize: 24, fontWeight: 'bold', color: '#FFF', marginBottom: 20 },
  myStatusCard: { backgroundColor: '#2C2C2E', padding: 20, borderRadius: 15, marginBottom: 30 },
  myStatusTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  statusBtns: { flexDirection: 'row', justifyContent: 'space-between' },
  statusBtn: { flex: 1, padding: 15, borderRadius: 10, alignItems: 'center', marginHorizontal: 5 },
  btnText: { color: '#FFF', fontWeight: 'bold' },
  contactsHeader: { color: '#A1A1A6', fontSize: 16, marginBottom: 10, textTransform: 'uppercase' },
  list: { paddingBottom: 50 },
  contactCard: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#2C2C2E', padding: 15, borderRadius: 10, marginBottom: 10, alignItems: 'center' },
  contactName: { color: '#FFF', fontSize: 18, fontWeight: '600' },
  contactPhone: { color: '#8E8E93', marginTop: 5 },
  statusBox: { alignItems: 'flex-end' },
  statusText: { fontWeight: 'bold', fontSize: 16 },
  locationText: { color: '#636366', fontSize: 12, marginTop: 5 }
});

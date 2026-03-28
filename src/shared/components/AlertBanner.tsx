import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated } from 'react-native';
import { socketService } from '../../services/socketService';

export default function AlertBanner() {
  const [alertMsg, setAlertMsg] = useState<string | null>(null);
  const slideAnim = useState(new Animated.Value(-100))[0];

  useEffect(() => {
    socketService.connect();
    
    socketService.on('emergency_broadcast', (data: any) => {
      setAlertMsg(data.message || 'EMERGENCY ALERT ISSUED FOR YOUR AREA');
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();

      setTimeout(() => {
        Animated.timing(slideAnim, {
          toValue: -100,
          duration: 300,
          useNativeDriver: true,
        }).start(() => setAlertMsg(null));
      }, 5000);
    });

    return () => {
      socketService.off('emergency_broadcast');
    };
  }, []);

  if (!alertMsg) return null;

  return (
    <Animated.View style={[styles.banner, { transform: [{ translateY: slideAnim }] }]}>
      <Text style={styles.text}>⚠️ {alertMsg}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 50,
    width: Dimensions.get('window').width - 40,
    marginHorizontal: 20,
    backgroundColor: '#FF3B30',
    padding: 15,
    borderRadius: 10,
    zIndex: 9999,
    boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.5)',
  },
  text: { color: '#FFF', fontWeight: 'bold', textAlign: 'center' }
});

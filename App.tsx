import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Text } from 'react-native';

import SosScreen from './src/features/sos/SosScreen';
import MapScreen from './src/features/map/MapScreen';
import ReportScreen from './src/features/reporting/ReportScreen';
import FamilyScreen from './src/features/family/FamilyScreen';
import AlertBanner from './src/shared/components/AlertBanner';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <AlertBanner />
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={{
            tabBarStyle: { backgroundColor: '#1C1C1E', borderTopColor: '#333' },
            tabBarActiveTintColor: '#FF3B30',
            tabBarInactiveTintColor: '#A1A1A6',
            headerStyle: { backgroundColor: '#1C1C1E' },
            headerTintColor: '#FFF',
          }}
        >
          <Tab.Screen 
            name="SOS" 
            component={SosScreen} 
            options={{ tabBarIcon: ({ color }) => <Text style={{ fontSize: 22 }}>🆘</Text> }}
          />
          <Tab.Screen 
            name="Map" 
            component={MapScreen} 
            options={{ tabBarIcon: ({ color }) => <Text style={{ fontSize: 22 }}>🗺️</Text> }}
          />
          <Tab.Screen 
            name="Report" 
            component={ReportScreen} 
            options={{ tabBarIcon: ({ color }) => <Text style={{ fontSize: 22 }}>📷</Text> }}
          />
          <Tab.Screen 
            name="Family" 
            component={FamilyScreen} 
            options={{ tabBarIcon: ({ color }) => <Text style={{ fontSize: 22 }}>👨‍👩‍👧</Text> }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

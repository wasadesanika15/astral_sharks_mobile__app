import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import SosScreen from './src/features/sos/SosScreen';
import MapScreen from './src/features/map/MapScreen';
import ReportScreen from './src/features/reporting/ReportScreen';
import FamilyScreen from './src/features/family/FamilyScreen';
import AlertBanner from './src/shared/components/AlertBanner';
import RescueTabBar from './src/navigation/RescueTabBar';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <AlertBanner />
      <NavigationContainer>
        <Tab.Navigator
          id="MainTabs"
          tabBar={(props) => <RescueTabBar {...props} />}
          screenOptions={{
            headerShown: false,
          }}
        >
          <Tab.Screen name="SOS" component={SosScreen} />
          <Tab.Screen name="Map" component={MapScreen} />
          <Tab.Screen name="Report" component={ReportScreen} />
          <Tab.Screen name="Family" component={FamilyScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

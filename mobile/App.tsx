import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet, Platform, TouchableOpacity } from 'react-native';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { LoginScreen } from './src/screens/LoginScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { UploadScreen } from './src/screens/UploadScreen';
import { FDRListScreen } from './src/screens/FDRListScreen';
import { NotificationsScreen } from './src/screens/NotificationsScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { ClearanceScreen } from './src/screens/ClearanceScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const TabNavigator = ({ navigation }: any) => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: {
          backgroundColor: '#070d1b',
        },
        headerTintColor: '#ffffff',
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 16,
        },
        headerRight: () => (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16, gap: 12 }}>
            <TouchableOpacity
              onPress={() => navigation.navigate('Notifications')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="notifications-outline" size={22} color="#ffffff" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate('Profile')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="person-circle-outline" size={24} color="#2dd4bf" />
            </TouchableOpacity>
          </View>
        ),
        tabBarShowLabel: true,
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#e2e8f0',
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 70,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
          paddingTop: 8,
          elevation: 12,
          shadowColor: '#0f172a',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
        },
        tabBarActiveTintColor: '#0d9488',
        tabBarInactiveTintColor: '#64748b',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
        tabBarIcon: ({ focused, color }) => {
          let iconName: any = 'home';

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'FDRs') {
            iconName = focused ? 'file-tray-full' : 'file-tray-full-outline';
          } else if (route.name === 'Upload') {
            return (
              <View style={[styles.uploadTabIcon, focused && styles.uploadTabIconFocused]}>
                <Ionicons name="camera" size={24} color="#ffffff" />
              </View>
            );
          } else if (route.name === 'Clearance') {
            iconName = focused ? 'shield-checkmark' : 'shield-checkmark-outline';
          } else if (route.name === 'ProfileTab') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Niddhi Setu',
          tabBarLabel: 'Home',
        }}
      />
      <Tab.Screen
        name="FDRs"
        component={FDRListScreen}
        options={{
          title: 'Deposit Register',
          tabBarLabel: 'FDRs',
        }}
      />
      <Tab.Screen
        name="Upload"
        component={UploadScreen}
        options={{
          title: 'Deposit Intake',
          tabBarLabel: 'Upload',
        }}
      />
      <Tab.Screen
        name="Clearance"
        component={ClearanceScreen}
        options={{
          title: 'Clearance Dossiers',
          tabBarLabel: 'Clearance',
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          title: 'Institute Profile',
          tabBarLabel: 'Profile',
        }}
      />
    </Tab.Navigator>
  );
};

const MainNavigator = () => {
  const { user } = useAuth();

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={TabNavigator} />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          headerShown: true,
          title: 'Regulatory Alerts',
          headerStyle: { backgroundColor: '#070d1b' },
          headerTintColor: '#ffffff',
          headerTitleStyle: { fontWeight: '700', fontSize: 16 },
        }}
      />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          headerShown: true,
          title: 'Institute Profile',
          headerStyle: { backgroundColor: '#070d1b' },
          headerTintColor: '#ffffff',
          headerTitleStyle: { fontWeight: '700', fontSize: 16 },
        }}
      />
    </Stack.Navigator>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <StatusBar style="light" />
          <MainNavigator />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  uploadTabIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0d9488',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
    borderWidth: 3.5,
    borderColor: '#ffffff',
    shadowColor: '#0d9488',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  uploadTabIconFocused: {
    backgroundColor: '#0f766e',
    transform: [{ scale: 1.05 }],
  },
});

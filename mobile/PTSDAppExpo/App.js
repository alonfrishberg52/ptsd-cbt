import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import WelcomeScreen from './screens/WelcomeScreen';
import PatientListScreen from './screens/PatientListScreen';
import StoryListScreen from './screens/StoryListScreen';
import StoryPlayerScreen from './screens/StoryPlayerScreen';
import FeedbackScreen from './screens/FeedbackScreen';
import DashboardScreen from './screens/DashboardScreen';
import ProfileScreen from './screens/ProfileScreen';
import PreSessionScreen from './screens/PreSessionScreen';
import SessionScreen from './screens/SessionScreen';
import PlanListScreen from './screens/PlanListScreen';
import AuditLogScreen from './screens/AuditLogScreen';
import ResearchScreen from './screens/ResearchScreen';
import { SessionProvider } from './SessionContext';

const Stack = createStackNavigator();

export default function App() {
  return (
    <SessionProvider>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Welcome" screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="PreSession" component={PreSessionScreen} />
          <Stack.Screen name="Session" component={SessionScreen} />
          <Stack.Screen name="Stories" component={StoryListScreen} />
          <Stack.Screen name="Player" component={StoryPlayerScreen} />
          <Stack.Screen name="Feedback" component={FeedbackScreen} />
          <Stack.Screen name="Dashboard" component={DashboardScreen} />
          <Stack.Screen name="Patients" component={PatientListScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="Plans" component={PlanListScreen} />
          <Stack.Screen name="AuditLog" component={AuditLogScreen} />
          <Stack.Screen name="Research" component={ResearchScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SessionProvider>
  );
} 
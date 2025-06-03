import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import WelcomeScreen from './screens/WelcomeScreen';
import SessionScreen from './screens/SessionScreen';
import FeedbackScreen from './screens/FeedbackScreen';
import PreSessionScreen from './screens/PreSessionScreen';
import AvatarCustomizationScreen from './screens/AvatarCustomizationScreen';

const Stack = createStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Welcome" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="Session" component={SessionScreen} />
        <Stack.Screen name="Feedback" component={FeedbackScreen} />
        <Stack.Screen name="PreSession" component={PreSessionScreen} />
        <Stack.Screen name="AvatarCustomization" component={AvatarCustomizationScreen} options={{ title: 'אווטאר אישי' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
} 
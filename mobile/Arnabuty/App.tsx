/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import WelcomeScreen from './WelcomeScreen'; // Assuming App.tsx is renamed/moved to WelcomeScreen.tsx
import TherapyScreen from './TherapyScreen';

export type RootStackParamList = {
  Welcome: undefined;
  Therapy: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const App = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Welcome">
        <Stack.Screen 
          name="Welcome" 
          component={WelcomeScreen} 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="Therapy" 
          component={TherapyScreen} 
          options={({ navigation }) => ({
            title: 'תרגול', // Title for the Therapy screen app bar
            headerBackTitleVisible: false,
            headerStyle: {
              backgroundColor: '#F0EFEB',
            },
            headerTintColor: '#333', // Color for back button and title
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          })}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;

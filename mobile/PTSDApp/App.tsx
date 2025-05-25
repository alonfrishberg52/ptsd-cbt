/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, { useState, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, StatusBar, I18nManager } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Tts from 'react-native-tts';
import WelcomeScreen from './screens/WelcomeScreen';
import StoryScreen from './screens/StoryScreen';

I18nManager.allowRTL(true);

const Stack = createNativeStackNavigator();

const CBT_STORY = `היום נתרגל סיפור שקרה לי ביום הולדת לאיתי. זה היה יום חם, ונסענו יחד לים. בדרך, נתקענו בפקק ארוך, והתחלתי להרגיש לחץ. בסוף הגענו, נשמתי עמוק, והצלחתי להירגע.`;

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Welcome"
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen
          name="Story"
          component={StoryScreen}
          options={{
            headerShown: true,
            headerTitle: 'יום הולדת לאיתי',
            headerStyle: { backgroundColor: '#efefe0' },
            headerTintColor: '#181818',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#efefe0',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 60,
  },
  progress: {
    fontSize: 32,
    fontWeight: '400',
    marginTop: 20,
    marginBottom: 60,
    textAlign: 'center',
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  greeting: {
    fontSize: 28,
    fontWeight: '500',
    marginBottom: 40,
    textAlign: 'center',
    color: '#181818',
    writingDirection: 'rtl',
  },
  button: {
    backgroundColor: '#f8f8ed',
    borderRadius: 40,
    paddingVertical: 18,
    paddingHorizontal: 48,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#181818',
    writingDirection: 'rtl',
  },
  storyTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#181818',
    marginBottom: 8,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  storySubtitle: {
    fontSize: 18,
    fontWeight: '400',
    color: '#181818',
    marginBottom: 24,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  storyBox: {
    backgroundColor: '#f8f8ed',
    borderRadius: 20,
    padding: 24,
    marginBottom: 32,
    width: '90%',
    alignSelf: 'center',
  },
  storyText: {
    fontSize: 20,
    color: '#181818',
    textAlign: 'right',
    writingDirection: 'rtl',
    lineHeight: 32,
  },
  ttsButton: {
    backgroundColor: '#f8f8ed',
    borderRadius: 40,
    paddingVertical: 18,
    paddingHorizontal: 48,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginTop: 16,
  },
});

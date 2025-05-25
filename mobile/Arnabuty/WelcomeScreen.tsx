import React from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from './App'; // Import the RootStackParamList

type WelcomeScreenProps = NativeStackScreenProps<RootStackParamList, 'Welcome'>;

const WelcomeScreen = ({ navigation }: WelcomeScreenProps) => {
  const name = 'דני'; // Replace with dynamic name if needed

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F0EFEB" />
      <View style={styles.header}>
        <Text style={styles.progressText}>3/12</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.greetingText}>{`היי ${name}, צהריים טובים`}</Text>
        <TouchableOpacity 
          style={styles.button} 
          onPress={() => navigation.navigate('Therapy')}
        >
          <Text style={styles.buttonText}>התחל תרגול</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0EFEB', // Light beige background
  },
  header: {
    alignItems: 'center',
    paddingVertical: 15,
  },
  progressText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000', // Black color for progress text
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  greetingText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333', // Darker text color for greeting
    textAlign: 'center',
    marginBottom: 30,
  },
  button: {
    backgroundColor: '#FFFFFF', // White button
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 25, // Rounded corners
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333', // Darker text color for button
  },
});

export default WelcomeScreen; 
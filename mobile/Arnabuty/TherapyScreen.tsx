import React, { useState } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

// Placeholder for text-to-speech functionality
const speak = (text: string) => {
  console.log('Speaking:', text);
};

const stopSpeaking = () => {
  console.log('Stopped speaking');
};

const TherapyScreen = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const therapeuticText = 
    'כאן יהיה טקסט טיפולי מרגיע. ' +
    'התמקדו בנשימה שלכם. ' +
    'הרגישו את האוויר נכנס ויוצא. ' +
    'שחררו כל מתח בגוף.'; // Replace with actual therapeutic text

  const togglePlayPause = () => {
    if (isPlaying) {
      stopSpeaking();
    } else {
      speak(therapeuticText);
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F0EFEB" />
      <View style={styles.content}>
        <Text style={styles.therapeuticText}>{therapeuticText}</Text>
        <TouchableOpacity style={styles.button} onPress={togglePlayPause}>
          <Text style={styles.buttonText}>{isPlaying ? 'השהה' : 'נגן'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0EFEB',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  therapeuticText: {
    fontSize: 20,
    color: '#333',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 30,
  },
  button: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 25,
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
    color: '#333',
  },
});

export default TherapyScreen; 
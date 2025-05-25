import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';
import Tts from 'react-native-tts';

const TherapyScreen = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isTtsInitialized, setIsTtsInitialized] = useState(false);
  const therapeuticText =
    'כאן יהיה טקסט טיפולי מרגיע. ' +
    'התמקדו בנשימה שלכם. ' +
    'הרגישו את האוויר נכנס ויוצא. ' +
    'שחררו כל מתח בגוף.';

  useEffect(() => {
    const initTts = async () => {
      try {
        await Tts.getInitStatus();
        await Tts.setDefaultLanguage('he-IL');
        Tts.setDefaultRate(0.5);
        Tts.setDefaultPitch(1.0);

        setIsTtsInitialized(true);
        console.log('TTS Initialized successfully');
      } catch (err: any) {
        console.error('TTS Initialization failed:', err);
        if (err.code === 'no_engine' && Platform.OS === 'android') {
          console.log('No TTS engine installed on Android.');
        }
      }
    };

    initTts();

    const ttsStartListener = Tts.addEventListener('tts-start', (event) => {
      console.log('TTS Start:', event);
      setIsPlaying(true);
    });
    const ttsFinishListener = Tts.addEventListener('tts-finish', (event) => {
      console.log('TTS Finish:', event);
      setIsPlaying(false);
    });
    const ttsCancelListener = Tts.addEventListener('tts-cancel', (event) => {
      console.log('TTS Cancel:', event);
      setIsPlaying(false);
    });
    const ttsErrorListener = Tts.addEventListener('tts-error', (event) => {
      console.error('TTS Error:', event);
      setIsPlaying(false);
    });

    return () => {
      Tts.stop();
    };
  }, []);

  const togglePlayPause = () => {
    if (!isTtsInitialized) {
      console.log('TTS is not initialized yet.');
      return;
    }

    if (isPlaying) {
      Tts.stop();
    } else {
      Tts.speak(therapeuticText);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F0EFEB" />
      <View style={styles.content}>
        <Text style={styles.therapeuticText}>{therapeuticText}</Text>
        <TouchableOpacity 
          style={styles.button} 
          onPress={togglePlayPause}
          disabled={!isTtsInitialized}
        >
          <Text style={styles.buttonText}>
            {isPlaying ? 'השהה' : (isTtsInitialized ? 'נגן' : 'טוען...')}
          </Text>
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
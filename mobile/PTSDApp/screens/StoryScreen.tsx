import React, { useState, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, StatusBar } from 'react-native';
import Tts from 'react-native-tts';

const CBT_STORY = `היום נתרגל סיפור שקרה לי ביום הולדת לאיתי. זה היה יום חם, ונסענו יחד לים. בדרך, נתקענו בפקק ארוך, והתחלתי להרגיש לחץ. בסוף הגענו, נשמתי עמוק, והצלחתי להירגע.`;

type StoryScreenProps = {
  navigation: any;
};

const StoryScreen: React.FC<StoryScreenProps> = ({ navigation }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [ttsFinished, setTtsFinished] = useState(false);

  React.useEffect(() => {
    Tts.setDefaultLanguage('he-IL');
    Tts.addEventListener('tts-finish', onFinish);
    Tts.addEventListener('tts-cancel', onFinish);
    Tts.addEventListener('tts-progress', (event) => console.log("progress", event));
    return () => {
      Tts.removeAllListeners('tts-finish');
      Tts.removeAllListeners('tts-cancel');
      Tts.stop();
    };
  }, []);

  const onFinish = () => {
    setIsPlaying(false);
    setTtsFinished(true);
  };

  const onPlayPause = () => {
    if (isPlaying) {
      Tts.pause();
      setIsPlaying(false);
    } else {
      if (ttsFinished) {
        Tts.speak(CBT_STORY);
        setTtsFinished(false);
      } else {
        Tts.speak(CBT_STORY);
      }
      setIsPlaying(true);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#efefe0" />
      <View style={styles.centerContent}>
        <View style={styles.storyBox}>
          <Text style={styles.storyText}>{CBT_STORY}</Text>
        </View>

        <TouchableOpacity style={styles.ttsButton} onPress={onPlayPause} activeOpacity={0.8}>
          <Text style={styles.buttonText}>{isPlaying ? 'השהה' : 'הפעל'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#efefe0',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 60,
    paddingBottom: 60,
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
    flex: 1,
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
  buttonText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#181818',
    writingDirection: 'rtl',
  },
});

export default StoryScreen; 
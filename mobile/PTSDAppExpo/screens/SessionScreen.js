import React, { useEffect, useState, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator, 
  TextInput, 
  Alert, 
  ScrollView,
  SafeAreaView,
  Modal,
  FlatList,
  Dimensions,
  TouchableWithoutFeedback,
  Image,
  Platform,
  Linking
} from 'react-native';
import { Audio } from 'expo-av';
import { startScenario, nextScenario, previousScenario, getAudioUrl, exitSession, API_BASE_URL } from '../api';
import LottieView from 'lottie-react-native';
import DynamicBackground from '../components/DynamicBackground';
import { useSession } from '../SessionContext';
import { WebView } from 'react-native-webview';
import omriCh1 from '../stories/omri-ch1';
import omriCh2 from '../stories/omri-ch2';
import omriCh3 from '../stories/omri-ch3';
import Svg, { Path, Text as SvgText } from 'react-native-svg';
import EscapeIcon from '../components/EscapeIcon';

const { width } = Dimensions.get('window');

// Custom audio player icons
const RewindIcon = ({ size = 40, color = "#fff" }) => (
  <Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    {/* Outer circle */}
    <Path 
      d="M20 2C30.4934 2 39 10.5066 39 21C39 31.4934 30.4934 40 20 40C9.50659 40 1 31.4934 1 21C1 10.5066 9.50659 2 20 2" 
      stroke={color} 
      strokeWidth="2" 
      fill="none"
      strokeLinecap="round"
    />
    {/* Arrow pointing left */}
    <Path 
      d="M5 21L10 16L10 19L14 19L14 23L10 23L10 26L5 21Z" 
      fill={color}
    />
    {/* 15 text in center */}
    <SvgText 
      x="20" 
      y="25" 
      fontSize="12" 
      fill={color} 
      textAnchor="middle" 
      fontWeight="bold"
    >
      15
    </SvgText>
  </Svg>
);

const PlayIcon = ({ size = 24, color = "#787878" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M8 5V19L19 12L8 5Z" fill={color}/>
  </Svg>
);

const VolumeIcon = ({ size = 32, color = "#fff" }) => (
  <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    {/* Speaker */}
    <Path d="M6 10V22H10L16 26V6L10 10H6Z" fill={color}/>
    {/* Sound waves */}
    <Path d="M20 8C22.21 10.21 22.21 13.79 20 16" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    <Path d="M23 5C26.31 8.31 26.31 15.69 23 19" stroke={color} strokeWidth="2" strokeLinecap="round"/>
  </Svg>
);

export default function SessionScreen({ route, navigation }) {
  // Debug: log route params to help catch missing or malformed data
  console.log('SessionScreen route.params:', route.params);

  // Safely destructure with fallback
  const { patient, initialStory, initialStage, initialScenarioState, storyType, storyId, feeling } = route.params || {};
  const [sessionState, setSessionState] = useState('initial');
  const [currentStage, setCurrentStage] = useState(initialStage || 1);
  const [story, setStory] = useState(initialStory || null);
  const [sudValue, setSudValue] = useState(50);
  const [loading, setLoading] = useState(false);
  const [scenarioState, setScenarioState] = useState(initialScenarioState || {});
  const [audioLoading, setAudioLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [audioStatus, setAudioStatus] = useState('מוכן להשמעה');
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const soundRef = useRef(null);
  const [showSudDropdown, setShowSudDropdown] = useState(false);
  const [showTextSizeMenu, setShowTextSizeMenu] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showChapterNavigation, setShowChapterNavigation] = useState(false);
  const [textSize, setTextSize] = useState('medium');
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [sessionEndTime, setSessionEndTime] = useState(null);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [completedChapters, setCompletedChapters] = useState([]);
  const [chaptersCompleted, setChaptersCompleted] = useState(0);
  const [hasSelectedSudForCurrentChapter, setHasSelectedSudForCurrentChapter] = useState(true);
  const [sudRequiredModalVisible, setSudRequiredModalVisible] = useState(false);
  const { addCoins, unlockTrophy, trophies, TROPHY_DEFS, coins, BADGE_DEFS, badges, unlockBadge, avatar, addSessionDate, getSessionStreak } = useSession();
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [newTrophy, setNewTrophy] = useState(null);
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [unlockedBadge, setUnlockedBadge] = useState(null);
  const [chapterStories, setChapterStories] = useState({});
  // Media state
  const [media, setMedia] = useState(null);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaError, setMediaError] = useState(null);
  // Add a ref to track if audio should auto-play
  const autoPlayAudioRef = useRef(false);
  // Add state for selectedChoice
  const [selectedChoice, setSelectedChoice] = useState(null);
  const [choiceError, setChoiceError] = useState(null);

  // Static story state
  const [currentChapter, setCurrentChapter] = useState(1);
  const [chapterText, setChapterText] = useState('');
  const [chapterLoading, setChapterLoading] = useState(false);
  const [chapterError, setChapterError] = useState(null);
  const totalChapters = 3; // For omri static story, adjust if needed

  // Use bundled chapters if storyType is 'static'
  useEffect(() => {
    if (storyType === 'static' && storyId === 'omri') {
      setChapterLoading(false);
      setChapterError(null);
      const chapters = [omriCh1, omriCh2, omriCh3];
      if (currentChapter >= 1 && currentChapter <= chapters.length) {
        setChapterText(chapters[currentChapter - 1]);
      } else {
        setChapterError('פרק לא קיים');
        setChapterText('');
      }
    }
  }, [storyType, storyId, currentChapter]);

  // All useEffect hooks here
  useEffect(() => {
    if (sessionState === 'started') {
      const startTimeMs = new Date(sessionStartTime).getTime();
      const interval = setInterval(() => {
        setSessionDuration(Date.now() - startTimeMs);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [sessionState, sessionStartTime]);

  useEffect(() => {
    setHasSelectedSudForCurrentChapter(false);
  }, [currentStage]);

  useEffect(() => {
    if (!story && patient) {
      handleStartSession();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (story && story.story) {
      setMediaLoading(true);
      setMediaError(null);
      const apiUrl = 'http://10.100.102.10:5000/api/media_suggestions';
      const reqBody = { story: story.story };
      console.log('Calling media suggestions API:', apiUrl, reqBody);
      fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reqBody),
      })
        .then(res => res.json())
        .then(data => {
          if (data.status === 'success') {
            setMedia(data.suggestions);
            console.log('Media suggestions:', data.suggestions);
            // If sound is a direct mp3, set flag to auto-play
            if (data.suggestions?.sound && data.suggestions.sound.endsWith('.mp3')) {
              autoPlayAudioRef.current = true;
            } else {
              autoPlayAudioRef.current = false;
            }
          } else {
            setMediaError(data.message || 'שגיאה בקבלת מדיה');
            setMedia(null);
            console.log('Media error:', data.message);
          }
        })
        .catch((err) => {
          setMediaError('שגיאה בתקשורת עם שרת המדיה');
          setMedia(null);
          console.log('Media fetch error:', err);
        })
        .finally(() => setMediaLoading(false));
    }
  }, [story]);

  // Auto-play audio if direct mp3 when media changes
  useEffect(() => {
    if (media?.sound && media.sound.endsWith('.mp3') && autoPlayAudioRef.current) {
      handlePlayPause();
      autoPlayAudioRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [media]);

  useEffect(() => {
    if (currentStage > chaptersCompleted) {
      setChaptersCompleted(currentStage);
    }
  }, [currentStage]);

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  useEffect(() => {
    if (sessionState === 'completed') {
      addCoins(10);
      if (!trophies.includes('first_session')) {
        unlockTrophy('first_session');
        setNewTrophy(TROPHY_DEFS.find(t => t.key === 'first_session'));
      } else if (!trophies.includes('five_sessions') && coins + 10 >= 50) {
        unlockTrophy('five_sessions');
        setNewTrophy(TROPHY_DEFS.find(t => t.key === 'five_sessions'));
      } else if (!trophies.includes('ten_sessions') && coins + 10 >= 100) {
        unlockTrophy('ten_sessions');
        setNewTrophy(TROPHY_DEFS.find(t => t.key === 'ten_sessions'));
      } else {
        setNewTrophy(null);
      }
      setShowRewardModal(true);
      if (!badges.includes('ten_sessions') && coins + 10 >= 100) {
        unlockBadge('ten_sessions');
        setUnlockedBadge(BADGE_DEFS.find(b => b.key === 'ten_sessions'));
        setShowBadgeModal(true);
      }
      // Add today's date to sessionDates for streak calculation
      const todayStr = new Date().toISOString().slice(0, 10);
      addSessionDate(todayStr);
      const streak = getSessionStreak();
      if (!badges.includes('streak_3') && streak >= 3) {
        unlockBadge('streak_3');
        setUnlockedBadge(BADGE_DEFS.find(b => b.key === 'streak_3'));
        setShowBadgeModal(true);
      }
      if (!badges.includes('streak_7') && streak >= 7) {
        unlockBadge('streak_7');
        setUnlockedBadge(BADGE_DEFS.find(b => b.key === 'streak_7'));
        setShowBadgeModal(true);
      }
    }
  }, [sessionState]);

  // Handle continue to SUD screen
  const handleContinueToSUD = () => {
    console.log('Continue button clicked, currentChapter:', currentChapter, 'totalChapters:', totalChapters);
    if (currentChapter < totalChapters) {
      console.log('Navigating to SUDScreen');
      navigation.navigate('SUDScreen', {
        initialSUD: sudValue,
        onComplete: (newSUD) => {
          console.log('SUD completed with value:', newSUD);
          setSudValue(newSUD);
          setCurrentChapter(prev => prev + 1);
          navigation.goBack();
        },
        chapter: currentChapter,
      });
    } else {
      console.log('Last chapter, navigating to SessionCompletion');
      // Last chapter, go to completion screen
      navigation.navigate('SessionCompletion');
    }
  };

  // Now, after all hooks, do conditional returns
  if (storyType === 'static' && storyId === 'omri') {
    // All text unbolded and scrollable, native gesture only
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F5F5EA' }}>
        {/* Top bar */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 24, marginBottom: 12 }}>
          {/* Progress bar */}
          <View style={{ flex: 1, alignItems: 'center' }}>
            <View style={{ width: 80, height: 6, borderRadius: 3, backgroundColor: '#E5E7EB', overflow: 'hidden' }}>
              <View style={{ width: (currentChapter / totalChapters) * 80, height: 6, borderRadius: 3, backgroundColor: '#222' }} />
            </View>
          </View>
          {/* Escape button */}
          <TouchableOpacity style={{ marginLeft: 16 }} onPress={() => navigation.goBack()}>
            <EscapeIcon />
          </TouchableOpacity>
        </View>
        {/* Story text (scrollable, all unbolded) */}
        <ScrollView
          style={{ width: '100%' }}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 120 }}
          showsVerticalScrollIndicator={true}
        >
          <Text style={{ fontSize: 24, color: '#C7C7C7', fontWeight: '600', textAlign: 'center', lineHeight: 36 }}>
            {chapterText}
          </Text>
          
          {/* Continue button at the end of each chapter */}
          <TouchableOpacity 
            style={{ 
              backgroundColor: '#fff', 
              borderRadius: 20, 
              padding: 16, 
              marginTop: 40, 
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.07,
              shadowRadius: 8,
              elevation: 3,
            }}
            onPress={handleContinueToSUD}
          >
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#111' }}>
              {currentChapter === totalChapters ? 'סיים מפגש' : 'המשך'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
        {/* Audio player */}
        <View style={{
          position: 'absolute',
          width: 201.02,
          height: 80.9,
          left: '50%',
          marginLeft: -100.51, // Half of width to center
          bottom: 40,
          backgroundColor: 'rgba(37, 37, 37, 0.6)',
          borderRadius: 15.9557,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: 24,
          paddingVertical: 12,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
          elevation: 8,
        }}>
          {/* 15s Rewind */}
          <TouchableOpacity>
            <RewindIcon size={40} color="#fff" />
          </TouchableOpacity>
          
          {/* Play Button */}
          <TouchableOpacity>
            <View style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: '#fff',
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 3,
            }}>
              <PlayIcon size={24} color="#787878" />
            </View>
          </TouchableOpacity>
          
          {/* Volume/Speaker */}
          <TouchableOpacity>
            <VolumeIcon size={32} color="#fff" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  if (!patient) {
    return (
      <SafeAreaView style={styles.container}>
        <DynamicBackground />
        <View style={styles.errorContainer}>
          <Text style={styles.header}>שגיאה</Text>
          <Text style={styles.errorText}>לא נמצאו נתוני מטופל</Text>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>חזור למסך הקודם</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  if (loading || !story) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#E0F2FE', justifyContent: 'center', alignItems: 'center' }}>
        <DynamicBackground />
        <LottieView
          source={require('../assets/loader.json')}
          autoPlay
          loop
          style={{ width: 200, height: 200 }}
        />
        <Text style={{ fontSize: 20, color: '#2563EB', fontWeight: '700', marginTop: 32, textAlign: 'center' }}>
          יוצרים עבורך סיפור טיפולי אישי...
        </Text>
        <Text style={{ fontSize: 16, color: '#64748B', marginTop: 12, textAlign: 'center' }}>
          נשום עמוק, זה עשוי לקחת מספר שניות
        </Text>
      </SafeAreaView>
    );
  }

  // SUD options (10-100 with 10-point jumps)
  const sudOptions = [
    { value: 10, label: '10 - רגוע מאוד' },
    { value: 20, label: '20 - רגוע' },
    { value: 30, label: '30 - רגוע קלות' },
    { value: 40, label: '40 - קצת מתוח' },
    { value: 50, label: '50 - מתוח בינוני' },
    { value: 60, label: '60 - מתוח' },
    { value: 70, label: '70 - מתוח מאוד' },
    { value: 80, label: '80 - חרד' },
    { value: 90, label: '90 - חרד מאוד' },
    { value: 100, label: '100 - פאניקה' }
  ];

  // Text size options
  const textSizeOptions = [
    { value: 'small', label: 'קטן', size: 14 },
    { value: 'medium', label: 'בינוני', size: 16 },
    { value: 'large', label: 'גדול', size: 18 },
    { value: 'xlarge', label: 'גדול מאוד', size: 20 }
  ];

  const getCurrentTextSize = () => {
    const option = textSizeOptions.find(opt => opt.value === textSize);
    return option ? option.size : 16;
  };

  // Start the therapy session
  const handleStartSession = async () => {
    setLoading(true);
    try {
      const response = await startScenario(patient.patient_id, sudValue);
      if (response.status === 'success') {
        setStory(response.result);
        setCurrentStage(response.stage);
        setScenarioState(response.scenario_state);
        setChapterStories({ [response.stage]: response.result }); // cache first chapter
        setSessionState('started');
      } else {
        Alert.alert('שגיאה', response.message || 'שגיאה בהתחלת המפגש');
      }
    } catch (error) {
      console.log('Start session error:', error);
      Alert.alert('שגיאה', 'שגיאה בתקשורת עם השרת');
    }
      setLoading(false);
  };

  // Continue to next chapter
  const handleNextChapter = async () => {
    if (story && story.choices && story.choices.length > 0 && !selectedChoice) {
      setChoiceError('יש לבחור אפשרות לפני המשך לפרק הבא.');
      return;
    }
    setChoiceError(null);
    setLoading(true);
    try {
      const response = await nextScenario(patient.patient_id, sudValue, scenarioState, selectedChoice);
      setSelectedChoice(null); // Reset for next chapter
      if (response.status === 'success') {
        setStory(response.result);
        const newStage = response.stage;
        setCurrentStage(newStage);
        setScenarioState(response.scenario_state);
        setChapterStories(prev => ({ ...prev, [newStage]: response.result }));
        // Track completed chapters
        const newCompletedChapters = [...completedChapters];
        if (!newCompletedChapters.includes(currentStage)) {
          newCompletedChapters.push(currentStage);
          setCompletedChapters(newCompletedChapters);
        }
      } else if (response.status === 'done') {
        setSessionState('completed');
        const finalCompletedChapters = [...completedChapters, currentStage];
        setCompletedChapters(finalCompletedChapters);
        navigateToCompletion();
      } else {
        Alert.alert('שגיאה', response.message || 'שגיאה במעבר לפרק הבא');
      }
    } catch (error) {
      console.log('Next chapter error:', error);
      Alert.alert('שגיאה', 'שגיאה בתקשורת עם השרת');
    }
    setLoading(false);
  };

  // Go back to previous chapter
  const handlePreviousChapter = async (targetStage) => {
    if (targetStage >= currentStage) {
      Alert.alert('שגיאה', 'לא ניתן לעבור לפרק עתידי');
      return;
    }

    // If we have the story cached, just display it
    if (chapterStories[targetStage]) {
      setStory(chapterStories[targetStage]);
      setCurrentStage(targetStage);
      setScenarioState(scenarioState); // keep scenario state as is
      setShowChapterNavigation(false);
      // Remove chapters after the target stage from completed list
      const updatedCompleted = completedChapters.filter(chapter => chapter < targetStage);
      setCompletedChapters(updatedCompleted);
      return;
    }

    setLoading(true);
    try {
      const response = await previousScenario(patient.patient_id, scenarioState, targetStage);
      if (response.status === 'success') {
        setStory(response.result);
        setCurrentStage(response.stage);
        setScenarioState(response.scenario_state);
        setChapterStories(prev => ({ ...prev, [response.stage]: response.result }));
        setShowChapterNavigation(false);
        // Remove chapters after the target stage from completed list
        const updatedCompleted = completedChapters.filter(chapter => chapter < targetStage);
        setCompletedChapters(updatedCompleted);
      } else {
        Alert.alert('שגיאה', response.message || 'שגיאה בחזרה לפרק קודם');
      }
    } catch (error) {
      console.log('Previous chapter error:', error);
      Alert.alert('שגיאה', 'שגיאה בתקשורת עם השרת');
    }
      setLoading(false);
  };

  // Handle session exit
  const handleExitSession = () => {
    Alert.alert(
      'יציאה מהמפגש',
      'האם אתה בטוח שברצונך לצאת ממפגש הטיפול? התקדמותך תישמר.',
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'צא מהמפגש',
          style: 'destructive',
          onPress: async () => {
            const endTime = new Date().toISOString();
            setSessionEndTime(endTime);
            
            try {
              await exitSession({
                patient_id: patient.patient_id,
                exit_time: endTime,
                chapters_completed: chaptersCompleted,
                current_stage: currentStage,
                final_sud: sudValue
              });
            } catch (error) {
              console.log('Exit session error:', error);
            }
            
            // Navigate to feedback with session data
            navigation.navigate('Feedback', {
              sessionData: {
                patient,
                sessionType: 'יצאת',
                startTime: sessionStartTime,
                endTime: endTime,
                chaptersCompleted,
                currentStage,
                finalSUD: sudValue
              }
            });
          }
        }
      ]
    );
  };

  // Handle completion navigation (for completed sessions)
  const navigateToCompletion = () => {
    const endTime = new Date().toISOString();
    setSessionEndTime(endTime);
    
    navigation.navigate('SessionCompletion', {
      sessionData: {
        patient,
        sessionType: 'מושלם',
        startTime: sessionStartTime,
        endTime: endTime,
        chaptersCompleted: 3, // All chapters completed
        currentStage,
        finalSUD: sudValue
      }
    });
  };

  // Handle audio playback with real TTS
  const handlePlayPause = async () => {
    if (!story?.story) return;
    try {
    if (!soundRef.current) {
        setAudioLoading(true);
        if (story.audio_file) {
          const audioUrl = getAudioUrl(story.audio_file);
          console.log('Audio URL:', audioUrl);
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
            { shouldPlay: true, rate: playbackSpeed },
        onPlaybackStatusUpdate
      );
      soundRef.current = sound;
      setPlaying(true);
          setAudioStatus('מנגן...');
        } else {
          Alert.alert('שגיאה', 'קובץ השמע אינו זמין');
          console.log('No audio_file in story:', story);
        }
        setAudioLoading(false);
    } else {
      const status = await soundRef.current.getStatusAsync();
      if (status.isPlaying) {
        await soundRef.current.pauseAsync();
        setPlaying(false);
          setAudioStatus('מושהה');
      } else {
        await soundRef.current.playAsync();
        setPlaying(true);
          setAudioStatus('מנגן...');
      }
    }
    } catch (error) {
      console.log('Audio error:', error);
      setAudioLoading(false);
      Alert.alert('שגיאה', 'שגיאה בהשמעת השמע');
  }
  };

  // Audio playback status callback
  const onPlaybackStatusUpdate = (playbackStatus) => {
    if (playbackStatus.didJustFinish) {
      setPlaying(false);
      setAudioStatus('הסתיים');
      if (soundRef.current) {
        soundRef.current.setPositionAsync(0);
      }
    } else if (playbackStatus.isPlaying) {
      setAudioStatus('מנגן...');
    } else if (playbackStatus.isLoaded) {
      setAudioStatus('מוכן להשמעה');
    }
  };

  // Speed control
  const handleSpeedChange = async (delta) => {
    const newSpeed = Math.max(0.5, Math.min(2.0, playbackSpeed + delta));
    setPlaybackSpeed(newSpeed);
    if (soundRef.current) {
      try {
      await soundRef.current.setRateAsync(newSpeed, true);
      } catch (error) {
        console.log('Speed change error:', error);
      }
    }
  };

  const SudDropdown = ({ visible, onClose, onSelect, currentValue }) => (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <View style={styles.dropdownContainer}>
            <Text style={styles.dropdownTitle}>מה רמת החרדה שלך כרגע?</Text>
            <FlatList
              data={sudOptions}
              keyExtractor={(item) => item.value.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.dropdownItem,
                    currentValue === item.value && styles.dropdownItemSelected
                  ]}
                  onPress={() => {
                    onSelect(item.value);
                    setHasSelectedSudForCurrentChapter(true); // Mark as selected
                    onClose();
                  }}
                >
                  <Text style={[
                    styles.dropdownItemText,
                    currentValue === item.value && styles.dropdownItemTextSelected
                  ]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              )}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );

  const TextSizeMenu = ({ visible, onClose, onSelect, currentValue }) => (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableOpacity style={styles.modalOverlay} onPress={onClose}>
        <View style={styles.textSizeContainer}>
          <Text style={styles.dropdownTitle}>בחר גודל טקסט</Text>
          {textSizeOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.textSizeOption,
                currentValue === option.value && styles.textSizeOptionSelected
              ]}
              onPress={() => {
                onSelect(option.value);
                onClose();
              }}
            >
              <Text style={[
                styles.textSizeOptionText,
                { fontSize: option.size },
                currentValue === option.value && styles.textSizeOptionTextSelected
              ]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const ExitModal = ({ visible, onClose, onConfirm }) => (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.exitModalContainer}>
          <Text style={styles.exitModalIcon}>⚠️</Text>
          <Text style={styles.exitModalTitle}>יציאה מהמפגש</Text>
          <Text style={styles.exitModalMessage}>
            האם אתה בטוח שברצונך לצאת מהמפגש?{'\n'}
            תוכל לתת משוב על המפגש בעמוד הבא.
          </Text>
          <View style={styles.exitModalButtons}>
            <TouchableOpacity style={styles.exitModalCancelButton} onPress={onClose}>
              <Text style={styles.exitModalCancelButtonText}>המשך במפגש</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.exitModalConfirmButton} onPress={onConfirm}>
              <Text style={styles.exitModalConfirmButtonText}>צא מהמפגש</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const ChapterNavigationModal = ({ visible, onClose, currentStage, onNavigate }) => {
    const availableChapters = [1, 2, 3].filter(chapter => chapter < currentStage);

  return (
      <Modal visible={visible} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} onPress={onClose}>
          <View style={styles.chapterNavContainer}>
            <Text style={styles.chapterNavTitle}>חזור לפרק קודם</Text>
            <Text style={styles.chapterNavSubtitle}>
              אתה נמצא כעת בפרק {currentStage}
            </Text>
            {availableChapters.length > 0 ? (
              <View style={styles.chapterNavOptions}>
                {availableChapters.map((chapter) => (
                  <TouchableOpacity
                    key={chapter}
                    style={styles.chapterNavOption}
                    onPress={() => onNavigate(chapter)}
                  >
                    <Text style={styles.chapterNavOptionText}>פרק {chapter}</Text>
                    <Text style={styles.chapterNavOptionArrow}>←</Text>
                  </TouchableOpacity>
                ))}
      </View>
            ) : (
              <Text style={styles.chapterNavEmpty}>
                אין פרקים קודמים זמינים
              </Text>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  // Add SUD required modal
  const SudRequiredModal = ({ visible, onClose }) => (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.sudRequiredContainer}>
          <Text style={styles.sudRequiredIcon}>⚠️</Text>
          <Text style={styles.sudRequiredTitle}>בחירת רמת חרדה נדרשת</Text>
          <Text style={styles.sudRequiredMessage}>
            עליך לבחור את רמת החרדה שלך לפני המעבר לפרק הבא.{'\n'}
            זה עוזר לנו להתאים את הטיפול בצורה אישית.
          </Text>
          <TouchableOpacity style={styles.sudRequiredButton} onPress={onClose}>
            <Text style={styles.sudRequiredButtonText}>הבנתי</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // Update formatSessionDuration to always show mm:ss with leading zeros
  const formatSessionDuration = (durationMs) => {
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Main session screen
  return (
    <SafeAreaView style={styles.container}>
      <DynamicBackground />
      {/* Avatar Preview */}
      <View style={{ alignItems: 'center', marginTop: 18, marginBottom: 2 }}>
        <View style={{ alignItems: 'center' }}>
          {/* Face (skin) */}
          <View style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', position: 'relative', marginBottom: 2, backgroundColor: '#fff', borderWidth: 2, borderColor: '#3B82F6' }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: getSkinColor(avatar?.skin), alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              {/* Eyes */}
              <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 14 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, marginHorizontal: 2, backgroundColor: getEyeColor(avatar?.eyes), borderWidth: 1, borderColor: '#222' }} />
                <View style={{ width: 6, height: 6, borderRadius: 3, marginHorizontal: 2, backgroundColor: getEyeColor(avatar?.eyes), borderWidth: 1, borderColor: '#222' }} />
              </View>
              {/* Hair */}
              <View style={{ position: 'absolute', top: 0, left: 6, right: 6, height: 12, borderTopLeftRadius: 8, borderTopRightRadius: 8, borderBottomLeftRadius: 6, borderBottomRightRadius: 6, backgroundColor: getHairColor(avatar?.hair), zIndex: 2 }} />
            </View>
          </View>
          {/* Shirt */}
          <View style={{ width: 26, height: 12, borderRadius: 6, backgroundColor: getShirtColor(avatar?.shirt), marginTop: -4 }} />
        </View>
      </View>
      <ScrollView showsVerticalScrollIndicator={true}>
        {/* Header with controls */}
        <View style={styles.sessionHeader}>
          <View style={styles.headerTop}>
            <TouchableOpacity
              style={styles.textSizeButton}
              onPress={() => setShowTextSizeMenu(true)}
            >
              <Text style={styles.textSizeButtonText}>Aa</Text>
            </TouchableOpacity>
            
            <View style={styles.headerCenter}>
              <Text style={styles.chapterTitle}>פרק {currentStage} מתוך 3</Text>
              <Text style={styles.patientName}>{patient.name}</Text>
            </View>

            <TouchableOpacity
              style={styles.exitSessionButton}
              onPress={handleExitSession}
            >
              <EscapeIcon />
            </TouchableOpacity>
          </View>

          {/* Session progress */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${(currentStage / 3) * 100}%` }
                ]} 
              />
            </View>
            <Text style={styles.progressText}>
              {formatSessionDuration(sessionDuration)}
            </Text>
          </View>
        </View>

        {/* Story content */}
        {story && story.story && (
          <View style={styles.storyContainer}>
            <Text style={[
              styles.storyText,
              { fontSize: getCurrentTextSize(), lineHeight: getCurrentTextSize() * 1.6 }
            ]}>
              {story.story}
            </Text>
            {/* --- Contextual Media Section --- */}
            <View style={styles.mediaSection}>
              {mediaLoading ? (
                <ActivityIndicator size="small" color="#3B82F6" style={{ marginVertical: 12 }} />
              ) : mediaError ? (
                <Text style={{ color: 'red', marginVertical: 8 }}>{mediaError}</Text>
              ) : (
                <>
                  {/* Image */}
                  {media?.image ? (
                    media.image.startsWith('http') || media.image.length > 3 ? (
                      <Image source={{ uri: getImageUrl(media.image) }} style={styles.mediaImagePlaceholder} resizeMode="cover" />
                    ) : (
                      <Text style={{ color: 'orange', marginVertical: 8 }}>[תמונת מדיה לא תקינה: {String(media.image)}]</Text>
                    )
                  ) : (
                    <View style={styles.mediaImagePlaceholder}>
                      <Text style={styles.mediaLabel}>[אין תמונה רלוונטית לסיפור]</Text>
                    </View>
                  )}
                  {/* Video */}
                  {media?.video ? (
                    media.video.length > 3 ? (
                      <WebView
                        source={{ uri: getYoutubeEmbedUrl(media.video) }}
                        style={styles.mediaVideoPlaceholder}
                        javaScriptEnabled
                        domStorageEnabled
                      />
                    ) : (
                      <Text style={{ color: 'orange', marginVertical: 8 }}>[וידאו מדיה לא תקין: {String(media.video)}]</Text>
                    )
                  ) : (
                    <View style={styles.mediaVideoPlaceholder}>
                      <Text style={styles.mediaLabel}>[אין וידאו לסיפור]</Text>
                    </View>
                  )}
                  {/* Audio */}
                  {media?.sound ? (
                    media.sound.length > 3 ? (
                      <AudioPlayer url={getFreesoundUrl(media.sound)} />
                    ) : (
                      <Text style={{ color: 'orange', marginVertical: 8 }}>[צליל מדיה לא תקין: {String(media.sound)}]</Text>
                    )
                  ) : (
                    <View style={styles.mediaAudioPlaceholder}>
                      <Text style={styles.mediaLabel}>[אין צליל רקע/הרפיה]</Text>
                    </View>
                  )}
                </>
              )}
            </View>
            {/* --- End Media Section --- */}
          </View>
        )}

        {/* Audio controls */}
        <View style={styles.audioControls}>
          <View style={styles.audioInfo}>
            <Text style={styles.audioStatus}>{audioStatus}</Text>
            <Text style={styles.playbackSpeed}>מהירות: {playbackSpeed}x</Text>
      </View>
          
          <View style={styles.audioButtons}>
            <TouchableOpacity 
              style={styles.speedButton}
              onPress={() => handleSpeedChange(-0.25)}
            >
              <Text style={styles.speedButtonText}>-</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.playButton}
              onPress={handlePlayPause}
              disabled={audioLoading}
            >
              {audioLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.playButtonText}>
                  {playing ? '⏸️' : '▶️'}
                </Text>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.speedButton}
              onPress={() => handleSpeedChange(0.25)}
            >
              <Text style={styles.speedButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Navigation controls */}
        <View style={styles.navigationControls}>
          {currentStage > 1 && (
            <TouchableOpacity
              style={styles.prevButton}
              onPress={() => setShowChapterNavigation(true)}
            >
              <Text style={styles.prevButtonText}>← פרק קודם</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.sudButton,
              !hasSelectedSudForCurrentChapter && styles.sudButtonRequired
            ]}
            onPress={() => setShowSudDropdown(true)}
          >
            <Text style={[
              styles.sudButtonText,
              !hasSelectedSudForCurrentChapter && styles.sudButtonTextRequired
            ]}>
              {hasSelectedSudForCurrentChapter 
                ? `SUD: ${sudValue}` 
                : 'בחר רמת חרדה *'
              }
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.nextButton,
              !hasSelectedSudForCurrentChapter && styles.nextButtonDisabled
            ]}
            onPress={handleNextChapter}
            disabled={!hasSelectedSudForCurrentChapter || loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.nextButtonText}>
                {currentStage >= 3 ? 'סיים מפגש' : 'פרק הבא →'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Loader overlay for next chapter/session finish */}
      {loading && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(30,64,175,0.12)',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 100,
        }}>
          <LottieView
            source={require('../assets/loader.json')}
            autoPlay
            loop
            style={{ width: 180, height: 180 }}
          />
          <Text style={{ fontSize: 20, color: '#2563EB', fontWeight: '700', marginTop: 32, textAlign: 'center' }}>
            טוען את הפרק הבא...
          </Text>
          <Text style={{ fontSize: 16, color: '#64748B', marginTop: 12, textAlign: 'center' }}>
            אנא המתן בסבלנות
          </Text>
    </View>
      )}

      {/* Modals */}
      <SudDropdown
        visible={showSudDropdown}
        onClose={() => setShowSudDropdown(false)}
        onSelect={setSudValue}
        currentValue={sudValue}
      />

      <TextSizeMenu
        visible={showTextSizeMenu}
        onClose={() => setShowTextSizeMenu(false)}
        onSelect={setTextSize}
        currentValue={textSize}
      />

      <ExitModal
        visible={showExitModal}
        onClose={() => setShowExitModal(false)}
        onConfirm={handleExitSession}
      />

      <ChapterNavigationModal
        visible={showChapterNavigation}
        onClose={() => setShowChapterNavigation(false)}
        currentStage={currentStage}
        onNavigate={handlePreviousChapter}
      />

      <SudRequiredModal
        visible={sudRequiredModalVisible}
        onClose={() => setSudRequiredModalVisible(false)}
      />

      {/* Badge Unlock Modal */}
      <Modal visible={showBadgeModal} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 24, alignItems: 'center', width: 320 }}>
            <LottieView source={require('../assets/badge.json')} autoPlay loop={false} style={{ width: 100, height: 100 }} />
            <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#1E40AF', marginTop: 12 }}>הרווחת תג חדש!</Text>
            {unlockedBadge && (
              <>
                <Text style={{ fontWeight: 'bold', color: '#1E40AF', fontSize: 18, marginTop: 8 }}>{unlockedBadge.label}</Text>
                <Text style={{ color: '#64748B', fontSize: 15, marginTop: 4 }}>{unlockedBadge.desc}</Text>
              </>
            )}
            <TouchableOpacity onPress={() => setShowBadgeModal(false)} style={{ marginTop: 24, backgroundColor: '#1E40AF', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 24 }}>
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>סגור</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Story choices */}
      {story && story.choices && story.choices.length > 0 && (
        <View style={{ marginTop: 24, marginBottom: 12 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1E40AF', marginBottom: 8, textAlign: 'center' }}>
            מה תרצה לעשות הלאה?
          </Text>
          {story.choices.map((choice, idx) => (
            <TouchableOpacity
              key={idx}
              style={{
                backgroundColor: selectedChoice === choice ? '#2563EB' : '#E0E7EF',
                borderRadius: 10,
                paddingVertical: 12,
                paddingHorizontal: 16,
                marginVertical: 6,
                borderWidth: selectedChoice === choice ? 2 : 1,
                borderColor: selectedChoice === choice ? '#1E40AF' : '#CBD5E1',
              }}
              onPress={() => {
                setSelectedChoice(choice);
                setChoiceError(null);
              }}
            >
              <Text style={{ color: selectedChoice === choice ? '#fff' : '#1E293B', fontSize: 16, textAlign: 'center' }}>{choice}</Text>
            </TouchableOpacity>
          ))}
          {choiceError && <Text style={{ color: 'red', marginTop: 8, textAlign: 'center' }}>{choiceError}</Text>}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Welcome screen styles
  welcomeContainer: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 16,
  },
  welcomePatientName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#3B82F6',
    textAlign: 'center',
    marginBottom: 32,
  },
  welcomeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  welcomeCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 20,
    textAlign: 'center',
  },
  welcomeFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  welcomeFeatureIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  welcomeFeatureText: {
    fontSize: 16,
    color: '#64748B',
    flex: 1,
  },
  beginButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 16,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  beginButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  exitButton: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingVertical: 16,
  },
  exitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
  },

  // Session screen styles
  sessionHeader: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 1,
    elevation: 1,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  exitSessionButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  exitSessionButtonText: {
    fontSize: 14,
    color: '#DC2626',
    fontWeight: 'bold',
  },
  headerCenter: {
    alignItems: 'center',
  },
  chapterTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  patientName: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  textSizeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EBF4FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  textSizeButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#3B82F6',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 3,
  },
  progressBar: {
    flex: 1,
    height: 3,
    backgroundColor: '#E2E8F0',
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 1.5,
  },
  progressText: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: '500',
  },

  // Story styles
  storyContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    marginTop: 12,
    marginBottom: 12,
    borderRadius: 10,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  storyText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#1E293B',
    textAlign: 'right',
    writingDirection: 'rtl',
  },

  // Audio controls
  audioControls: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 10,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  audioInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  audioStatus: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  playbackSpeed: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  audioButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  speedButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  speedButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#64748B',
  },
  playButton: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  playButtonText: {
    fontSize: 18,
  },

  // Navigation controls
  navigationControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 20,
    gap: 8,
  },
  prevButton: {
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  prevButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  sudButton: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  sudButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#3B82F6',
  },
  sudButtonRequired: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
    borderWidth: 2,
  },
  sudButtonTextRequired: {
    color: '#F59E0B',
    fontWeight: '700',
  },
  nextButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    minWidth: 90,
    alignItems: 'center',
  },
  nextButtonDisabled: {
    backgroundColor: '#94A3B8',
    opacity: 0.6,
  },
  nextButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    width: width * 0.75,
    maxHeight: '55%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
  dropdownTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 14,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  dropdownItemSelected: {
    backgroundColor: '#EBF4FF',
    borderRadius: 5,
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#1E293B',
  },
  dropdownItemTextSelected: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  textSizeContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    width: width * 0.55,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
  textSizeOption: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    alignItems: 'center',
  },
  textSizeOptionSelected: {
    backgroundColor: '#EBF4FF',
    borderRadius: 5,
  },
  textSizeOptionText: {
    color: '#1E293B',
  },
  textSizeOptionTextSelected: {
    color: '#3B82F6',
    fontWeight: '600',
  },

  // Exit modal
  exitModalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    width: width * 0.75,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
  exitModalIcon: {
    fontSize: 36,
    marginBottom: 10,
  },
  exitModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
    textAlign: 'center',
  },
  exitModalMessage: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  exitModalButtons: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
  exitModalCancelButton: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  exitModalCancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  exitModalConfirmButton: {
    flex: 1,
    backgroundColor: '#DC2626',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  exitModalConfirmButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Chapter navigation modal
  chapterNavContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    width: width * 0.7,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
  chapterNavTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 6,
    textAlign: 'center',
  },
  chapterNavSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 14,
    textAlign: 'center',
  },
  chapterNavOptions: {
    width: '100%',
  },
  chapterNavOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  chapterNavOptionText: {
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '600',
  },
  chapterNavOptionArrow: {
    fontSize: 14,
    color: '#3B82F6',
  },
  chapterNavEmpty: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
  },

  // SUD required modal
  sudRequiredContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    width: width * 0.75,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
  sudRequiredIcon: {
    fontSize: 36,
    marginBottom: 10,
  },
  sudRequiredTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
    textAlign: 'center',
  },
  sudRequiredMessage: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  sudRequiredButton: {
    backgroundColor: '#22C55E',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  sudRequiredButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Reward modal
  rewardModalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    width: width * 0.75,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
  rewardCoinsText: {
    color: '#1E40AF',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 12,
  },
  rewardTrophyText: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 6,
  },
  rewardTrophyDesc: {
    color: '#64748B',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 3,
  },
  rewardCloseButton: {
    marginTop: 18,
    backgroundColor: '#1E40AF',
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 20,
  },
  rewardCloseButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },

  // Badge modal
  badgeModalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    width: width * 0.75,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
  badgeTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E40AF',
    marginTop: 10,
  },
  badgeLabel: {
    fontWeight: '700',
    color: '#1E40AF',
    fontSize: 16,
    marginTop: 6,
  },
  badgeDesc: {
    color: '#64748B',
    fontSize: 13,
    marginTop: 3,
    textAlign: 'center',
  },
  badgeCloseButton: {
    marginTop: 18,
    backgroundColor: '#1E40AF',
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 20,
  },
  badgeCloseButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },

  // Media section styles
  mediaSection: {
    marginTop: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  mediaImagePlaceholder: {
    width: '100%',
    height: 140,
    backgroundColor: '#E2E8F0',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    overflow: 'hidden',
  },
  mediaVideoPlaceholder: {
    width: '100%',
    height: 140,
    backgroundColor: '#E2E8F0',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  mediaAudioPlaceholder: {
    width: '100%',
    height: 45,
    backgroundColor: '#E2E8F0',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaLabel: {
    color: '#64748B',
    fontSize: 11,
    fontStyle: 'italic',
  },
  // Audio Player Component Styles
  audioPlayerContainer: {
    width: '100%',
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#F0F8FF',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  audioPlayerButton: {
    backgroundColor: '#3B82F6',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  audioPlayerButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  audioPlayerSlider: {
    flex: 1,
    height: 25,
    marginHorizontal: 6,
  },
  audioPlayerTime: {
    fontSize: 11,
    color: '#4A5568',
    fontWeight: '500',
  },
  audioPlayerStatus: {
    fontSize: 9,
    color: '#718096',
    marginTop: 3,
  },
});

function getHairColor(key) {
  switch (key) {
    case 'short': return '#8D5524';
    case 'long': return '#C68642';
    case 'blonde': return '#E0C068';
    case 'black': return '#222';
    default: return '#8D5524';
  }
}

function getEyeColor(key) {
  switch (key) {
    case 'blue': return '#4F8EF7';
    case 'green': return '#4FC36E';
    case 'brown': return '#8D5524';
    case 'gray': return '#A0A0A0';
    default: return '#4F8EF7';
  }
}

function getShirtColor(key) {
  switch (key) {
    case 'red': return '#EF4444';
    case 'blue': return '#3B82F6';
    case 'green': return '#10B981';
    case 'yellow': return '#FACC15';
    default: return '#3B82F6';
  }
}

function getSkinColor(key) {
  switch (key) {
    case 'light': return '#F9D7B5';
    case 'tan': return '#E0AC69';
    case 'brown': return '#8D5524';
    case 'dark': return '#5C4033';
    default: return '#F9D7B5';
  }
}

// Helper functions for media URLs
function getImageUrl(image) {
  if (image.startsWith('http')) return image;
  // Use only the first 3 words for Unsplash search
  const shortQuery = image.split(' ').slice(0, 3).join(' ');
  return `https://source.unsplash.com/600x400/?${encodeURIComponent(shortQuery)}`;
}

function getYoutubeEmbedUrl(video) {
  if (video.includes('youtube.com') || video.includes('youtu.be')) {
    const match = video.match(/(?:v=|be\/)([\w-]{11})/);
    const id = match ? match[1] : null;
    return id ? `https://www.youtube.com/embed/${id}` : video;
  }
  // Use only the first 3 words for YouTube search
  const shortQuery = video.split(' ').slice(0, 3).join(' ');
  return `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(shortQuery)}`;
}

function getFreesoundUrl(sound) {
  if (sound.startsWith('http')) return sound;
  // Use only the first 3 words for Freesound search
  const shortQuery = sound.split(' ').slice(0, 3).join(' ');
  return `https://freesound.org/search/?q=${encodeURIComponent(shortQuery)}`;
}

// Improved audio player: only play direct mp3, otherwise show message
function AudioPlayer({ url }) {
  const isPlayable = url.endsWith('.mp3');
  if (!isPlayable) {
    return (
      <View style={{ width: '100%', height: 48, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#64748B', fontSize: 15 }}>
          <Text style={{ fontWeight: 'bold' }}>🔇 </Text>
          אין צליל ישיר זמין לסיפור זה
        </Text>
      </View>
    );
  }
  // If playable, show nothing (auto-play will trigger)
  return null;
} 
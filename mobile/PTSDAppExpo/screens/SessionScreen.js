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
  TouchableWithoutFeedback
} from 'react-native';
import { Audio } from 'expo-av';
import { startScenario, nextScenario, previousScenario, getAudioUrl, exitSession } from '../api';
import LottieView from 'lottie-react-native';
import DynamicBackground from '../components/DynamicBackground';
import { useSession } from '../SessionContext';

const { width } = Dimensions.get('window');

export default function SessionScreen({ route, navigation }) {
  const { patient, initialStory, initialStage, initialScenarioState } = route.params;
  
  // Session state
  const [sessionState, setSessionState] = useState('initial'); // 'initial', 'active', 'completed', 'exited'
  const [currentStage, setCurrentStage] = useState(initialStage || 1);
  const [story, setStory] = useState(initialStory || null);
  const [sudValue, setSudValue] = useState(50);
  const [loading, setLoading] = useState(false);
  const [scenarioState, setScenarioState] = useState(initialScenarioState || {});
  
  // Audio state
  const [audioLoading, setAudioLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [audioStatus, setAudioStatus] = useState('מוכן להשמעה');
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const soundRef = useRef(null);

  // UI state
  const [showSudDropdown, setShowSudDropdown] = useState(false);
  const [showTextSizeMenu, setShowTextSizeMenu] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showChapterNavigation, setShowChapterNavigation] = useState(false);
  const [textSize, setTextSize] = useState('medium');
  
  // Session tracking
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [sessionEndTime, setSessionEndTime] = useState(null);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [completedChapters, setCompletedChapters] = useState([]);
  const [chaptersCompleted, setChaptersCompleted] = useState(0);
  
  // New state for mandatory SUD selection
  const [hasSelectedSudForCurrentChapter, setHasSelectedSudForCurrentChapter] = useState(true); // Start as true for initial chapter
  const [sudRequiredModalVisible, setSudRequiredModalVisible] = useState(false);

  // Gamification context
  const { addCoins, unlockTrophy, trophies, TROPHY_DEFS, coins, BADGE_DEFS, badges, unlockBadge, avatar } = useSession();
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [newTrophy, setNewTrophy] = useState(null);
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [unlockedBadge, setUnlockedBadge] = useState(null);

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

  // Update session duration timer
  useEffect(() => {
    if (sessionState === 'started') {
      const startTimeMs = new Date(sessionStartTime).getTime();
      const interval = setInterval(() => {
        setSessionDuration(Date.now() - startTimeMs);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [sessionState, sessionStartTime]);

  // Add this after state declarations
  useEffect(() => {
    // Reset SUD selection requirement for each new chapter
    setHasSelectedSudForCurrentChapter(false);
  }, [currentStage]);

  // Add chapterStories state
  const [chapterStories, setChapterStories] = useState({});

  // Only call startScenario if no initialStory
  useEffect(() => {
    if (!story && patient) {
      handleStartSession();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    setLoading(true);
    try {
      const response = await nextScenario(patient.patient_id, sudValue, scenarioState);
      
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
        
        // Navigate to feedback with completion data
        navigateToFeedback();
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

  // Handle feedback navigation (for completed sessions)
  const navigateToFeedback = () => {
    const endTime = new Date().toISOString();
    setSessionEndTime(endTime);
    
    navigation.navigate('Feedback', {
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

  // Update chapters completed when stage changes
  useEffect(() => {
    if (currentStage > chaptersCompleted) {
      setChaptersCompleted(currentStage);
    }
  }, [currentStage]);

  // Handle audio playback with real TTS
  const handlePlayPause = async () => {
    if (!story?.story) return;
    
    try {
    if (!soundRef.current) {
        setAudioLoading(true);
        
        // Check if we have an audio file from the backend
        if (story.audio_file) {
          const audioUrl = getAudioUrl(story.audio_file);
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
            { shouldPlay: true, rate: playbackSpeed },
        onPlaybackStatusUpdate
      );
      soundRef.current = sound;
      setPlaying(true);
          setAudioStatus('מנגן...');
        } else {
          // Fallback message if no audio file
          Alert.alert('שגיאה', 'קובץ השמע אינו זמין');
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

  // Cleanup audio when component unmounts
  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  // Award coins/trophies/badges on session completion
  useEffect(() => {
    if (sessionState === 'completed') {
      // Award coins
      addCoins(10);
      // Trophies
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

      // BADGES: 10 sessions badge
      if (!badges.includes('ten_sessions') && coins + 10 >= 100) {
        unlockBadge('ten_sessions');
        setUnlockedBadge(BADGE_DEFS.find(b => b.key === 'ten_sessions'));
        setShowBadgeModal(true);
      }
      // BADGES: streaks (dummy logic, replace with real streak tracking)
      // Example: if user has a 3-day streak
      const streak = 3; // TODO: Replace with real streak logic
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

  // Show well_done.json Lottie animation when sessionState is 'completed'
  if (sessionState === 'completed') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#E0F2FE', justifyContent: 'center', alignItems: 'center' }}>
        <DynamicBackground />
        <Modal visible={showRewardModal} transparent animationType="fade">
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 24, alignItems: 'center', width: 300 }}>
              <LottieView source={require('../assets/coins.json')} autoPlay loop={false} style={{ width: 120, height: 120 }} />
              <Text style={{ color: '#1E40AF', fontSize: 22, fontWeight: 'bold', marginTop: 16 }}>הרווחת 10 מטבעות!</Text>
              {newTrophy && (
                <>
                  <LottieView source={require('../assets/trohpy.json')} autoPlay loop={false} style={{ width: 100, height: 100, marginTop: 8 }} />
                  <Text style={{ color: '#FFD700', fontSize: 20, fontWeight: 'bold', marginTop: 8 }}>🏆 {newTrophy.label}</Text>
                  <Text style={{ color: '#64748B', fontSize: 15 }}>{newTrophy.desc}</Text>
                </>
              )}
              <TouchableOpacity onPress={() => setShowRewardModal(false)} style={{ marginTop: 24, backgroundColor: '#1E40AF', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 24 }}>
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>סגור</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
        <LottieView
          source={require('../assets/well_done.json')}
          autoPlay
          loop={false}
          style={{ width: 200, height: 200 }}
        />
        <Text style={{ fontSize: 24, color: '#059669', fontWeight: '800', marginTop: 32, textAlign: 'center' }}>
          כל הכבוד!
        </Text>
        <Text style={{ fontSize: 16, color: '#64748B', marginTop: 12, textAlign: 'center' }}>
          סיימת בהצלחה את המפגש
        </Text>
      </SafeAreaView>
    );
  }

  // Early return if no patient data
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

  // Welcome screen before session starts or while loading story
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
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header with controls */}
        <View style={styles.sessionHeader}>
          <View style={styles.headerTop}>
            <TouchableOpacity
              style={styles.exitSessionButton}
              onPress={handleExitSession}
            >
              <Text style={styles.exitSessionButtonText}>✕</Text>
            </TouchableOpacity>
            
            <View style={styles.headerCenter}>
              <Text style={styles.chapterTitle}>פרק {currentStage} מתוך 3</Text>
              <Text style={styles.patientName}>{patient.name}</Text>
            </View>

            <TouchableOpacity
              style={styles.textSizeButton}
              onPress={() => setShowTextSizeMenu(true)}
            >
              <Text style={styles.textSizeButtonText}>Aa</Text>
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
        {story && (
          <View style={styles.storyContainer}>
            <Text style={[
              styles.storyText, 
              { fontSize: getCurrentTextSize(), lineHeight: getCurrentTextSize() * 1.6 }
            ]}>
              {story.story}
            </Text>
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
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  exitSessionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  exitSessionButtonText: {
    fontSize: 18,
    color: '#DC2626',
    fontWeight: 'bold',
  },
  headerCenter: {
    alignItems: 'center',
  },
  chapterTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  patientName: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },
  textSizeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EBF4FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  textSizeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },

  // Story styles
  storyContainer: {
    backgroundColor: '#FFFFFF',
    margin: 20,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  storyText: {
    color: '#1E293B',
    textAlign: 'right',
    writingDirection: 'rtl',
  },

  // Audio controls
  audioControls: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  audioInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  audioStatus: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  playbackSpeed: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  audioButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  speedButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  speedButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#64748B',
  },
  playButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  playButtonText: {
    fontSize: 24,
  },

  // Navigation controls
  navigationControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 12,
  },
  prevButton: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  prevButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  sudButton: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  sudButtonText: {
    fontSize: 14,
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
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    minWidth: 120,
    alignItems: 'center',
  },
  nextButtonDisabled: {
    backgroundColor: '#94A3B8',
    opacity: 0.6,
  },
  nextButtonText: {
    fontSize: 14,
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
    borderRadius: 16,
    padding: 20,
    width: width * 0.85,
    maxHeight: '70%',
  },
  dropdownTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 16,
  },
  dropdownItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  dropdownItemSelected: {
    backgroundColor: '#EBF4FF',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#1E293B',
  },
  dropdownItemTextSelected: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  textSizeContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: width * 0.7,
  },
  textSizeOption: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    alignItems: 'center',
  },
  textSizeOptionSelected: {
    backgroundColor: '#EBF4FF',
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
    borderRadius: 16,
    padding: 24,
    width: width * 0.85,
    alignItems: 'center',
  },
  exitModalIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  exitModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 12,
    textAlign: 'center',
  },
  exitModalMessage: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  exitModalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  exitModalCancelButton: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  exitModalCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
  exitModalConfirmButton: {
    flex: 1,
    backgroundColor: '#DC2626',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  exitModalConfirmButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Chapter navigation modal
  chapterNavContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: width * 0.8,
    alignItems: 'center',
  },
  chapterNavTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
    textAlign: 'center',
  },
  chapterNavSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 20,
    textAlign: 'center',
  },
  chapterNavOptions: {
    width: '100%',
  },
  chapterNavOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chapterNavOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  chapterNavOptionArrow: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  chapterNavEmpty: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
    fontStyle: 'italic',
  },

  // Add SUD required modal
  sudRequiredContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: width * 0.85,
    alignItems: 'center',
  },
  sudRequiredIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  sudRequiredTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 12,
    textAlign: 'center',
  },
  sudRequiredMessage: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  sudRequiredButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  sudRequiredButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
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
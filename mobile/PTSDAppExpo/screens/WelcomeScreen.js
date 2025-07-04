import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  SafeAreaView, 
  Animated,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  ActivityIndicator,
  Image,
  Modal,
  ScrollView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchPatients } from '../api';
import LottieView from 'lottie-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSession } from '../SessionContext';
import DynamicBackground from '../components/DynamicBackground';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

function ReturnButton({ navigation }) {
  return (
    <TouchableOpacity
      style={{ position: 'absolute', top: 36, left: 16, zIndex: 10, backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 16, padding: 6 }}
      onPress={() => navigation.goBack()}
    >
      <Text style={{ fontSize: 14, color: '#1E40AF', fontWeight: '600' }}>← חזור</Text>
    </TouchableOpacity>
  );
}

export default function WelcomeScreen({ navigation }) {
  // User state
  const [userName, setUserName] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [nameInput, setNameInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [sessionState, setSessionState] = useState('initial');
  const [showSudInput, setShowSudInput] = useState(false);
  const [sudValue, setSudValue] = useState(50);
  const [showSudDropdown, setShowSudDropdown] = useState(false);

  // Gamification state
  const { coins, trophies, TROPHY_DEFS } = useSession();
  const [showTrophyModal, setShowTrophyModal] = useState(false);

  // Avatar state
  const { avatar } = useSession();
  const nav = useNavigation();

  // SUD options with proper Hebrew descriptions
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

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const logoRotateAnim = new Animated.Value(0);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const session = useSession();

  useEffect(() => {
    // Check if user is already logged in
    checkExistingUser();
    
    // Start entrance animations
    startLoadingAnimation();
  }, []);

  const startLoadingAnimation = () => {
    // Logo rotation animation
    Animated.loop(
      Animated.timing(logoRotateAnim, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      })
    ).start();

    // Entrance animation
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1.1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        })
      ]).start();
      
      setInitialLoading(false);
    }, 1500); // Show loading logo for 1.5 seconds
  };

  const checkExistingUser = async () => {
    try {
      const storedUser = await AsyncStorage.getItem('currentUser');
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        setCurrentUser(userData);
        setUserName(userData.name);
        setIsLoggedIn(true);
      }
    } catch (error) {
      console.log('Error checking existing user:', error);
    }
  };

  const handleNameSubmit = async () => {
    if (!nameInput.trim()) {
      Alert.alert('שגיאה', 'אנא הזן את שמך');
      return;
    }

    setLoading(true);
    try {
      const patients = await fetchPatients();
      const normalizedInput = nameInput.trim().replace(/\s+/g, ' ').toLowerCase();
      const foundPatient = patients.find(p =>
        p.name && p.name.trim().replace(/\s+/g, ' ').toLowerCase() === normalizedInput
      );

      if (foundPatient) {
        const userData = {
          name: foundPatient.name,
          patient_id: foundPatient.patient_id,
          loginTime: new Date().toISOString()
        };
        await AsyncStorage.setItem('currentUser', JSON.stringify(userData));
        setCurrentUser(userData);
        setUserName(foundPatient.name);
        setIsLoggedIn(true);
        setNameInput('');
        setLoading(false);
        navigation.navigate('PreSession', { patient: userData });
        return;
      } else {
        Alert.alert(
          'משתמש לא נמצא',
          `לא נמצא מטופל בשם "${nameInput.trim()}". אנא ודא שהשם נכון או פנה למטפל שלך.`,
          [{ text: 'אישור', style: 'default' }]
        );
      }
    } catch (error) {
      console.log('Name lookup error:', error);
      Alert.alert('שגיאה', 'שגיאה בחיבור לשרת. אנא נסה שוב.');
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    Alert.alert(
      'יציאה',
      'האם אתה בטוח שברצונך להתנתק?',
      [
        { text: 'ביטול', style: 'cancel' },
        { 
          text: 'התנתק',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('currentUser');
              setIsLoggedIn(false);
              setCurrentUser(null);
              setUserName('');
            } catch (error) {
              console.log('Logout error:', error);
            }
          }
        }
      ]
    );
  };

  const handleContinueToPreSession = () => {
    console.log('handleContinueToPreSession called');
    console.log('currentUser:', currentUser);
    if (currentUser) {
      console.log('Setting showSudInput to true');
      // Go to anxiety selection first
      setShowSudInput(true);
    } else {
      console.log('No current user found in handleContinueToPreSession');
      Alert.alert('שגיאה', 'לא נמצא מידע על המטופל');
    }
  };

  const handleStartSession = async () => {
    if (!currentUser) {
      Alert.alert('שגיאה', 'לא נמצא מידע על המטופל');
      return;
    }
    // Start story generation in the background
    session.startStoryGeneration(currentUser, sudValue);
    // Immediately go to PreSession, pass patient as param
    navigation.navigate('PreSession', { patient: currentUser });
  };

  const handleProceedToAnxietySelection = () => {
    setShowSudInput(true);
  };

  // SUD Dropdown Component
  const SudDropdown = ({ visible, onClose, onSelect, currentValue }) => (
    <Modal visible={visible} transparent animationType="slide">
      <TouchableOpacity style={styles.modalOverlay} onPress={onClose}>
        <View style={styles.anxietyDropdownContainer}>
          <View style={styles.anxietyDropdownHeader}>
            <Text style={styles.anxietyDropdownTitle}>בחר את רמת החרדה שלך</Text>
            <Text style={styles.anxietyDropdownSubtitle}>גלגל למטה כדי לראות את כל האפשרויות</Text>
          </View>
          
          <ScrollView 
            style={styles.anxietyDropdownList} 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.anxietyDropdownContent}
          >
            {sudOptions.map((item) => (
              <TouchableOpacity
                key={item.value}
                style={[
                  styles.anxietyDropdownItem,
                  currentValue === item.value && styles.anxietyDropdownItemSelected
                ]}
                onPress={() => {
                  onSelect(item.value);
                  onClose();
                }}
                activeOpacity={0.7}
              >
                <View style={styles.anxietyDropdownItemContent}>
                  <View style={[
                    styles.anxietyDropdownValueContainer,
                    currentValue === item.value && styles.anxietyDropdownValueContainerSelected
                  ]}>
                    <Text style={[
                      styles.anxietyDropdownValue,
                      currentValue === item.value && styles.anxietyDropdownValueSelected
                    ]}>
                      {item.value}
                    </Text>
                  </View>
                  
                  <View style={styles.anxietyDropdownTextContainer}>
                    <Text style={[
                      styles.anxietyDropdownText,
                      currentValue === item.value && styles.anxietyDropdownTextSelected
                    ]}>
                      {item.label.split(' - ')[1]}
                    </Text>
                    <Text style={styles.anxietyDropdownRange}>
                      רמה {item.value}
                    </Text>
                  </View>
                  
                  {currentValue === item.value && (
                    <View style={styles.anxietyDropdownCheckContainer}>
                      <Text style={styles.anxietyDropdownCheck}>✓</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
          
          <TouchableOpacity style={styles.anxietyDropdownCloseButton} onPress={onClose}>
            <Text style={styles.anxietyDropdownCloseText}>סגור</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  // Show loader.json Lottie animation while initialLoading is true
  if (initialLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#E0F2FE', justifyContent: 'center', alignItems: 'center' }}>
        <LottieView
          source={require('../assets/loader.json')}
          autoPlay
          loop
          style={{ width: 200, height: 200 }}
        />
        <Text style={{ fontSize: 20, color: '#2563EB', fontWeight: '700', marginTop: 32, textAlign: 'center' }}>
          טוען את NarraTIVE...
        </Text>
        <Text style={{ fontSize: 16, color: '#64748B', marginTop: 12, textAlign: 'center' }}>
          אנא המתן מספר שניות
        </Text>
      </SafeAreaView>
    );
  }

  // Initial SUD input screen - MOVED TO TOP PRIORITY
  if (showSudInput) {
    return (
      <SafeAreaView style={styles.anxietyContainer}>
        <DynamicBackground />
        <Animated.ScrollView 
          contentContainerStyle={styles.anxietyContent}
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header with calming icon */}
          <View style={styles.anxietyHeader}>
            <Animated.View style={[
              styles.anxietyIconContainer,
              { transform: [{ scale: logoScale }] }
            ]}>
              <Text style={styles.anxietyIcon}>🌱</Text>
            </Animated.View>
            <Text style={styles.anxietyTitle}>מה רמת החרדה שלך כרגע?</Text>
            <Text style={styles.anxietySubtitle}>
              עזור לנו להתאים את הטיפול בצורה אישית{'\n'}
              בחר את הרמה שמתאימה לך ברגע זה
            </Text>
          </View>

          {/* Anxiety level explanation */}
          <View style={styles.anxietyExplanation}>
            <View style={styles.explanationCard}>
              <Text style={styles.explanationTitle}>💡 איך לבחור?</Text>
              <View style={styles.explanationItem}>
                <Text style={styles.explanationDot}>•</Text>
                <Text style={styles.explanationText}>10-30: רגוע, מוכן להתחיל</Text>
              </View>
              <View style={styles.explanationItem}>
                <Text style={styles.explanationDot}>•</Text>
                <Text style={styles.explanationText}>40-60: קצת מתוח, זה בסדר</Text>
              </View>
              <View style={styles.explanationItem}>
                <Text style={styles.explanationDot}>•</Text>
                <Text style={styles.explanationText}>70-90: מרגיש חרד, נעבוד יחד</Text>
              </View>
              <View style={styles.explanationItem}>
                <Text style={styles.explanationDot}>•</Text>
                <Text style={styles.explanationText}>100: מצב קשה, נתקדם בזהירות</Text>
              </View>
            </View>
          </View>

          {/* Anxiety level selector */}
          <View style={styles.anxietySelectorContainer}>
            <Text style={styles.selectorLabel}>רמת החרדה שלי:</Text>
            <TouchableOpacity
              style={styles.anxietySelector}
              onPress={() => setShowSudDropdown(true)}
            >
              <View style={styles.selectorContent}>
                <Text style={styles.selectorValue}>{sudValue}</Text>
                <View style={styles.selectorTextContainer}>
                  <Text style={styles.selectorText}>
                    {sudOptions.find(opt => opt.value === sudValue)?.label.split(' - ')[1] || 'בחר רמה'}
                  </Text>
                  <Text style={styles.selectorSubtext}>לחץ לשינוי</Text>
                </View>
                <Text style={styles.selectorArrow}>▼</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Encouragement message */}
          <View style={styles.encouragementContainer}>
            <Text style={styles.encouragementIcon}>💙</Text>
            <Text style={styles.encouragementText}>
              אין תשובה נכונה או לא נכונה.{'\n'}
              זה המקום הבטוח שלך להתחיל.
            </Text>
          </View>

          {/* Action buttons */}
          <View style={styles.anxietyActions}>
            <TouchableOpacity 
              style={styles.anxietyBackButton}
              onPress={() => setShowSudInput(false)}
            >
              <Text style={styles.anxietyBackButtonText}>← חזור</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.anxietyStartButton}
              onPress={handleStartSession}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Text style={styles.anxietyStartButtonText}>בואו נתחיל</Text>
                  <Text style={styles.anxietyStartButtonIcon}>🌟</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </Animated.ScrollView>

        <SudDropdown
          visible={showSudDropdown}
          onClose={() => setShowSudDropdown(false)}
          onSelect={setSudValue}
          currentValue={sudValue}
        />
      </SafeAreaView>
    );
  }

  // Main welcome screen content
  if (!showSudInput && !initialLoading) {
    return (
      <SafeAreaView style={styles.figmaGradient}>
        <View style={styles.figmaLogoContainer}>
          <Image
            source={require('../assets/logo.png')}
            style={styles.figmaLogo}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.figmaHeadline}>NarraTIVE</Text>
        <Text style={styles.figmaTagline}>ליווי אישי וסיפורים מותאמים להתמודדות עם פוסט טראומה</Text>
        <View style={styles.figmaCard}>
          <Text style={styles.figmaCardTitle}>כניסה</Text>
          <Text style={styles.figmaCardSubtitle}>נא הזן את שמך המלא כדי להתחבר:</Text>
          <TextInput
            style={styles.figmaInput}
            placeholder="הזן את שמך"
            placeholderTextColor="#A0AEC0"
            value={nameInput}
            onChangeText={setNameInput}
            autoCapitalize="words"
            textAlign="right"
          />
          <TouchableOpacity
            style={styles.figmaButton}
            onPress={handleNameSubmit}
            disabled={loading}
          >
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={styles.figmaButtonText}>{loading ? 'טוען...' : 'התחבר'}</Text>
            </View>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Main welcome screen content
    return (
      <SafeAreaView style={styles.container}>
      {navigation.canGoBack && navigation.canGoBack() && <ReturnButton navigation={navigation} />}
        <DynamicBackground />
      <Animated.ScrollView 
        contentContainerStyle={styles.content}
        style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
        }}
        >
        {/* Hero Section: Logo, Tagline, Subtitle */}
        <View style={styles.heroSection}>
          <Animated.View style={[
            styles.logoContainer,
            { transform: [{ scale: logoScale }, { rotate: logoRotateAnim.interpolate({
              inputRange: [0, 1],
              outputRange: ['0deg', '360deg']
            }) }] }
          ]}>
            <Image 
              source={require('../assets/logo.png')}
              style={{ width: 100, height: 100, borderRadius: 50, marginBottom: 12 }}
            />
            <Text style={styles.logoMain}>NarraTIVE</Text>
            <View style={styles.logoAccent} />
          </Animated.View>
          <Text style={styles.tagline}>
            ליווי אישי וסיפורים מותאמים להתמודדות עם פוסט טראומה.{'\n'}
          </Text>
         
        </View>

        {/* Login/Welcome Section */}
        {!isLoggedIn ? (
          <KeyboardAvoidingView 
            style={styles.keyboardContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
          >
            <View style={styles.welcomeSection}>
              <Text style={styles.welcomeTitle}>ברוכים הבאים ל-NarraTIVE</Text>
              <Text style={styles.welcomeSubtitle}>
                נא הזן את שמך המלא כדי להתחבר:
              </Text>
            </View>
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>שם מלא</Text>
              <TextInput
                style={styles.nameInput}
                placeholder="הזן את שמך" placeholderTextColor="rgba(255, 255, 255, 0.6)"
                value={nameInput}
                onChangeText={setNameInput}
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleNameSubmit}
                editable={!loading}
              />
            </View>
            <TouchableOpacity 
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleNameSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#1E40AF" />
              ) : (
                <Text style={styles.submitButtonText}>התחבר</Text>
              )}
            </TouchableOpacity>
            
            <View style={styles.featuresSection}>
              <Text style={styles.featuresTitle}>למה NarraTIVE?</Text>
              <View style={styles.featuresList}>
                <View style={styles.featureItem}>
                  <Text style={[styles.featureIcon, { color: '#F59E0B' }]}>✍️</Text>
                  <Text style={styles.featureText}>סיפורים מותאמים אישית</Text>
            </View>
                <View style={styles.featureItem}>
                  <Text style={[styles.featureIcon, { color: '#10B981' }]}>🧘</Text>
                  <Text style={styles.featureText}>תרגילים טיפוליים</Text>
          </View>
                <View style={styles.featureItem}>
                  <Text style={[styles.featureIcon, { color: '#6366F1' }]}>📊</Text>
                  <Text style={styles.featureText}>מעקב התקדמות</Text>
            </View>
                <View style={styles.featureItem}>
                  <Text style={[styles.featureIcon, { color: '#EC4899' }]}>🫂</Text>
                  <Text style={styles.featureText}>תמיכה ובטחון</Text>
                </View>
              </View>
            </View>
          </KeyboardAvoidingView>
        ) : (
          <View>
            <View style={styles.userHeader}>
              <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <Text style={styles.logoutButtonText}>התנתק</Text>
            </TouchableOpacity>
              <View style={styles.userInfo}>
                <Text style={styles.welcomeBackText}>שלום לך,</Text>
                <Text style={styles.userNameText}>{userName}!</Text>
              </View>
          </View>

          {/* Enhanced Avatar Section */}
          <View style={styles.enhancedAvatarContainer}>
            <View style={styles.avatarGlowContainer}>
              <View style={styles.avatarRings}>
                <View style={styles.avatarOuterRing} />
                <View style={styles.avatarInnerRing} />
              </View>
              <View style={styles.avatarCircle}>
                <View style={styles.avatarFace}>
                  {/* Eyes */}
                  <View style={styles.avatarEyesContainer}>
                    <View style={[styles.avatarEye, { backgroundColor: getEyeColor(avatar?.eyes) }]} />
                    <View style={[styles.avatarEye, { backgroundColor: getEyeColor(avatar?.eyes) }]} />
                  </View>
                  {/* Hair */}
                  <View style={[styles.avatarHair, { backgroundColor: getHairColor(avatar?.hair) }]} />
                </View>
              </View>
              {/* Shirt */}
              <View style={[styles.avatarShirt, { backgroundColor: getShirtColor(avatar?.shirt) }]} />
            </View>
          </View>

          {/* Enhanced Stats Section */}
          <View style={styles.enhancedStatsContainer}>
            <View style={styles.statsCard}>
              <Text style={styles.statsIcon}>🌟</Text>
              <Text style={styles.statsTitle}>ההישגים שלך</Text>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{coins}</Text>
                  <Text style={styles.statLabel}>מטבעות</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{trophies.length}</Text>
                  <Text style={styles.statLabel}>תגים</Text>
                </View>
              </View>
              <TouchableOpacity 
                style={styles.viewTrophiesButton}
                onPress={() => setShowTrophyModal(true)}
              >
                <Text style={styles.viewTrophiesText}>🏆 הצג תגים</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Motivational Message */}
          <View style={styles.motivationalContainer}>
            <Text style={styles.motivationalEmoji}>💙</Text>
            <Text style={styles.motivationalText}>
              זה הזמן לצעד קדימה.{'\n'}
              אתה מוכן למסע הבא?
            </Text>
          </View>

          {/* Enhanced Main Action Button */}
          <View style={styles.mainActionContainer}>
            <TouchableOpacity 
              style={styles.enhancedContinueButton}
              onPress={handleContinueToPreSession}
              activeOpacity={0.8}
            >
              <View style={styles.buttonGlow} />
              <View style={styles.buttonContent}>
                <View style={styles.buttonIcon}>
                  <Text style={styles.buttonIconText}>🚀</Text>
                </View>
                <Text style={styles.enhancedContinueButtonText}>התחל מפגש חדש</Text>
                <View style={styles.buttonArrow}>
                  <Text style={styles.buttonArrowText}>→</Text>
                </View>
              </View>
            </TouchableOpacity>
            <Text style={styles.buttonSubtext}>המסע שלך לריפוי מתחיל כאן</Text>
          </View>



        <Modal visible={showTrophyModal} transparent animationType="fade">
              <View style={styles.modalOverlay}>
                <View style={styles.trophyModalContainer}>
                  <Text style={styles.trophyModalTitle}>התגים שפתחת</Text>
                  {trophies.length > 0 ? (
                    <ScrollView style={styles.trophyList}>
                      {trophies.map(trophyKey => {
                        const trophy = TROPHY_DEFS.find(t => t.key === trophyKey);
                        return trophy ? (
                          <View key={trophy.key} style={styles.trophyItem}>
                            <LottieView source={require('../assets/trohpy.json')} autoPlay loop={false} style={{ width: 60, height: 60 }} />
                            <View style={styles.trophyInfo}>
                              <Text style={styles.trophyLabel}>🏆 {trophy.label}</Text>
                              <Text style={styles.trophyDesc}>{trophy.desc}</Text>
                      </View>
                    </View>
                        ) : null;
                      })}
                    </ScrollView>
                  ) : (
                    <Text style={styles.noTrophiesText}>עדיין לא פתחת תגים. המשך במפגשים כדי לפתוח חדשים!</Text>
                  )}
                  <TouchableOpacity onPress={() => setShowTrophyModal(false)} style={styles.trophyCloseButton}>
                    <Text style={styles.trophyCloseButtonText}>סגור</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

              </View>
        )}
      </Animated.ScrollView>

      {/* Initial Loading Overlay */}
      {initialLoading && (
        <View style={styles.loadingOverlay}>
          <Animated.View style={[
            styles.loadingLogo,
            { transform: [{ scale: logoScale }, { rotate: logoRotateAnim.interpolate({
              inputRange: [0, 1],
              outputRange: ['0deg', '360deg']
            }) }] }
          ]}>
            <Image 
              source={require('../assets/logo.png')}
              style={{ width: '100%', height: '100%', borderRadius: 50 }}
            />
          </Animated.View>
          <Animated.Text style={[
            styles.loadingTitle,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
          ]}>
            NarraTIVE
          </Animated.Text>
          <Animated.Text style={[
            styles.loadingSubtitle,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
          ]}>
            הדרך שלך להחלמה. בבטחה.
          </Animated.Text>
          <ActivityIndicator size="large" color="#60A5FA" style={styles.loadingIndicator} />
                </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E3F0FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradientBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#1E40AF',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  heroSection: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 16,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  logoMain: {
    fontSize: 34,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 1,
  },
  logoAccent: {
    width: 40,
    height: 2.5,
    backgroundColor: '#60A5FA',
    borderRadius: 1,
    marginTop: 5,
  },
  tagline: {
    fontSize: 18,
    color: '#1E293B',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
    marginTop: 8,
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 14,
    color: '#2563EB',
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '400',
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  featureCard: {
    width: (width - 32 - 10) / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginBottom: 10,
    backdropFilter: 'blur(6px)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  featureIconContainer: {
    width: 36,
    height: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureIcon: {
    fontSize: 16,
    marginBottom: 4,
  },
  featureTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 2,
  },
  featureSubtitle: {
    fontSize: 10,
    color: '#BFDBFE',
    textAlign: 'center',
  },
  ctaButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E40AF',
    marginRight: 8,
  },
  ctaIcon: {
    width: 24,
    height: 24,
    backgroundColor: '#1E40AF',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ctaArrow: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  trustSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  trustItem: {
    alignItems: 'center',
  },
  trustIcon: {
    fontSize: 16,
    marginBottom: 2,
  },
  trustText: {
    fontSize: 9,
    color: '#BFDBFE',
    textAlign: 'center',
  },
  footer: {
    alignItems: 'center',
    marginTop: 'auto',
  },
  footerText: {
    fontSize: 9,
    color: 'rgba(191, 219, 254, 0.6)',
    textAlign: 'center',
    lineHeight: 12,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  logoutButton: {
    padding: 8,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  logoutButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  userInfo: {
    marginLeft: 10,
  },
  welcomeBackText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  userNameText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  logo: {
    fontSize: 40,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  appName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  accentLine: {
    width: 40,
    height: 2.5,
    backgroundColor: '#60A5FA',
    borderRadius: 1,
    marginTop: 5,
  },
  quickStats: {
    alignItems: 'center',
    marginBottom: 12,
  },
  quickStatsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  quickStatsSubtitle: {
    fontSize: 13,
    color: '#BFDBFE',
    textAlign: 'center',
  },
  continueButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  continueButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E40AF',
  },
  continueButtonArrow: {
    fontSize: 14,
    marginLeft: 6,
  },
  keyboardContainer: {
    flex: 1,
  },
  welcomeSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#BFDBFE',
    textAlign: 'center',
  },
  inputSection: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  nameInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 16,
    color: '#FFFFFF',
  },
  submitButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
    marginTop: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  submitButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E40AF',
  },
  featuresSection: {
    marginBottom: 20,
  },
  featuresTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 20,
  },
  featuresList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  featureItem: {
    width: (width - 40 - 12) / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  featureText: {
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'center',
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#1E40AF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
  },
  loadingLogo: {
    width: 120,
    height: 120,
  },
  loadingTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  loadingSubtitle: {
    fontSize: 18,
    color: '#BFDBFE',
    textAlign: 'center',
    marginBottom: 32,
  },
  loadingIndicator: {
    marginTop: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  headerLogo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 0,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  scrollContent: {
    padding: 24,
    flexGrow: 1,
  },
  keyboardView: {
    flex: 1,
  },
  welcomeCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    backdropFilter: 'blur(10px)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  welcomeDescription: {
    fontSize: 16,
    color: '#BFDBFE',
    textAlign: 'center',
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  searchButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  searchButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  searchButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E40AF',
    textAlign: 'center',
  },
  featuresContainer: {
    marginBottom: 20,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
  },
  featureIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#BFDBFE',
    lineHeight: 20,
  },
  anxietyContainer: {
    flex: 1,
    backgroundColor: '#1E40AF',
  },
  dynamicBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#1E40AF',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    borderWidth: 0,
    borderColor: 'transparent',
  },
  anxietyContent: {
    padding: 24,
    flexGrow: 1,
  },
  anxietyHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  anxietyIconContainer: {
    width: 80,
    height: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  anxietyIcon: {
    fontSize: 40,
    color: '#FFFFFF',
  },
  anxietyTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  anxietySubtitle: {
    fontSize: 16,
    color: '#BFDBFE',
    textAlign: 'center',
    lineHeight: 24,
  },
  anxietyExplanation: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  explanationCard: {
    // No specific styles here, just a container for explanation items
  },
  explanationTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  explanationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  explanationDot: {
    fontSize: 16,
    color: '#60A5FA',
    marginRight: 8,
    fontWeight: 'bold',
  },
  explanationText: {
    fontSize: 15,
    color: '#BFDBFE',
    flex: 1,
  },
  anxietySelectorContainer: {
    marginBottom: 24,
  },
  selectorLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  anxietySelector: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  selectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectorValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    width: 60,
    textAlign: 'center',
    marginRight: 16,
  },
  selectorTextContainer: {
    // No specific styles here
  },
  selectorText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  selectorSubtext: {
    fontSize: 12,
    color: '#BFDBFE',
  },
  selectorArrow: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  encouragementContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  encouragementIcon: {
    fontSize: 36,
    marginBottom: 12,
  },
  encouragementText: {
    fontSize: 16,
    color: '#BFDBFE',
    textAlign: 'center',
    lineHeight: 24,
  },
  anxietyActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  anxietyBackButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  anxietyBackButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  anxietyStartButton: {
    flex: 2,
    backgroundColor: '#22C55E',
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  anxietyStartButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    marginRight: 6,
  },
  anxietyStartButtonIcon: {
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  anxietyDropdownContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    width: width * 0.8,
    maxHeight: '60%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
  anxietyDropdownHeader: {
    marginBottom: 14,
  },
  anxietyDropdownTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 6,
  },
  anxietyDropdownSubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
  anxietyDropdownList: {
    maxHeight: '75%',
  },
  anxietyDropdownContent: {
    paddingBottom: 8,
  },
  anxietyDropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    borderRadius: 5,
    marginBottom: 3,
  },
  anxietyDropdownItemSelected: {
    backgroundColor: '#EBF4FF',
  },
  anxietyDropdownItemText: {
    fontSize: 14,
    color: '#1E293B',
    textAlign: 'right',
  },
  anxietyDropdownItemTextSelected: {
    fontWeight: '600',
    color: '#3B82F6',
  },
  trophyModalContainer: {
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
  trophyModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E40AF',
    marginTop: 10,
  },
  trophyList: {
    maxHeight: 300,
  },
  trophyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  trophyInfo: {
    flex: 1,
  },
  trophyLabel: {
    fontWeight: '700',
    color: '#1E40AF',
    fontSize: 16,
    marginTop: 6,
  },
  trophyDesc: {
    color: '#64748B',
    fontSize: 13,
    marginTop: 3,
    textAlign: 'center',
  },
  noTrophiesText: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 20,
  },
  trophyCloseButton: {
    marginTop: 16,
    backgroundColor: '#1E40AF',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 18,
  },
  trophyCloseButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  
  // Enhanced Avatar Styles
  enhancedAvatarContainer: {
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  avatarGlowContainer: {
    position: 'relative',
    alignItems: 'center',
  },
  avatarRings: {
    position: 'absolute',
    top: -5,
    left: -5,
    right: -5,
    bottom: -5,
  },
  avatarOuterRing: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    top: 0,
    left: 0,
  },
  avatarInnerRing: {
    position: 'absolute',
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.6)',
    top: 3,
    left: 3,
  },
  avatarCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#60A5FA',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarFace: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarEyesContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  avatarEye: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginHorizontal: 2,
    borderWidth: 1,
    borderColor: '#222',
  },
  avatarHair: {
    position: 'absolute',
    top: 0,
    left: 6,
    right: 6,
    height: 14,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    zIndex: 2,
  },
  avatarShirt: {
    width: 32,
    height: 14,
    borderRadius: 8,
    marginTop: -6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },

  // Enhanced Stats Styles
  enhancedStatsContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  statsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    minWidth: width * 0.75,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsIcon: {
    fontSize: 18,
    marginBottom: 6,
  },
  statsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: '#60A5FA',
    marginBottom: 3,
  },
  statLabel: {
    fontSize: 11,
    color: '#DBEAFE',
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 16,
  },
  viewTrophiesButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  viewTrophiesText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Motivational Message Styles
  motivationalContainer: {
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  motivationalEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  motivationalText: {
    fontSize: 14,
    color: '#DBEAFE',
    textAlign: 'center',
    lineHeight: 18,
    fontWeight: '500',
  },

  // Enhanced Button Styles
  mainActionContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  enhancedContinueButton: {
    backgroundColor: '#2563EB',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 20,
    minWidth: width * 0.8,
    elevation: 0,
    borderWidth: 0,
  },
  buttonGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 14,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  buttonIconText: {
    fontSize: 14,
  },
  enhancedContinueButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  buttonArrow: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  buttonArrowText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  buttonSubtext: {
    fontSize: 11,
    color: '#BFDBFE',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  figmaGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5EA',
  },
  figmaContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  figmaLogoContainer: {
    marginTop: 40,
    marginBottom: 16,
    alignItems: 'center',
  },
  figmaLogo: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#E3F0FF',
    marginBottom: 8,
  },
  figmaHeadline: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 1,
  },
  figmaTagline: {
    fontSize: 16,
    color: '#2563EB',
    textAlign: 'center',
    marginBottom: 32,
    fontWeight: '500',
  },
  figmaCard: {
    width: '88%',
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 6,
  },
  figmaCardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
    textAlign: 'center',
  },
  figmaCardSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 16,
    textAlign: 'center',
  },
  figmaInput: {
    width: '100%',
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFD7ED',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#1E293B',
    marginBottom: 18,
    textAlign: 'right',
  },
  figmaButton: {
    width: 193,
    height: 52,
    borderRadius: 80,
    backgroundColor: '#2563EB',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 29,
    paddingVertical: 15,
    marginTop: 16,
    alignSelf: 'center',
  },
  figmaButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
});

function getHairColor(key) {
  switch (key) {
    case 'blonde': return '#F5DEB3';
    case 'brown': return '#8B4513';
    case 'black': return '#000000';
    case 'red': return '#B22222';
    default: return '#000000';
  }
}

function getEyeColor(key) {
  switch (key) {
    case 'blue': return '#4682B4';
    case 'green': return '#228B22';
    case 'brown': return '#A52A2A';
    default: return '#A52A2A';
  }
}

function getShirtColor(key) {
  switch (key) {
    case 'blue': return '#4682B4';
    case 'green': return '#228B22';
    case 'red': return '#B22222';
    case 'purple': return '#800080';
    default: return '#4682B4';
  }
}

function getSkinColor(key) {
  switch (key) {
    case 'light': return '#FCD5B4';
    case 'medium': return '#DBB08E';
    case 'dark': return '#A67B5B';
    default: return '#DBB08E';
  }
} 
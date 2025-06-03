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

const { width } = Dimensions.get('window');

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
      // Search for patient by name
      const patients = await fetchPatients();
      const foundPatient = patients.find(p => 
        p.name && p.name.toLowerCase().includes(nameInput.trim().toLowerCase())
      );

      if (foundPatient) {
        // User found - save to storage and set state
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
    // Immediately go to PreSession
    navigation.navigate('PreSession');
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

  // Logged in view
  if (isLoggedIn && currentUser) {
    return (
      <SafeAreaView style={styles.container}>
        <DynamicBackground />
        <Animated.View 
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          {/* Header with user info */}
          <View style={styles.userHeader}>
            <TouchableOpacity 
              style={styles.logoutButton}
              onPress={handleLogout}
            >
              <Text style={styles.logoutButtonText}>יציאה</Text>
            </TouchableOpacity>
            
            <View style={styles.userInfo}>
              <Text style={styles.welcomeBackText}>ברוך שובך,</Text>
              <Text style={styles.userNameText}>{userName}</Text>
            </View>
          </View>

          {/* Coin & Trophy Bar */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, justifyContent: 'center', gap: 28 }}>
            {/* Coins */}
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <LottieView source={require('../assets/coins.json')} autoPlay loop style={{ width: 36, height: 36 }} />
              <Text style={{ color: '#FFD700', fontWeight: 'bold', fontSize: 18, marginLeft: 6 }}>{coins}</Text>
            </View>
            {/* Trophies */}
            <TouchableOpacity onPress={() => setShowTrophyModal(true)} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <LottieView source={require('../assets/trohpy.json')} autoPlay loop style={{ width: 36, height: 36 }} />
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 18, marginLeft: 6 }}>{trophies.length}</Text>
            </TouchableOpacity>
          </View>

          {/* Logo with therapeutic animation */}
          <Animated.View 
            style={[
              styles.logoContainer,
              { 
                transform: [
                  { scale: logoScale },
                  { rotate: logoRotateAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '5deg']
                  })}
                ]
              }
            ]}
          >
            <View style={styles.logoCircleShadow}>
              <View style={styles.logoCircle}>
                <Image 
                  source={require('../assets/logo.png')} 
                  style={styles.headerLogo}
                  resizeMode="contain"
                />
              </View>
            </View>
            <Text style={styles.appName}>NarraTIVE</Text>
            <View style={styles.accentLine} />
          </Animated.View>

          {/* Quick stats with breathing animation */}
          <Animated.View 
            style={[
              styles.quickStats,
              {
                transform: [{
                  scale: logoRotateAnim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [1, 1.02, 1]
                  })
                }]
              }
            ]}
          >
            <Text style={styles.quickStatsTitle}>המפגש שלך מחכה</Text>
            <Text style={styles.quickStatsSubtitle}>המשך במסע הטיפולי שלך</Text>
          </Animated.View>

          {/* Continue button */}
          <TouchableOpacity 
            style={styles.continueButton}
            onPress={handleContinueToPreSession}
          >
            <Text style={styles.continueButtonText}>התחל מפגש טיפולי</Text>
            <Text style={styles.continueButtonArrow}>→</Text>
          </TouchableOpacity>

          {/* Session info actions */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 }}>
            <TouchableOpacity
              style={[
                styles.quickActionButton,
                {
                  flex: 1,
                  marginRight: 10,
                  paddingVertical: 10,
                  paddingHorizontal: 0,
                  minHeight: 64,
                  borderRadius: 18,
                  backgroundColor: 'rgba(255,255,255,0.13)',
                  borderWidth: 1,
                  borderColor: 'rgba(59,130,246,0.13)',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.10,
                  shadowRadius: 6,
                  elevation: 2,
                  alignItems: 'center',
                  justifyContent: 'center',
                }
              ]}
              onPress={() => Alert.alert('היסטוריית מפגשים', 'כאן תוצג היסטוריית המפגשים שלך (דמה).')}
            >
              <Text style={[styles.quickActionIcon, { fontSize: 22, marginBottom: 2 }]}>📅</Text>
              <Text style={[styles.quickActionText, { fontSize: 13 }]}>היסטוריית מפגשים</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.quickActionButton,
                {
                  flex: 1,
                  marginLeft: 10,
                  paddingVertical: 10,
                  paddingHorizontal: 0,
                  minHeight: 64,
                  borderRadius: 18,
                  backgroundColor: 'rgba(255,255,255,0.13)',
                  borderWidth: 1,
                  borderColor: 'rgba(59,130,246,0.13)',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.10,
                  shadowRadius: 6,
                  elevation: 2,
                  alignItems: 'center',
                  justifyContent: 'center',
                }
              ]}
              onPress={() => Alert.alert('המפגש הבא', 'המפגש הבא שלך עם המטפל: 12.06.2024, 14:00 (דמה)')}
            >
              <Text style={[styles.quickActionIcon, { fontSize: 22, marginBottom: 2 }]}>👨‍⚕️</Text>
              <Text style={[styles.quickActionText, { fontSize: 13 }]}>המפגש הבא עם המטפל</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Trophy Modal */}
        <Modal visible={showTrophyModal} transparent animationType="fade">
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 24, width: 320, alignItems: 'center' }}>
              <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#1E40AF', marginBottom: 16 }}>הישגים</Text>
              {TROPHY_DEFS.map((trophy, idx) => {
                const unlocked = trophies.includes(trophy.key);
                return (
                  <View key={trophy.key} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 18 }}>
                    {unlocked ? (
                      <LottieView source={require('../assets/trohpy.json')} autoPlay loop={false} style={{ width: 40, height: 40, marginRight: 10 }} />
                    ) : (
                      <View style={{ width: 40, height: 40, marginRight: 10, opacity: 0.3 }}>
                        <LottieView source={require('../assets/trohpy.json')} autoPlay={false} loop={false} style={{ width: 40, height: 40 }} />
                      </View>
                    )}
                    <View>
                      <Text style={{ fontWeight: 'bold', color: unlocked ? '#1E40AF' : '#64748B', fontSize: 16 }}>{trophy.label}</Text>
                      <Text style={{ color: '#64748B', fontSize: 13 }}>{trophy.desc}</Text>
                    </View>
                  </View>
                );
              })}
              <TouchableOpacity onPress={() => setShowTrophyModal(false)} style={{ marginTop: 12, backgroundColor: '#1E40AF', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 24 }}>
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>סגור</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  // Login view
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <DynamicBackground />
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <Animated.ScrollView 
          contentContainerStyle={styles.scrollContent}
          style={{
            opacity: fadeAnim,
            transform: [
              { translateY: slideAnim },
              { scale: scaleAnim }
            ]
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header with Logo in a circle and breathing animation */}
          <Animated.View 
            style={[
              styles.header,
              {
                alignItems: 'center',
                marginBottom: 32,
                transform: [{
                  scale: logoRotateAnim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [1, 1.05, 1]
                  })
                }]
              }
            ]}
          >
            <View style={styles.logoCircleShadow}>
              <View style={styles.logoCircle}>
                <Image 
                  source={require('../assets/logo.png')} 
                  style={styles.headerLogo}
                  resizeMode="contain"
                />
              </View>
            </View>
      <Text style={styles.title}>ברוך הבא ל-NarraTIVE</Text>
            <Text style={styles.subtitle}>מערכת טיפול נרטיבי מתקדמת</Text>
          </Animated.View>

          {/* Welcome Card with gentle floating animation */}
          <Animated.View style={[
            styles.welcomeCard,
            {
              opacity: fadeAnim,
              transform: [
                { scale: logoScale },
                { translateY: logoRotateAnim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0, -2, 0]
                })}
              ]
            }
          ]}>
            <Text style={styles.welcomeTitle}>הכנס את שמך להתחלה</Text>
            <Text style={styles.welcomeDescription}>
              המערכת תזהה אותך ותתאים לך טיפול אישי
            </Text>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.nameInput}
                placeholder="השם המלא שלך"
                value={nameInput}
                onChangeText={setNameInput}
                placeholderTextColor="#94A3B8"
                textAlign="right"
                autoCorrect={false}
                autoCapitalize="words"
              />
            </View>

            <TouchableOpacity 
              style={[
                styles.searchButton,
                (!nameInput.trim() || loading) && styles.searchButtonDisabled
              ]}
              onPress={handleNameSubmit}
              disabled={!nameInput.trim() || loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.searchButtonText}>מצא את הפרופיל שלי</Text>
              )}
            </TouchableOpacity>
          </Animated.View>

          {/* Features with staggered animations */}
          <View style={styles.featuresContainer}>
            <Text style={styles.featuresTitle}>מה תקבל במערכת?</Text>
            {[
              { icon: '🧠', title: 'טיפול מותאם אישית', desc: 'סיפורים טיפוליים המותאמים לחוויה האישית שלך' },
              { icon: '📱', title: 'נגיש בכל מקום', desc: 'המשך את הטיפול מהבית, בקצב שלך' },
              { icon: '��', title: 'מעקב התקדמות', desc: 'עקוב אחר השיפור שלך לאורך זמן' }
            ].map((feature, index) => (
              <Animated.View 
                key={index}
                style={[
                  styles.feature,
                  {
                    opacity: fadeAnim,
                    transform: [{
                      translateX: slideAnim.interpolate({
                        inputRange: [0, 30],
                        outputRange: [0, 30 * (index + 1)]
                      })
                    }]
                  }
                ]}
              >
                <Text style={styles.featureIcon}>{feature.icon}</Text>
                <View style={styles.featureContent}>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureDescription}>{feature.desc}</Text>
                </View>
              </Animated.View>
            ))}
    </View>
        </Animated.ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E40AF',
  },
  gradientBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#1E40AF',
    // Add gradient overlay effect
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  heroSection: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoMain: {
    fontSize: 42,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 2,
  },
  logoAccent: {
    width: 60,
    height: 4,
    backgroundColor: '#60A5FA',
    borderRadius: 2,
    marginTop: 8,
  },
  tagline: {
    fontSize: 20,
    fontWeight: '600',
    color: '#DBEAFE',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#BFDBFE',
    textAlign: 'center',
    lineHeight: 24,
    opacity: 0.9,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  featureCard: {
    width: (width - 48 - 16) / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    backdropFilter: 'blur(10px)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  featureIconContainer: {
    width: 50,
    height: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureIcon: {
    fontSize: 20,
    marginBottom: 8,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 4,
  },
  featureSubtitle: {
    fontSize: 12,
    color: '#BFDBFE',
    textAlign: 'center',
  },
  ctaButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 32,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  ctaContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E40AF',
    marginRight: 12,
  },
  ctaIcon: {
    width: 32,
    height: 32,
    backgroundColor: '#1E40AF',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ctaArrow: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  trustSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  trustItem: {
    alignItems: 'center',
  },
  trustIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  trustText: {
    fontSize: 11,
    color: '#BFDBFE',
    textAlign: 'center',
  },
  footer: {
    alignItems: 'center',
    marginTop: 'auto',
  },
  footerText: {
    fontSize: 11,
    color: 'rgba(191, 219, 254, 0.7)',
    textAlign: 'center',
    lineHeight: 16,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoutButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  userInfo: {
    marginLeft: 16,
  },
  welcomeBackText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  userNameText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  logo: {
    fontSize: 48,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  appName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  accentLine: {
    width: 60,
    height: 4,
    backgroundColor: '#60A5FA',
    borderRadius: 2,
  },
  quickStats: {
    alignItems: 'center',
    marginBottom: 20,
  },
  quickStatsTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  quickStatsSubtitle: {
    fontSize: 16,
    color: '#BFDBFE',
    textAlign: 'center',
  },
  continueButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 32,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E40AF',
    marginRight: 12,
  },
  continueButtonArrow: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E40AF',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickActionButton: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  quickActionIcon: {
    fontSize: 24,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
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
    borderRadius: 8,
    padding: 16,
  },
  submitButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  submitButtonText: {
    fontSize: 16,
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
    width: (width - 48 - 16) / 2,
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
  subtitle: {
    fontSize: 16,
    color: '#BFDBFE',
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
    // Add gradient-like effect
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
    marginBottom: 16,
  },
  anxietyIcon: {
    fontSize: 48,
    color: '#FFFFFF',
  },
  anxietyTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  anxietySubtitle: {
    fontSize: 16,
    color: '#BFDBFE',
    textAlign: 'center',
    lineHeight: 24,
  },
  anxietyExplanation: {
    alignItems: 'center',
    marginBottom: 20,
  },
  explanationCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    backdropFilter: 'blur(10px)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  explanationTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  explanationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  explanationDot: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginRight: 8,
  },
  explanationText: {
    fontSize: 14,
    color: '#BFDBFE',
  },
  anxietySelectorContainer: {
    marginBottom: 20,
  },
  selectorLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  anxietySelector: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 16,
  },
  selectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectorValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginRight: 16,
  },
  selectorTextContainer: {
    flex: 1,
  },
  selectorText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  selectorSubtext: {
    fontSize: 12,
    color: '#BFDBFE',
  },
  selectorArrow: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  encouragementContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  encouragementIcon: {
    fontSize: 24,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  encouragementText: {
    fontSize: 16,
    color: '#BFDBFE',
    textAlign: 'center',
  },
  anxietyActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  anxietyBackButton: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  anxietyBackButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  anxietyStartButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
  },
  anxietyStartButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E40AF',
    marginRight: 8,
  },
  anxietyStartButtonIcon: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E40AF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  anxietyDropdownContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 0,
    width: '100%',
    maxWidth: 350,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  anxietyDropdownHeader: {
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  anxietyDropdownTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E40AF',
    marginBottom: 8,
    textAlign: 'center',
  },
  anxietyDropdownSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
  anxietyDropdownList: {
    maxHeight: 300,
  },
  anxietyDropdownContent: {
    padding: 0,
  },
  anxietyDropdownItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  anxietyDropdownItemSelected: {
    backgroundColor: '#EBF4FF',
  },
  anxietyDropdownItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  anxietyDropdownValueContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  anxietyDropdownValueContainerSelected: {
    backgroundColor: '#3B82F6',
    borderColor: '#2563EB',
  },
  anxietyDropdownValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  anxietyDropdownValueSelected: {
    color: '#FFFFFF',
  },
  anxietyDropdownTextContainer: {
    flex: 1,
  },
  anxietyDropdownText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  anxietyDropdownTextSelected: {
    color: '#3B82F6',
    fontWeight: '700',
  },
  anxietyDropdownRange: {
    fontSize: 12,
    color: '#64748B',
  },
  anxietyDropdownCheckContainer: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  anxietyDropdownCheck: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  anxietyDropdownCloseButton: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    margin: 20,
    marginTop: 0,
  },
  anxietyDropdownCloseText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
  logoCircleShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#3B82F6',
  },
}); 
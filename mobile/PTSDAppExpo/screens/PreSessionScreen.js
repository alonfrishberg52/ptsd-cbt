import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  SafeAreaView, 
  ScrollView, 
  ActivityIndicator, 
  Alert,
  Animated,
  Dimensions
} from 'react-native';
import { fetchPatients } from '../api';
import { useSession } from '../SessionContext';
import LottieView from 'lottie-react-native';
import DynamicBackground from '../components/DynamicBackground';

const { width } = Dimensions.get('window');

export default function PreSessionScreen({ navigation }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState(null);
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  const session = useSession();

  // Loader state for waiting for story
  const [waitingForStory, setWaitingForStory] = useState(false);
  const [storyError, setStoryError] = useState(null);

  // Fetch patient data when component mounts
  useEffect(() => {
    fetchPatients()
      .then(patients => {
        if (patients && patients.length > 0) {
          setPatient(patients[0]);
        }
        setLoading(false);
      })
      .catch(error => {
        console.log('Error fetching patients:', error);
        setLoading(false);
      });
  }, []);

  // Animation for step transitions
  useEffect(() => {
    // Animate step content
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(progressAnim, {
        toValue: (currentStep + 1) / steps.length,
        duration: 600,
        useNativeDriver: false,
      }),
    ]).start();
  }, [currentStep]);

  const steps = [
    {
      title: "שלום ויצירת קשר",
      content: "ברוך הבא למפגש הטיפולי שלך. זהו מרחב בטוח שנועד לעזור לך להתמודד עם הטראומה בצורה מדורגת ומקצועית. אנחנו כאן לליווי שלך.",
      icon: "👋",
      color: "#10B981",
      tip: "קח נשימה עמוקה והרפה"
    },
    {
      title: "יצירת בטחון",
      content: "המפגש הזה מתנהל בסביבה בטוחה לחלוטין. תוכל לעצור בכל רגע, לקחת הפסקה או לפנות לתמיכה. אתה שולט על הקצב והתהליך.",
      icon: "🛡️",
      color: "#3B82F6",
      tip: "זכור: אתה תמיד בשליטה"
    },
    {
      title: "כלים להרגעה",
      content: "אם תרגיש מתח במהלך המפגש, השתמש בטכניקות ההרגעה: נשימה עמוקה (4 שניות פנימה, 6 החוצה), הארקה (5-4-3-2-1), או מחשבות מרגיעות.",
      icon: "🧘‍♀️",
      color: "#8B5CF6",
      tip: "בואו נתרגל יחד נשימה עמוקה"
    },
    {
      title: "מוכנות למפגש",
      content: "מצוין! אתה מוכן להתחיל. זכור שהמטפל שלך זמין לכל שאלה או תמיכה. המפגש יתנהל בקצב שלך ובהתאם לרמת הנוחות שלך.",
      icon: "🌟",
      color: "#F59E0B",
      tip: "בהצלחה! אתה עושה דבר אמיץ"
    }
  ];

  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  // Handler for last step (start session)
  const handleStartSession = async () => {
    setStoryError(null);
    if (session.storyResult && session.storyResult.status === 'success') {
      navigation.navigate('Session', {
        patient: session.patient,
        initialStory: session.storyResult.result,
        initialStage: session.storyResult.stage,
        initialScenarioState: session.storyResult.scenario_state
      });
    } else if (session.storyResult && session.storyResult.status === 'error') {
      setStoryError(session.storyResult.message || 'שגיאה בהתחלת המפגש');
    } else {
      setWaitingForStory(true);
      try {
        const result = await session.storyPromise;
        if (result.status === 'success') {
          navigation.navigate('Session', {
            patient: session.patient,
            initialStory: result.result,
            initialStage: result.stage,
            initialScenarioState: result.scenario_state
          });
        } else {
          setStoryError(result.message || 'שגיאה בהתחלת המפגש');
        }
      } catch (err) {
        setStoryError('שגיאה בתקשורת עם השרת');
      }
      setWaitingForStory(false);
    }
  };

  const handleNext = () => {
    fadeAnim.setValue(0);
    slideAnim.setValue(30);
    if (isLastStep) {
      handleStartSession();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    fadeAnim.setValue(0);
    slideAnim.setValue(-30);
    setCurrentStep(currentStep - 1);
  };

  // Show loading indicator while fetching patient data
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <DynamicBackground />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>מכין את המפגש שלך...</Text>
          <Text style={styles.loadingSubtext}>טוען נתוני מטופל</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show loader if waiting for story or session.isLoading
  if (waitingForStory || session.isLoading) {
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
        {storyError && (
          <Text style={{ color: 'red', marginTop: 20 }}>{storyError}</Text>
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <DynamicBackground />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>הכנה למפגש</Text>
          <Text style={styles.headerSubtitle}>
            שלב {currentStep + 1} מתוך {steps.length}
          </Text>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <Animated.View 
              style={[
                styles.progressBar,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                  backgroundColor: currentStepData.color,
                }
              ]} 
            />
          </View>
          <View style={styles.progressSteps}>
            {steps.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.progressStep,
                  { 
                    backgroundColor: index <= currentStep ? currentStepData.color : '#E2E8F0',
                    borderColor: index === currentStep ? currentStepData.color : 'transparent',
                  }
                ]}
              >
                <Text style={[
                  styles.progressStepText,
                  { color: index <= currentStep ? '#FFFFFF' : '#64748B' }
                ]}>
                  {index + 1}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Step Content */}
        <Animated.View 
          style={[
            styles.stepCard,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
              borderLeftColor: currentStepData.color,
            }
          ]}
        >
          <View style={[styles.stepIconContainer, { backgroundColor: currentStepData.color }]}>
            <Text style={styles.stepIcon}>{currentStepData.icon}</Text>
          </View>
          
          <Text style={styles.stepTitle}>{currentStepData.title}</Text>
          <Text style={styles.stepContent}>{currentStepData.content}</Text>
          
          {/* Tip Section */}
          <View style={styles.tipContainer}>
            <View style={styles.tipIcon}>
              <Text style={styles.tipIconText}>💡</Text>
            </View>
            <Text style={styles.tipText}>{currentStepData.tip}</Text>
          </View>
        </Animated.View>

        {/* Navigation Buttons */}
        <View style={styles.navigationContainer}>
          {currentStep > 0 && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBack}
              activeOpacity={0.8}
            >
              <Text style={styles.backButtonText}>← חזור</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.nextButton,
              { 
                backgroundColor: currentStepData.color,
                flex: currentStep === 0 ? 1 : 0.6,
              }
            ]}
            onPress={handleNext}
            activeOpacity={0.8}
          >
            <Text style={styles.nextButtonText}>
              {isLastStep ? "התחל מפגש 🚀" : "המשך →"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Emergency Support */}
        <View style={styles.supportCard}>
          <View style={styles.supportHeader}>
            <Text style={styles.supportIcon}>🆘</Text>
            <Text style={styles.supportTitle}>תמיכה מיידית</Text>
          </View>
          <Text style={styles.supportText}>
            זקוק לעזרה? אל תהסס לפנות למטפל שלך או לשירותי חירום
          </Text>
          <TouchableOpacity style={styles.supportButton}>
            <Text style={styles.supportButtonText}>צור קשר</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 16,
    textAlign: 'center',
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 8,
    textAlign: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
  },
  progressContainer: {
    marginBottom: 32,
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    marginBottom: 20,
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  progressSteps: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  progressStep: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  progressStepText: {
    fontSize: 14,
    fontWeight: '600',
  },
  stepCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 32,
    marginBottom: 24,
    borderLeftWidth: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  stepIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 24,
  },
  stepIcon: {
    fontSize: 36,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 16,
  },
  stepContent: {
    fontSize: 16,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 24,
  },
  tipContainer: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  tipIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F59E0B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  tipIconText: {
    fontSize: 16,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: '#92400E',
    fontWeight: '500',
  },
  navigationContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  backButton: {
    flex: 0.4,
    backgroundColor: '#F1F5F9',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#475569',
  },
  nextButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  supportCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  supportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  supportIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  supportTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#991B1B',
  },
  supportText: {
    fontSize: 14,
    color: '#7F1D1D',
    lineHeight: 20,
    marginBottom: 16,
  },
  supportButton: {
    backgroundColor: '#DC2626',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  supportButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
}); 
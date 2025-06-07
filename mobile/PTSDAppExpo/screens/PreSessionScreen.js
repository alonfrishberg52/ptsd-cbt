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
  Dimensions,
  Image
} from 'react-native';
import { useSession } from '../SessionContext';
import LottieView from 'lottie-react-native';
import DynamicBackground from '../components/DynamicBackground';

const { width } = Dimensions.get('window');

export default function PreSessionScreen({ navigation, route }) {
  const [currentStep, setCurrentStep] = useState(0);
  const patient = route?.params?.patient || null;
  const [loading, setLoading] = useState(false);
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  const session = useSession();

  // Loader state for waiting for story
  const [waitingForStory, setWaitingForStory] = useState(false);
  const [storyError, setStoryError] = useState(null);

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
        const result = await session.getStoryPromise();
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
        <View style={styles.figmaHeader}>
          <Image source={require('../assets/logo.png')} style={styles.figmaLogo} />
          <Text style={styles.figmaHeaderTitle}>הכנה למפגש</Text>
          <Text style={styles.figmaHeaderSubtitle}>שלב {currentStep + 1} מתוך {steps.length}</Text>
        </View>

        {/* Progress Bar */}
        <View style={styles.figmaProgressContainer}>
          <View style={styles.figmaProgressTrack}>
            <Animated.View 
              style={[
                styles.figmaProgressBar,
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
          <View style={styles.figmaProgressSteps}>
            {steps.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.figmaProgressStep,
                  { 
                    backgroundColor: index <= currentStep ? currentStepData.color : '#E2E8F0',
                    borderColor: index === currentStep ? currentStepData.color : 'transparent',
                  }
                ]}
              >
                <Text style={[
                  styles.figmaProgressStepText,
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
            styles.figmaStepCard,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
              borderLeftColor: currentStepData.color,
            }
          ]}
        >
          <View style={[styles.figmaStepIconContainer, { backgroundColor: currentStepData.color }]}>
            <Text style={styles.figmaStepIcon}>{currentStepData.icon}</Text>
          </View>
          
          <Text style={styles.figmaStepTitle}>{currentStepData.title}</Text>
          <Text style={styles.figmaStepContent}>{currentStepData.content}</Text>
          
          {/* Tip Section */}
          <View style={styles.figmaTipContainer}>
            <View style={styles.figmaTipIcon}>
              <Text style={styles.figmaTipIconText}>💡</Text>
            </View>
            <Text style={styles.figmaTipText}>{currentStepData.tip}</Text>
          </View>
        </Animated.View>

        {/* Navigation Buttons */}
        <View style={styles.figmaNavigationContainer}>
          {currentStep > 0 && (
            <TouchableOpacity
              style={styles.figmaBackButton}
              onPress={handleBack}
              activeOpacity={0.8}
            >
              <Text style={styles.figmaBackButtonText}>← חזור</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.figmaNextButton,
              { 
                backgroundColor: currentStepData.color,
                flex: currentStep === 0 ? 1 : 0.6,
              }
            ]}
            onPress={handleNext}
            activeOpacity={0.8}
          >
            <Text style={styles.figmaNextButtonText}>
              {isLastStep ? "התחל מפגש 🚀" : "המשך →"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Emergency Support */}
        <View style={styles.figmaSupportCard}>
          <View style={styles.figmaSupportHeader}>
            <Text style={styles.figmaSupportIcon}>��</Text>
            <Text style={styles.figmaSupportTitle}>תמיכה מיידית</Text>
          </View>
          <Text style={styles.figmaSupportText}>
            זקוק לעזרה? אל תהסס לפנות למטפל שלך או לשירותי חירום
          </Text>
          <TouchableOpacity style={styles.figmaSupportButton}>
            <Text style={styles.figmaSupportButtonText}>צור קשר</Text>
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
  figmaHeader: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 20,
  },
  figmaLogo: {
    width: 80,
    height: 80,
    resizeMode: 'contain',
    marginBottom: 8,
  },
  figmaHeaderTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 4,
  },
  figmaHeaderSubtitle: {
    fontSize: 17,
    color: '#64748B',
    textAlign: 'center',
  },
  figmaProgressContainer: {
    marginBottom: 32,
  },
  figmaProgressTrack: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    marginBottom: 20,
  },
  figmaProgressBar: {
    height: '100%',
    borderRadius: 4,
  },
  figmaProgressSteps: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  figmaProgressStep: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  figmaProgressStepText: {
    fontSize: 15,
    fontWeight: '700',
  },
  figmaStepCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 36,
    marginBottom: 28,
    borderLeftWidth: 7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 6,
  },
  figmaStepIconContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 28,
  },
  figmaStepIcon: {
    fontSize: 40,
  },
  figmaStepTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 18,
  },
  figmaStepContent: {
    fontSize: 17,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 28,
  },
  figmaTipContainer: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
  },
  figmaTipIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F59E0B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  figmaTipIconText: {
    fontSize: 18,
  },
  figmaTipText: {
    flex: 1,
    fontSize: 15,
    color: '#92400E',
    fontWeight: '600',
  },
  figmaNavigationContainer: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 28,
  },
  figmaBackButton: {
    flex: 0.4,
    backgroundColor: '#F1F5F9',
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  figmaBackButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#475569',
  },
  figmaNextButton: {
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
    elevation: 4,
  },
  figmaNextButtonText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  figmaSupportCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 18,
    padding: 24,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  figmaSupportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  figmaSupportIcon: {
    fontSize: 26,
    marginRight: 10,
  },
  figmaSupportTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#991B1B',
  },
  figmaSupportText: {
    fontSize: 15,
    color: '#7F1D1D',
    lineHeight: 22,
    marginBottom: 18,
  },
  figmaSupportButton: {
    backgroundColor: '#DC2626',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  figmaSupportButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
}); 
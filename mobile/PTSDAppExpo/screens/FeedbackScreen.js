import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView,
  SafeAreaView,
  Modal,
  FlatList,
  Animated,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { submitSessionFeedback } from '../api';
import { Picker } from '@react-native-picker/picker';
import DynamicBackground from '../components/DynamicBackground';
import { useSession } from '../SessionContext';
import LottieView from 'lottie-react-native';

const { width } = Dimensions.get('window');

export default function FeedbackScreen({ route, navigation }) {
  const { sessionData } = route.params || {};
  
  // Animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  // Form state
  const [finalSUD, setFinalSUD] = useState(50);
  const [helpfulness, setHelpfulness] = useState(5);
  const [comfort, setComfort] = useState(5);
  const [difficulty, setDifficulty] = useState(5);
  const [improvement, setImprovement] = useState(5);
  const [wouldRecommend, setWouldRecommend] = useState('yes');
  const [comments, setComments] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showSudModal, setShowSudModal] = useState(false);

  // Badge system
  const { BADGE_DEFS, badges, unlockBadge } = useSession();
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [unlockedBadge, setUnlockedBadge] = useState(null);
  const [showGallery, setShowGallery] = useState(false);

  // Calculate session duration and format it nicely
  const getSessionSummary = () => {
    const startTime = sessionData?.startTime ? new Date(sessionData.startTime) : new Date(Date.now() - 30*60000); // Default 30 min ago
    const endTime = new Date();
    const durationMs = endTime.getTime() - startTime.getTime();
    
    // Format duration
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((durationMs % (1000 * 60)) / 1000);
    
    let durationText = '';
    if (hours > 0) {
      durationText = `${hours} שעות ו-${minutes} דקות`;
    } else if (minutes > 0) {
      durationText = `${minutes} דקות`;
      if (seconds > 30) {
        durationText += ` ו-${seconds} שניות`;
      }
    } else {
      durationText = `${seconds} שניות`;
    }
    
    return {
      sessionType: sessionData?.sessionType || 'מושלם',
      chaptersCompleted: sessionData?.chaptersCompleted || 3,
      totalChapters: 3,
      duration: durationText,
      formattedStartTime: startTime.toLocaleTimeString('he-IL', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      formattedEndTime: endTime.toLocaleTimeString('he-IL', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      sessionDate: endTime.toLocaleDateString('he-IL'),
      durationMinutes: Math.round(durationMs / (1000 * 60))
    };
  };

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleSubmit = async () => {
    setLoading(true);
    
    try {
      const summary = getSessionSummary();
      
      const feedbackData = {
        // Session info
        sessionType: summary.sessionType,
        chaptersCompleted: summary.chaptersCompleted,
        sessionDuration: summary.durationMinutes,
        sessionDate: summary.sessionDate,
        startTime: summary.formattedStartTime,
        endTime: summary.formattedEndTime,
        
        // Ratings
        finalSUD,
        helpfulness,
        comfort,
        difficulty,
        improvement,
        wouldRecommend,
        
        // Comments
        comments: comments.trim(),
        
        // Patient info (if available)
        patientId: sessionData?.patient?.patient_id || 'unknown',
        patientName: sessionData?.patient?.name || 'אנונימי',
        
        // Timestamp
        submittedAt: new Date().toISOString()
      };

      const result = await submitSessionFeedback(feedbackData);
      
      if (result.status === 'success') {
        // Award first_feedback badge if not already unlocked
        if (!badges.includes('first_feedback')) {
          unlockBadge('first_feedback');
          setUnlockedBadge(BADGE_DEFS.find(b => b.key === 'first_feedback'));
          setShowBadgeModal(true);
        }
        setSubmitted(true);
        // Navigate back after 3 seconds
        setTimeout(() => {
          navigation.reset({
            index: 0,
            routes: [{ name: 'Welcome' }],
          });
        }, 3000);
      } else {
        Alert.alert('שגיאה', 'שגיאה בשליחת המשוב. אנא נסה שוב.');
      }
    } catch (error) {
      console.log('Feedback submission error:', error);
      Alert.alert('שגיאה', 'שגיאה בחיבור לשרת. אנא נסה שוב.');
    }
    
    setLoading(false);
  };

  // Success screen
  if (submitted) {
    return (
      <SafeAreaView style={styles.container}>
        <DynamicBackground />
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          <View style={styles.successContainer}>
            <Text style={styles.successIcon}>✅</Text>
            <Text style={styles.successTitle}>תודה רבה!</Text>
            <Text style={styles.successMessage}>
              המשוב שלך נשלח בהצלחה{'\n'}
              ויעזור לנו לשפר את הטיפול
            </Text>
            <Text style={styles.successSubtitle}>
              חוזרים למסך הבית...
            </Text>
      </View>
        </Animated.View>
      </SafeAreaView>
    );
  }

  const summary = getSessionSummary();

  return (
    <SafeAreaView style={styles.container}>
      <DynamicBackground />
      {/* Badge Gallery Button */}
      <TouchableOpacity style={{ position: 'absolute', top: 36, right: 24, zIndex: 10 }} onPress={() => setShowGallery(true)}>
        <LottieView source={require('../assets/badge.json')} autoPlay loop style={{ width: 36, height: 36 }} />
      </TouchableOpacity>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardContainer}
      >
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          <ScrollView 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>משוב על המפגש</Text>
              <Text style={styles.subtitle}>עזור לנו לשפר את החוויה שלך</Text>
            </View>

            {/* Session Summary */}
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>סיכום המפגש</Text>
              
              <View style={styles.summaryGrid}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>סוג מפגש</Text>
                  <View style={[styles.sessionTypeChip, 
                    summary.sessionType === 'מושלם' && styles.sessionTypeCompleted,
                    summary.sessionType === 'יצאת' && styles.sessionTypeExited,
                    summary.sessionType === 'הופסק' && styles.sessionTypeInterrupted
                  ]}>
                    <Text style={styles.sessionTypeText}>{summary.sessionType}</Text>
                  </View>
                </View>
                
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>פרקים</Text>
                  <Text style={styles.summaryValue}>
                    {summary.chaptersCompleted}/{summary.totalChapters}
                  </Text>
                </View>
              </View>
              
              <View style={styles.timingCard}>
                <Text style={styles.timingTitle}>⏱️ זמן המפגש</Text>
                <View style={styles.timingRow}>
                  <Text style={styles.timingLabel}>התחלה:</Text>
                  <Text style={styles.timingValue}>{summary.formattedStartTime}</Text>
                </View>
                <View style={styles.timingRow}>
                  <Text style={styles.timingLabel}>סיום:</Text>
                  <Text style={styles.timingValue}>{summary.formattedEndTime}</Text>
                </View>
                <View style={styles.timingRow}>
                  <Text style={styles.timingLabel}>משך זמן:</Text>
                  <Text style={[styles.timingValue, styles.durationHighlight]}>
                    {summary.duration}
                  </Text>
                </View>
                <Text style={styles.timingDate}>{summary.sessionDate}</Text>
              </View>
            </View>

            {/* SUD Rating */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>רמת החרדה הסופית (SUD)</Text>
              <Text style={styles.cardSubtitle}>איך אתה מרגיש עכשיו? (10-100)</Text>
              
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.customPickerContainer}
                onPress={() => setShowSudModal(true)}
              >
                <Text style={styles.customPickerText}>
                  {finalSUD} - {getSUDDescription(finalSUD)}
                </Text>
                <Text style={styles.customPickerArrow}>▼</Text>
              </TouchableOpacity>
              <Modal visible={showSudModal} transparent animationType="fade">
                <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowSudModal(false)}>
                  <View style={styles.sudModalContent}>
                    <ScrollView showsVerticalScrollIndicator={false}>
                      {Array.from({length: 10}, (_, i) => (10 + i * 10)).map(value => (
                        <TouchableOpacity
                          key={value}
                          style={[
                            styles.sudModalItem,
                            finalSUD === value && styles.sudModalItemSelected
                          ]}
                          onPress={() => {
                            setFinalSUD(value);
                            setShowSudModal(false);
                          }}
                        >
                          <Text style={[
                            styles.sudModalItemText,
                            finalSUD === value && styles.sudModalItemTextSelected
                          ]}>
                            {value} - {getSUDDescription(value)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </TouchableOpacity>
              </Modal>
            </View>

            {/* Rating Scales */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>דירוג החוויה</Text>
              
              <RatingRow 
                title="כמה המפגש עזר לך?"
                value={helpfulness}
                onChange={setHelpfulness}
                lowLabel="לא עזר"
                highLabel="עזר מאוד"
              />
              
              <RatingRow 
                title="כמה נוח הרגשת?"
                value={comfort}
                onChange={setComfort}
                lowLabel="לא נוח"
                highLabel="נוח מאוד"
              />
              
              <RatingRow 
                title="כמה קשה היה המפגש?"
                value={difficulty}
                onChange={setDifficulty}
                lowLabel="קל מאוד"
                highLabel="קשה מאוד"
              />
              
              <RatingRow 
                title="האם תרגיש שיפור?"
                value={improvement}
                onChange={setImprovement}
                lowLabel="לא בכלל"
                highLabel="שיפור גדול"
              />
            </View>

            {/* Recommendation */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>המלצה</Text>
              <Text style={styles.cardSubtitle}>האם תמליץ על המפגש לאחרים?</Text>
              
              <View style={styles.recommendationContainer}>
                <TouchableOpacity 
                  style={[
                    styles.recommendationButton,
                    wouldRecommend === 'yes' && styles.recommendationButtonActive
                  ]}
                  onPress={() => setWouldRecommend('yes')}
                >
                  <Text style={[
                    styles.recommendationText,
                    wouldRecommend === 'yes' && styles.recommendationTextActive
                  ]}>
                    👍 כן, אמליץ
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[
                    styles.recommendationButton,
                    wouldRecommend === 'no' && styles.recommendationButtonActive
                  ]}
                  onPress={() => setWouldRecommend('no')}
                >
                  <Text style={[
                    styles.recommendationText,
                    wouldRecommend === 'no' && styles.recommendationTextActive
                  ]}>
                    👎 לא אמליץ
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Comments */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>הערות נוספות</Text>
              <Text style={styles.cardSubtitle}>שתף אותנו במחשבות שלך (אופציונלי)</Text>
              
      <TextInput
                style={styles.commentsInput}
                value={comments}
                onChangeText={setComments}
                placeholder="איך היה המפגש בשבילך? מה היה טוב? מה אפשר לשפר?"
                placeholderTextColor="#94A3B8"
        multiline
                numberOfLines={4}
                textAlign="right"
                maxLength={500}
      />
              <Text style={styles.characterCount}>
                {comments.length}/500 תווים
              </Text>
            </View>

            {/* Submit Button */}
            <TouchableOpacity 
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={styles.submitButtonText}>
                {loading ? 'שולח משוב...' : 'שלח משוב'}
              </Text>
            </TouchableOpacity>
            
            <View style={styles.bottomSpacer} />
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
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
      {/* Badge Gallery Modal */}
      <Modal visible={showGallery} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(30,64,175,0.12)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 24, padding: 24, width: 340, alignItems: 'center', maxHeight: 500, shadowColor: '#1E40AF', shadowOpacity: 0.15, shadowRadius: 16, elevation: 10 }}>
            <Text style={{ fontSize: 26, fontWeight: 'bold', color: '#1E40AF', marginBottom: 10, letterSpacing: 1 }}>התגים שלי</Text>
            <Text style={{ color: '#64748B', fontSize: 15, marginBottom: 18 }}>אסוף תגי התמדה, הישגים והפתעות!</Text>
            <ScrollView style={{ width: '100%' }} contentContainerStyle={{ alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }}>
                {BADGE_DEFS.map((badge, idx) => {
                  const unlocked = badges.includes(badge.key);
                  return (
                    <TouchableOpacity
                      key={badge.key}
                      activeOpacity={0.8}
                      style={{ width: 90, alignItems: 'center', margin: 8 }}
                      onPress={() => unlocked && setUnlockedBadge(badge)}
                    >
                      <View style={{
                        width: 60,
                        height: 60,
                        borderRadius: 30,
                        backgroundColor: unlocked ? '#E0F2FE' : '#F1F5F9',
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginBottom: 6,
                        borderWidth: unlocked ? 2 : 1,
                        borderColor: unlocked ? '#3B82F6' : '#CBD5E1',
                        shadowColor: unlocked ? '#3B82F6' : '#000',
                        shadowOpacity: unlocked ? 0.18 : 0.06,
                        shadowRadius: 6,
                        elevation: unlocked ? 6 : 2,
                        overflow: 'hidden',
                      }}>
                        <LottieView
                          source={badge.icon}
                          autoPlay={unlocked}
                          loop={unlocked}
                          style={{ width: 48, height: 48, opacity: unlocked ? 1 : 0.3, filter: unlocked ? undefined : 'grayscale(1)' }}
                        />
                        {!unlocked && (
                          <View style={{
                            ...StyleSheet.absoluteFillObject,
                            backgroundColor: 'rgba(255,255,255,0.7)',
                            borderRadius: 30,
                          }} />
                        )}
                      </View>
                      <Text style={{ fontWeight: 'bold', color: unlocked ? '#1E40AF' : '#64748B', fontSize: 14, textAlign: 'center' }}>{badge.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
            <TouchableOpacity onPress={() => setShowGallery(false)} style={{ marginTop: 18, backgroundColor: '#1E40AF', borderRadius: 16, paddingVertical: 12, paddingHorizontal: 36, shadowColor: '#1E40AF', shadowOpacity: 0.18, shadowRadius: 8, elevation: 6 }}>
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 18, letterSpacing: 1 }}>סגור</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Helper component for rating rows
function RatingRow({ title, value, onChange, lowLabel, highLabel }) {
  return (
    <View style={styles.ratingRow}>
      <Text style={styles.ratingTitle}>{title}</Text>
      <View style={styles.ratingScale}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
          <TouchableOpacity
            key={num}
            style={[
              styles.ratingButton,
              value === num && styles.ratingButtonActive
            ]}
            onPress={() => onChange(num)}
          >
            <Text style={[
              styles.ratingButtonText,
              value === num && styles.ratingButtonTextActive
            ]}>
              {num}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.ratingLabels}>
        <Text style={styles.ratingLabel}>{lowLabel}</Text>
        <Text style={styles.ratingLabel}>{highLabel}</Text>
      </View>
    </View>
  );
}

// Helper function for SUD descriptions
function getSUDDescription(value) {
  if (value <= 20) return 'רגוע מאוד';
  if (value <= 40) return 'רגוע';
  if (value <= 60) return 'חרדה בינונית';
  if (value <= 80) return 'חרד';
  return 'חרדה גבוהה';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  header: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    borderLeftWidth: 6,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 16,
    textAlign: 'center',
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#64748B',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  sessionTypeChip: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  sessionTypeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  sessionTypeCompleted: {
    backgroundColor: '#10B981',
  },
  sessionTypeExited: {
    backgroundColor: '#F59E0B',
  },
  sessionTypeInterrupted: {
    backgroundColor: '#EF4444',
  },
  timingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  timingTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 16,
  },
  timingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  timingLabel: {
    fontSize: 14,
    color: '#64748B',
  },
  timingValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  timingDate: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 16,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 16,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
  },
  picker: {
    width: '100%',
    height: 50,
  },
  pickerItem: {
    fontSize: 16,
    color: '#1E293B',
  },
  ratingRow: {
    marginBottom: 24,
  },
  ratingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 12,
  },
  ratingScale: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  ratingButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  ratingButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  ratingButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  ratingButtonTextActive: {
    color: '#FFFFFF',
  },
  ratingLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  ratingLabel: {
    fontSize: 12,
    color: '#94A3B8',
  },
  recommendationContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  recommendationButton: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  recommendationButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  recommendationText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  recommendationTextActive: {
    color: '#FFFFFF',
  },
  commentsInput: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1E293B',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minHeight: 100,
  },
  characterCount: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'right',
  },
  submitButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonDisabled: {
    backgroundColor: '#94A3B8',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  successIcon: {
    fontSize: 80,
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#10B981',
    textAlign: 'center',
    marginBottom: 16,
  },
  successMessage: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  successSubtitle: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  bottomSpacer: {
    height: 40,
  },
  customPickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
    marginTop: 8,
    marginBottom: 4,
    minHeight: 50,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  customPickerText: {
    fontSize: 17,
    color: '#1E293B',
    fontWeight: '600',
  },
  customPickerArrow: {
    fontSize: 18,
    color: '#64748B',
    marginLeft: 8,
  },
  sudModalContent: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 12,
    marginHorizontal: 32,
    marginTop: 120,
    maxHeight: 350,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  sudModalItem: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  sudModalItemSelected: {
    backgroundColor: '#E0F2FE',
  },
  sudModalItemText: {
    fontSize: 16,
    color: '#1E293B',
    textAlign: 'right',
  },
  sudModalItemTextSelected: {
    color: '#2563EB',
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 
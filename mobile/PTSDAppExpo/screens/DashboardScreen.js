import React, { useEffect, useState, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView, 
  RefreshControl, 
  Alert,
  Animated,
  Dimensions,
  StatusBar,
  SafeAreaView
} from 'react-native';
import { fetchPatients, fetchPlans, fetchAudit, fetchSessionFeedback, fetchNotifications } from '../api';
import DynamicBackground from '../components/DynamicBackground';

const { width } = Dimensions.get('window');

export default function DashboardScreen({ navigation }) {
  const [patients, setPatients] = useState([]);
  const [plans, setPlans] = useState([]);
  const [audit, setAudit] = useState([]);
  const [sessionFeedback, setSessionFeedback] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [statistics, setStatistics] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const loadData = async () => {
    try {
      const [patientsData, plansData, auditData, feedbackData, notificationsData] = await Promise.all([
        fetchPatients(),
        fetchPlans(),
        fetchAudit(),
        fetchSessionFeedback(),
        fetchNotifications()
      ]);
      setPatients(patientsData || []);
      setPlans(plansData || []);
      setAudit(auditData || []);
      setSessionFeedback(feedbackData.feedback || []);
      setNotifications(notificationsData || []);
      setStatistics(feedbackData.statistics || {});
    } catch (error) {
      Alert.alert('שגיאה', 'לא ניתן לטעון נתונים מהשרת');
      console.error('Dashboard data loading error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const StatCard = ({ title, value, color, icon, onPress, trend }) => (
    <TouchableOpacity 
      style={[styles.statCard, { borderTopColor: color }]} 
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.statHeader}>
        <View style={[styles.statIconContainer, { backgroundColor: color }]}>
          <Text style={styles.statIcon}>{icon}</Text>
        </View>
        {trend && (
          <View style={[styles.trendContainer, { backgroundColor: trend > 0 ? '#DCFCE7' : '#FEF2F2' }]}>
            <Text style={[styles.trendText, { color: trend > 0 ? '#166534' : '#DC2626' }]}>
              {trend > 0 ? '↗' : '↘'} {Math.abs(trend)}%
            </Text>
          </View>
        )}
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </TouchableOpacity>
  );

  const QuickActionCard = ({ title, subtitle, onPress, color, icon, badge }) => (
    <TouchableOpacity 
      style={[styles.actionCard, { borderLeftColor: color }]} 
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.actionHeader}>
        <View style={[styles.actionIconContainer, { backgroundColor: `${color}15` }]}>
          <Text style={[styles.actionIcon, { color }]}>{icon}</Text>
        </View>
        {badge && (
          <View style={[styles.badgeContainer, { backgroundColor: color }]}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
      </View>
      <Text style={styles.actionTitle}>{title}</Text>
      <Text style={styles.actionSubtitle}>{subtitle}</Text>
      <View style={styles.actionArrow}>
        <Text style={[styles.arrowText, { color }]}>→</Text>
      </View>
    </TouchableOpacity>
  );

  const ActivityItem = ({ item, index }) => (
    <Animated.View 
      style={[
        styles.activityItem,
        {
          opacity: fadeAnim,
          transform: [{
            translateX: slideAnim.interpolate({
              inputRange: [0, 30],
              outputRange: [0, 30],
            })
          }]
        }
      ]}
    >
      <View style={styles.activityIcon}>
        <View style={styles.activityDot} />
      </View>
      <View style={styles.activityContent}>
        <Text style={styles.activityText}>{item.action || 'פעילות'}</Text>
        <Text style={styles.activityTime}>{item.timestamp || 'זמן לא ידוע'}</Text>
      </View>
    </Animated.View>
  );

  const FeedbackItem = ({ item, index }) => {
    const getSessionTypeColor = (type) => {
      switch (type) {
        case 'completed': return '#10B981';
        case 'exited': return '#F59E0B';
        case 'interrupted': return '#EF4444';
        default: return '#3B82F6';
      }
    };

    const getSessionTypeIcon = (type) => {
      switch (type) {
        case 'completed': return '✅';
        case 'exited': return '⏸️';
        case 'interrupted': return '❌';
        default: return '📝';
      }
    };

    return (
      <Animated.View 
        style={[
          styles.feedbackItem,
          {
            opacity: fadeAnim,
            transform: [{
              translateX: slideAnim.interpolate({
                inputRange: [0, 30],
                outputRange: [0, 30],
              })
            }],
            borderLeftColor: getSessionTypeColor(item.session_type)
          }
        ]}
      >
        <View style={styles.feedbackHeader}>
          <View style={styles.feedbackPatient}>
            <Text style={styles.feedbackPatientName}>{item.patient_name}</Text>
            <Text style={styles.feedbackDate}>
              {new Date(item.timestamp).toLocaleDateString('he-IL')}
            </Text>
          </View>
          <View style={styles.feedbackTypeContainer}>
            <Text style={styles.feedbackTypeIcon}>{getSessionTypeIcon(item.session_type)}</Text>
            <Text style={[styles.feedbackType, { color: getSessionTypeColor(item.session_type) }]}>
              {item.session_type === 'completed' ? 'הושלם' : 
               item.session_type === 'exited' ? 'יצא מוקדם' : 'הופסק'}
            </Text>
          </View>
        </View>
        
        <View style={styles.feedbackStats}>
          <View style={styles.feedbackStat}>
            <Text style={styles.feedbackStatValue}>{item.final_sud}</Text>
            <Text style={styles.feedbackStatLabel}>SUD סופי</Text>
          </View>
          <View style={styles.feedbackStat}>
            <Text style={styles.feedbackStatValue}>{item.helpfulness}/10</Text>
            <Text style={styles.feedbackStatLabel}>עזר</Text>
          </View>
          <View style={styles.feedbackStat}>
            <Text style={styles.feedbackStatValue}>{item.comfort_level}/10</Text>
            <Text style={styles.feedbackStatLabel}>נוחות</Text>
          </View>
          <View style={styles.feedbackStat}>
            <Text style={styles.feedbackStatValue}>{item.completed_chapters?.length || 0}</Text>
            <Text style={styles.feedbackStatLabel}>פרקים</Text>
          </View>
        </View>

        {item.free_text && (
          <View style={styles.feedbackText}>
            <Text style={styles.feedbackTextContent} numberOfLines={2}>
              "{item.free_text}"
            </Text>
          </View>
        )}

        <View style={styles.feedbackFooter}>
          <Text style={styles.feedbackRecommendation}>
            {item.would_recommend ? '👍 ממליץ' : '👎 לא ממליץ'}
          </Text>
          <Text style={styles.feedbackDuration}>
            {Math.round(item.session_duration / 60000)} דקות
          </Text>
        </View>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <DynamicBackground />
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <Animated.View 
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <ScrollView 
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Text style={styles.logo}>🧠</Text>
              <Text style={styles.appName}>NarraTIVE</Text>
            </View>
            <Text style={styles.subtitle}>לוח בקרה מטפלים</Text>
          </View>

          {/* Enhanced Statistics */}
          <View style={styles.statsSection}>
            <Text style={styles.sectionTitle}>סטטיסטיקות כלליות</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{patients.length}</Text>
                <Text style={styles.statLabel}>מטופלים פעילים</Text>
                <Text style={styles.statIcon}>👥</Text>
              </View>
              
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{statistics.total_feedback || 0}</Text>
                <Text style={styles.statLabel}>מפגשים כולל</Text>
                <Text style={styles.statIcon}>📊</Text>
              </View>
              
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{statistics.completion_rate || 0}%</Text>
                <Text style={styles.statLabel}>השלמת מפגשים</Text>
                <Text style={styles.statIcon}>✅</Text>
              </View>
              
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{statistics.avg_helpfulness || 0}/10</Text>
                <Text style={styles.statLabel}>דירוג עזרה</Text>
                <Text style={styles.statIcon}>⭐</Text>
              </View>
            </View>
            
            {/* Additional stats row */}
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{statistics.avg_improvement || 0}/10</Text>
                <Text style={styles.statLabel}>שיפור ממוצע</Text>
                <Text style={styles.statIcon}>📈</Text>
              </View>
              
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{statistics.recommendation_rate || 0}%</Text>
                <Text style={styles.statLabel}>שיעור המלצות</Text>
                <Text style={styles.statIcon}>👍</Text>
              </View>
            </View>
          </View>

          {/* Recent Session Feedback */}
          <View style={styles.feedbackSection}>
            <Text style={styles.sectionTitle}>משוב מפגשים אחרונים</Text>
            {sessionFeedback.length > 0 ? (
              sessionFeedback.slice(0, 10).map((feedback, index) => (
                <View key={index} style={styles.feedbackCard}>
                  <View style={styles.feedbackHeader}>
                    <View style={styles.feedbackPatientInfo}>
                      <Text style={styles.feedbackPatientName}>
                        {feedback.patient_name || 'מטופל אנונימי'}
                      </Text>
                      <Text style={styles.feedbackDate}>
                        {new Date(feedback.created_at).toLocaleDateString('he-IL')}
                      </Text>
                    </View>
                    
                    <View style={[
                      styles.sessionTypeBadge,
                      getSessionTypeStyle(feedback.session_type)
                    ]}>
                      <Text style={[
                        styles.sessionTypeText,
                        { color: getSessionTypeStyle(feedback.session_type).color }
                      ]}>
                        {feedback.session_type}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.feedbackMetrics}>
                    <View style={styles.metricItem}>
                      <Text style={styles.metricLabel}>SUD:</Text>
                      <Text style={styles.metricValue}>{feedback.final_sud}</Text>
                    </View>
                    <View style={styles.metricItem}>
                      <Text style={styles.metricLabel}>עזרה:</Text>
                      <Text style={styles.metricValue}>{feedback.helpfulness_rating}/10</Text>
                    </View>
                    <View style={styles.metricItem}>
                      <Text style={styles.metricLabel}>נוחות:</Text>
                      <Text style={styles.metricValue}>{feedback.comfort_rating}/10</Text>
                    </View>
                    <View style={styles.metricItem}>
                      <Text style={styles.metricLabel}>פרקים:</Text>
                      <Text style={styles.metricValue}>{feedback.chapters_completed}/3</Text>
                    </View>
                  </View>
                  
                  {feedback.comments && (
                    <View style={styles.feedbackComments}>
                      <Text style={styles.commentsTitle}>הערות המטופל:</Text>
                      <Text style={styles.commentsText}>
                        {feedback.comments.length > 100 
                          ? `${feedback.comments.substring(0, 100)}...` 
                          : feedback.comments
                        }
                      </Text>
                    </View>
                  )}
                  
                  <View style={styles.feedbackFooter}>
                    <Text style={styles.recommendationText}>
                      {feedback.would_recommend === 'yes' ? '👍 ימליץ' : '👎 לא ימליץ'}
                    </Text>
                    <Text style={styles.sessionDuration}>
                      {Math.round(feedback.session_duration_minutes)} דקות
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>אין משוב זמין עדיין</Text>
              </View>
            )}
          </View>

          {/* Quick Actions */}
          <View style={styles.actionsSection}>
            <Text style={styles.sectionTitle}>פעולות מהירות</Text>
            <View style={styles.actionsGrid}>
              <TouchableOpacity style={styles.actionCard}>
                <Text style={styles.actionIcon}>📝</Text>
                <Text style={styles.actionTitle}>הוסף מטופל</Text>
                <Text style={styles.actionDescription}>רישום מטופל חדש במערכת</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.actionCard}>
                <Text style={styles.actionIcon}>📊</Text>
                <Text style={styles.actionTitle}>דוחות מפורטים</Text>
                <Text style={styles.actionDescription}>צפה בדוחות התקדמות</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.actionCard}>
                <Text style={styles.actionIcon}>⚙️</Text>
                <Text style={styles.actionTitle}>הגדרות מערכת</Text>
                <Text style={styles.actionDescription}>נהל הגדרות וקונפיגורציה</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.actionCard}>
                <Text style={styles.actionIcon}>💬</Text>
                <Text style={styles.actionTitle}>משוב מטפלים</Text>
                <Text style={styles.actionDescription}>צפה בכל המשובים</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.bottomSpacer} />
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 60,
    paddingBottom: 32,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1E293B',
    letterSpacing: 1,
  },
  appName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748B',
    marginLeft: 12,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  content: {
    flex: 1,
  },
  statsSection: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: (width - 52) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderTopWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statIcon: {
    fontSize: 20,
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  trendContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '600',
  },
  feedbackSection: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  feedbackCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
    marginBottom: 12,
  },
  feedbackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  feedbackPatientInfo: {
    flex: 1,
  },
  feedbackPatientName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
  },
  feedbackDate: {
    fontSize: 12,
    color: '#64748B',
  },
  feedbackTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  feedbackTypeIcon: {
    fontSize: 16,
  },
  feedbackType: {
    fontSize: 12,
    fontWeight: '600',
  },
  feedbackMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
    paddingVertical: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  feedbackComments: {
    marginBottom: 12,
  },
  commentsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  commentsText: {
    fontSize: 12,
    color: '#64748B',
  },
  feedbackFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recommendationText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  sessionDuration: {
    fontSize: 12,
    color: '#94A3B8',
  },
  actionsSection: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  actionsGrid: {
    gap: 12,
  },
  actionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  actionIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 14,
    color: '#64748B',
  },
  bottomSpacer: {
    height: 32,
  },
  sessionTypeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  sessionTypeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
  },
}); 
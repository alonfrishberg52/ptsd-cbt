import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { fetchPlans } from '../api';
import DynamicBackground from '../components/DynamicBackground';

export default function PlanListScreen() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlans().then(p => { setPlans(p); setLoading(false); });
  }, []);

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#2563eb" />;

  return (
    <View style={styles.container}>
      <DynamicBackground />
      <Text style={styles.header}>רשימת תוכניות</Text>
      <FlatList
        data={plans}
        keyExtractor={item => item.plan_id || item._id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.title}>תוכנית: {item.title || item.plan_id}</Text>
            <Text>מטופל: {item.patient_id || '-'}</Text>
            <Text>סטטוס: {item.status || '-'}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 40 }}>אין תוכניות להצגה</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f7fb', padding: 16 },
  header: { fontSize: 22, fontWeight: 'bold', color: '#1E293B', marginBottom: 16, textAlign: 'center' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 18, marginBottom: 12, borderColor: '#E0E7EF', borderWidth: 1, shadowColor: '#B3E5FC', shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 },
  title: { fontSize: 17, fontWeight: 'bold', color: '#1E293B' },
}); 
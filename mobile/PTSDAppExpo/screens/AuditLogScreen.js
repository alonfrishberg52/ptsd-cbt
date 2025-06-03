import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { fetchAudit } from '../api';
import DynamicBackground from '../components/DynamicBackground';

export default function AuditLogScreen() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAudit().then(a => { setLogs(a); setLoading(false); });
  }, []);

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#2563eb" />;

  return (
    <View style={styles.container}>
      <DynamicBackground />
      <Text style={styles.header}>יומן פעולות</Text>
      <FlatList
        data={logs}
        keyExtractor={(_, idx) => String(idx)}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.type}>סוג: {item.type}</Text>
            <Text>מטופל: {item.patient_name}</Text>
            <Text>זמן: {new Date(item.timestamp).toLocaleString()}</Text>
            <Text>פרטים: {item.details}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 40 }}>אין פעולות להצגה</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f7fb', padding: 16 },
  header: { fontSize: 22, fontWeight: 'bold', color: '#1E293B', marginBottom: 16, textAlign: 'center' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 18, marginBottom: 12, borderColor: '#E0E7EF', borderWidth: 1, shadowColor: '#B3E5FC', shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 },
  type: { fontSize: 17, fontWeight: 'bold', color: '#1E293B' },
}); 
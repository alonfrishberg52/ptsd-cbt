import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { fetchPatients } from '../api';
import DynamicBackground from '../components/DynamicBackground';

export default function PatientListScreen({ navigation }) {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPatients().then(p => { setPatients(p); setLoading(false); });
  }, []);

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#2563eb" />;

  return (
    <View style={styles.container}>
      <DynamicBackground />
      <Text style={styles.header}>רשימת מטופלים</Text>
      <FlatList
        data={patients}
        keyExtractor={item => item.patient_id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('Stories', { patient: item })}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.info}>גיל: {item.age || '-'} | עיר: {item.city || '-'}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 40 }}>אין מטופלים להצגה</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f7fb', padding: 16 },
  header: { fontSize: 22, fontWeight: 'bold', color: '#1E293B', marginBottom: 16, textAlign: 'center' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 18, marginBottom: 12, borderColor: '#E0E7EF', borderWidth: 1, shadowColor: '#B3E5FC', shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 },
  name: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
  info: { fontSize: 15, color: '#1E293B', marginTop: 4 },
}); 
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { fetchStories } from '../api';
import DynamicBackground from '../components/DynamicBackground';

export default function StoryListScreen({ route, navigation }) {
  const { patient } = route.params;
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStories(patient.patient_id).then(s => { setStories(s); setLoading(false); });
  }, []);

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#2563eb" />;

  return (
    <View style={styles.container}>
      <DynamicBackground />
      <Text style={styles.header}>סיפורים עבור {patient.name}</Text>
      <FlatList
        data={stories}
        keyExtractor={item => item.story_id || item._id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('Player', { story: item })}>
            <Text style={styles.stage}>פרק {item.stage}</Text>
            <Text style={styles.summary}>{item.result?.story?.slice(0, 60) || '...'}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 40 }}>אין סיפורים להצגה</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f7fb', padding: 16 },
  header: { fontSize: 20, fontWeight: 'bold', color: '#1E293B', marginBottom: 16, textAlign: 'center' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, marginBottom: 12, borderColor: '#E0E7EF', borderWidth: 1, shadowColor: '#B3E5FC', shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 },
  stage: { fontSize: 16, fontWeight: 'bold', color: '#1E293B' },
  summary: { fontSize: 15, color: '#1E293B', marginTop: 4 },
}); 
import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { 
  searchPTSDResearch, searchCBTTechniques, fetchExposureTherapyMethods,
  fetchSUDScaleResearch, fetchNarrativeTherapy, searchTherapistResources,
  fetchCopingStrategies, fetchTriggerManagement 
} from '../api';

export default function ResearchScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchType, setSearchType] = useState('ptsd');

  async function handleSearch() {
    if (!searchQuery.trim() && ['ptsd', 'cbt', 'therapist'].includes(searchType)) return;
    
    setLoading(true);
    try {
      let data = [];
      switch (searchType) {
        case 'ptsd':
          data = await searchPTSDResearch(searchQuery);
          break;
        case 'cbt':
          data = await searchCBTTechniques(searchQuery);
          break;
        case 'exposure':
          data = await fetchExposureTherapyMethods();
          break;
        case 'sud':
          data = await fetchSUDScaleResearch();
          break;
        case 'narrative':
          data = await fetchNarrativeTherapy();
          break;
        case 'therapist':
          data = await searchTherapistResources(searchQuery);
          break;
        case 'coping':
          data = await fetchCopingStrategies();
          break;
        case 'triggers':
          data = await fetchTriggerManagement();
          break;
      }
      setResults(data);
    } catch (error) {
      console.error('Search error:', error);
    }
    setLoading(false);
  }

  const searchButtons = [
    { key: 'ptsd', label: 'חקר PTSD', needsQuery: true },
    { key: 'cbt', label: 'טכניקות CBT', needsQuery: true },
    { key: 'exposure', label: 'טיפול חשיפה', needsQuery: false },
    { key: 'sud', label: 'סולם SUD', needsQuery: false },
    { key: 'narrative', label: 'טיפול נרטיבי', needsQuery: false },
    { key: 'therapist', label: 'משאבי מטפל', needsQuery: true },
    { key: 'coping', label: 'אסטרטגיות התמודדות', needsQuery: false },
    { key: 'triggers', label: 'ניהול טריגרים', needsQuery: false },
  ];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>חקר ומשאבים טיפוליים</Text>
      
      <View style={styles.searchTypeContainer}>
        {searchButtons.map(btn => (
          <TouchableOpacity
            key={btn.key}
            style={[styles.typeButton, searchType === btn.key && styles.activeTypeButton]}
            onPress={() => setSearchType(btn.key)}
          >
            <Text style={[styles.typeButtonText, searchType === btn.key && styles.activeTypeButtonText]}>
              {btn.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {searchButtons.find(b => b.key === searchType)?.needsQuery && (
        <TextInput
          style={styles.searchInput}
          placeholder="הזן מונח חיפוש..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      )}

      <Button 
        title={loading ? 'מחפש...' : 'חפש'} 
        onPress={handleSearch} 
        disabled={loading}
      />

      <View style={styles.resultsContainer}>
        {results.map((result, index) => (
          <View key={index} style={styles.resultCard}>
            <Text style={styles.resultTitle}>{result.title}</Text>
            <Text style={styles.resultUrl}>{result.url}</Text>
            <Text style={styles.resultText}>{result.text}</Text>
          </View>
        ))}
        {results.length === 0 && !loading && (
          <Text style={styles.noResults}>אין תוצאות להצגה</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#f6f7fb', flexGrow: 1 },
  header: { fontSize: 22, fontWeight: 'bold', color: '#2563eb', marginBottom: 20, textAlign: 'center' },
  searchTypeContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 },
  typeButton: { backgroundColor: '#e5e7eb', borderRadius: 8, padding: 8, margin: 4 },
  activeTypeButton: { backgroundColor: '#2563eb' },
  typeButtonText: { fontSize: 12, color: '#374151' },
  activeTypeButtonText: { color: '#fff' },
  searchInput: { backgroundColor: '#fff', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 16 },
  resultsContainer: { marginTop: 20 },
  resultCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  resultTitle: { fontSize: 16, fontWeight: 'bold', color: '#1f2937', marginBottom: 4 },
  resultUrl: { fontSize: 12, color: '#6b7280', marginBottom: 8 },
  resultText: { fontSize: 14, color: '#374151', lineHeight: 20 },
  noResults: { textAlign: 'center', color: '#6b7280', marginTop: 40 },
}); 
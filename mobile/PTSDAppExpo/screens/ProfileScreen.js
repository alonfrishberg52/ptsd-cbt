import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ScrollView } from 'react-native';
import { submitProfile } from '../api';
import DynamicBackground from '../components/DynamicBackground';

export default function ProfileScreen({ route, navigation }) {
  const [profile, setProfile] = useState(route.params?.profile || {});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  function handleChange(key, value) {
    setProfile({ ...profile, [key]: value });
  }

  async function handleSave() {
    setSaving(true);
    const res = await submitProfile(profile);
    setSaving(false);
    setMessage(res.status === 'success' ? 'נשמר בהצלחה' : 'שגיאה בשמירה');
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <DynamicBackground />
      <Text style={styles.header}>פרופיל מטופל</Text>
      <TextInput style={styles.input} placeholder="שם" value={profile.name || ''} onChangeText={v => handleChange('name', v)} />
      <TextInput style={styles.input} placeholder="גיל" value={profile.age ? String(profile.age) : ''} onChangeText={v => handleChange('age', v)} keyboardType="numeric" />
      <TextInput style={styles.input} placeholder="עיר" value={profile.city || ''} onChangeText={v => handleChange('city', v)} />
      <TextInput style={styles.input} placeholder="הערות" value={profile.notes || ''} onChangeText={v => handleChange('notes', v)} multiline />
      <Button title={saving ? 'שומר...' : 'שמור'} onPress={handleSave} disabled={saving} />
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, backgroundColor: '#f6f7fb', flexGrow: 1 },
  header: { fontSize: 22, fontWeight: 'bold', color: '#1E293B', marginBottom: 24, textAlign: 'center' },
  input: { backgroundColor: '#FFFFFF', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 16, borderColor: '#E0E7EF', borderWidth: 1 },
  message: { marginTop: 16, textAlign: 'center', color: '#1E293B' },
}); 
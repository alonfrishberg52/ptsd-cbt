import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { useSession } from '../SessionContext';

const HAIR_OPTIONS = [
  { key: 'short', label: 'קצר', color: '#8D5524' },
  { key: 'long', label: 'ארוך', color: '#C68642' },
  { key: 'blonde', label: 'בלונד', color: '#E0C068' },
  { key: 'black', label: 'שחור', color: '#222' },
];
const EYES_OPTIONS = [
  { key: 'blue', label: 'כחול', color: '#4F8EF7' },
  { key: 'green', label: 'ירוק', color: '#4FC36E' },
  { key: 'brown', label: 'חום', color: '#8D5524' },
  { key: 'gray', label: 'אפור', color: '#A0A0A0' },
];
const SHIRT_OPTIONS = [
  { key: 'red', label: 'אדום', color: '#EF4444' },
  { key: 'blue', label: 'כחול', color: '#3B82F6' },
  { key: 'green', label: 'ירוק', color: '#10B981' },
  { key: 'yellow', label: 'צהוב', color: '#FACC15' },
];
const SKIN_OPTIONS = [
  { key: 'light', label: 'בהיר', color: '#F9D7B5' },
  { key: 'tan', label: 'שזוף', color: '#E0AC69' },
  { key: 'brown', label: 'חום', color: '#8D5524' },
  { key: 'dark', label: 'כהה', color: '#5C4033' },
];

export default function AvatarCustomizationScreen({ navigation }) {
  const { avatar, setAvatar } = useSession();
  const [localAvatar, setLocalAvatar] = useState(avatar);

  const handleSelect = (part, value) => {
    setLocalAvatar((prev) => ({ ...prev, [part]: value }));
  };

  const handleSave = () => {
    setAvatar(localAvatar);
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>בחר/י אווטאר אישי</Text>
      {/* Avatar Preview */}
      <View style={styles.avatarPreview}>
        {/* Face (skin) */}
        <View style={[styles.face, { backgroundColor: SKIN_OPTIONS.find(o => o.key === localAvatar.skin)?.color }]}>
          {/* Eyes */}
          <View style={[styles.eyesRow]}>
            <View style={[styles.eye, { backgroundColor: EYES_OPTIONS.find(o => o.key === localAvatar.eyes)?.color }]} />
            <View style={[styles.eye, { backgroundColor: EYES_OPTIONS.find(o => o.key === localAvatar.eyes)?.color }]} />
          </View>
          {/* Hair */}
          <View style={[styles.hair, { backgroundColor: HAIR_OPTIONS.find(o => o.key === localAvatar.hair)?.color }]} />
        </View>
        {/* Shirt */}
        <View style={[styles.shirt, { backgroundColor: SHIRT_OPTIONS.find(o => o.key === localAvatar.shirt)?.color }]} />
      </View>
      <ScrollView style={{ width: '100%' }} contentContainerStyle={{ alignItems: 'center' }}>
        {/* Hair */}
        <Text style={styles.sectionTitle}>שיער</Text>
        <View style={styles.optionsRow}>
          {HAIR_OPTIONS.map(opt => (
            <TouchableOpacity key={opt.key} style={[styles.optionCircle, { backgroundColor: opt.color, borderWidth: localAvatar.hair === opt.key ? 3 : 1, borderColor: localAvatar.hair === opt.key ? '#3B82F6' : '#E2E8F0' }]} onPress={() => handleSelect('hair', opt.key)} />
          ))}
        </View>
        {/* Eyes */}
        <Text style={styles.sectionTitle}>עיניים</Text>
        <View style={styles.optionsRow}>
          {EYES_OPTIONS.map(opt => (
            <TouchableOpacity key={opt.key} style={[styles.optionCircle, { backgroundColor: opt.color, borderWidth: localAvatar.eyes === opt.key ? 3 : 1, borderColor: localAvatar.eyes === opt.key ? '#3B82F6' : '#E2E8F0' }]} onPress={() => handleSelect('eyes', opt.key)} />
          ))}
        </View>
        {/* Shirt */}
        <Text style={styles.sectionTitle}>חולצה</Text>
        <View style={styles.optionsRow}>
          {SHIRT_OPTIONS.map(opt => (
            <TouchableOpacity key={opt.key} style={[styles.optionCircle, { backgroundColor: opt.color, borderWidth: localAvatar.shirt === opt.key ? 3 : 1, borderColor: localAvatar.shirt === opt.key ? '#3B82F6' : '#E2E8F0' }]} onPress={() => handleSelect('shirt', opt.key)} />
          ))}
        </View>
        {/* Skin */}
        <Text style={styles.sectionTitle}>גוון עור</Text>
        <View style={styles.optionsRow}>
          {SKIN_OPTIONS.map(opt => (
            <TouchableOpacity key={opt.key} style={[styles.optionCircle, { backgroundColor: opt.color, borderWidth: localAvatar.skin === opt.key ? 3 : 1, borderColor: localAvatar.skin === opt.key ? '#3B82F6' : '#E2E8F0' }]} onPress={() => handleSelect('skin', opt.key)} />
          ))}
        </View>
      </ScrollView>
      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>שמור</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    paddingTop: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E40AF',
    marginBottom: 16,
  },
  avatarPreview: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 8,
  },
  face: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 8,
  },
  eyesRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 28,
    marginBottom: 0,
  },
  eye: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginHorizontal: 6,
    backgroundColor: '#4F8EF7',
    borderWidth: 1,
    borderColor: '#222',
  },
  hair: {
    position: 'absolute',
    top: 0,
    left: 15,
    right: 15,
    height: 28,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    backgroundColor: '#8D5524',
    zIndex: 2,
  },
  shirt: {
    width: 60,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3B82F6',
    marginTop: -10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 12,
    marginBottom: 6,
    alignSelf: 'flex-start',
    marginLeft: 24,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 8,
    marginLeft: 12,
  },
  optionCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginHorizontal: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  saveButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 40,
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 24,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
}); 
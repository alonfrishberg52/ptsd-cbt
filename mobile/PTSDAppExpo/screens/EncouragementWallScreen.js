import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert, Platform, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const initialMessages = [
  { id: '1', text: 'אתה לא לבד. כל הכבוד על ההתמדה!', likes: 2, flagged: false },
  { id: '2', text: 'זכור/י לנשום עמוק. כל יום הוא התחלה חדשה.', likes: 3, flagged: false },
  { id: '3', text: 'הדרך לשינוי מורכבת מצעדים קטנים.', likes: 1, flagged: false },
];

export default function EncouragementWallScreen() {
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState('');
  const navigation = useNavigation();

  const postMessage = () => {
    if (!input.trim()) return;
    setMessages([
      { id: Date.now().toString(), text: input.trim(), likes: 0, flagged: false },
      ...messages,
    ]);
    setInput('');
  };

  const likeMessage = (id) => {
    setMessages(messages.map(m => m.id === id ? { ...m, likes: m.likes + 1 } : m));
  };

  const flagMessage = (id) => {
    Alert.alert('דיווח', 'ההודעה דווחה לבדיקה. תודה על הערנות.');
    setMessages(messages.map(m => m.id === id ? { ...m, flagged: true } : m));
  };

  const renderItem = ({ item }) => (
    <View style={[styles.messageCard, item.flagged && styles.flaggedCard]}>
      <Text style={styles.messageText}>{item.text}</Text>
      <View style={styles.actionsRow}>
        <TouchableOpacity onPress={() => likeMessage(item.id)} style={styles.actionBtn}>
          <Text style={styles.likeText}>👍 {item.likes}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => flagMessage(item.id)} style={styles.actionBtn} disabled={item.flagged}>
          <Text style={[styles.flagText, item.flagged && styles.flaggedText]}>🚩 {item.flagged ? 'דווח' : 'דווח'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>קיר עידוד אנונימי</Text>
        <Text style={styles.subtitle}>שתף/י מסר עידוד או תמיכה. כל ההודעות אנונימיות.</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="כתוב/י מסר עידוד..."
            placeholderTextColor="#94A3B8"
            maxLength={120}
            returnKeyType="send"
            onSubmitEditing={postMessage}
          />
          <TouchableOpacity onPress={postMessage} style={styles.sendBtn}>
            <Text style={styles.sendBtnText}>שלח</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          data={messages}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingBottom: 120 }}
          style={{ marginTop: 16 }}
          showsVerticalScrollIndicator={false}
        />
      </View>
      {/* Return Button absolutely positioned at bottom */}
      <TouchableOpacity
        style={styles.returnBtnBottom}
        onPress={() => navigation.goBack()}
        activeOpacity={0.8}
      >
        <Text style={styles.returnBtnText}>חזור</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 24 : 16,
    paddingBottom: 0,
  },
  returnBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 16 : 8,
    right: 16,
    zIndex: 10,
    backgroundColor: '#3B82F6',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 18,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  returnBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E40AF',
    marginBottom: 6,
    textAlign: 'center',
    marginTop: 32,
  },
  subtitle: {
    fontSize: 15,
    color: '#64748B',
    marginBottom: 18,
    textAlign: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  input: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 8,
  },
  sendBtn: {
    backgroundColor: '#3B82F6',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  sendBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  messageCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  flaggedCard: {
    backgroundColor: '#FEE2E2',
    borderColor: '#EF4444',
    borderWidth: 1,
  },
  messageText: {
    fontSize: 16,
    color: '#1E293B',
    marginBottom: 10,
    textAlign: 'right',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
  },
  actionBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  likeText: {
    color: '#3B82F6',
    fontWeight: '600',
    fontSize: 15,
  },
  flagText: {
    color: '#EF4444',
    fontWeight: '600',
    fontSize: 15,
  },
  flaggedText: {
    opacity: 0.6,
  },
  returnBtnBottom: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
    alignItems: 'center',
    zIndex: 100,
    backgroundColor: '#3B82F6',
    borderRadius: 16,
    paddingVertical: 14,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
}); 
import React, { useRef, useState } from 'react';
import { View, Text, Button, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Audio } from 'expo-av';
import { getAudioUrl } from '../api';
import DynamicBackground from '../components/DynamicBackground';

export default function StoryPlayerScreen({ route }) {
  const { story } = route.params;
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [speed, setSpeed] = useState(1.0);
  const [status, setStatus] = useState('מוכן להשמעה');
  const soundRef = useRef(null);

  const audioFile = story.result?.audio_file;
  const audioUrl = audioFile ? getAudioUrl(audioFile) : null;

  async function handlePlayPause() {
    if (!audioUrl) return;
    if (!soundRef.current) {
      setLoading(true);
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true, rate: speed },
        onPlaybackStatusUpdate
      );
      soundRef.current = sound;
      setPlaying(true);
      setLoading(false);
    } else {
      const status = await soundRef.current.getStatusAsync();
      if (status.isPlaying) {
        await soundRef.current.pauseAsync();
        setPlaying(false);
      } else {
        await soundRef.current.setRateAsync(speed, true);
        await soundRef.current.playAsync();
        setPlaying(true);
      }
    }
  }

  function onPlaybackStatusUpdate(playbackStatus) {
    if (playbackStatus.didJustFinish) {
      setPlaying(false);
      setStatus('הסתיים');
      soundRef.current && soundRef.current.setPositionAsync(0);
    } else if (playbackStatus.isPlaying) {
      setStatus('מנגן...');
    } else {
      setStatus('מוכן להשמעה');
    }
  }

  async function handleSpeedChange(delta) {
    let newSpeed = Math.max(0.5, Math.min(2.0, speed + delta));
    setSpeed(newSpeed);
    if (soundRef.current) {
      await soundRef.current.setRateAsync(newSpeed, true);
    }
  }

  React.useEffect(() => {
    return () => { soundRef.current && soundRef.current.unloadAsync(); };
  }, []);

  return (
    <View style={styles.container}>
      <DynamicBackground />
      <Text style={styles.header}>סיפור - פרק {story.stage}</Text>
      <View style={styles.storyBox}>
        <Text style={styles.storyText}>{story.result?.story || '...'}</Text>
      </View>
      {audioUrl ? (
        <View style={styles.audioBox}>
          <TouchableOpacity style={styles.playBtn} onPress={handlePlayPause} disabled={loading}>
            <Text style={{ fontSize: 28 }}>{playing ? '⏸️' : '▶️'}</Text>
          </TouchableOpacity>
          <Text style={styles.status}>{status}</Text>
          <View style={styles.speedRow}>
            <Button title="-" onPress={() => handleSpeedChange(-0.1)} />
            <Text style={styles.speedText}>{speed.toFixed(2)}x</Text>
            <Button title="+" onPress={() => handleSpeedChange(0.1)} />
          </View>
        </View>
      ) : (
        <Text style={{ color: '#888', marginTop: 24 }}>אין אודיו לסיפור זה</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f7fb', padding: 16 },
  header: { fontSize: 20, fontWeight: 'bold', color: '#2563eb', marginBottom: 16, textAlign: 'center' },
  storyBox: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 18, marginBottom: 24, minHeight: 180, borderColor: '#E0E7EF', borderWidth: 1, shadowColor: '#B3E5FC', shadowOpacity: 0.08 },
  storyText: { fontSize: 16, color: '#1E293B', lineHeight: 24 },
  audioBox: { alignItems: 'center', marginTop: 12 },
  playBtn: { backgroundColor: '#2563eb', borderRadius: 32, width: 64, height: 64, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  status: { fontSize: 16, color: '#1E293B', marginBottom: 8 },
  speedRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  speedText: { fontSize: 16, marginHorizontal: 12 },
}); 
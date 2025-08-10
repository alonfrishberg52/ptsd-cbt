import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import Slider from '@react-native-community/slider';
import EscapeIcon from '../components/EscapeIcon';

export default function SUDScreen({ route, navigation }) {
  const { initialSUD = 50, onComplete, chapter } = route.params || {};
  const [sud, setSud] = useState(initialSUD);

  const handleContinue = () => {
    if (onComplete) {
      onComplete(sud);
    }
    // Let the onComplete callback handle navigation
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top bar with back button */}
      <View style={styles.topBar}>
        <View />
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <EscapeIcon />
        </TouchableOpacity>
      </View>
      <View style={styles.content}>
        <Text style={styles.label}>דרג את רמת המצוקה שלך (SUD)</Text>
        <Text style={styles.sudValue}>{sud}</Text>
        <View style={styles.sliderRow}>
          <Text style={styles.sliderLabel}>1</Text>
          <Slider
            style={styles.slider}
            minimumValue={1}
            maximumValue={100}
            step={1}
            value={sud}
            onValueChange={setSud}
            minimumTrackTintColor="#222"
            maximumTrackTintColor="#E0E0E0"
            thumbTintColor="#fff"
          />
          <Text style={styles.sliderLabel}>100</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
        <Text style={styles.continueButtonText}>המשך ←</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5EA',
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    height: 60,
  },
  backButton: {
    width: 30,
    height: 37,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exportIcon: {
    fontSize: 32,
    color: '#222',
    fontWeight: 'bold',
  },
  content: {
    alignItems: 'center',
    marginTop: 60,
  },
  label: {
    fontSize: 22,
    color: '#222',
    fontWeight: '400',
    marginBottom: 32,
    textAlign: 'center',
  },
  sudValue: {
    fontSize: 56,
    fontWeight: 'bold',
    color: '#111',
    marginBottom: 32,
    textAlign: 'center',
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '90%',
    marginBottom: 32,
  },
  slider: {
    flex: 1,
    height: 40,
  },
  sliderLabel: {
    fontSize: 16,
    color: '#AAA',
    width: 32,
    textAlign: 'center',
  },
  continueButton: {
    backgroundColor: '#fff',
    borderRadius: 40,
    margin: 24,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  continueButtonText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111',
    textAlign: 'center',
  },
}); 
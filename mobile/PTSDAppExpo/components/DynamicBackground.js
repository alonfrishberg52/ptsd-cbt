import React from 'react';
import { View, StyleSheet, Dimensions, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

export default function DynamicBackground() {
  // Restore deep blue gradient and circles
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={["#3B82F6", "#1E40AF", "#0F172A"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Blue floating circles */}
      <Animated.View style={[styles.circle, { top: height * 0.15, left: width * 0.2, opacity: 0.18, backgroundColor: '#3B82F6' }]} />
      <Animated.View style={[styles.circle, { top: height * 0.6, left: width * 0.7, opacity: 0.12, width: 180, height: 180, backgroundColor: '#1E40AF' }]} />
      <Animated.View style={[styles.circle, { top: height * 0.35, left: width * 0.5, opacity: 0.10, width: 140, height: 140, backgroundColor: '#0F172A' }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#3B82F6',
  },
}); 
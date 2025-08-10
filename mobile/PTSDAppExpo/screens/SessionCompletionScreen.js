import React from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window')

export default function SessionCompletionScreen({ navigation, route }) {
  const handleClose = () => {
    // Navigate back to the welcome screen
    navigation.navigate('Welcome');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Gradient Sphere */}
      <View style={styles.sphereContainer}>
        <LinearGradient
          colors={[
            '#FF6B6B', // Red
            '#4ECDC4', // Teal
            '#45B7D1', // Blue
            '#96CEB4', // Green
            '#FFEAA7', // Yellow
            '#DDA0DD', // Plum
            '#98D8C8', // Mint
            '#F7DC6F', // Light Yellow
          ]}
          locations={[0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875]}
          style={styles.gradientSphere}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      </View>

      {/* Title */}
      <Text style={styles.title}>השלמת סשן מאתגר ומרגשים.</Text>

      {/* Description */}
      <Text style={styles.description}>
        הצלחת להישאר מחובר גם כשעלו גירויים{'\n'}
        חיצוניים, ובחרת להמשיך את הדרך במקום{'\n'}
        לוותר. זה לא מובן מאליו — זו יכולת{'\n'}
        שמתחזקת עם כל תרגול. כל הכבוד על{'\n'}
        ההתמדה והנכוחות.
      </Text>

      {/* Close Button */}
      <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
        <Text style={styles.closeButtonText}>סיום</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F0',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  sphereContainer: {
    marginBottom: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradientSphere: {
    width: 280,
    height: 280,
    borderRadius: 140,
    opacity: 0.8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C2C2C',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 32,
  },
  description: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 60,
    paddingHorizontal: 16,
  },
  closeButton: {
    backgroundColor: '#2C2C2C',
    borderRadius: 25,
    paddingVertical: 16,
    paddingHorizontal: 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
}); 
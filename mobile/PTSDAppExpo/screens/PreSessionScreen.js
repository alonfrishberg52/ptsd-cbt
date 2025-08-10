import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import EscapeIcon from '../components/EscapeIcon';

const FEELINGS = [
  'רגוע', 'עייף', 'מתרגש', 'אדיש', 'מתוחכם',
  'לחוץ', 'שמח', 'פוחד', 'מתוח', 'מלא תקווה'
];

const { width, height } = Dimensions.get('window');

export default function PreSessionScreen({ navigation, route }) {
  // Debug: log navigation and route props
  console.log('PreSessionScreen navigation:', navigation);
  console.log('PreSessionScreen route:', route);
  const [selectedFeeling, setSelectedFeeling] = useState(null);

  const handleContinue = () => {
    if (!selectedFeeling) {
      // Optionally alert the user to select a feeling first
      return;
    }
    navigation.navigate('PreSessionGuidelines', {
      ...route?.params,
      feeling: selectedFeeling,
    });
  };

  const handleSkip = () => {
    // Navigate back or to previous screen
    navigation.goBack();
  };

  const renderFeeling = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.feelingButton,
        selectedFeeling === item && styles.feelingButtonSelected
      ]}
      onPress={() => setSelectedFeeling(item)}
      activeOpacity={0.8}
    >
      <Text style={[
        styles.feelingText,
        selectedFeeling === item && styles.feelingTextSelected
      ]}>{item}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Radial gradient background spot */}
      <View style={{
        position: 'absolute',
        left: -120,
        top: 200,
        width: 500,
        height: 500,
        borderRadius: 250,
        backgroundColor: '#F9E3DD',
        opacity: 0.45,
        zIndex: 0,
      }} />
      {/* Top Bar */}
      <View style={styles.topBar}>
        <View />
        <TouchableOpacity onPress={handleSkip}>
          <EscapeIcon />
        </TouchableOpacity>
      </View>

      {/* Header */}
      <View style={styles.headerContainer}>
        <Text style={styles.headerLine1}>לפני שנתחיל,</Text>
        <Text style={styles.headerLine2}>איך אתה מרגיש?</Text>
      </View>

      {/* Feelings Grid */}
      <View style={styles.feelingsGridContainer}>
        <FlatList
          data={FEELINGS}
          renderItem={renderFeeling}
          keyExtractor={(item) => item}
          numColumns={2}
          columnWrapperStyle={styles.feelingsRow}
          contentContainerStyle={styles.feelingsGrid}
          scrollEnabled={false}
        />
      </View>

      {/* Continue Button */}
      <TouchableOpacity
        style={styles.continueButton}
        onPress={handleContinue}
        activeOpacity={0.85}
      >
        <Ionicons name="arrow-back" size={22} color="#222" style={{ marginRight: 8 }} />
        <Text style={styles.continueButtonText}>המשך</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF9F3',
    justifyContent: 'flex-start',
    width: '100%',
  },
  topBar: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
    paddingHorizontal: 8,
    marginTop: 16,
  },
  skipText: {
    fontSize: 16,
    color: '#222',
    fontWeight: '400',
    paddingLeft: 8,
  },
  headerContainer: {
    width: '100%',
    marginBottom: 40,
    alignItems: 'flex-end',
    paddingRight: 16,
    marginTop: 24,
  },
  headerLine1: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#222',
    textAlign: 'right',
    marginBottom: 0,
    lineHeight: 44,
  },
  headerLine2: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#222',
    textAlign: 'right',
    marginBottom: 0,
    lineHeight: 44,
  },
  feelingsGridContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginBottom: 32,
  },
  feelingsGrid: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 24,
  },
  feelingsRow: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  feelingButton: {
    backgroundColor: '#fff',
    borderRadius: 32,
    paddingVertical: 10,
    paddingHorizontal: 24,
    marginHorizontal: 8,
    marginVertical: 8,
    minWidth: 110,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  feelingButtonSelected: {
    backgroundColor: '#E3F0FF',
    borderColor: '#2563EB',
    borderWidth: 1.5,
  },
  feelingText: {
    fontSize: 16,
    color: '#222',
    fontWeight: '500',
    textAlign: 'center',
  },
  feelingTextSelected: {
    color: '#2563EB',
    fontWeight: '700',
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 40,
    width: '88%',
    height: 64,
    position: 'absolute',
    bottom: 40,
    left: (width * 0.06),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  continueButtonText: {
    fontSize: 20,
    color: '#222',
    fontWeight: 'bold',
    textAlign: 'center',
    marginLeft: 8,
  },
}); 
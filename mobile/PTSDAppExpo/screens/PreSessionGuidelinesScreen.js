import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, MaterialIcons, Entypo, FontAwesome } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function PreSessionGuidelinesScreen({ navigation, route }) {
  const [checked, setChecked] = useState(false);

  const guidelines = [
    {
      icon: <Ionicons name="volume-mute-outline" size={22} color="#222" style={styles.icon} />, 
      text: 'ודאו שאתם נמצאים בסביבה שקטה ונעימה המאפשרת תחושת ביטחון וללא הפרעות.'
    },
    {
      icon: <MaterialCommunityIcons name="timer-outline" size={22} color="#222" style={styles.icon} />, 
      text: 'הקדישו כ-15 דקות רציפות בהן תוכלו להתרכז ללא קטיעות או הסחות דעת.'
    },
    {
      icon: <MaterialIcons name="person-outline" size={22} color="#222" style={styles.icon} />, 
      text: 'עדכנו אדם קרוב בתחילת הסשן, במידת הצורך, לקבלת תחושת ביטחון נוספת.'
    },
    {
      icon: <Entypo name="headphones" size={22} color="#222" style={styles.icon} />, 
      text: 'השתמשו באוזניות איכותיות לטובת ריכוז והעמקה בחוויית התרגול המודרך.'
    },
    {
      icon: <FontAwesome name="glass" size={22} color="#222" style={styles.icon} />, 
      text: 'הכינו מים או משקה מרענן לשתייה בסיום הסשן.'
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Radial gradient background spot */}
      <View style={styles.backgroundSpot} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerContainer}>
          <Text style={styles.headerLine1}>כמה דגשים לפני</Text>
          <Text style={styles.headerLine2}>שמתחילים</Text>
        </View>
        <View style={styles.guidelinesContainer}>
          {guidelines.map((item, idx) => (
            <View key={idx} style={styles.guidelineRow}>
              <Text style={styles.guidelineText}>{item.text}</Text>
              {item.icon}
            </View>
          ))}
        </View>
        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => setChecked(!checked)}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
            {checked && <Ionicons name="checkmark" size={18} color="#fff" />}
          </View>
          <Text style={styles.checkboxLabel}>קראתי את הדגשים ואני מוכן להתחיל</Text>
        </TouchableOpacity>
      </ScrollView>
      <TouchableOpacity
        style={[styles.continueButton, !checked && styles.continueButtonDisabled]}
        onPress={() => {
          let params = route?.params || {};
          if (!params.patient) {
            params = {
              ...params,
              patient: {
                patient_id: 'dummy',
                name: 'משתמש דמה',
              },
            };
          }
          navigation.navigate('Session', params);
        }}
        activeOpacity={checked ? 0.85 : 1}
        disabled={!checked}
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
  backgroundSpot: {
    position: 'absolute',
    left: -120,
    top: 200,
    width: 500,
    height: 500,
    borderRadius: 250,
    backgroundColor: '#F9E3DD',
    opacity: 0.45,
    zIndex: 0,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 120,
    alignItems: 'flex-end',
  },
  headerContainer: {
    marginBottom: 36,
    alignItems: 'flex-end',
    width: '100%',
  },
  headerLine1: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#222',
    textAlign: 'right',
    lineHeight: 38,
  },
  headerLine2: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#222',
    textAlign: 'right',
    lineHeight: 38,
  },
  guidelinesContainer: {
    width: '100%',
    marginBottom: 32,
  },
  guidelineRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 18,
    width: '100%',
  },
  guidelineText: {
    flex: 1,
    fontSize: 16,
    color: '#222',
    textAlign: 'right',
    marginLeft: 12,
    fontWeight: '400',
    lineHeight: 22,
  },
  icon: {
    marginLeft: 8,
    marginRight: 0,
  },
  checkboxRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 24,
    alignSelf: 'flex-end',
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#2563EB',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  checkboxChecked: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#222',
    fontWeight: 'bold',
    textAlign: 'right',
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
  continueButtonDisabled: {
    opacity: 0.5,
  },
  continueButtonText: {
    fontSize: 20,
    color: '#222',
    fontWeight: 'bold',
    textAlign: 'center',
    marginLeft: 8,
  },
}); 
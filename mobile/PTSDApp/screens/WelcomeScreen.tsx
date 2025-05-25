import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, StatusBar } from 'react-native';

type WelcomeScreenProps = {
  navigation: any;
};

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#efefe0" />
      <Text style={styles.progress}>3/12</Text>
      <View style={styles.centerContent}>
        <Text style={styles.greeting}>היי דני, צהריים טובים</Text>
        <TouchableOpacity
          style={styles.button}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('Story')}
        >
          <Text style={styles.buttonText}>התחל תרגול</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#efefe0',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 60,
  },
  progress: {
    fontSize: 32,
    fontWeight: '400',
    marginTop: 20,
    marginBottom: 60,
    textAlign: 'center',
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  greeting: {
    fontSize: 28,
    fontWeight: '500',
    marginBottom: 40,
    textAlign: 'center',
    color: '#181818',
    writingDirection: 'rtl',
  },
  button: {
    backgroundColor: '#f8f8ed',
    borderRadius: 40,
    paddingVertical: 18,
    paddingHorizontal: 48,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#181818',
    writingDirection: 'rtl',
  },
});

export default WelcomeScreen; 
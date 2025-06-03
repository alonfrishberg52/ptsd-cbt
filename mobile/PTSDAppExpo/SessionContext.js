import React, { createContext, useContext, useState, useRef } from 'react';
import { startScenario } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SessionContext = createContext();

export function SessionProvider({ children }) {
  const [patient, setPatient] = useState(null);
  const [SUD, setSUD] = useState(50);
  const [storyResult, setStoryResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const storyPromiseRef = useRef(null);

  // Gamification state
  const [coins, setCoins] = useState(0);
  const [trophies, setTrophies] = useState([]); // array of trophy keys

  // Trophy definitions
  const TROPHY_DEFS = [
    { key: 'first_session', label: 'מפגש ראשון', desc: 'סיימת מפגש ראשון!' },
    { key: 'five_sessions', label: '5 מפגשים', desc: 'סיימת 5 מפגשים!' },
    { key: 'seven_streak', label: 'רצף 7 ימים', desc: '7 ימים ברצף!' },
    { key: 'ten_sessions', label: '10 מפגשים', desc: 'סיימת 10 מפגשים!' },
  ];

  // Load coins/trophies from storage
  React.useEffect(() => {
    (async () => {
      const c = await AsyncStorage.getItem('coins');
      const t = await AsyncStorage.getItem('trophies');
      if (c) setCoins(Number(c));
      if (t) setTrophies(JSON.parse(t));
    })();
  }, []);

  // Save coins/trophies to storage
  React.useEffect(() => { AsyncStorage.setItem('coins', coins.toString()); }, [coins]);
  React.useEffect(() => { AsyncStorage.setItem('trophies', JSON.stringify(trophies)); }, [trophies]);

  // Add coins
  const addCoins = (amount) => setCoins((prev) => prev + amount);

  // Unlock trophy
  const unlockTrophy = (key) => {
    if (!trophies.includes(key)) setTrophies((prev) => [...prev, key]);
  };

  // Reset rewards (for testing)
  const resetRewards = () => {
    setCoins(0);
    setTrophies([]);
  };

  // Start story generation in the background
  const startStoryGeneration = (patientObj, sudValue) => {
    setPatient(patientObj);
    setSUD(sudValue);
    setIsLoading(true);
    setStoryResult(null);
    // Start the API call and store the promise
    const promise = startScenario(patientObj.patient_id, sudValue)
      .then((response) => {
        setStoryResult(response);
        setIsLoading(false);
        return response;
      })
      .catch((err) => {
        setIsLoading(false);
        setStoryResult({ status: 'error', message: err?.message || 'שגיאה' });
        throw err;
      });
    storyPromiseRef.current = promise;
    return promise;
  };

  // Reset session state
  const resetSession = () => {
    setPatient(null);
    setSUD(50);
    setStoryResult(null);
    setIsLoading(false);
    storyPromiseRef.current = null;
  };

  return (
    <SessionContext.Provider
      value={{
        patient,
        setPatient,
        SUD,
        setSUD,
        storyResult,
        isLoading,
        startStoryGeneration,
        storyPromise: storyPromiseRef.current,
        resetSession,
        // Gamification
        coins,
        addCoins,
        trophies,
        unlockTrophy,
        resetRewards,
        TROPHY_DEFS,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
} 
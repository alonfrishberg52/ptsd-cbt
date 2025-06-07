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

  // Badge definitions
  const BADGE_DEFS = [
    { key: 'first_feedback', label: 'משוב ראשון', desc: 'שלחת משוב בפעם הראשונה!', icon: require('./assets/badge.json') },
    { key: 'streak_3', label: 'רצף 3 ימים', desc: 'השלמת 3 ימים ברצף!', icon: require('./assets/badge.json') },
    { key: 'streak_7', label: 'רצף 7 ימים', desc: 'השלמת שבוע ברצף!', icon: require('./assets/badge.json') },
    { key: 'ten_sessions', label: '10 מפגשים', desc: 'השלמת 10 מפגשים!', icon: require('./assets/badge.json') },
    { key: 'lucky_box', label: 'הפתעה!', desc: 'קיבלת בונוס מתיבת הפתעה!', icon: require('./assets/badge.json') },
  ];

  // Badges state
  const [badges, setBadges] = useState([]); // array of badge keys

  // Avatar state
  const [avatar, setAvatar] = useState({ hair: 'short', eyes: 'blue', shirt: 'red', skin: 'light' });

  // Session dates state (for streaks)
  const [sessionDates, setSessionDates] = useState([]); // array of ISO date strings (YYYY-MM-DD)

  // Load coins/trophies/badges/avatar from storage
  React.useEffect(() => {
    (async () => {
      const c = await AsyncStorage.getItem('coins');
      const t = await AsyncStorage.getItem('trophies');
      const b = await AsyncStorage.getItem('badges');
      const a = await AsyncStorage.getItem('avatar');
      if (c) setCoins(Number(c));
      if (t) setTrophies(JSON.parse(t));
      if (b) setBadges(JSON.parse(b));
      if (a) setAvatar(JSON.parse(a));
    })();
  }, []);

  // Save coins/trophies/badges/avatar to storage
  React.useEffect(() => { AsyncStorage.setItem('coins', coins.toString()); }, [coins]);
  React.useEffect(() => { AsyncStorage.setItem('trophies', JSON.stringify(trophies)); }, [trophies]);
  React.useEffect(() => { AsyncStorage.setItem('badges', JSON.stringify(badges)); }, [badges]);
  React.useEffect(() => { AsyncStorage.setItem('avatar', JSON.stringify(avatar)); }, [avatar]);

  // Load sessionDates from storage
  React.useEffect(() => {
    (async () => {
      const d = await AsyncStorage.getItem('sessionDates');
      if (d) setSessionDates(JSON.parse(d));
    })();
  }, []);
  React.useEffect(() => { AsyncStorage.setItem('sessionDates', JSON.stringify(sessionDates)); }, [sessionDates]);

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

  // Unlock badge
  const unlockBadge = (key) => {
    if (!badges.includes(key)) setBadges((prev) => [...prev, key]);
  };

  // Reset badges (for testing)
  const resetBadges = () => setBadges([]);

  // Reset avatar
  const resetAvatar = () => setAvatar({ hair: 'short', eyes: 'blue', shirt: 'red', skin: 'light' });

  // Add a session date (YYYY-MM-DD)
  const addSessionDate = (dateStr) => {
    setSessionDates((prev) => {
      if (!prev.includes(dateStr)) {
        return [...prev, dateStr];
      }
      return prev;
    });
  };

  // Calculate current streak (consecutive days up to today)
  const getSessionStreak = () => {
    if (!sessionDates.length) return 0;
    const sorted = [...sessionDates].sort();
    let streak = 0;
    let today = new Date();
    for (let i = sorted.length - 1; i >= 0; i--) {
      const d = new Date(sorted[i]);
      if (
        d.getFullYear() === today.getFullYear() &&
        d.getMonth() === today.getMonth() &&
        d.getDate() === today.getDate()
      ) {
        streak++;
        today.setDate(today.getDate() - 1);
      } else if (
        d.getFullYear() === today.getFullYear() &&
        d.getMonth() === today.getMonth() &&
        d.getDate() === today.getDate()
      ) {
        // already counted
        continue;
      } else {
        break;
      }
    }
    return streak;
  };

  // Start story generation in the background
  const startStoryGeneration = (patientObj, sudValue) => {
    setPatient(patientObj);
    setSUD(sudValue);
    setIsLoading(true);
    setStoryResult(null);
    console.log('[Session] Calling startScenario for', patientObj.patient_id, sudValue);
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
        getStoryPromise: () => storyPromiseRef.current,
        resetSession,
        // Gamification
        coins,
        addCoins,
        trophies,
        unlockTrophy,
        resetRewards,
        TROPHY_DEFS,
        // Badges
        BADGE_DEFS,
        badges,
        unlockBadge,
        resetBadges,
        // Avatar
        avatar,
        setAvatar,
        resetAvatar,
        // Session streak
        sessionDates,
        addSessionDate,
        getSessionStreak,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
} 
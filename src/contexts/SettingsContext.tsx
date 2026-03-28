import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';

export interface EventSchedule {
  time: string;
  event: string;
}

export interface Settings {
  heroTitle: string;
  heroSubtitle: string;
  welcomeMessage: string;
  eventDate: string;
  schedule: EventSchedule[];
  dressCode: string;
  hostName: string;
  hostPhone: string;
  address: string;
  coverPhotoUrl: string;
}

const defaultSettings: Settings = {
  heroTitle: "Gruhapravesham aahwanam",
  heroSubtitle: "Housewarming Ceremony Invitation",
  welcomeMessage: "With the grace of the Almighty and the blessings of our elders, we are stepping into our new abode. Your presence will add to the joy and sanctity of this special occasion. Please join us as we celebrate this new beginning with prayers and festivities.",
  eventDate: "April 26th, Sunday",
  schedule: [
    { time: "5:00 am", event: "Gruhapravesham" },
    { time: "7:30 am", event: "Satyanarayana Swami Vratam" },
    { time: "12:30 pm onwards", event: "Lunch" }
  ],
  dressCode: "Festive traditional or ethnic wear",
  hostName: "Naveen & Priyanka",
  hostPhone: "6026427380",
  address: "8731 W Denton Ln, Glendale, AZ 85305",
  coverPhotoUrl: "https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&q=80&w=1920"
};

interface SettingsContextType {
  settings: Settings;
  loading: boolean;
  updateSettings: (newSettings: Settings) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType>({
  settings: defaultSettings,
  loading: true,
  updateSettings: async () => {}
});

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'global'), (snapshot) => {
      if (snapshot.exists()) {
        setSettings(snapshot.data() as Settings);
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/global');
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const updateSettings = async (newSettings: Settings) => {
    try {
      await setDoc(doc(db, 'settings', 'global'), newSettings);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings/global');
    }
  };

  const value = useMemo(() => ({ settings, loading, updateSettings }), [settings, loading]);

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);

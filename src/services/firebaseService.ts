import { collection, addDoc, getDocs, query, orderBy, serverTimestamp, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { GuestRSVP, EventDetails } from '../types';
import { DEFAULT_EVENT_ID } from '../constants';

const EVENTS_COLLECTION = 'events';
const RSVPS_SUBCOLLECTION = 'rsvps';

export const saveRSVP = async (rsvp: Omit<GuestRSVP, 'id' | 'createdAt'>) => {
  try {
    const rsvpsRef = collection(db, EVENTS_COLLECTION, DEFAULT_EVENT_ID, RSVPS_SUBCOLLECTION);
    const docRef = await addDoc(rsvpsRef, {
      ...rsvp,
      createdAt: new Date().toISOString()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error saving RSVP:', error);
    throw error;
  }
};

export const getRSVPs = async () => {
  try {
    const rsvpsRef = collection(db, EVENTS_COLLECTION, DEFAULT_EVENT_ID, RSVPS_SUBCOLLECTION);
    const q = query(rsvpsRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as GuestRSVP[];
  } catch (error) {
    console.error('Error getting RSVPs:', error);
    throw error;
  }
};

export const getEventDetails = async (eventId: string = DEFAULT_EVENT_ID) => {
  try {
    const eventRef = doc(db, EVENTS_COLLECTION, eventId);
    const eventSnap = await getDoc(eventRef);
    if (eventSnap.exists()) {
      return { id: eventSnap.id, ...eventSnap.data() } as EventDetails;
    }
    return null;
  } catch (error) {
    console.error('Error getting event details:', error);
    throw error;
  }
};

export const updateEventDetails = async (event: EventDetails) => {
  try {
    const eventRef = doc(db, EVENTS_COLLECTION, event.id);
    await setDoc(eventRef, event, { merge: true });
  } catch (error) {
    console.error('Error updating event details:', error);
    throw error;
  }
};

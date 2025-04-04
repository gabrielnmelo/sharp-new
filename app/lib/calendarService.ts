import { db } from './firebase';
import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  onSnapshot,
  query,
  where,
  addDoc,
  updateDoc
} from 'firebase/firestore';

export interface Calendar {
  id: string;
  name: string;
  color: string;
  userId: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: 'in-person' | 'online';
  location?: string;
  meetingUrl?: string;
  calendarId: string;
  isLive: boolean;
  userId: string;
}

// Helper function to remove undefined values from an object
function removeUndefinedValues(obj: Record<string, any>): Record<string, any> {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    if (value !== undefined) {
      acc[key] = value;
    }
    return acc;
  }, {} as Record<string, any>);
}

export const calendarService = {
  // Calendars
  async getCalendars(userId: string): Promise<Calendar[]> {
    const q = query(collection(db, 'calendars'), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Calendar[];
  },

  async saveCalendar(calendar: Omit<Calendar, 'id'>, userId: string): Promise<string> {
    const calendarWithUserId = { ...calendar, userId };
    console.log('calendarService.saveCalendar: Saving data:', calendarWithUserId);
    try {
      const docRef = await addDoc(collection(db, 'calendars'), calendarWithUserId);
      console.log('calendarService.saveCalendar: Write successful, doc ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('calendarService.saveCalendar: Write error:', error);
      throw error;
    }
  },

  async updateCalendar(id: string, calendar: Partial<Calendar>, userId: string): Promise<void> {
    const calendarRef = doc(db, 'calendars', id);
    const calendarWithUserId = { ...calendar, userId };
    await updateDoc(calendarRef, calendarWithUserId);
  },

  async deleteCalendar(id: string): Promise<void> {
    await deleteDoc(doc(db, 'calendars', id));
  },

  // Events
  async getEvents(userId: string): Promise<CalendarEvent[]> {
    const q = query(collection(db, 'events'), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      start: doc.data().start.toDate(),
      end: doc.data().end.toDate()
    })) as CalendarEvent[];
  },

  async saveEvent(event: Omit<CalendarEvent, 'id'>, userId: string): Promise<string> {
    const eventWithUserId = { ...event, userId };
    console.log('calendarService.saveEvent: Raw data:', eventWithUserId);
    const cleanData = removeUndefinedValues(eventWithUserId);
    console.log('calendarService.saveEvent: Saving clean data:', cleanData); // Log cleaned data
    try {
      const docRef = await addDoc(collection(db, 'events'), cleanData);
      console.log('calendarService.saveEvent: Write successful, doc ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('calendarService.saveEvent: Write error:', error);
      throw error;
    }
  },

  async updateEvent(id: string, event: Partial<CalendarEvent>, userId: string): Promise<void> {
    const eventRef = doc(db, 'events', id);
    // Combine potentially partial event data with userId
    const eventWithUserId = { ...event, userId }; 
    console.log('calendarService.updateEvent: Raw data:', eventWithUserId);
    const cleanData = removeUndefinedValues(eventWithUserId);
    console.log('calendarService.updateEvent: Updating with clean data:', cleanData);
    try {
      await updateDoc(eventRef, cleanData);
      console.log('calendarService.updateEvent: Update successful');
    } catch (error) {
      console.error('calendarService.updateEvent: Update error:', error);
      throw error;
    }
  },

  async deleteEvent(id: string): Promise<void> {
    await deleteDoc(doc(db, 'events', id));
  },

  // Real-time listeners
  onCalendarsChange(userId: string, callback: (calendars: Calendar[]) => void) {
    const q = query(collection(db, 'calendars'), where('userId', '==', userId));
    return onSnapshot(q, (snapshot) => {
      const calendars = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Calendar[];
      callback(calendars);
    });
  },

  onEventsChange(userId: string, callback: (events: CalendarEvent[]) => void) {
    const q = query(collection(db, 'events'), where('userId', '==', userId));
    return onSnapshot(q, (snapshot) => {
      const events = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        start: doc.data().start.toDate(),
        end: doc.data().end.toDate()
      })) as CalendarEvent[];
      callback(events);
    });
  }
}; 
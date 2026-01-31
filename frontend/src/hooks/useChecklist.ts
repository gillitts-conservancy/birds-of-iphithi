import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SEEN_STORAGE_KEY = '@birds_of_iphithi_seen';
const NOTES_STORAGE_KEY = '@birds_of_iphithi_notes';
const DATES_STORAGE_KEY = '@birds_of_iphithi_dates';

interface SeenState {
  [speciesNumber: number]: boolean;
}

interface NotesState {
  [speciesNumber: number]: string;
}

interface DatesState {
  [speciesNumber: number]: string; // ISO date string
}

export const useChecklist = () => {
  const [seenBirds, setSeenBirds] = useState<SeenState>({});
  const [notes, setNotes] = useState<NotesState>({});
  const [dates, setDates] = useState<DatesState>({});
  const [isLoading, setIsLoading] = useState(true);

  // Load persisted data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [seenData, notesData, datesData] = await Promise.all([
          AsyncStorage.getItem(SEEN_STORAGE_KEY),
          AsyncStorage.getItem(NOTES_STORAGE_KEY),
          AsyncStorage.getItem(DATES_STORAGE_KEY),
        ]);
        
        if (seenData) {
          setSeenBirds(JSON.parse(seenData));
        }
        if (notesData) {
          setNotes(JSON.parse(notesData));
        }
        if (datesData) {
          setDates(JSON.parse(datesData));
        }
      } catch (error) {
        console.error('Failed to load checklist data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Toggle seen status for a bird
  const toggleSeen = useCallback(async (speciesNumber: number) => {
    const wasAlreadySeen = seenBirds[speciesNumber];
    
    setSeenBirds((prev) => {
      const newState = {
        ...prev,
        [speciesNumber]: !prev[speciesNumber],
      };
      // Persist to storage
      AsyncStorage.setItem(SEEN_STORAGE_KEY, JSON.stringify(newState)).catch(
        (error) => console.error('Failed to save seen state:', error)
      );
      return newState;
    });

    // If marking as seen, record the date
    if (!wasAlreadySeen) {
      setDates((prev) => {
        const newState = {
          ...prev,
          [speciesNumber]: new Date().toISOString(),
        };
        AsyncStorage.setItem(DATES_STORAGE_KEY, JSON.stringify(newState)).catch(
          (error) => console.error('Failed to save date:', error)
        );
        return newState;
      });
    }
  }, [seenBirds]);

  // Update notes for a bird
  const updateNotes = useCallback(async (speciesNumber: number, note: string) => {
    setNotes((prev) => {
      const newState = {
        ...prev,
        [speciesNumber]: note,
      };
      // Persist to storage
      AsyncStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(newState)).catch(
        (error) => console.error('Failed to save notes:', error)
      );
      return newState;
    });
  }, []);

  // Update date for a bird (for manual editing)
  const updateDate = useCallback(async (speciesNumber: number, date: string) => {
    setDates((prev) => {
      const newState = {
        ...prev,
        [speciesNumber]: date,
      };
      AsyncStorage.setItem(DATES_STORAGE_KEY, JSON.stringify(newState)).catch(
        (error) => console.error('Failed to save date:', error)
      );
      return newState;
    });
  }, []);

  // Reset all checkmarks
  const resetAll = useCallback(async () => {
    setSeenBirds({});
    setDates({});
    try {
      await Promise.all([
        AsyncStorage.setItem(SEEN_STORAGE_KEY, JSON.stringify({})),
        AsyncStorage.setItem(DATES_STORAGE_KEY, JSON.stringify({})),
      ]);
    } catch (error) {
      console.error('Failed to reset data:', error);
    }
  }, []);

  // Check if a bird is seen
  const isSeen = useCallback(
    (speciesNumber: number) => !!seenBirds[speciesNumber],
    [seenBirds]
  );

  // Get notes for a bird
  const getNotes = useCallback(
    (speciesNumber: number) => notes[speciesNumber] || '',
    [notes]
  );

  // Count seen birds
  const seenCount = Object.values(seenBirds).filter(Boolean).length;

  return {
    seenBirds,
    notes,
    isLoading,
    toggleSeen,
    updateNotes,
    resetAll,
    isSeen,
    getNotes,
    seenCount,
  };
};

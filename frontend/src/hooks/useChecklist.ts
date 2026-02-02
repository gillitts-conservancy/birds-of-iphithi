import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabase';

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

  // Helper: load from local cache (AsyncStorage)
  const loadFromCache = async () => {
    const [seenData, notesData, datesData] = await Promise.all([
      AsyncStorage.getItem(SEEN_STORAGE_KEY),
      AsyncStorage.getItem(NOTES_STORAGE_KEY),
      AsyncStorage.getItem(DATES_STORAGE_KEY),
    ]);

    if (seenData) setSeenBirds(JSON.parse(seenData));
    if (notesData) setNotes(JSON.parse(notesData));
    if (datesData) setDates(JSON.parse(datesData));
  };

  // Helper: save to local cache (AsyncStorage)
  const saveCache = async (nextSeen: SeenState, nextNotes: NotesState, nextDates: DatesState) => {
    await Promise.all([
      AsyncStorage.setItem(SEEN_STORAGE_KEY, JSON.stringify(nextSeen)),
      AsyncStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(nextNotes)),
      AsyncStorage.setItem(DATES_STORAGE_KEY, JSON.stringify(nextDates)),
    ]);
  };

  // Helper: fetch sightings from Supabase and hydrate state + cache
  const loadFromSupabase = async (userId: string) => {
    const { data, error } = await supabase
      .from('sightings')
      .select('bird_id, sighted_at, notes')
      .eq('user_id', userId);

    if (error) throw error;

    const nextSeen: SeenState = {};
    const nextNotes: NotesState = {};
    const nextDates: DatesState = {};

    (data ?? []).forEach((row: any) => {
      const speciesNumber = Number(row.bird_id);
      if (!Number.isFinite(speciesNumber)) return;

      nextSeen[speciesNumber] = true;
      nextDates[speciesNumber] = row.sighted_at;
      if (row.notes) nextNotes[speciesNumber] = row.notes;
    });

    setSeenBirds(nextSeen);
    setNotes(nextNotes);
    setDates(nextDates);

    // cache it for offline browsing
    await saveCache(nextSeen, nextNotes, nextDates);
  };

  // On mount: load cache first, then (if logged in) load from Supabase
  useEffect(() => {
    const init = async () => {
      try {
        await loadFromCache();

        const { data } = await supabase.auth.getSession();
        const user = data.session?.user;

        if (user) {
          await loadFromSupabase(user.id);
        }
      } catch (error) {
        console.error('Failed to initialize checklist:', error);
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, []);

  // Toggle seen status for a bird
  const toggleSeen = useCallback(async (speciesNumber: number) => {
    setSeenBirds((prev) => {
      const wasAlreadySeen = !!prev[speciesNumber];
      const nextSeenState: SeenState = { ...prev, [speciesNumber]: !wasAlreadySeen };

      // Optimistically update cache and (if marking seen) date
      if (!wasAlreadySeen) {
        const newDate = new Date().toISOString();
        setDates((prevDates) => {
          const nextDatesState: DatesState = { ...prevDates, [speciesNumber]: newDate };
          // save cache async
          saveCache(nextSeenState, notes, nextDatesState).catch((e) =>
            console.error('Failed to save cache:', e)
          );
          return nextDatesState;
        });
      } else {
        // If unseeing, remove date + notes locally
        setDates((prevDates) => {
          const nextDatesState = { ...prevDates };
          delete nextDatesState[speciesNumber];
          saveCache(nextSeenState, notes, nextDatesState).catch((e) =>
            console.error('Failed to save cache:', e)
          );
          return nextDatesState;
        });
      }

      // Persist seen state to cache async (notes/dates handled above too)
      AsyncStorage.setItem(SEEN_STORAGE_KEY, JSON.stringify(nextSeenState)).catch((e) =>
        console.error('Failed to save seen cache:', e)
      );

      // Persist to Supabase (async; no blocking UI)
      (async () => {
        try {
          const { data } = await supabase.auth.getSession();
          const user = data.session?.user;
          if (!user) return;

          const birdId = String(speciesNumber);

          if (!wasAlreadySeen) {
            // Mark seen: insert a row (dedupe with client_event_id unique index)
            const clientEventId = crypto.randomUUID();
            const sightedAt = new Date().toISOString();

            const { error } = await supabase.from('sightings').insert({
              user_id: user.id,
              bird_id: birdId,
              sighted_at: sightedAt,
              notes: notes[speciesNumber] || null,
              client_event_id: clientEventId,
            });

            if (error) console.error('Failed to save sighting:', error);
          } else {
            // Unsee: delete all sightings for that bird_id for this user
            // (simple behavior for now; later we can keep history if you want)
            const { error } = await supabase
              .from('sightings')
              .delete()
              .eq('user_id', user.id)
              .eq('bird_id', birdId);

            if (error) console.error('Failed to delete sighting:', error);
          }
        } catch (e) {
          console.error('Failed Supabase toggleSeen:', e);
        }
      })();

      return nextSeenState;
    });
  }, [notes]);

  // Update notes for a bird
  const updateNotes = useCallback(async (speciesNumber: number, note: string) => {
    setNotes((prev) => {
      const nextState: NotesState = { ...prev, [speciesNumber]: note };

      // Persist to cache
      AsyncStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(nextState)).catch((e) =>
        console.error('Failed to save notes cache:', e)
      );

      // Persist to Supabase (update existing row for this bird)
      (async () => {
        try {
          const { data } = await supabase.auth.getSession();
          const user = data.session?.user;
          if (!user) return;

          const birdId = String(speciesNumber);

          // Update notes on all rows for this bird for now (simple)
          const { error } = await supabase
            .from('sightings')
            .update({ notes: note })
            .eq('user_id', user.id)
            .eq('bird_id', birdId);

          if (error) console.error('Failed to update notes:', error);
        } catch (e) {
          console.error('Failed Supabase updateNotes:', e);
        }
      })();

      return nextState;
    });
  }, []);

  // Update date for a bird (manual editing)
  const updateDate = useCallback(async (speciesNumber: number, date: string) => {
    setDates((prev) => {
      const nextState: DatesState = { ...prev, [speciesNumber]: date };

      AsyncStorage.setItem(DATES_STORAGE_KEY, JSON.stringify(nextState)).catch((e) =>
        console.error('Failed to save date cache:', e)
      );

      (async () => {
        try {
          const { data } = await supabase.auth.getSession();
          const user = data.session?.user;
          if (!user) return;

          const birdId = String(speciesNumber);

          const { error } = await supabase
            .from('sightings')
            .update({ sighted_at: date })
            .eq('user_id', user.id)
            .eq('bird_id', birdId);

          if (error) console.error('Failed to update date:', error);
        } catch (e) {
          console.error('Failed Supabase updateDate:', e);
        }
      })();

      return nextState;
    });
  }, []);

  // Reset all checkmarks
  const resetAll = useCallback(async () => {
    setSeenBirds({});
    setNotes({});
    setDates({});

    try {
      await Promise.all([
        AsyncStorage.setItem(SEEN_STORAGE_KEY, JSON.stringify({})),
        AsyncStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify({})),
        AsyncStorage.setItem(DATES_STORAGE_KEY, JSON.stringify({})),
      ]);

      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!user) return;

      const { error } = await supabase.from('sightings').delete().eq('user_id', user.id);
      if (error) console.error('Failed to reset sightings in Supabase:', error);
    } catch (error) {
      console.error('Failed to reset data:', error);
    }
  }, []);

  // Check if a bird is seen
  const isSeen = useCallback((speciesNumber: number) => !!seenBirds[speciesNumber], [seenBirds]);

  // Get notes for a bird
  const getNotes = useCallback((speciesNumber: number) => notes[speciesNumber] || '', [notes]);

  // Get date seen for a bird
  const getDateSeen = useCallback((speciesNumber: number) => dates[speciesNumber] || '', [dates]);

  // Count seen birds
  const seenCount = Object.values(seenBirds).filter(Boolean).length;

  return {
    seenBirds,
    notes,
    dates,
    isLoading,
    toggleSeen,
    updateNotes,
    updateDate,
    resetAll,
    isSeen,
    getNotes,
    getDateSeen,
    seenCount,
  };
};

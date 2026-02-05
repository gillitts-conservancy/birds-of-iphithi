import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabase';

const SEEN_STORAGE_KEY = '@birds_of_iphithi_seen';
const NOTES_STORAGE_KEY = '@birds_of_iphithi_notes';
const DATES_STORAGE_KEY = '@birds_of_iphithi_dates';

/**
 * Option B (Event Log) local caches:
 * - sightingsCount: count per species
 * - lastSeen: last event timestamp per species
 *
 * These are derived from Supabase when logged in, but kept locally for offline continuity.
 */
const SIGHTINGS_COUNT_STORAGE_KEY = '@birds_of_iphithi_sightings_count_v1';
const LAST_SEEN_STORAGE_KEY = '@birds_of_iphithi_last_seen_v1';

interface SeenState {
  [speciesNumber: number]: boolean;
}

interface NotesState {
  [speciesNumber: number]: string;
}

interface DatesState {
  [speciesNumber: number]: string; // ISO date string (first-seen / user-edited)
}

interface SightingsCountState {
  [speciesNumber: number]: number;
}

interface LastSeenState {
  [speciesNumber: number]: string; // ISO timestamp
}

const nowIso = () => new Date().toISOString();

const safeParseJson = <T,>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

export const useChecklist = () => {
  const [seenBirds, setSeenBirds] = useState<SeenState>({});
  const [notes, setNotes] = useState<NotesState>({});
  const [dates, setDates] = useState<DatesState>({});

  // Option B (Event Log)
  const [sightingsCount, setSightingsCount] = useState<SightingsCountState>({});
  const [lastSeen, setLastSeen] = useState<LastSeenState>({});

  const [isLoading, setIsLoading] = useState(true);

  // Keep this because Index already surfaces it
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error'>('idle');

  const saveCache = useCallback(
    async (
      nextSeen: SeenState,
      nextNotes: NotesState,
      nextDates: DatesState,
      nextCounts: SightingsCountState,
      nextLastSeen: LastSeenState
    ) => {
      await Promise.all([
        AsyncStorage.setItem(SEEN_STORAGE_KEY, JSON.stringify(nextSeen)),
        AsyncStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(nextNotes)),
        AsyncStorage.setItem(DATES_STORAGE_KEY, JSON.stringify(nextDates)),
        AsyncStorage.setItem(SIGHTINGS_COUNT_STORAGE_KEY, JSON.stringify(nextCounts)),
        AsyncStorage.setItem(LAST_SEEN_STORAGE_KEY, JSON.stringify(nextLastSeen)),
      ]);
    },
    []
  );

  const loadFromCache = useCallback(async () => {
    const [seenData, notesData, datesData, countData, lastSeenData] = await Promise.all([
      AsyncStorage.getItem(SEEN_STORAGE_KEY),
      AsyncStorage.getItem(NOTES_STORAGE_KEY),
      AsyncStorage.getItem(DATES_STORAGE_KEY),
      AsyncStorage.getItem(SIGHTINGS_COUNT_STORAGE_KEY),
      AsyncStorage.getItem(LAST_SEEN_STORAGE_KEY),
    ]);

    const nextSeen = safeParseJson<SeenState>(seenData, {});
    const nextNotes = safeParseJson<NotesState>(notesData, {});
    const nextDates = safeParseJson<DatesState>(datesData, {});
    const nextCounts = safeParseJson<SightingsCountState>(countData, {});
    const nextLastSeen = safeParseJson<LastSeenState>(lastSeenData, {});

    setSeenBirds(nextSeen);
    setNotes(nextNotes);
    setDates(nextDates);
    setSightingsCount(nextCounts);
    setLastSeen(nextLastSeen);

    return { nextSeen, nextNotes, nextDates, nextCounts, nextLastSeen };
  }, [saveCache]);

  const getUserId = useCallback(async (): Promise<string | null> => {
    try {
      const { data } = await supabase.auth.getSession();
      return data.session?.user?.id ?? null;
    } catch {
      return null;
    }
  }, []);

  /**
   * Option B: hydrate derived sightings stats from Supabase event log.
   * - sightingsCount[species] = number of events
   * - lastSeen[species] = max(seen_at)
   * - checkbox seenBirds[species] = count > 0
   *
   * Notes + manual "date first seen" remain local-only for now.
   */
  const loadFromSupabase = useCallback(
    async (userId: string) => {
      setSyncStatus('syncing');

      const { data, error } = await supabase
        .from('sightings')
        .select('species_number, seen_at')
        .eq('user_id', userId);

      if (error) {
        setSyncStatus('error');
        throw error;
      }

      const nextCounts: SightingsCountState = {};
      const nextLastSeen: LastSeenState = {};
      const nextSeen: SeenState = { ...seenBirds }; // keep local if you want, then overlay derived truth

      (data ?? []).forEach((row: any) => {
        const sn = Number(row.species_number);
        if (!Number.isFinite(sn)) return;

        nextCounts[sn] = (nextCounts[sn] ?? 0) + 1;

        const seenAt = row.seen_at as string | undefined;
        if (seenAt) {
          const prev = nextLastSeen[sn];
          if (!prev || seenAt > prev) nextLastSeen[sn] = seenAt;
        }
      });

      // Derive "seen" from event log when logged in
      Object.keys(nextCounts).forEach((k) => {
        const sn = Number(k);
        if (!Number.isFinite(sn)) return;
        nextSeen[sn] = true;
      });

      // If a species has no events, we do NOT force nextSeen[sn]=false here
      // because you still want the checkbox as an optional marker (and you may
      // later decide to fully derive it). This keeps disruption minimal.

      setSightingsCount(nextCounts);
      setLastSeen(nextLastSeen);
      setSeenBirds(nextSeen);

      await saveCache(nextSeen, notes, dates, nextCounts, nextLastSeen);

      setSyncStatus('idle');
    },
    [dates, notes, saveCache, seenBirds]
  );

  /**
   * Option B: Insert a new sighting event (append-only).
   * Called by "+ Seen again" (and also by turning checkbox ON, once).
   */
  const logSighting = useCallback(
    async (speciesNumber: number) => {
      const userId = await getUserId();
      const timestamp = nowIso();

      // Update local derived stats immediately (works offline too)
      const nextCounts: SightingsCountState = {
        ...sightingsCount,
        [speciesNumber]: (sightingsCount[speciesNumber] ?? 0) + 1,
      };

      const prevLast = lastSeen[speciesNumber];
      const nextLastSeen: LastSeenState = {
        ...lastSeen,
        [speciesNumber]: !prevLast || timestamp > prevLast ? timestamp : prevLast,
      };

      // Ensure checkbox reflects at least one sighting
      const nextSeen: SeenState = { ...seenBirds, [speciesNumber]: true };

      // If no "first seen" date exists locally, set it now (optional marker)
      const nextDates: DatesState = { ...dates };
      if (!nextDates[speciesNumber]) nextDates[speciesNumber] = timestamp;

      setSightingsCount(nextCounts);
      setLastSeen(nextLastSeen);
      setSeenBirds(nextSeen);
      setDates(nextDates);

      await saveCache(nextSeen, notes, nextDates, nextCounts, nextLastSeen);

      // If logged in, write event to Supabase
      if (!userId) {
        // Offline / not logged in: event remains local only (offline queue can be added later)
        return;
      }

      setSyncStatus('syncing');

      const { error } = await supabase.from('sightings').insert({
        user_id: userId,
        species_number: speciesNumber,
        seen_at: timestamp,
        // notes: null, // keep column available; we’re not attaching notes per event yet
      });

      if (error) {
        console.error('Failed to log sighting:', error);
        setSyncStatus('error');
        return;
      }

      setSyncStatus('idle');
    },
    [dates, getUserId, lastSeen, notes, saveCache, seenBirds, sightingsCount]
  );

  /**
   * Checkbox behavior (minimal disruption):
   * - Turning ON: log a sighting event once (creates first event)
   * - Turning OFF: purely local checkbox off (does NOT delete server events)
   *
   * This avoids any "toggle ambiguity" on the server: the server is an event log only.
   */
  const toggleSeen = useCallback(
    async (speciesNumber: number) => {
      const wasSeen = !!seenBirds[speciesNumber];

      if (!wasSeen) {
        // Turning ON means: record at least one event.
        await logSighting(speciesNumber);
        return;
      }

      // Turning OFF is local-only (does not delete event log)
      const nextSeen: SeenState = { ...seenBirds, [speciesNumber]: false };
      setSeenBirds(nextSeen);

      await saveCache(nextSeen, notes, dates, sightingsCount, lastSeen);
    },
    [dates, lastSeen, logSighting, notes, saveCache, seenBirds, sightingsCount]
  );

  /**
   * Notes remain local-only for now.
   * (Your table still has notes, but attaching notes to an event log needs a defined model:
   * per-event notes vs per-species notes. We won’t guess.)
   */
  const updateNotes = useCallback(
    async (speciesNumber: number, note: string) => {
      const nextNotes: NotesState = { ...notes, [speciesNumber]: note };
      setNotes(nextNotes);
      await saveCache(seenBirds, nextNotes, dates, sightingsCount, lastSeen);
    },
    [dates, lastSeen, notes, saveCache, seenBirds, sightingsCount]
  );

  /**
   * Date edit remains local-only (first-seen marker / correction).
   */
  const updateDate = useCallback(
    async (speciesNumber: number, date: string) => {
      const nextDates: DatesState = { ...dates, [speciesNumber]: date };
      setDates(nextDates);
      await saveCache(seenBirds, notes, nextDates, sightingsCount, lastSeen);
    },
    [dates, lastSeen, notes, saveCache, seenBirds, sightingsCount]
  );

  /**
   * Reset:
   * - clears local caches
   * - if logged in, deletes ALL your event log rows (per-user RLS allows this)
   */
  const resetAll = useCallback(async () => {
    setSeenBirds({});
    setNotes({});
    setDates({});
    setSightingsCount({});
    setLastSeen({});
    setSyncStatus('idle');

    try {
      await saveCache({}, {}, {}, {}, {});

      const userId = await getUserId();
      if (!userId) return;

      setSyncStatus('syncing');
      const { error } = await supabase.from('sightings').delete().eq('user_id', userId);
      if (error) {
        console.error('Failed to reset sightings in Supabase:', error);
        setSyncStatus('error');
        return;
      }

      setSyncStatus('idle');
    } catch (error) {
      console.error('Failed to reset data:', error);
      setSyncStatus('error');
    }
  }, [getUserId, saveCache]);

  const isSeen = useCallback((speciesNumber: number) => !!seenBirds[speciesNumber], [seenBirds]);
  const getNotes = useCallback((speciesNumber: number) => notes[speciesNumber] || '', [notes]);
  const getDateSeen = useCallback((speciesNumber: number) => dates[speciesNumber] || '', [dates]);

  // Option B selectors
  const getSightingsCount = useCallback(
    (speciesNumber: number) => sightingsCount[speciesNumber] ?? 0,
    [sightingsCount]
  );

  const getLastSeen = useCallback(
    (speciesNumber: number) => lastSeen[speciesNumber] || '',
    [lastSeen]
  );

  const seenCount = Object.values(seenBirds).filter(Boolean).length;

  useEffect(() => {
    const init = async () => {
      try {
        await loadFromCache();

        const userId = await getUserId();
        if (userId) {
          await loadFromSupabase(userId);
        }
      } catch (error) {
        console.error('Failed to initialize checklist:', error);
      } finally {
        setIsLoading(false);
      }
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    // existing
    seenBirds,
    notes,
    dates,
    isLoading,
    syncStatus,
    toggleSeen,
    updateNotes,
    updateDate,
    resetAll,
    isSeen,
    getNotes,
    getDateSeen,
    seenCount,

    // Option B: new
    logSighting,
    getSightingsCount,
    getLastSeen,
  };
};

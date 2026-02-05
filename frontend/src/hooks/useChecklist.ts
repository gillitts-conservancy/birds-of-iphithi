import { useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabase';

const SEEN_STORAGE_KEY = '@birds_of_iphithi_seen';
const NOTES_STORAGE_KEY = '@birds_of_iphithi_notes';
const DATES_STORAGE_KEY = '@birds_of_iphithi_dates';

const SIGHTINGS_COUNT_STORAGE_KEY = '@birds_of_iphithi_sightings_count_v1';
const LAST_SEEN_STORAGE_KEY = '@birds_of_iphithi_last_seen_v1';

type SyncStatus = 'idle' | 'syncing' | 'error';

interface SeenState {
  [speciesNumber: number]: boolean;
}

interface NotesState {
  [speciesNumber: number]: string;
}

interface DatesState {
  [speciesNumber: number]: string; // ISO string
}

interface SightingsCountState {
  [speciesNumber: number]: number;
}

interface LastSeenState {
  [speciesNumber: number]: string; // ISO timestamptz string
}

const safeParse = <T,>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const nowIso = () => new Date().toISOString();

export const useChecklist = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');

  // Existing local checklist state (kept for minimal disruption)
  const [seenBirds, setSeenBirds] = useState<SeenState>({});
  const [notes, setNotes] = useState<NotesState>({});
  const [dates, setDates] = useState<DatesState>({});

  // Option B derived stats (event log)
  const [sightingsCount, setSightingsCount] = useState<SightingsCountState>({});
  const [lastSeen, setLastSeen] = useState<LastSeenState>({});

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

  const loadCache = useCallback(async () => {
    const [seenRaw, notesRaw, datesRaw, countsRaw, lastSeenRaw] = await Promise.all([
      AsyncStorage.getItem(SEEN_STORAGE_KEY),
      AsyncStorage.getItem(NOTES_STORAGE_KEY),
      AsyncStorage.getItem(DATES_STORAGE_KEY),
      AsyncStorage.getItem(SIGHTINGS_COUNT_STORAGE_KEY),
      AsyncStorage.getItem(LAST_SEEN_STORAGE_KEY),
    ]);

    const nextSeen = safeParse<SeenState>(seenRaw, {});
    const nextNotes = safeParse<NotesState>(notesRaw, {});
    const nextDates = safeParse<DatesState>(datesRaw, {});
    const nextCounts = safeParse<SightingsCountState>(countsRaw, {});
    const nextLastSeen = safeParse<LastSeenState>(lastSeenRaw, {});

    setSeenBirds(nextSeen);
    setNotes(nextNotes);
    setDates(nextDates);
    setSightingsCount(nextCounts);
    setLastSeen(nextLastSeen);

    return { nextSeen, nextNotes, nextDates, nextCounts, nextLastSeen };
  }, []);

  const getUserId = useCallback(async (): Promise<string | null> => {
    try {
      const { data } = await supabase.auth.getSession();
      return data.session?.user?.id ?? null;
    } catch {
      return null;
    }
  }, []);

  const refreshSightingsFromSupabase = useCallback(
    async (userId: string) => {
      setSyncStatus('syncing');

      const { data, error } = await supabase
        .from('sightings')
        .select('species_number, seen_at')
        .eq('user_id', userId);

      if (error) {
        setSyncStatus('error');
        return;
      }

      const nextCounts: SightingsCountState = {};
      const nextLast: LastSeenState = {};
      const nextSeen: SeenState = { ...seenBirds };

      (data ?? []).forEach((row: any) => {
        const sn = Number(row.species_number);
        if (!Number.isFinite(sn)) return;

        nextCounts[sn] = (nextCounts[sn] ?? 0) + 1;

        const ts = row.seen_at as string | undefined;
        if (ts) {
          const prev = nextLast[sn];
          if (!prev || ts > prev) nextLast[sn] = ts;
        }
      });

      // derive checkbox "seen" from events (but do NOT force false for missing)
      Object.keys(nextCounts).forEach((k) => {
        const sn = Number(k);
        if (!Number.isFinite(sn)) return;
        nextSeen[sn] = true;
      });

      setSightingsCount(nextCounts);
      setLastSeen(nextLast);
      setSeenBirds(nextSeen);

      await saveCache(nextSeen, notes, dates, nextCounts, nextLast);
      setSyncStatus('idle');
    },
    [dates, notes, saveCache, seenBirds]
  );

  const logSighting = useCallback(
    async (speciesNumber: number) => {
      const userId = await getUserId();
      const ts = nowIso();

      // update local derived stats immediately
      const nextCounts: SightingsCountState = {
        ...sightingsCount,
        [speciesNumber]: (sightingsCount[speciesNumber] ?? 0) + 1,
      };

      const prevLast = lastSeen[speciesNumber];
      const nextLast: LastSeenState = {
        ...lastSeen,
        [speciesNumber]: !prevLast || ts > prevLast ? ts : prevLast,
      };

      const nextSeen: SeenState = { ...seenBirds, [speciesNumber]: true };

      // If user never set a date for this species, seed it (keeps old UI working)
      const nextDates: DatesState = { ...dates };
      if (!nextDates[speciesNumber]) nextDates[speciesNumber] = ts;

      setSightingsCount(nextCounts);
      setLastSeen(nextLast);
      setSeenBirds(nextSeen);
      setDates(nextDates);

      await saveCache(nextSeen, notes, nextDates, nextCounts, nextLast);

      // Offline / logged out: keep local only (offline queue later)
      if (!userId) return;

      setSyncStatus('syncing');
      const { error } = await supabase.from('sightings').insert({
        user_id: userId,
        species_number: speciesNumber,
        seen_at: ts,
      });

      if (error) {
        console.error('Failed to insert sighting:', error);
        setSyncStatus('error');
        return;
      }

      setSyncStatus('idle');
    },
    [dates, getUserId, lastSeen, notes, saveCache, seenBirds, sightingsCount]
  );

  // Checkbox behaviour (minimal disruption):
  // ON -> logs one sighting event
  // OFF -> local-only (does not delete event history)
  const toggleSeen = useCallback(
    async (speciesNumber: number) => {
      const wasSeen = !!seenBirds[speciesNumber];
      if (!wasSeen) {
        await logSighting(speciesNumber);
        return;
      }

      const nextSeen: SeenState = { ...seenBirds, [speciesNumber]: false };
      setSeenBirds(nextSeen);
      await saveCache(nextSeen, notes, dates, sightingsCount, lastSeen);
    },
    [dates, lastSeen, logSighting, notes, saveCache, seenBirds, sightingsCount]
  );

  const isSeen = useCallback((speciesNumber: number) => !!seenBirds[speciesNumber], [seenBirds]);

  const getNotes = useCallback((speciesNumber: number) => notes[speciesNumber] || '', [notes]);
  const getDateSeen = useCallback((speciesNumber: number) => dates[speciesNumber] || '', [dates]);

  const updateNotes = useCallback(
    async (speciesNumber: number, value: string) => {
      const nextNotes: NotesState = { ...notes, [speciesNumber]: value };
      setNotes(nextNotes);
      await saveCache(seenBirds, nextNotes, dates, sightingsCount, lastSeen);
    },
    [dates, lastSeen, notes, saveCache, seenBirds, sightingsCount]
  );

  const updateDate = useCallback(
    async (speciesNumber: number, value: string) => {
      const nextDates: DatesState = { ...dates, [speciesNumber]: value };
      setDates(nextDates);
      await saveCache(seenBirds, notes, nextDates, sightingsCount, lastSeen);
    },
    [dates, lastSeen, notes, saveCache, seenBirds, sightingsCount]
  );

  const resetAll = useCallback(async () => {
    setSeenBirds({});
    setNotes({});
    setDates({});
    setSightingsCount({});
    setLastSeen({});
    setSyncStatus('idle');

    await saveCache({}, {}, {}, {}, {});

    const userId = await getUserId();
    if (!userId) return;

    setSyncStatus('syncing');
    const { error } = await supabase.from('sightings').delete().eq('user_id', userId);
    if (error) {
      console.error('Failed to reset sightings:', error);
      setSyncStatus('error');
      return;
    }
    setSyncStatus('idle');
  }, [getUserId, saveCache]);

  const getSightingsCount = useCallback(
    (speciesNumber: number) => sightingsCount[speciesNumber] ?? 0,
    [sightingsCount]
  );

  const getLastSeen = useCallback(
    (speciesNumber: number) => lastSeen[speciesNumber] || '',
    [lastSeen]
  );

  const seenCount = useMemo(() => Object.values(seenBirds).filter(Boolean).length, [seenBirds]);

  useEffect(() => {
    const init = async () => {
      try {
        await loadCache();
        const userId = await getUserId();
        if (userId) await refreshSightingsFromSupabase(userId);
      } catch (e) {
        console.error('useChecklist init failed:', e);
      } finally {
        setIsLoading(false);
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    isLoading,
    syncStatus,

    toggleSeen,
    isSeen,

    getNotes,
    getDateSeen,
    updateNotes,
    updateDate,

    resetAll,
    seenCount,

    // Option B
    logSighting,
    getSightingsCount,
    getLastSeen,
  };
};

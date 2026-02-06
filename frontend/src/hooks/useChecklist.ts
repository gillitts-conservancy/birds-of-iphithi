import { useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabase';

const SEEN_STORAGE_KEY = '@birds_seen_v1';
const NOTES_STORAGE_KEY = '@birds_notes_v1';
const DATES_STORAGE_KEY = '@birds_dates_v1';
const SIGHTINGS_COUNT_KEY = '@birds_sightings_count_v1';
const LAST_SEEN_KEY = '@birds_last_seen_v1';

// NEW
const PENDING_SIGHTINGS_KEY = '@birds_pending_sightings_v1';

type SyncStatus = 'idle' | 'syncing' | 'error';

type SeenState = Record<number, boolean>;
type NotesState = Record<number, string>;
type DatesState = Record<number, string>;
type SightingsCountState = Record<number, number>;
type LastSeenState = Record<number, string>;

type PendingSighting = {
  client_event_id: string;
  species_number: number;
  seen_at: string;
};

const safeParse = <T,>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const nowIso = () => new Date().toISOString();

const generateUUID = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const useChecklist = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [lastSyncError, setLastSyncError] = useState<string>('');

  const [seenBirds, setSeenBirds] = useState<SeenState>({});
  const [notes, setNotes] = useState<NotesState>({});
  const [dates, setDates] = useState<DatesState>({});
  const [sightingsCount, setSightingsCount] = useState<SightingsCountState>({});
  const [lastSeen, setLastSeen] = useState<LastSeenState>({});

  /* ------------------------------------------------------------------ */
  /* Cache helpers                                                      */
  /* ------------------------------------------------------------------ */

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
        AsyncStorage.setItem(SIGHTINGS_COUNT_KEY, JSON.stringify(nextCounts)),
        AsyncStorage.setItem(LAST_SEEN_KEY, JSON.stringify(nextLastSeen)),
      ]);
    },
    []
  );

  const loadCache = useCallback(async () => {
    const [seenRaw, notesRaw, datesRaw, countsRaw, lastSeenRaw] = await Promise.all([
      AsyncStorage.getItem(SEEN_STORAGE_KEY),
      AsyncStorage.getItem(NOTES_STORAGE_KEY),
      AsyncStorage.getItem(DATES_STORAGE_KEY),
      AsyncStorage.getItem(SIGHTINGS_COUNT_KEY),
      AsyncStorage.getItem(LAST_SEEN_KEY),
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
    const { data } = await supabase.auth.getSession();
    return data.session?.user?.id ?? null;
  }, []);

  /* ------------------------------------------------------------------ */
  /* Pending queue (NEW)                                                */
  /* ------------------------------------------------------------------ */

  const getPending = useCallback(async (): Promise<PendingSighting[]> => {
    const raw = await AsyncStorage.getItem(PENDING_SIGHTINGS_KEY);
    return safeParse<PendingSighting[]>(raw, []);
  }, []);

  const setPending = useCallback(async (items: PendingSighting[]) => {
    await AsyncStorage.setItem(PENDING_SIGHTINGS_KEY, JSON.stringify(items));
  }, []);

  const enqueuePending = useCallback(
    async (item: PendingSighting) => {
      const items = await getPending();
      items.push(item);
      await setPending(items);
    },
    [getPending, setPending]
  );

  const retryPendingSightings = useCallback(async () => {
    const userId = await getUserId();
    if (!userId) {
      setSyncStatus('error');
      setLastSyncError('Not signed in.');
      return;
    }

    const pending = await getPending();
    if (pending.length === 0) {
      // Nothing to retry
      setSyncStatus('idle');
      return;
    }

    setSyncStatus('syncing');
    setLastSyncError('');

    try {
      const { error, status } = await supabase.from('sightings').insert(
        pending.map((p) => ({
          user_id: userId,
          species_number: p.species_number,
          seen_at: p.seen_at,
          client_event_id: p.client_event_id,
        }))
      );

      console.log('SIGHTINGS RETRY RESULT', { status, error });

      if (error) {
        setSyncStatus('error');
        setLastSyncError(error.message ?? 'Unknown error');
        return;
      }

      await setPending([]);
      setSyncStatus('idle');
    } catch (e) {
      console.log('SIGHTINGS RETRY EXCEPTION', e);
      setSyncStatus('error');
      setLastSyncError(String(e));
    }
  }, [getPending, getUserId, setPending]);

  /* ------------------------------------------------------------------ */
  /* Option B — log sighting                                            */
  /* ------------------------------------------------------------------ */

  const logSighting = useCallback(
    async (speciesNumber: number) => {
      const userId = await getUserId();
      const ts = nowIso();

      // update local state immediately
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

      // keep old Date Seen behavior intact
      const nextDates: DatesState = { ...dates };
      if (!nextDates[speciesNumber]) nextDates[speciesNumber] = ts;

      setSightingsCount(nextCounts);
      setLastSeen(nextLast);
      setSeenBirds(nextSeen);
      setDates(nextDates);

      await saveCache(nextSeen, notes, nextDates, nextCounts, nextLast);

      // not signed in: keep local only, queue it
      if (!userId) {
        const client_event_id = generateUUID();
        await enqueuePending({ client_event_id, species_number: speciesNumber, seen_at: ts });
        setSyncStatus('error');
        setLastSyncError('Not signed in. Saved locally.');
        return;
      }

      const client_event_id = generateUUID();

      setSyncStatus('syncing');
      setLastSyncError('');

      try {
        const { data, error, status } = await supabase.from('sightings').insert({
          user_id: userId,
          species_number: speciesNumber,
          seen_at: ts,
          client_event_id,
        });

        console.log('SIGHTINGS INSERT RESULT', { status, error, data });

        if (error) {
          // queue for retry
          await enqueuePending({ client_event_id, species_number: speciesNumber, seen_at: ts });
          setSyncStatus('error');
          setLastSyncError(error.message ?? 'Unknown error');
          return;
        }

        setSyncStatus('idle');
      } catch (e) {
        // queue for retry
        await enqueuePending({ client_event_id, species_number: speciesNumber, seen_at: ts });
        setSyncStatus('error');
        setLastSyncError(String(e));
      }
    },
    [dates, enqueuePending, getUserId, lastSeen, notes, saveCache, seenBirds, sightingsCount]
  );

  /* ------------------------------------------------------------------ */
  /* Existing checklist behaviour                                       */
  /* ------------------------------------------------------------------ */

  const toggleSeen = useCallback(
    async (speciesNumber: number) => {
      const wasSeen = !!seenBirds[speciesNumber];
      if (!wasSeen) {
        await logSighting(speciesNumber);
        return;
      }

      const nextSeen = { ...seenBirds, [speciesNumber]: false };
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
      const nextNotes = { ...notes, [speciesNumber]: value };
      setNotes(nextNotes);
      await saveCache(seenBirds, nextNotes, dates, sightingsCount, lastSeen);
    },
    [dates, lastSeen, notes, saveCache, seenBirds, sightingsCount]
  );

  const updateDate = useCallback(
    async (speciesNumber: number, value: string) => {
      const nextDates = { ...dates, [speciesNumber]: value };
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
    setLastSyncError('');

    await saveCache({}, {}, {}, {}, {});
    await setPending([]);

    const userId = await getUserId();
    if (!userId) return;

    setSyncStatus('syncing');
    const { error } = await supabase.from('sightings').delete().eq('user_id', userId);

    if (error) {
      setSyncStatus('error');
      setLastSyncError(error.message ?? 'Unknown error');
      return;
    }

    setSyncStatus('idle');
  }, [getUserId, saveCache, setPending]);

  const getSightingsCount = useCallback(
    (speciesNumber: number) => sightingsCount[speciesNumber] ?? 0,
    [sightingsCount]
  );

  const getLastSeen = useCallback((speciesNumber: number) => lastSeen[speciesNumber] || '', [lastSeen]);

  const seenCount = useMemo(() => Object.values(seenBirds).filter(Boolean).length, [seenBirds]);

  /* ------------------------------------------------------------------ */
  /* Init                                                               */
  /* ------------------------------------------------------------------ */

  useEffect(() => {
    const init = async () => {
      try {
        await loadCache();
        // If we have pending and user is signed in, attempt a quick retry on startup
        const userId = await getUserId();
        if (userId) await retryPendingSightings();
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, [getUserId, loadCache, retryPendingSightings]);

  return {
    isLoading,
    syncStatus,
    lastSyncError,

    toggleSeen,
    isSeen,

    getNotes,
    getDateSeen,
    updateNotes,
    updateDate,

    resetAll,
    seenCount,

    logSighting,
    getSightingsCount,
    getLastSeen,

    retryPendingSightings,
  };
};

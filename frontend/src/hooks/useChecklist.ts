import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabase';

const SEEN_STORAGE_KEY = '@birds_of_iphithi_seen';
const NOTES_STORAGE_KEY = '@birds_of_iphithi_notes';
const DATES_STORAGE_KEY = '@birds_of_iphithi_dates';

// Final-state “dirty snapshot” queue (per bird_id)
const DIRTY_STORAGE_KEY = '@birds_of_iphithi_dirty_v1';

interface SeenState {
  [speciesNumber: number]: boolean;
}

interface NotesState {
  [speciesNumber: number]: string;
}

interface DatesState {
  [speciesNumber: number]: string; // ISO date string
}

/**
 * Dirty entry represents the *final* state we want the server to reflect.
 * - seen: whether the bird is checked
 * - date: the local date (ISO) we want stored for first-seen (subject to earliest-wins rule)
 * - dateEdited: user explicitly edited the date (override earliest-wins)
 * - notes: notes to store (only synced when seen === true)
 */
type DirtyMap = Record<
  string,
  {
    seen: boolean;
    date?: string;
    dateEdited?: boolean;
    notes?: string | null;
    updatedAt: string; // ISO timestamp for debugging / future use
  }
>;

// Works in web + RN without relying on crypto.randomUUID
const uuid = (): string => {
  const c: any = (globalThis as any).crypto;
  if (c?.randomUUID) return c.randomUUID();

  // Fallback UUID v4-ish
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = Math.floor(Math.random() * 16);
    const v = ch === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

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
  const [isLoading, setIsLoading] = useState(true);

  // Optional: simple sync status you can surface later if you want
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error'>('idle');

  // Keep dirty queue in memory to reduce AsyncStorage reads
  const dirtyRef = useRef<DirtyMap>({});
  const syncingRef = useRef(false);

  const saveCache = useCallback(async (nextSeen: SeenState, nextNotes: NotesState, nextDates: DatesState) => {
    await Promise.all([
      AsyncStorage.setItem(SEEN_STORAGE_KEY, JSON.stringify(nextSeen)),
      AsyncStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(nextNotes)),
      AsyncStorage.setItem(DATES_STORAGE_KEY, JSON.stringify(nextDates)),
    ]);
  }, []);

  const saveDirty = useCallback(async (dirty: DirtyMap) => {
    dirtyRef.current = dirty;
    await AsyncStorage.setItem(DIRTY_STORAGE_KEY, JSON.stringify(dirty));
  }, []);

  const loadDirty = useCallback(async () => {
    const raw = await AsyncStorage.getItem(DIRTY_STORAGE_KEY);
    const parsed = safeParseJson<DirtyMap>(raw, {});
    dirtyRef.current = parsed;
    return parsed;
  }, []);

  const enqueueDirty = useCallback(
    async (birdId: string, patch: Omit<DirtyMap[string], 'updatedAt'> & { updatedAt?: string }) => {
      const current = dirtyRef.current ?? {};
      const prev = current[birdId];

      // Coalesce to final state for this bird (last write wins)
      const nextEntry = {
        seen: patch.seen,
        date: patch.date ?? prev?.date,
        dateEdited: patch.dateEdited ?? prev?.dateEdited,
        notes: patch.notes ?? prev?.notes,
        updatedAt: patch.updatedAt ?? nowIso(),
      };

      const nextDirty: DirtyMap = { ...current, [birdId]: nextEntry };
      await saveDirty(nextDirty);
    },
    [saveDirty]
  );

  const removeDirty = useCallback(
    async (birdId: string) => {
      const current = dirtyRef.current ?? {};
      if (!current[birdId]) return;

      const nextDirty: DirtyMap = { ...current };
      delete nextDirty[birdId];
      await saveDirty(nextDirty);
    },
    [saveDirty]
  );

  const getUserId = useCallback(async (): Promise<string | null> => {
    try {
      const { data } = await supabase.auth.getSession();
      return data.session?.user?.id ?? null;
    } catch {
      return null;
    }
  }, []);

  /**
   * First-seen rule:
   * - If the user did NOT explicitly edit the date, keep the earliest date between server + local.
   * - If they DID explicitly edit the date, trust the local date (correction).
   */
  const chooseFirstSeenDate = useCallback(
    async (userId: string, birdId: string, localDateIso: string, dateEdited?: boolean) => {
      if (dateEdited) return localDateIso;

      // Fetch existing (if any) and keep earliest
      const { data, error } = await supabase
        .from('sightings')
        .select('sighted_at')
        .eq('user_id', userId)
        .eq('bird_id', birdId)
        .maybeSingle();

      if (error) {
        // If this fails (offline, network, etc), fall back to local date;
        // dirty entry will remain and we’ll retry later.
        return localDateIso;
      }

      const serverDate = data?.sighted_at as string | undefined;
      if (!serverDate) return localDateIso;

      // ISO string compare works for chronological ordering when both are valid ISO timestamps
      return serverDate < localDateIso ? serverDate : localDateIso;
    },
    []
  );

  /**
   * Flush dirty queue to Supabase.
   * - Final state only per bird.
   * - Stops on first “hard” error to avoid hammering.
   */
  const flushDirtyToSupabase = useCallback(async () => {
    if (syncingRef.current) return;

    const userId = await getUserId();
    if (!userId) return;

    syncingRef.current = true;
    setSyncStatus('syncing');

    try {
      const dirty = dirtyRef.current ?? {};
      const birdIds = Object.keys(dirty);

      for (const birdId of birdIds) {
        const entry = dirty[birdId];
        if (!entry) continue;

        if (entry.seen) {
          const localDate = entry.date ?? nowIso();
          const finalDate = await chooseFirstSeenDate(userId, birdId, localDate, entry.dateEdited);

          // Determine if a row exists
          const { data: existing, error: existingError } = await supabase
            .from('sightings')
            .select('bird_id')
            .eq('user_id', userId)
            .eq('bird_id', birdId)
            .maybeSingle();

          if (existingError) {
            // Likely offline / network / auth edge. Stop flush; keep dirty for later.
            throw existingError;
          }

          if (existing) {
            const { error: updateError } = await supabase
              .from('sightings')
              .update({
                sighted_at: finalDate,
                notes: entry.notes ?? null,
                client_event_id: uuid(),
              })
              .eq('user_id', userId)
              .eq('bird_id', birdId);

            if (updateError) throw updateError;
          } else {
            const { error: insertError } = await supabase.from('sightings').insert({
              user_id: userId,
              bird_id: birdId,
              sighted_at: finalDate,
              notes: entry.notes ?? null,
              client_event_id: uuid(),
            });

            if (insertError) throw insertError;
          }

          await removeDirty(birdId);
        } else {
          // Final state is unchecked: delete on server
          const { error: deleteError } = await supabase
            .from('sightings')
            .delete()
            .eq('user_id', userId)
            .eq('bird_id', birdId);

          if (deleteError) throw deleteError;

          await removeDirty(birdId);
        }
      }

      setSyncStatus('idle');
    } catch (e) {
      console.error('Failed to flush dirty queue:', e);
      setSyncStatus('error');
    } finally {
      syncingRef.current = false;
    }
  }, [chooseFirstSeenDate, getUserId, removeDirty]);

  const loadFromCache = useCallback(async () => {
    const [seenData, notesData, datesData] = await Promise.all([
      AsyncStorage.getItem(SEEN_STORAGE_KEY),
      AsyncStorage.getItem(NOTES_STORAGE_KEY),
      AsyncStorage.getItem(DATES_STORAGE_KEY),
    ]);

    const nextSeen = safeParseJson<SeenState>(seenData, {});
    const nextNotes = safeParseJson<NotesState>(notesData, {});
    const nextDates = safeParseJson<DatesState>(datesData, {});

    setSeenBirds(nextSeen);
    setNotes(nextNotes);
    setDates(nextDates);

    return { nextSeen, nextNotes, nextDates };
  }, []);

  const loadFromSupabase = useCallback(
    async (userId: string) => {
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
        if (row.sighted_at) nextDates[speciesNumber] = row.sighted_at;
        if (row.notes) nextNotes[speciesNumber] = row.notes;
      });

      setSeenBirds(nextSeen);
      setNotes(nextNotes);
      setDates(nextDates);

      await saveCache(nextSeen, nextNotes, nextDates);
    },
    [saveCache]
  );

  useEffect(() => {
    const init = async () => {
      try {
        await loadFromCache();
        await loadDirty();

        const userId = await getUserId();
        if (userId) {
          // Hydrate from server, then apply any pending local changes on top via flush.
          await loadFromSupabase(userId);
          await flushDirtyToSupabase();
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

  /**
   * Toggle seen:
   * - Turning ON: set date if missing (now), but this will be reconciled to earliest-on-server on sync unless user edits.
   * - Turning OFF: remove date locally (and leave notes locally — not synced while unchecked in current model).
   */
  const toggleSeen = useCallback(
    async (speciesNumber: number) => {
      const birdId = String(speciesNumber);

      // Compute next state from current state snapshots (avoid nested setState side effects)
      const wasSeen = !!seenBirds[speciesNumber];
      const nextSeen: SeenState = { ...seenBirds, [speciesNumber]: !wasSeen };

      let nextDates: DatesState = { ...dates };
      if (!wasSeen) {
        // Only set if missing
        if (!nextDates[speciesNumber]) {
          nextDates[speciesNumber] = nowIso();
        }
      } else {
        delete nextDates[speciesNumber];
      }

      // Notes remain in local cache even when unchecked.
      // (If later you add a separate bird_notes table, we can sync these too.)
      const nextNotes: NotesState = { ...notes };

      setSeenBirds(nextSeen);
      setDates(nextDates);
      setNotes(nextNotes);

      await saveCache(nextSeen, nextNotes, nextDates);

      // Enqueue final desired server state
      if (!wasSeen) {
        await enqueueDirty(birdId, {
          seen: true,
          date: nextDates[speciesNumber],
          dateEdited: false,
          notes: nextNotes[speciesNumber] ?? null,
        });
      } else {
        await enqueueDirty(birdId, {
          seen: false,
          // date/notes kept for local use, but server will delete row
        });
      }

      // Try to flush (no-op if not logged in / offline)
      await flushDirtyToSupabase();
    },
    [dates, enqueueDirty, flushDirtyToSupabase, notes, saveCache, seenBirds]
  );

  /**
   * Update notes:
   * - Always saved locally.
   * - If the bird is currently seen, we enqueue a server update.
   * - If unchecked, notes remain local-only with current schema (by design).
   */
  const updateNotes = useCallback(
    async (speciesNumber: number, note: string) => {
      const birdId = String(speciesNumber);
      const nextNotes: NotesState = { ...notes, [speciesNumber]: note };

      setNotes(nextNotes);
      await saveCache(seenBirds, nextNotes, dates);

      if (seenBirds[speciesNumber]) {
        await enqueueDirty(birdId, {
          seen: true,
          date: dates[speciesNumber] ?? nowIso(),
          notes: note,
          // dateEdited left as-is
        });
        await flushDirtyToSupabase();
      }
    },
    [dates, enqueueDirty, flushDirtyToSupabase, notes, saveCache, seenBirds]
  );

  /**
   * Update date:
   * - This is an explicit correction by the user, so dateEdited=true
   * - If bird is seen, enqueue update.
   */
  const updateDate = useCallback(
    async (speciesNumber: number, date: string) => {
      const birdId = String(speciesNumber);
      const nextDates: DatesState = { ...dates, [speciesNumber]: date };

      setDates(nextDates);
      await saveCache(seenBirds, notes, nextDates);

      if (seenBirds[speciesNumber]) {
        await enqueueDirty(birdId, {
          seen: true,
          date,
          dateEdited: true,
          notes: notes[speciesNumber] ?? null,
        });
        await flushDirtyToSupabase();
      }
    },
    [dates, enqueueDirty, flushDirtyToSupabase, notes, saveCache, seenBirds]
  );

  const resetAll = useCallback(async () => {
    setSeenBirds({});
    setNotes({});
    setDates({});
    setSyncStatus('idle');

    try {
      await Promise.all([
        AsyncStorage.setItem(SEEN_STORAGE_KEY, JSON.stringify({})),
        AsyncStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify({})),
        AsyncStorage.setItem(DATES_STORAGE_KEY, JSON.stringify({})),
      ]);

      await saveDirty({});

      const userId = await getUserId();
      if (!userId) return;

      const { error } = await supabase.from('sightings').delete().eq('user_id', userId);
      if (error) console.error('Failed to reset sightings in Supabase:', error);
    } catch (error) {
      console.error('Failed to reset data:', error);
    }
  }, [getUserId, saveDirty]);

  const isSeen = useCallback((speciesNumber: number) => !!seenBirds[speciesNumber], [seenBirds]);
  const getNotes = useCallback((speciesNumber: number) => notes[speciesNumber] || '', [notes]);
  const getDateSeen = useCallback((speciesNumber: number) => dates[speciesNumber] || '', [dates]);

  const seenCount = Object.values(seenBirds).filter(Boolean).length;

  return {
    seenBirds,
    notes,
    dates,
    isLoading,
    syncStatus, // optional
    toggleSeen,
    updateNotes,
    updateDate,
    resetAll,
    isSeen,
    getNotes,
    getDateSeen,
    seenCount,
    // Optional manual sync trigger (handy for a “Sync now” button later)
    flushDirtyToSupabase,
  };
};

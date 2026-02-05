import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bird } from '../data/birds';
import { supabase } from '../supabase';

// Helper function to format date for display
const formatDate = (isoDate: string): string => {
  if (!isoDate) return '';
  const date = new Date(isoDate);
  return date.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

// Helper function to format date for input
const formatDateForInput = (isoDate: string): string => {
  if (!isoDate) return '';
  const date = new Date(isoDate);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper for compact event timestamp display
const formatSeenAt = (isoDate: string): string => {
  if (!isoDate) return '';
  const d = new Date(isoDate);
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

type SightingRow = {
  seen_at: string;
};

interface BirdDetailModalProps {
  bird: Bird | null;
  visible: boolean;
  isSeen: boolean;
  notes: string;
  dateSeen: string;

  // Option B: allow modal to reflect local derived state when server sync fails
  sightingsCount?: number; // derived/local count
  lastSeen?: string;       // derived/local last seen
  syncStatus?: 'idle' | 'syncing' | 'error';

  onClose: () => void;
  onToggleSeen: () => void;
  onUpdateNotes: (notes: string) => void;
  onUpdateDate: (date: string) => void;
}

export const BirdDetailModal: React.FC<BirdDetailModalProps> = ({
  bird,
  visible,
  isSeen,
  notes,
  dateSeen,

  sightingsCount = 0,
  lastSeen = '',
  syncStatus = 'idle',

  onClose,
  onToggleSeen,
  onUpdateNotes,
  onUpdateDate,
}) => {
  const insets = useSafeAreaInsets();

  const [localNotes, setLocalNotes] = useState(notes);
  const [localDate, setLocalDate] = useState(formatDateForInput(dateSeen));
  const [isEditingDate, setIsEditingDate] = useState(false);

  // Option B: sightings list (server)
  const [sightings, setSightings] = useState<SightingRow[]>([]);
  const [isLoadingSightings, setIsLoadingSightings] = useState(false);
  const [sightingsError, setSightingsError] = useState<string>('');
  const [showAllSightings, setShowAllSightings] = useState(false);

  // Whether user is logged in (for server fetch expectations)
  const [isAuthed, setIsAuthed] = useState<boolean>(false);

  useEffect(() => {
    setLocalNotes(notes);
    setLocalDate(formatDateForInput(dateSeen));
  }, [notes, dateSeen, bird]);

  const handleNotesBlur = () => {
    if (localNotes !== notes) {
      onUpdateNotes(localNotes);
    }
  };

  const handleDateChange = (text: string) => {
    const cleaned = text.replace(/[^0-9-]/g, '');
    setLocalDate(cleaned);
  };

  const handleDateBlur = () => {
    setIsEditingDate(false);
    if (localDate) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (dateRegex.test(localDate)) {
        const newDate = new Date(localDate);
        if (!isNaN(newDate.getTime())) {
          onUpdateDate(newDate.toISOString());
        }
      }
    }
  };

  const fetchSightings = useCallback(async () => {
    if (!bird) return;

    setSightingsError('');
    setIsLoadingSightings(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id;

      setIsAuthed(!!userId);

      // If logged out, we can’t fetch server events
      if (!userId) {
        setSightings([]);
        setIsLoadingSightings(false);
        return;
      }

      const { data, error } = await supabase
        .from('sightings')
        .select('seen_at')
        .eq('user_id', userId)
        .eq('species_number', bird.speciesNumber)
        .order('seen_at', { ascending: false });

      if (error) {
        setSightings([]);
        setSightingsError('Could not load sightings.');
        setIsLoadingSightings(false);
        return;
      }

      setSightings((data ?? []) as SightingRow[]);
      setIsLoadingSightings(false);
    } catch (e) {
      setSightings([]);
      setSightingsError('Could not load sightings.');
      setIsLoadingSightings(false);
      setIsAuthed(false);
    }
  }, [bird]);

  useEffect(() => {
    if (!visible) return;
    if (!bird) return;
    fetchSightings();
  }, [visible, bird, fetchSightings]);

  const handleToggleSeenAndRefresh = async () => {
    await Promise.resolve(onToggleSeen());
    await fetchSightings();
  };

  const serverCount = sightings.length;

  // This is the key: if local says seen (or has sightingsCount/lastSeen)
  // but server has none AND sync is errored (or user is logged out),
  // show a “pending sync” message instead of “no sightings”.
  const localHasEvidence = sightingsCount > 0 || !!lastSeen || !!dateSeen || isSeen;
  const serverHasNone = serverCount === 0;
  const syncLooksBroken = syncStatus === 'error';
  const notLoggedIn = !isAuthed;

  const showPendingSync =
    localHasEvidence &&
    serverHasNone &&
    !isLoadingSightings &&
    !sightingsError &&
    (syncLooksBroken || notLoggedIn);

  const maxCollapsed = 6;
  const sightingsToDisplay = useMemo(() => {
    if (showAllSightings) return sightings;
    return sightings.slice(0, maxCollapsed);
  }, [sightings, showAllSightings]);

  if (!bird) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="chevron-back" size={28} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Bird Details</Text>
            <View style={{ width: 44 }} />
          </View>

          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            <Image source={{ uri: bird.photoUrl }} style={styles.image} resizeMode="cover" />

            <View style={styles.detailsContainer}>
              <Text style={styles.speciesNumber}>Species #{bird.speciesNumber}</Text>
              <Text style={styles.commonName}>{bird.commonName}</Text>
              <Text style={styles.scientificName}>{bird.scientificName}</Text>

              <TouchableOpacity
                style={styles.seenToggle}
                onPress={handleToggleSeenAndRefresh}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, isSeen && styles.checkboxChecked]}>
                  {isSeen && <Ionicons name="checkmark" size={20} color="#fff" />}
                </View>
                <Text style={styles.seenText}>{isSeen ? 'Seen' : 'Not seen yet'}</Text>
              </TouchableOpacity>

              {/* Option B: Sightings event log */}
              <View style={styles.sightingsSection}>
                <View style={styles.sightingsHeaderRow}>
                  <View style={styles.sightingsTitleRow}>
                    <Ionicons name="time-outline" size={18} color="#018440" />
                    <Text style={styles.sightingsLabel}>Sightings</Text>
                  </View>

                  <View style={styles.sightingsHeaderRight}>
                    {!isLoadingSightings && (
                      <Text style={styles.sightingsCount}>{`${serverCount}`}</Text>
                    )}
                    <TouchableOpacity
                      style={styles.retryButton}
                      onPress={fetchSightings}
                      activeOpacity={0.8}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="refresh" size={18} color="#018440" />
                    </TouchableOpacity>
                  </View>
                </View>

                {isLoadingSightings && (
                  <View style={styles.sightingsLoadingRow}>
                    <ActivityIndicator size="small" color="#018440" />
                    <Text style={styles.sightingsLoadingText}>Loading sightings…</Text>
                  </View>
                )}

                {!isLoadingSightings && !!sightingsError && (
                  <Text style={styles.sightingsErrorText}>{sightingsError}</Text>
                )}

                {!isLoadingSightings && !sightingsError && showPendingSync && (
                  <View style={styles.pendingSyncBox}>
                    <Ionicons name="cloud-offline-outline" size={18} color="#9a6b00" />
                    <Text style={styles.pendingSyncText}>
                      Sightings are saved locally and haven’t synced yet.
                    </Text>
                    <Text style={styles.pendingSyncSubText}>
                      {notLoggedIn
                        ? 'You are not signed in, so server sightings won’t show here.'
                        : 'Sync is paused right now. Tap refresh to retry.'}
                    </Text>
                  </View>
                )}

                {!isLoadingSightings && !sightingsError && !showPendingSync && serverCount === 0 && (
                  <Text style={styles.sightingsEmptyText}>No sightings logged yet.</Text>
                )}

                {!isLoadingSightings && !sightingsError && serverCount > 0 && (
                  <View style={styles.sightingsList}>
                    {sightingsToDisplay.map((s, idx) => (
                      <View key={`${s.seen_at}-${idx}`} style={styles.sightingRow}>
                        <Ionicons name="ellipse" size={8} color="#018440" />
                        <Text style={styles.sightingText}>{formatSeenAt(s.seen_at)}</Text>
                      </View>
                    ))}

                    {serverCount > maxCollapsed && (
                      <TouchableOpacity
                        style={styles.showMoreButton}
                        onPress={() => setShowAllSightings((v) => !v)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.showMoreText}>
                          {showAllSightings ? 'Show less' : `Show all (${serverCount})`}
                        </Text>
                        <Ionicons
                          name={showAllSightings ? 'chevron-up' : 'chevron-down'}
                          size={16}
                          color="#018440"
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>

              {isSeen && (
                <View style={styles.dateSection}>
                  <View style={styles.dateLabelRow}>
                    <Ionicons name="calendar" size={18} color="#018440" />
                    <Text style={styles.dateLabel}>Date Seen</Text>
                  </View>
                  {isEditingDate ? (
                    <TextInput
                      style={styles.dateInput}
                      value={localDate}
                      onChangeText={handleDateChange}
                      onBlur={handleDateBlur}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor="#999"
                      keyboardType="numeric"
                      autoFocus
                    />
                  ) : (
                    <TouchableOpacity style={styles.dateDisplay} onPress={() => setIsEditingDate(true)}>
                      <Text style={styles.dateValue}>
                        {dateSeen ? formatDate(dateSeen) : 'Tap to set date'}
                      </Text>
                      <Ionicons name="pencil" size={16} color="#888" />
                    </TouchableOpacity>
                  )}
                </View>
              )}

              <View style={styles.notesSection}>
                <Text style={styles.notesLabel}>Notes</Text>
                <TextInput
                  style={styles.notesInput}
                  value={localNotes}
                  onChangeText={setLocalNotes}
                  onBlur={handleNotesBlur}
                  placeholder="Add your observations here..."
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a1a' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#018440',
  },
  closeButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '600', color: '#fff' },
  content: { flex: 1 },
  contentContainer: { paddingBottom: 40 },
  image: { width: '100%', height: 250, backgroundColor: '#333' },
  detailsContainer: { padding: 20 },
  speciesNumber: { fontSize: 14, color: '#aaa', fontWeight: '500', marginBottom: 4 },
  commonName: { fontSize: 24, fontWeight: '700', color: '#fff', marginBottom: 4 },
  scientificName: { fontSize: 16, fontStyle: 'italic', color: '#ccc', marginBottom: 20 },

  seenToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 14,
  },
  checkbox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxChecked: { backgroundColor: '#018440', borderColor: '#018440' },
  seenText: { fontSize: 16, fontWeight: '500', color: '#333' },

  sightingsSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  sightingsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sightingsTitleRow: { flexDirection: 'row', alignItems: 'center' },
  sightingsLabel: { fontSize: 14, fontWeight: '700', color: '#018440', marginLeft: 8 },
  sightingsHeaderRight: { flexDirection: 'row', alignItems: 'center' },
  sightingsCount: { fontSize: 14, fontWeight: '800', color: '#333' },

  retryButton: {
    marginLeft: 10,
    backgroundColor: '#F3FAF5',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },

  sightingsLoadingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  sightingsLoadingText: { marginLeft: 10, color: '#666', fontSize: 13, fontWeight: '600' },
  sightingsErrorText: { color: '#b00020', fontSize: 13, fontWeight: '600' },
  sightingsEmptyText: { color: '#666', fontSize: 13, fontWeight: '600' },

  pendingSyncBox: {
    backgroundColor: '#FFF6E5',
    borderRadius: 10,
    padding: 12,
  },
  pendingSyncText: {
    marginTop: 6,
    color: '#7a5200',
    fontSize: 13,
    fontWeight: '800',
  },
  pendingSyncSubText: {
    marginTop: 6,
    color: '#7a5200',
    fontSize: 12,
    fontWeight: '600',
  },

  sightingsList: { gap: 8 },
  sightingRow: { flexDirection: 'row', alignItems: 'center' },
  sightingText: { marginLeft: 10, fontSize: 13, color: '#333', fontWeight: '600' },

  showMoreButton: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#F3FAF5',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  showMoreText: { fontSize: 12, fontWeight: '800', color: '#018440', marginRight: 6 },

  dateSection: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 20 },
  dateLabelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  dateLabel: { fontSize: 14, fontWeight: '600', color: '#018440', marginLeft: 8 },
  dateDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  dateValue: { fontSize: 15, color: '#333' },
  dateInput: {
    fontSize: 15,
    color: '#333',
    borderWidth: 1,
    borderColor: '#018440',
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#f8fff8',
  },

  notesSection: { backgroundColor: '#fff', borderRadius: 12, padding: 16 },
  notesLabel: { fontSize: 14, fontWeight: '600', color: '#666', marginBottom: 8 },
  notesInput: {
    fontSize: 15,
    color: '#333',
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fafafa',
  },
});

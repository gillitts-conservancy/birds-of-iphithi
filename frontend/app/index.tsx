import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { birdsData, Bird, BirdColor, BirdSize, BirdHabitat } from '../src/data/birds';
import { useChecklist } from '../src/hooks/useChecklist';
import { BirdCard } from '../src/components/BirdCard';
import { BirdDetailModal } from '../src/components/BirdDetailModal';
import { QuickTools, FilterType } from '../src/components/QuickTools';
import { BirdFilters } from '../src/components/BirdFilters';
import { useAuth } from '../src/context/AuthContext';

export default function Index() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const {
    isLoading,
    toggleSeen,
    isSeen,
    getNotes,
    getDateSeen,
    updateNotes,
    updateDate,
    resetAll,
    seenCount,
    syncStatus,

    // NEW
    lastSyncError,
    retryPendingSightings,

    // Option B
    logSighting,
    getSightingsCount,
    getLastSeen,
  } = useChecklist();

  const getSyncLabel = () => {
    if (!user) return 'Offline – saved locally';
    if (syncStatus === 'syncing') return 'Syncing…';
    if (syncStatus === 'error') return 'Sync paused – will retry';
    return 'All changes synced';
  };

  const [selectedBird, setSelectedBird] = useState<Bird | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const [selectedColors, setSelectedColors] = useState<BirdColor[]>([]);
  const [selectedSize, setSelectedSize] = useState<BirdSize | null>(null);
  const [selectedHabitats, setSelectedHabitats] = useState<BirdHabitat[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const handleColorToggle = (color: BirdColor) => {
    setSelectedColors((prev) =>
      prev.includes(color) ? prev.filter((c) => c !== color) : [...prev, color]
    );
  };

  const handleSizeSelect = (size: BirdSize | null) => {
    setSelectedSize(size);
  };

  const handleHabitatToggle = (habitat: BirdHabitat) => {
    setSelectedHabitats((prev) =>
      prev.includes(habitat) ? prev.filter((h) => h !== habitat) : [...prev, habitat]
    );
  };

  const handleClearAllFilters = () => {
    setSelectedColors([]);
    setSelectedSize(null);
    setSelectedHabitats([]);
  };

  const hasActiveAttributeFilters =
    selectedColors.length > 0 || selectedSize !== null || selectedHabitats.length > 0;

  const filteredBirds = useMemo(() => {
    let birds = [...birdsData];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      birds = birds.filter(
        (bird) =>
          bird.commonName.toLowerCase().includes(query) ||
          bird.scientificName.toLowerCase().includes(query)
      );
    }

    if (selectedColors.length > 0) {
      birds = birds.filter((bird) =>
        selectedColors.every((color) => bird.primaryColors.includes(color))
      );
    }

    if (selectedSize) {
      birds = birds.filter((bird) => bird.size === selectedSize);
    }

    if (selectedHabitats.length > 0) {
      birds = birds.filter((bird) =>
        selectedHabitats.some((habitat) => bird.habitats.includes(habitat))
      );
    }

    if (activeFilter === 'seen') {
      birds = birds.filter((bird) => isSeen(bird.speciesNumber));
    } else if (activeFilter === 'unseen') {
      birds = birds.filter((bird) => !isSeen(bird.speciesNumber));
    } else if (activeFilter === 'byDate') {
      birds = birds.filter((bird) => isSeen(bird.speciesNumber));
      birds.sort((a, b) => {
        const dateA = getDateSeen(a.speciesNumber);
        const dateB = getDateSeen(b.speciesNumber);
        if (!dateA && !dateB) return 0;
        if (!dateA) return 1;
        if (!dateB) return -1;
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      });
    }

    birds.sort((a, b) => a.speciesNumber - b.speciesNumber);
    return birds;
  }, [
    searchQuery,
    activeFilter,
    isSeen,
    getDateSeen,
    selectedColors,
    selectedSize,
    selectedHabitats,
  ]);

  const renderBirdCard = ({ item }: { item: Bird }) => (
    <BirdCard
      bird={item}
      isSeen={isSeen(item.speciesNumber)}
      dateSeen={getDateSeen(item.speciesNumber)}
      sightingsCount={getSightingsCount(item.speciesNumber)}
      lastSeen={getLastSeen(item.speciesNumber)}
      onToggleSeen={() => toggleSeen(item.speciesNumber)}
      onPress={() => setSelectedBird(item)}
      onSeenAgain={(speciesNumber) => logSighting(speciesNumber)}
    />
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#018440" />
        <Text style={styles.loadingText}>Loading checklist...</Text>
      </View>
    );
  }

  const selectedSpecies = selectedBird?.speciesNumber ?? null;
  const selectedSightingsCount = selectedSpecies ? getSightingsCount(selectedSpecies) : 0;
  const selectedLastSeen = selectedSpecies ? getLastSeen(selectedSpecies) : '';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#018440" />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.title}>Birds of iPhithi</Text>
        <Text style={styles.stats}>
          Seen: {seenCount} / Total: {birdsData.length}
        </Text>
        {user && <Text style={styles.userEmail}>{user.email}</Text>}
        <Text style={styles.syncStatus}>{getSyncLabel()}</Text>
      </View>

      <QuickTools
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        onReset={resetAll}
      />

      <TouchableOpacity style={styles.filterToggle} onPress={() => setShowFilters(!showFilters)}>
        <Ionicons
          name={showFilters ? 'options' : 'options-outline'}
          size={18}
          color={hasActiveAttributeFilters ? '#018440' : '#aaa'}
        />
        <Text
          style={[
            styles.filterToggleText,
            hasActiveAttributeFilters && styles.filterToggleTextActive,
          ]}
        >
          {showFilters ? 'Hide Filters' : 'Filter by Colour, Size, Habitat'}
        </Text>
        <Ionicons name={showFilters ? 'chevron-up' : 'chevron-down'} size={16} color="#aaa" />
      </TouchableOpacity>

      {hasActiveAttributeFilters && (
        <Text style={styles.filterHint}>Matching all selected colours · any selected habitat</Text>
      )}

      {showFilters && (
        <BirdFilters
          selectedColors={selectedColors}
          selectedSize={selectedSize}
          selectedHabitats={selectedHabitats}
          onColorToggle={handleColorToggle}
          onSizeSelect={handleSizeSelect}
          onHabitatToggle={handleHabitatToggle}
          onClearAll={handleClearAllFilters}
        />
      )}

      <FlatList
        data={filteredBirds}
        keyExtractor={(item) => item.speciesNumber.toString()}
        renderItem={renderBirdCard}
        style={styles.list}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 16 }]}
      />

      <BirdDetailModal
        bird={selectedBird}
        visible={!!selectedBird}
        isSeen={selectedBird ? isSeen(selectedBird.speciesNumber) : false}
        notes={selectedBird ? getNotes(selectedBird.speciesNumber) : ''}
        dateSeen={selectedBird ? getDateSeen(selectedBird.speciesNumber) : ''}
        sightingsCount={selectedSightingsCount}
        lastSeen={selectedLastSeen}
        syncStatus={syncStatus}
        lastSyncError={lastSyncError}
        onRetrySync={retryPendingSightings}
        onClose={() => setSelectedBird(null)}
        onToggleSeen={() => selectedBird && toggleSeen(selectedBird.speciesNumber)}
        onUpdateNotes={(v) => selectedBird && updateNotes(selectedBird.speciesNumber, v)}
        onUpdateDate={(d) => selectedBird && updateDate(selectedBird.speciesNumber, d)}
      />
    </View>
  );
}

const BG = '#1a1a1a';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BG },
  loadingText: { marginTop: 12, color: '#aaa' },
  header: { backgroundColor: '#018440', paddingHorizontal: 16, paddingBottom: 16 },
  title: { fontSize: 26, fontWeight: '700', color: '#fff' },
  stats: { fontSize: 14, color: 'rgba(255,255,255,0.85)' },
  userEmail: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  syncStatus: { fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 4 },
  filterToggle: { flexDirection: 'row', alignItems: 'center', padding: 10, backgroundColor: '#2a2a2a' },
  filterToggleText: { marginLeft: 8, color: '#aaa', flex: 1 },
  filterToggleTextActive: { color: '#018440' },
  filterHint: { fontSize: 12, color: '#aaa', textAlign: 'center', paddingVertical: 6, backgroundColor: '#1f1f1f' },
  list: { flex: 1, backgroundColor: BG },
  listContent: { flexGrow: 1, backgroundColor: BG },
});

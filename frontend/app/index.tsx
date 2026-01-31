import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { birdsData, Bird } from '../src/data/birds';
import { useChecklist } from '../src/hooks/useChecklist';
import { BirdCard } from '../src/components/BirdCard';
import { BirdDetailModal } from '../src/components/BirdDetailModal';
import { QuickTools, FilterType } from '../src/components/QuickTools';

export default function Index() {
  const insets = useSafeAreaInsets();
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
  } = useChecklist();

  const [selectedBird, setSelectedBird] = useState<Bird | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  // Sort birds by speciesNumber ascending and apply filters
  const filteredBirds = useMemo(() => {
    let birds = [...birdsData].sort(
      (a, b) => a.speciesNumber - b.speciesNumber
    );

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      birds = birds.filter(
        (bird) =>
          bird.commonName.toLowerCase().includes(query) ||
          bird.scientificName.toLowerCase().includes(query)
      );
    }

    // Apply seen/unseen filter
    if (activeFilter === 'seen') {
      birds = birds.filter((bird) => isSeen(bird.speciesNumber));
    } else if (activeFilter === 'unseen') {
      birds = birds.filter((bird) => !isSeen(bird.speciesNumber));
    }

    return birds;
  }, [searchQuery, activeFilter, isSeen]);

  const renderBirdCard = ({ item }: { item: Bird }) => (
    <BirdCard
      bird={item}
      isSeen={isSeen(item.speciesNumber)}
      dateSeen={getDateSeen(item.speciesNumber)}
      onToggleSeen={() => toggleSeen(item.speciesNumber)}
      onPress={() => setSelectedBird(item)}
    />
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading checklist...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#4CAF50" />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.title}>Birds of iPhithi</Text>
        <Text style={styles.stats}>
          Seen: {seenCount} / Total: {birdsData.length}
        </Text>
      </View>

      {/* Quick Tools */}
      <QuickTools
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        onReset={resetAll}
      />

      {/* Bird List */}
      <FlatList
        data={filteredBirds}
        keyExtractor={(item) => item.speciesNumber.toString()}
        renderItem={renderBirdCard}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 16 },
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {searchQuery
                ? 'No birds match your search'
                : activeFilter === 'seen'
                ? "You haven't seen any birds yet"
                : activeFilter === 'unseen'
                ? 'You have seen all birds!'
                : 'No birds available'}
            </Text>
          </View>
        }
      />

      {/* Detail Modal */}
      <BirdDetailModal
        bird={selectedBird}
        visible={!!selectedBird}
        isSeen={selectedBird ? isSeen(selectedBird.speciesNumber) : false}
        notes={selectedBird ? getNotes(selectedBird.speciesNumber) : ''}
        onClose={() => setSelectedBird(null)}
        onToggleSeen={() => {
          if (selectedBird) {
            toggleSeen(selectedBird.speciesNumber);
          }
        }}
        onUpdateNotes={(notes) => {
          if (selectedBird) {
            updateNotes(selectedBird.speciesNumber, notes);
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#666',
  },
  header: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  stats: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
  },
  listContent: {
    paddingTop: 8,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 15,
    color: '#888',
    textAlign: 'center',
  },
});

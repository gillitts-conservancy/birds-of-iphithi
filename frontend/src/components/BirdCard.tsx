import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Bird } from '../data/birds';

const formatDate = (isoDate: string): string => {
  if (!isoDate) return '';
  const date = new Date(isoDate);
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

interface BirdCardProps {
  bird: Bird;
  isSeen: boolean;
  dateSeen: string;
  onToggleSeen: () => void;
  onPress: () => void;

  // Option B actions
  onSeenAgain?: (speciesNumber: number) => void;

  // Option B display
  sightingsCount?: number;
  lastSeen?: string;
}

export const BirdCard: React.FC<BirdCardProps> = ({
  bird,
  isSeen,
  dateSeen,
  onToggleSeen,
  onPress,
  onSeenAgain,
  sightingsCount,
  lastSeen,
}) => {
  const showStats = (sightingsCount ?? 0) > 0 || !!lastSeen;

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <Image source={{ uri: bird.photoUrl }} style={styles.thumbnail} resizeMode="cover" />

      <View style={styles.info}>
        <Text style={styles.speciesNumber}>#{bird.speciesNumber}</Text>

        <Text style={styles.commonName} numberOfLines={1}>
          {bird.commonName}
        </Text>

        <Text style={styles.scientificName} numberOfLines={1}>
          {bird.scientificName}
        </Text>

        {isSeen && (
          <View style={styles.dateContainer}>
            <Ionicons name="calendar-outline" size={12} color="#018440" />
            <Text style={styles.dateText}>{dateSeen ? formatDate(dateSeen) : 'Date not recorded'}</Text>
          </View>
        )}

        {/* Option B: derived stats display */}
        {showStats && (
          <View style={styles.statsRow}>
            {(sightingsCount ?? 0) > 0 && (
              <Text style={styles.statsText}>Seen {(sightingsCount ?? 0)}×</Text>
            )}
            {!!lastSeen && (
              <Text style={styles.statsText}>
                {(sightingsCount ?? 0) > 0 ? ' · ' : ''}
                Last seen {formatDate(lastSeen!)}
              </Text>
            )}
          </View>
        )}

        {/* Option B: professional repeatable sightings */}
        {onSeenAgain && (
          <TouchableOpacity
            style={styles.seenAgainButton}
            onPress={(e) => {
              e.stopPropagation();
              onSeenAgain(bird.speciesNumber);
            }}
            activeOpacity={0.8}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="add-circle-outline" size={16} color="#018440" />
            <Text style={styles.seenAgainText}>Seen again</Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity
        style={styles.checkboxContainer}
        onPress={(e) => {
          e.stopPropagation();
          onToggleSeen();
        }}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <View style={[styles.checkbox, isSeen && styles.checkboxChecked]}>
          {isSeen && <Ionicons name="checkmark" size={18} color="#fff" />}
        </View>
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  thumbnail: { width: 60, height: 60, borderRadius: 8, backgroundColor: '#e0e0e0' },
  info: { flex: 1, marginLeft: 12 },
  speciesNumber: { fontSize: 11, color: '#888', fontWeight: '500' },
  commonName: { fontSize: 16, fontWeight: '600', color: '#333', marginTop: 2 },
  scientificName: { fontSize: 13, fontStyle: 'italic', color: '#666', marginTop: 2 },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    backgroundColor: '#E6F4EA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  dateText: { fontSize: 11, color: '#018440', marginLeft: 4, fontWeight: '600' },

  statsRow: { marginTop: 6, flexDirection: 'row', flexWrap: 'wrap' },
  statsText: { fontSize: 11, color: '#666', fontWeight: '600' },

  seenAgainButton: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#F3FAF5',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  seenAgainText: { marginLeft: 6, fontSize: 12, fontWeight: '700', color: '#018440' },

  checkboxContainer: { padding: 8 },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: '#018440', borderColor: '#018440' },
});

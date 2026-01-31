import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Bird } from '../data/birds';

// Helper function to format date
const formatDate = (isoDate: string): string => {
  if (!isoDate) return '';
  const date = new Date(isoDate);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

interface BirdCardProps {
  bird: Bird;
  isSeen: boolean;
  dateSeen: string;
  onToggleSeen: () => void;
  onPress: () => void;
}

export const BirdCard: React.FC<BirdCardProps> = ({
  bird,
  isSeen,
  dateSeen,
  onToggleSeen,
  onPress,
}) => {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Image
        source={{ uri: bird.photoUrl }}
        style={styles.thumbnail}
        resizeMode="cover"
      />
      
      <View style={styles.info}>
        <Text style={styles.speciesNumber}>#{bird.speciesNumber}</Text>
        <Text style={styles.commonName} numberOfLines={1}>
          {bird.commonName}
        </Text>
        <Text style={styles.scientificName} numberOfLines={1}>
          {bird.scientificName}
        </Text>
        {isSeen && dateSeen && (
          <View style={styles.dateContainer}>
            <Ionicons name="calendar-outline" size={12} color="#4CAF50" />
            <Text style={styles.dateText}>{formatDate(dateSeen)}</Text>
          </View>
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
          {isSeen && (
            <Ionicons name="checkmark" size={18} color="#fff" />
          )}
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
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#e0e0e0',
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  speciesNumber: {
    fontSize: 11,
    color: '#888',
    fontWeight: '500',
  },
  commonName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 2,
  },
  scientificName: {
    fontSize: 13,
    fontStyle: 'italic',
    color: '#666',
    marginTop: 2,
  },
  checkboxContainer: {
    padding: 8,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
});

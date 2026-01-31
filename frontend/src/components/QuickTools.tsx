import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type FilterType = 'all' | 'seen' | 'unseen' | 'byDate';

interface QuickToolsProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  onReset: () => void;
}

export const QuickTools: React.FC<QuickToolsProps> = ({
  searchQuery,
  onSearchChange,
  activeFilter,
  onFilterChange,
  onReset,
}) => {
  const handleReset = () => {
    Alert.alert(
      'Reset Checklist',
      'Are you sure you want to clear all checkmarks? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: onReset,
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color="#aaa" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={onSearchChange}
          placeholder="Search birds..."
          placeholderTextColor="#777"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => onSearchChange('')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close-circle" size={18} color="#aaa" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.filterRow}>
        <View style={styles.filterButtons}>
          {(['all', 'seen', 'unseen', 'byDate'] as FilterType[]).map((filter) => {
            const labels: Record<FilterType, string> = {
              all: 'All',
              seen: 'Seen',
              unseen: 'Unseen',
              byDate: 'By Date',
            };
            return (
              <TouchableOpacity
                key={filter}
                style={[
                  styles.filterButton,
                  activeFilter === filter && styles.filterButtonActive,
                ]}
                onPress={() => onFilterChange(filter)}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    activeFilter === filter && styles.filterButtonTextActive,
                  ]}
                >
                  {labels[filter]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={styles.resetButton}
          onPress={handleReset}
          hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
        >
          <Ionicons name="refresh" size={16} color="#ff5252" />
          <Text style={styles.resetText}>Reset</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#2a2a2a',
    borderBottomWidth: 1,
    borderBottomColor: '#3a3a3a',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3a3a3a',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 15,
    color: '#fff',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterButtons: {
    flexDirection: 'row',
    backgroundColor: '#3a3a3a',
    borderRadius: 8,
    padding: 3,
    flex: 1,
    marginRight: 8,
  },
  filterButton: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 6,
    flex: 1,
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#018440',
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#aaa',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 82, 82, 0.15)',
  },
  resetText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#ff5252',
    marginLeft: 4,
  },
});

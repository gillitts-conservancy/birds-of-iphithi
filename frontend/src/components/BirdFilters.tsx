import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BirdColor, BirdSize, BirdHabitat } from '../data/birds';

const COLORS: { value: BirdColor; hex: string }[] = [
  { value: 'black', hex: '#1a1a1a' },
  { value: 'brown', hex: '#8B4513' },
  { value: 'white', hex: '#FFFFFF' },
  { value: 'grey', hex: '#808080' },
  { value: 'green', hex: '#228B22' },
  { value: 'yellow', hex: '#FFD700' },
  { value: 'red', hex: '#DC143C' },
  { value: 'blue', hex: '#1E90FF' },
];

const SIZES: { value: BirdSize; label: string }[] = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
];

const HABITATS: { value: BirdHabitat; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'garden', label: 'Garden', icon: 'flower-outline' },
  { value: 'trees', label: 'Trees', icon: 'leaf-outline' },
  { value: 'grassland', label: 'Grassland', icon: 'sunny-outline' },
  { value: 'wetland', label: 'Wetland', icon: 'water-outline' },
  { value: 'open-sky', label: 'Sky', icon: 'cloud-outline' },
];

interface BirdFiltersProps {
  selectedColors: BirdColor[];
  selectedSize: BirdSize | null;
  selectedHabitats: BirdHabitat[];
  onColorToggle: (color: BirdColor) => void;
  onSizeSelect: (size: BirdSize | null) => void;
  onHabitatToggle: (habitat: BirdHabitat) => void;
  onClearAll: () => void;
}

export const BirdFilters: React.FC<BirdFiltersProps> = ({
  selectedColors,
  selectedSize,
  selectedHabitats,
  onColorToggle,
  onSizeSelect,
  onHabitatToggle,
  onClearAll,
}) => {
  const hasActiveFilters = selectedColors.length > 0 || selectedSize !== null || selectedHabitats.length > 0;

  return (
    <View style={styles.container}>
      {/* Color Filter */}
      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>Colour</Text>
        <View style={styles.colorRow}>
          {COLORS.map((color) => {
            const isSelected = selectedColors.includes(color.value);
            return (
              <TouchableOpacity
                key={color.value}
                style={[
                  styles.colorButton,
                  { backgroundColor: color.hex },
                  color.value === 'white' && styles.colorButtonWhite,
                  isSelected && styles.colorButtonSelected,
                ]}
                onPress={() => onColorToggle(color.value)}
              >
                {isSelected && (
                  <Ionicons
                    name="checkmark"
                    size={14}
                    color={color.value === 'white' || color.value === 'yellow' ? '#000' : '#fff'}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Size Filter */}
      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>Size</Text>
        <View style={styles.buttonRow}>
          {SIZES.map((size) => {
            const isSelected = selectedSize === size.value;
            return (
              <TouchableOpacity
                key={size.value}
                style={[
                  styles.textButton,
                  isSelected && styles.textButtonSelected,
                ]}
                onPress={() => onSizeSelect(isSelected ? null : size.value)}
              >
                <Text
                  style={[
                    styles.textButtonLabel,
                    isSelected && styles.textButtonLabelSelected,
                  ]}
                >
                  {size.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Habitat Filter */}
      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>Habitat</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.buttonRow}>
            {HABITATS.map((habitat) => {
              const isSelected = selectedHabitats.includes(habitat.value);
              return (
                <TouchableOpacity
                  key={habitat.value}
                  style={[
                    styles.habitatButton,
                    isSelected && styles.habitatButtonSelected,
                  ]}
                  onPress={() => onHabitatToggle(habitat.value)}
                >
                  <Ionicons
                    name={habitat.icon}
                    size={14}
                    color={isSelected ? '#fff' : '#aaa'}
                    style={styles.habitatIcon}
                  />
                  <Text
                    style={[
                      styles.habitatLabel,
                      isSelected && styles.habitatLabelSelected,
                    ]}
                  >
                    {habitat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* Clear All Button */}
      {hasActiveFilters && (
        <TouchableOpacity style={styles.clearButton} onPress={onClearAll}>
          <Ionicons name="close-circle" size={14} color="#ff5252" />
          <Text style={styles.clearText}>Clear filters</Text>
        </TouchableOpacity>
      )}
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
  filterSection: {
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  colorRow: {
    flexDirection: 'row',
    gap: 8,
  },
  colorButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorButtonWhite: {
    borderWidth: 1,
    borderColor: '#555',
  },
  colorButtonSelected: {
    borderWidth: 2,
    borderColor: '#018440',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  textButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#3a3a3a',
  },
  textButtonSelected: {
    backgroundColor: '#018440',
  },
  textButtonLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#aaa',
  },
  textButtonLabelSelected: {
    color: '#fff',
  },
  habitatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#3a3a3a',
  },
  habitatButtonSelected: {
    backgroundColor: '#018440',
  },
  habitatIcon: {
    marginRight: 4,
  },
  habitatLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#aaa',
  },
  habitatLabelSelected: {
    color: '#fff',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginTop: 4,
  },
  clearText: {
    fontSize: 13,
    color: '#ff5252',
    marginLeft: 6,
  },
});

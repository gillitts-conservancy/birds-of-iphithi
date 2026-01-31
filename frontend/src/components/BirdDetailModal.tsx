import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bird } from '../data/birds';

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

interface BirdDetailModalProps {
  bird: Bird | null;
  visible: boolean;
  isSeen: boolean;
  notes: string;
  dateSeen: string;
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
  onClose,
  onToggleSeen,
  onUpdateNotes,
}) => {
  const insets = useSafeAreaInsets();
  const [localNotes, setLocalNotes] = useState(notes);

  useEffect(() => {
    setLocalNotes(notes);
  }, [notes, bird]);

  const handleNotesBlur = () => {
    if (localNotes !== notes) {
      onUpdateNotes(localNotes);
    }
  };

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
              <Ionicons name="close" size={28} color="#333" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Bird Details</Text>
            <View style={{ width: 44 }} />
          </View>

          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            <Image
              source={{ uri: bird.photoUrl }}
              style={styles.image}
              resizeMode="cover"
            />

            <View style={styles.detailsContainer}>
              <Text style={styles.speciesNumber}>
                Species #{bird.speciesNumber}
              </Text>
              <Text style={styles.commonName}>{bird.commonName}</Text>
              <Text style={styles.scientificName}>{bird.scientificName}</Text>

              <TouchableOpacity
                style={styles.seenToggle}
                onPress={onToggleSeen}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.checkbox,
                    isSeen && styles.checkboxChecked,
                  ]}
                >
                  {isSeen && (
                    <Ionicons name="checkmark" size={20} color="#fff" />
                  )}
                </View>
                <Text style={styles.seenText}>
                  {isSeen ? 'Seen' : 'Not seen yet'}
                </Text>
              </TouchableOpacity>

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
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  image: {
    width: '100%',
    height: 250,
    backgroundColor: '#e0e0e0',
  },
  detailsContainer: {
    padding: 20,
  },
  speciesNumber: {
    fontSize: 14,
    color: '#888',
    fontWeight: '500',
    marginBottom: 4,
  },
  commonName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  scientificName: {
    fontSize: 16,
    fontStyle: 'italic',
    color: '#666',
    marginBottom: 20,
  },
  seenToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
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
  checkboxChecked: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  seenText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  notesSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
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

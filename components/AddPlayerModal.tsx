import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TextInput, 
  Pressable, 
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { X, Camera } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { Player, Position } from '@/types';
import Colors from '@/constants/colors';

interface AddPlayerModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (player: Omit<Player, 'id' | 'createdAt'>) => void;
  editPlayer?: Player;
}

const positions: Position[] = ['GK', 'DEF', 'MID', 'FWD'];

export default function AddPlayerModal({ visible, onClose, onSave, editPlayer }: AddPlayerModalProps) {
  const [name, setName] = useState('');
  const [position, setPosition] = useState<Position>('MID');
  const [rating, setRating] = useState('70');
  const [photo, setPhoto] = useState<string | undefined>();

  useEffect(() => {
    if (editPlayer) {
      setName(editPlayer.name);
      setPosition(editPlayer.position);
      setRating(editPlayer.rating.toString());
      setPhoto(editPlayer.photo);
    } else {
      setName('');
      setPosition('MID');
      setRating('70');
      setPhoto(undefined);
    }
  }, [editPlayer, visible]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled && result.assets[0]) {
      setPhoto(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a player name');
      return;
    }
    
    const ratingNum = parseInt(rating, 10);
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 99) {
      Alert.alert('Error', 'Rating must be between 1 and 99');
      return;
    }

    onSave({
      name: name.trim(),
      position,
      rating: ratingNum,
      photo,
    });
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>{editPlayer ? 'Edit Player' : 'Add Player'}</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <X size={24} color={Colors.text} />
            </Pressable>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <Pressable style={styles.photoSection} onPress={pickImage} disabled={uploading}>
              {photo ? (
                <Image source={{ uri: photo }} style={styles.photoPreview} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Camera size={32} color={Colors.gold} />
                  <Text style={styles.photoText}>Add Photo</Text>
                </View>
              )}
            </Pressable>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Player name"
                placeholderTextColor={Colors.textMuted}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Position</Text>
              <View style={styles.positionGrid}>
                {positions.map((pos) => (
                  <Pressable
                    key={pos}
                    style={[
                      styles.positionButton,
                      position === pos && styles.positionButtonActive,
                    ]}
                    onPress={() => setPosition(pos)}
                  >
                    <Text style={[
                      styles.positionText,
                      position === pos && styles.positionTextActive,
                    ]}>
                      {pos}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Rating (1-99)</Text>
              <TextInput
                style={styles.input}
                value={rating}
                onChangeText={setRating}
                keyboardType="number-pad"
                maxLength={2}
                placeholder="70"
                placeholderTextColor={Colors.textMuted}
              />
            </View>
          </ScrollView>

          <Pressable style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>
              {editPlayer ? 'Update Player' : 'Add Player'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: Colors.cardBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 34,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  title: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  photoSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  photoPreview: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: Colors.gold,
  },
  photoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.background,
    borderWidth: 2,
    borderColor: Colors.gold,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoText: {
    color: Colors.gold,
    fontSize: 12,
    marginTop: 8,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500' as const,
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    color: Colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  positionGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  positionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.background,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  positionButtonActive: {
    backgroundColor: Colors.gold,
    borderColor: Colors.gold,
  },
  positionText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  positionTextActive: {
    color: Colors.background,
  },
  saveButton: {
    marginHorizontal: 20,
    backgroundColor: Colors.gold,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '700' as const,
  },

});

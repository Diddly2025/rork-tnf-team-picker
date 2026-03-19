import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TextInput, 
  Pressable, 
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { X, Camera, Trash2 } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { Player } from '@/types';
import { useTNF } from '@/context/TNFContext';
import { uploadPlayerPhoto } from '@/utils/photoUpload';
import PlayerAvatar from './PlayerAvatar';
import Colors from '@/constants/colors';

interface AddPlayerModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (player: Omit<Player, 'id' | 'createdAt'>) => void;
  editPlayer?: Player;
}

export default function AddPlayerModal({ visible, onClose, onSave, editPlayer }: AddPlayerModalProps) {
  const { sportConfig } = useTNF();
  const positions = useMemo(() => sportConfig.hasPositions ? sportConfig.positions : [], [sportConfig.hasPositions, sportConfig.positions]);

  const [name, setName] = useState('');
  const [position, setPosition] = useState(positions[0] ?? 'Player');
  const [rating, setRating] = useState('70');
  const [photo, setPhoto] = useState<string | undefined>();
  const [localPhotoUri, setLocalPhotoUri] = useState<string | undefined>();
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (editPlayer) {
      setName(editPlayer.name);
      setPosition(editPlayer.position);
      setRating(editPlayer.rating.toString());
      setPhoto(editPlayer.photo);
      setLocalPhotoUri(undefined);
    } else {
      setName('');
      setPosition(positions.length > 0 ? positions[Math.floor(positions.length / 2)] : 'Player');
      setRating('70');
      setPhoto(undefined);
      setLocalPhotoUri(undefined);
    }
  }, [editPlayer, visible, positions]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled && result.assets[0]) {
      setLocalPhotoUri(result.assets[0].uri);
      setPhoto(result.assets[0].uri);
    }
  };

  const removePhoto = () => {
    setPhoto(undefined);
    setLocalPhotoUri(undefined);
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

    let finalPhotoUrl = photo;

    if (localPhotoUri) {
      setIsUploading(true);
      try {
        const playerId = editPlayer?.id ?? `player-${Date.now()}`;
        const uploadedUrl = await uploadPlayerPhoto(localPhotoUri, playerId);
        if (uploadedUrl) {
          finalPhotoUrl = uploadedUrl;
          console.log('[AddPlayer] Photo uploaded to Supabase:', uploadedUrl);
        } else {
          finalPhotoUrl = localPhotoUri;
          console.log('[AddPlayer] Upload failed, using local URI');
        }
      } catch (e) {
        console.log('[AddPlayer] Photo upload error:', e);
        finalPhotoUrl = localPhotoUri;
      } finally {
        setIsUploading(false);
      }
    }

    onSave({
      name: name.trim(),
      position: sportConfig.hasPositions ? position : 'Player',
      rating: ratingNum,
      photo: finalPhotoUrl,
    });
    onClose();
  };

  const displayName = name.trim() || 'Player';

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
            <View style={styles.photoSection}>
              <Pressable style={styles.photoTouchable} onPress={pickImage}>
                {photo ? (
                  <PlayerAvatar
                    name={displayName}
                    photoUrl={photo}
                    size={120}
                    borderColor={Colors.gold}
                    borderWidth={3}
                  />
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <Camera size={32} color={Colors.gold} />
                    <Text style={styles.photoText}>Add Photo</Text>
                  </View>
                )}
              </Pressable>
              {photo && (
                <View style={styles.photoActions}>
                  <Pressable style={styles.photoActionBtn} onPress={pickImage}>
                    <Camera size={16} color={Colors.gold} />
                    <Text style={styles.photoActionText}>Change</Text>
                  </Pressable>
                  <Pressable style={styles.photoActionBtn} onPress={removePhoto}>
                    <Trash2 size={16} color={Colors.danger} />
                    <Text style={[styles.photoActionText, { color: Colors.danger }]}>Remove</Text>
                  </Pressable>
                </View>
              )}
            </View>

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

            {sportConfig.hasPositions && positions.length > 0 && (
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
            )}

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

          <Pressable
            style={[styles.saveButton, isUploading && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={isUploading}
          >
            {isUploading ? (
              <View style={styles.uploadingRow}>
                <ActivityIndicator size="small" color={Colors.background} />
                <Text style={styles.saveButtonText}>Uploading Photo...</Text>
              </View>
            ) : (
              <Text style={styles.saveButtonText}>
                {editPlayer ? 'Update Player' : 'Add Player'}
              </Text>
            )}
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
  photoTouchable: {
    alignItems: 'center',
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
  photoActions: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
  },
  photoActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  photoActionText: {
    color: Colors.gold,
    fontSize: 12,
    fontWeight: '600' as const,
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
    flexWrap: 'wrap',
  },
  positionButton: {
    flex: 1,
    minWidth: 60,
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
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '700' as const,
  },
  uploadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
});

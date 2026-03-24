import React, { useState } from 'react';
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
} from 'react-native';
import { X, Upload, FileText, Info } from 'lucide-react-native';
import { Player } from '@/types';
import { useTNF } from '@/context/TNFContext';
import Colors from '@/constants/colors';

interface ImportPlayersModalProps {
  visible: boolean;
  onClose: () => void;
  onImport: (players: Omit<Player, 'id' | 'createdAt'>[]) => void;
}

const EXAMPLE_DATA = `Player1	Player	70
Player2	Player	75
Player3	Player	77
Player4	Player	78
Player5	Player	85`;

export default function ImportPlayersModal({ visible, onClose, onImport }: ImportPlayersModalProps) {
  const { sportConfig } = useTNF();
  const VALID_POSITIONS = sportConfig.hasPositions ? sportConfig.positions : ['Player'];
  const [inputText, setInputText] = useState('');
  const [errors, setErrors] = useState<string[]>([]);

  const parsePosition = (pos: string): string | null => {
    const normalized = pos.toUpperCase().trim();
    if (VALID_POSITIONS.map(p => p.toUpperCase()).includes(normalized)) {
      return VALID_POSITIONS.find(p => p.toUpperCase() === normalized) ?? normalized;
    }
    const positionMap: Record<string, string> = {
      'GOALKEEPER': 'GK',
      'GOALIE': 'GK',
      'KEEPER': 'GK',
      'DEFENDER': 'DEF',
      'DEFENSE': 'DEF',
      'CB': 'DEF',
      'LB': 'DEF',
      'RB': 'DEF',
      'MIDFIELDER': 'MID',
      'MIDFIELD': 'MID',
      'CM': 'MID',
      'CDM': 'MID',
      'CAM': 'MID',
      'LM': 'MID',
      'RM': 'MID',
      'FORWARD': 'FWD',
      'STRIKER': 'FWD',
      'ST': 'FWD',
      'CF': 'FWD',
      'LW': 'FWD',
      'RW': 'FWD',
      'WINGER': 'FWD',
      'POINT GUARD': 'PG',
      'SHOOTING GUARD': 'SG',
      'SMALL FORWARD': 'SF',
      'POWER FORWARD': 'PF',
      'CENTER': 'C',
      'PLAYER': 'Player',
    };
    const mapped = positionMap[normalized];
    if (mapped) return mapped;
    if (!sportConfig.hasPositions) return 'Player';
    return null;
  };

  const handleImport = () => {
    const lines = inputText.trim().split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      Alert.alert('Error', 'Please enter player data to import');
      return;
    }

    const parsedPlayers: Omit<Player, 'id' | 'createdAt'>[] = [];
    const parseErrors: string[] = [];

    const isHeaderRow = (line: string): boolean => {
      const lower = line.toLowerCase();
      return lower.includes('player') && (lower.includes('position') || lower.includes('postion') || lower.includes('rating'));
    };

    lines.forEach((line, index) => {
      if (isHeaderRow(line)) {
        return;
      }

      const delimiter = line.includes('\t') ? '\t' : ',';
      const parts = line.split(delimiter).map(p => p.trim());
      
      if (parts.length < 2) {
        parseErrors.push(`Line ${index + 1}: Not enough fields (need at least name and position)`);
        return;
      }

      const name = parts[0];
      if (!name) {
        parseErrors.push(`Line ${index + 1}: Missing player name`);
        return;
      }

      const position = parsePosition(parts[1]);
      if (!position) {
        parseErrors.push(`Line ${index + 1}: Invalid position "${parts[1]}" (use ${VALID_POSITIONS.join(', ')})`);
        return;
      }

      let rating = 70;
      if (parts.length >= 3 && parts[2]) {
        const parsedRating = parseInt(parts[2], 10);
        if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 99) {
          parseErrors.push(`Line ${index + 1}: Invalid rating "${parts[2]}" (must be 1-99), using default 70`);
        } else {
          rating = parsedRating;
        }
      }

      parsedPlayers.push({
        name,
        position,
        rating,
      });
    });

    setErrors(parseErrors);

    if (parsedPlayers.length === 0) {
      Alert.alert('Import Failed', 'No valid players found. Please check the format.');
      return;
    }

    if (parseErrors.length > 0) {
      Alert.alert(
        'Partial Import',
        `${parsedPlayers.length} player(s) ready to import.\n${parseErrors.length} line(s) had errors and will be skipped.\n\nContinue with import?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Import Valid Players', 
            onPress: () => {
              onImport(parsedPlayers);
              setInputText('');
              setErrors([]);
              onClose();
            }
          },
        ]
      );
    } else {
      onImport(parsedPlayers);
      setInputText('');
      setErrors([]);
      onClose();
      Alert.alert('Success', `${parsedPlayers.length} player(s) imported successfully!`);
    }
  };

  const handleLoadExample = () => {
    setInputText(EXAMPLE_DATA);
    setErrors([]);
  };

  const handleClose = () => {
    setInputText('');
    setErrors([]);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>Import Players</Text>
            <Pressable onPress={handleClose} style={styles.closeButton}>
              <X size={24} color={Colors.text} />
            </Pressable>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.infoBox}>
              <Info size={18} color={Colors.gold} />
              <Text style={styles.infoText}>
                Paste from Excel or enter one player per line:{'\n'}
                <Text style={styles.formatText}>Name, Position, Rating</Text>
                {'\n'}(tab-separated or comma-separated)
              </Text>
            </View>

            <View style={styles.formatExamples}>
              <Text style={styles.formatLabel}>Valid positions:</Text>
              <View style={styles.positionTags}>
                {VALID_POSITIONS.map(pos => (
                  <View key={pos} style={styles.positionTag}>
                    <Text style={styles.positionTagText}>{pos}</Text>
                  </View>
                ))}
              </View>
            </View>

            <Pressable style={styles.exampleButton} onPress={handleLoadExample}>
              <FileText size={18} color={Colors.gold} />
              <Text style={styles.exampleButtonText}>Load Example (Excel Format)</Text>
            </Pressable>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Player Data</Text>
              <TextInput
                style={styles.textArea}
                value={inputText}
                onChangeText={(text) => {
                  setInputText(text);
                  setErrors([]);
                }}
                placeholder={"Diddly\tFWD\t70\nSunny\tMID\t75\nPritz\tMID\t77"}
                placeholderTextColor={Colors.textMuted}
                multiline
                numberOfLines={10}
                textAlignVertical="top"
              />
            </View>

            {errors.length > 0 && (
              <View style={styles.errorsBox}>
                <Text style={styles.errorsTitle}>Errors Found:</Text>
                {errors.slice(0, 5).map((error, index) => (
                  <Text key={index} style={styles.errorText}>• {error}</Text>
                ))}
                {errors.length > 5 && (
                  <Text style={styles.errorText}>...and {errors.length - 5} more</Text>
                )}
              </View>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable style={styles.importButton} onPress={handleImport}>
              <Upload size={20} color={Colors.background} />
              <Text style={styles.importButtonText}>Import Players</Text>
            </Pressable>
          </View>
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
  infoBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    borderRadius: 12,
    padding: 14,
    gap: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
  },
  infoText: {
    flex: 1,
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  formatText: {
    color: Colors.gold,
    fontWeight: '600' as const,
  },
  formatExamples: {
    marginBottom: 16,
  },
  formatLabel: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginBottom: 8,
  },
  positionTags: {
    flexDirection: 'row',
    gap: 8,
  },
  positionTag: {
    backgroundColor: Colors.background,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  positionTagText: {
    color: Colors.gold,
    fontSize: 13,
    fontWeight: '600' as const,
  },
  exampleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    padding: 12,
    borderRadius: 12,
    gap: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  exampleButtonText: {
    color: Colors.gold,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500' as const,
  },
  textArea: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    color: Colors.text,
    fontSize: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    minHeight: 180,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  errorsBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  errorsTitle: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 13,
    marginBottom: 4,
  },
  footer: {
    padding: 20,
    paddingBottom: 34,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
  },
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.gold,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  importButtonText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '700' as const,
  },
});

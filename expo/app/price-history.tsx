import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Stack } from 'expo-router';
import { Plus, Trash2, X, Calendar, TrendingUp, History } from 'lucide-react-native';
import { useTNF } from '@/context/TNFContext';
import { SubsPriceHistory } from '@/types';
import Colors from '@/constants/colors';

export default function PriceHistoryScreen() {
  console.log('[PriceHistory] Screen rendered');
  const { priceHistory, addPriceChange, deletePriceChange, subsSettings } = useTNF();

  const [showAddModal, setShowAddModal] = useState(false);
  const [newAmount, setNewAmount] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newNote, setNewNote] = useState('');

  const sortedHistory = useMemo(() => {
    return [...priceHistory].sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
  }, [priceHistory]);

  const handleAdd = useCallback(() => {
    const amount = parseFloat(newAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid price amount.');
      return;
    }
    if (!newDate.trim()) {
      Alert.alert('Date Required', 'Please enter the date this price takes effect from.');
      return;
    }

    const dateParts = newDate.trim().split(/[\\s,/-]+/);
    let isoDate = newDate.trim();
    if (dateParts.length >= 3) {
      const months: Record<string, string> = {
        jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
        jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
      };
      const day = dateParts[0].padStart(2, '0');
      const monthKey = dateParts[1].toLowerCase().substring(0, 3);
      const year = dateParts[2].length === 2 ? `20${dateParts[2]}` : dateParts[2];
      const month = months[monthKey] ?? '01';
      isoDate = `${year}-${month}-${day}`;
    }

    addPriceChange(amount, isoDate, newNote.trim() || undefined);
    setNewAmount('');
    setNewDate('');
    setNewNote('');
    setShowAddModal(false);
    console.log('[PriceHistory] Added price change:', amount, isoDate);
  }, [newAmount, newDate, newNote, addPriceChange]);

  const handleDelete = useCallback((entry: SubsPriceHistory) => {
    Alert.alert(
      'Delete Price Entry',
      `Remove the £${entry.amount.toFixed(2)} price effective from ${entry.effectiveFrom}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deletePriceChange(entry.id) },
      ]
    );
  }, [deletePriceChange]);

  const formatDate = (dateStr: string): string => {
    try {
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const renderItem = useCallback(({ item }: { item: SubsPriceHistory }) => (
    <View style={styles.entryCard}>
      <View style={styles.entryLeft}>
        <View style={styles.entryIconWrap}>
          <TrendingUp size={16} color={Colors.gold} />
        </View>
        <View style={styles.entryInfo}>
          <Text style={styles.entryAmount}>£{item.amount.toFixed(2)} per session</Text>
          <View style={styles.entryMeta}>
            <Calendar size={11} color={Colors.textMuted} />
            <Text style={styles.entryDate}>From {formatDate(item.effectiveFrom)}</Text>
          </View>
          {item.note ? (
            <Text style={styles.entryNote}>{item.note}</Text>
          ) : null}
        </View>
      </View>
      <Pressable
        onPress={() => handleDelete(item)}
        hitSlop={10}
        style={styles.deleteBtn}
        testID={`delete-price-${item.id}`}
      >
        <Trash2 size={16} color={Colors.danger} />
      </Pressable>
    </View>
  ), [handleDelete]);

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <History size={56} color={Colors.textMuted} />
      <Text style={styles.emptyTitle}>No Price Changes</Text>
      <Text style={styles.emptyText}>
        The current subs price of £{subsSettings.costPerGame.toFixed(2)} applies to all sessions.
        Add a price change to track when prices changed.
      </Text>
    </View>
  );

  return (
    <View style={styles.container} testID="price-history-screen">
      <Stack.Screen options={{ title: 'Subs Price History' }} />

      <View style={styles.currentPriceCard}>
        <View style={styles.currentPriceLeft}>
          <Text style={styles.currentPriceLabel}>Current Default Price</Text>
          <Text style={styles.currentPriceHint}>From Subs Settings</Text>
        </View>
        <Text style={styles.currentPriceValue}>£{subsSettings.costPerGame.toFixed(2)}</Text>
      </View>

      {priceHistory.length > 0 && (
        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            When price history entries exist, the correct price is automatically applied to each session based on its date.
          </Text>
        </View>
      )}

      <FlatList
        data={sortedHistory}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmpty}
      />

      <Pressable
        style={styles.fab}
        onPress={() => setShowAddModal(true)}
        testID="add-price-change-btn"
      >
        <Plus size={22} color="#fff" />
        <Text style={styles.fabText}>New Price</Text>
      </Pressable>

      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAddModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setShowAddModal(false)} />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Subs Price</Text>
              <Pressable onPress={() => setShowAddModal(false)} hitSlop={12}>
                <X size={22} color={Colors.textSecondary} />
              </Pressable>
            </View>

            <Text style={styles.fieldLabel}>New Price (£)</Text>
            <View style={styles.amountRow}>
              <Text style={styles.amountPrefix}>£</Text>
              <TextInput
                style={styles.amountInput}
                value={newAmount}
                onChangeText={setNewAmount}
                placeholder="0.00"
                placeholderTextColor={Colors.textMuted}
                keyboardType="decimal-pad"
                autoFocus
              />
            </View>

            <Text style={styles.fieldLabel}>Effective From (date)</Text>
            <TextInput
              style={styles.textInput}
              value={newDate}
              onChangeText={setNewDate}
              placeholder="e.g. 01 Jan 2025 or 2025-01-01"
              placeholderTextColor={Colors.textMuted}
            />

            <Text style={styles.fieldLabel}>Reason / Note (optional)</Text>
            <TextInput
              style={styles.textInput}
              value={newNote}
              onChangeText={setNewNote}
              placeholder="e.g. Pitch price increase"
              placeholderTextColor={Colors.textMuted}
            />

            <Pressable style={styles.saveBtn} onPress={handleAdd} testID="save-price-change-btn">
              <Text style={styles.saveBtnText}>Save Price Change</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  currentPriceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.cardBackground,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  currentPriceLeft: {
    flex: 1,
  },
  currentPriceLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  currentPriceHint: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  currentPriceValue: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: Colors.gold,
  },
  infoCard: {
    backgroundColor: 'rgba(200,160,42,0.08)',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(200,160,42,0.2)',
  },
  infoText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  entryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  entryLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  entryIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(200,160,42,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  entryInfo: {
    flex: 1,
  },
  entryAmount: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  entryMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 3,
  },
  entryDate: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  entryNote: {
    fontSize: 12,
    color: Colors.textMuted,
    fontStyle: 'italic' as const,
    marginTop: 3,
  },
  deleteBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(220,53,69,0.1)',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 10,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 28,
    backgroundColor: Colors.gold,
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalContent: {
    backgroundColor: Colors.cardBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
    gap: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginBottom: -6,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingHorizontal: 14,
  },
  amountPrefix: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.textSecondary,
    marginRight: 6,
  },
  amountInput: {
    flex: 1,
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.text,
    paddingVertical: 12,
  },
  textInput: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.text,
  },
  saveBtn: {
    backgroundColor: Colors.gold,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: '700' as const,
    fontSize: 15,
  },
});

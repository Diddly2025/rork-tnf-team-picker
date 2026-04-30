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
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  Wallet, Plus, X, ChevronRight, TrendingUp, TrendingDown,
  Settings, Trash2, PoundSterling, ChevronLeft, AlertTriangle, Coins, UserPlus, Ban, History,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTNF } from '@/context/TNFContext';
import { useGroup } from '@/context/GroupContext';
import { SPORT_CONFIGS } from '@/constants/sports';
import { Player, SubsPayment } from '@/types';
import Colors from '@/constants/colors';

type Tab = 'overview' | 'history';
type PaymentFormType = 'credit' | 'debit' | 'latefee' | 'guest';

function formatDateDisplay(date: Date): string {
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function SubsScreen() {
  console.log('[Subs] Screen rendered');
  const router = useRouter();
  const {
    players,
    getPlayerBalance,
    getPlayerPayments,
    getTotalCollected,
    getTotalOutstanding,
    getKittyBalance,
    addSubsCredit,
    addSubsDebit,
    addGuestDebit,
    deleteSubsPayment,
    voidMatchDebit,
    subsSettings,
    updateSubsSettings,
    matchHistory,
  } = useTNF();

  const { groups, activeGroup, activeGroupId, setActiveGroup } = useGroup();

  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [addPaymentVisible, setAddPaymentVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [paymentFormType, setPaymentFormType] = useState<PaymentFormType>('credit');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [paymentDate, setPaymentDate] = useState<Date>(getToday());
  const [costPerGame, setCostPerGame] = useState(String(subsSettings.costPerGame));
  const [lateFeeAmount, setLateFeeAmount] = useState(String(subsSettings.lateFee));
  const [gameCostAmount, setGameCostAmount] = useState(String(subsSettings.gameCost));
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [guestName, setGuestName] = useState('');


  const totalCollected = getTotalCollected();
  const totalOutstanding = getTotalOutstanding();
  const kittyBalance = getKittyBalance();
  const totalGameCosts = matchHistory.length * subsSettings.gameCost;
  const costPerSession = activeGroup?.costPerSession ?? subsSettings.costPerGame;

  const handleSwitchGroup = useCallback((groupId: string) => {
    setActiveGroup(groupId);
    console.log('[Subs] Switched to group:', groupId);
  }, [setActiveGroup]);

  const sortedPlayers = useMemo(() => {
    return [...players].sort((a, b) => {
      const balA = getPlayerBalance(a.id);
      const balB = getPlayerBalance(b.id);
      return balA - balB;
    });
  }, [players, getPlayerBalance]);

  const allPayments = useMemo(() => {
    const all: (SubsPayment & { playerName: string })[] = [];
    players.forEach(p => {
      getPlayerPayments(p.id).forEach(payment => {
        all.push({ ...payment, playerName: p.name });
      });
    });
    return all.sort((a, b) => b.createdAt - a.createdAt);
  }, [players, getPlayerPayments]);

  const openPaymentForm = useCallback((type: PaymentFormType) => {
    setPaymentFormType(type);
    setPaymentDate(getToday());
    setGuestName('');
    if (type === 'latefee') {
      setAmount(String(subsSettings.lateFee));
      setDescription('Late fee');
    } else if (type === 'guest') {
      setAmount(String(subsSettings.costPerGame));
      setDescription('');
    } else {
      setAmount('');
      setDescription('');
    }
    setModalVisible(false);
    setTimeout(() => setAddPaymentVisible(true), 300);
  }, [subsSettings.lateFee, subsSettings.costPerGame]);

  const handleOpenPlayer = useCallback((player: Player) => {
    setSelectedPlayer(player);
    setModalVisible(true);
  }, []);

  const adjustDate = useCallback((days: number) => {
    setPaymentDate(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() + days);
      return d;
    });
  }, []);

  const handleAddPayment = useCallback(() => {
    if (!selectedPlayer) return;
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount.');
      return;
    }
    if (paymentFormType === 'guest' && !guestName.trim()) {
      Alert.alert('Guest Name Required', 'Please enter the guest\'s name.');
      return;
    }
    const desc = description.trim() || (
      paymentFormType === 'credit' ? 'Payment received' :
      paymentFormType === 'latefee' ? 'Late fee' :
      paymentFormType === 'guest' ? `Guest: ${guestName.trim()}` :
      'Manual deduction'
    );
    const dateStr = formatDateDisplay(paymentDate);
    if (paymentFormType === 'credit') {
      addSubsCredit(selectedPlayer.id, parsed, desc, dateStr);
    } else if (paymentFormType === 'guest') {
      addGuestDebit(selectedPlayer.id, guestName.trim(), parsed, dateStr);
    } else {
      addSubsDebit(selectedPlayer.id, parsed, desc, dateStr);
    }
    setAmount('');
    setDescription('');
    setGuestName('');
    setAddPaymentVisible(false);
    setTimeout(() => setModalVisible(true), 300);
  }, [selectedPlayer, amount, description, guestName, paymentFormType, paymentDate, addSubsCredit, addSubsDebit, addGuestDebit]);

  const handleDeletePayment = useCallback((payment: SubsPayment) => {
    if (payment.id.startsWith('synthetic-')) {
      const parts = payment.id.replace('synthetic-', '').split('-');
      const playerId = parts.slice(-3).join('-');
      const matchId = parts.slice(0, -3).join('-');
      Alert.alert(
        'Void Game Sub',
        `Void the £${subsSettings.costPerGame.toFixed(2)} charge for this match?\n\nUse this when another player is covering this sub.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Void',
            style: 'destructive',
            onPress: () => {
              voidMatchDebit(matchId, playerId, payment.date);
            },
          },
        ]
      );
      return;
    }
    Alert.alert(
      'Delete Entry',
      'Remove this transaction?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteSubsPayment(payment.id) },
      ]
    );
  }, [deleteSubsPayment, voidMatchDebit, subsSettings.costPerGame]);

  const handleSaveSettings = useCallback(() => {
    const parsedCost = parseFloat(costPerGame);
    const parsedLateFee = parseFloat(lateFeeAmount);
    const parsedGameCost = parseFloat(gameCostAmount);
    if (isNaN(parsedCost) || parsedCost < 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid cost per game.');
      return;
    }
    if (isNaN(parsedLateFee) || parsedLateFee < 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid late fee amount.');
      return;
    }
    if (isNaN(parsedGameCost) || parsedGameCost < 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid game cost.');
      return;
    }
    updateSubsSettings({ costPerGame: parsedCost, lateFee: parsedLateFee, gameCost: parsedGameCost });
    setSettingsVisible(false);
  }, [costPerGame, lateFeeAmount, gameCostAmount, updateSubsSettings]);

  const formatCurrency = (value: number) => `£${Math.abs(value).toFixed(2)}`;

  const getFormColor = () => {
    if (paymentFormType === 'credit') return Colors.success;
    if (paymentFormType === 'latefee') return Colors.gold;
    return Colors.danger;
  };

  const getFormTitle = () => {
    if (paymentFormType === 'credit') return '+ Add Credit';
    if (paymentFormType === 'latefee') return 'Late Fee';
    if (paymentFormType === 'guest') return 'Guest Sub';
    return '- Add Debit';
  };

  const renderPlayerRow = useCallback(({ item }: { item: Player }) => {
    const balance = getPlayerBalance(item.id);
    const isNegative = balance < 0;
    const isPositive = balance > 0;
    return (
      <Pressable style={styles.playerRow} onPress={() => handleOpenPlayer(item)}>
        <View style={[styles.playerAvatar, {
          backgroundColor: isNegative ? 'rgba(220,53,69,0.12)' : isPositive ? 'rgba(22,163,74,0.12)' : 'rgba(0,0,0,0.06)',
        }]}>
          <Text style={[styles.playerAvatarText, {
            color: isNegative ? Colors.danger : isPositive ? Colors.success : Colors.textMuted,
          }]}>
            {item.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.playerInfo}>
          <Text style={styles.playerName}>{item.name}</Text>
          <Text style={styles.playerPosition}>{item.position}</Text>
        </View>
        <View style={styles.playerBalance}>
          <Text style={[styles.balanceAmount, isNegative && styles.balanceNegative, isPositive && styles.balancePositive]}>
            {isNegative ? `-${formatCurrency(balance)}` : isPositive ? `+${formatCurrency(balance)}` : '£0.00'}
          </Text>
          <Text style={styles.balanceLabel}>
            {isNegative ? 'Owes' : isPositive ? 'In credit' : 'Settled'}
          </Text>
        </View>
        <ChevronRight size={18} color={Colors.textMuted} />
      </Pressable>
    );
  }, [getPlayerBalance, handleOpenPlayer]);

  const renderHistoryRow = useCallback(({ item }: { item: SubsPayment & { playerName: string } }) => {
    const isCredit = item.type === 'credit';
    const isSynthetic = item.id.startsWith('synthetic-');
    const isGuest = !!item.guestName;
    return (
      <View style={styles.historyRow}>
        <View style={[styles.historyIcon, {
          backgroundColor: isGuest ? 'rgba(99,102,241,0.12)' : isCredit ? 'rgba(22,163,74,0.12)' : 'rgba(220,53,69,0.12)',
        }]}>
          {isGuest
            ? <UserPlus size={16} color="#6366f1" />
            : isCredit
            ? <TrendingUp size={16} color={Colors.success} />
            : <TrendingDown size={16} color={Colors.danger} />}
        </View>
        <View style={styles.historyInfo}>
          <Text style={styles.historyPlayerName}>{item.playerName}</Text>
          <Text style={styles.historyDesc}>{item.description}</Text>
          <Text style={styles.historyDate}>{item.date}</Text>
        </View>
        <View style={styles.historyRowRight}>
          <Text style={[styles.historyAmount, isCredit ? styles.balancePositive : styles.balanceNegative]}>
            {isCredit ? '+' : '-'}{formatCurrency(item.amount)}
          </Text>
          {isSynthetic ? (
            <Pressable
              style={styles.historyVoidBtn}
              onPress={() => handleDeletePayment(item)}
              testID={`void-history-${item.id}`}
            >
              <Ban size={14} color="#f59e0b" />
            </Pressable>
          ) : (
            <Pressable
              style={styles.historyDeleteBtn}
              onPress={() => handleDeletePayment(item)}
              testID={`delete-history-${item.id}`}
            >
              <Trash2 size={15} color={Colors.danger} />
            </Pressable>
          )}
        </View>
      </View>
    );
  }, [handleDeletePayment]);

  const playerPayments = selectedPlayer ? getPlayerPayments(selectedPlayer.id) : [];
  const playerBalance = selectedPlayer ? getPlayerBalance(selectedPlayer.id) : 0;

  return (
    <View style={styles.container} testID="subs-screen">
      {groups.length > 1 && (
        <View style={styles.filterSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
            {groups.map((g) => {
              const config = SPORT_CONFIGS[g.sport];
              const isActive = g.id === activeGroupId;
              return (
                <Pressable
                  key={g.id}
                  style={[styles.filterChip, isActive && styles.filterChipActive]}
                  onPress={() => handleSwitchGroup(g.id)}
                  testID={`subs-filter-${g.id}`}
                >
                  <Text style={styles.filterChipEmoji}>{config.emoji}</Text>
                  <Text
                    style={[styles.filterChipText, isActive && styles.filterChipTextActive]}
                    numberOfLines={1}
                  >
                    {g.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      <View style={styles.summaryCard}>
        <View style={styles.summaryItem}>
          <PoundSterling size={18} color={Colors.success} />
          <Text style={styles.summaryValue}>£{totalCollected.toFixed(2)}</Text>
          <Text style={styles.summaryLabel}>Subs Received</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <TrendingDown size={18} color={Colors.danger} />
          <Text style={[styles.summaryValue, { color: totalOutstanding > 0 ? Colors.danger : Colors.text }]}>
            £{totalOutstanding.toFixed(2)}
          </Text>
          <Text style={styles.summaryLabel}>Outstanding</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Settings size={18} color={Colors.gold} />
          <Text style={styles.summaryValue}>£{costPerSession.toFixed(2)}</Text>
          <Text style={styles.summaryLabel}>Per Session</Text>
        </View>
      </View>

      <View style={styles.kittyCard}>
        <View style={styles.kittyLeft}>
          <View style={styles.kittyIconWrap}>
            <Coins size={20} color={kittyBalance >= 0 ? Colors.success : Colors.danger} />
          </View>
          <View>
            <Text style={styles.kittyTitle}>Group Kitty</Text>
            <Text style={styles.kittySubtitle}>
              {matchHistory.length} games × £{subsSettings.gameCost.toFixed(0)} = £{totalGameCosts.toFixed(2)} costs
            </Text>
          </View>
        </View>
        <View style={styles.kittyRight}>
          <Text style={[styles.kittyAmount, { color: kittyBalance >= 0 ? Colors.success : Colors.danger }]}>
            {kittyBalance >= 0 ? '+' : ''}£{kittyBalance.toFixed(2)}
          </Text>
          <Text style={styles.kittyLabel}>{kittyBalance >= 0 ? 'In kitty' : 'Deficit'}</Text>
        </View>
      </View>

      <View style={styles.tabRow}>
        <Pressable
          style={[styles.tabBtn, activeTab === 'overview' && styles.tabBtnActive]}
          onPress={() => setActiveTab('overview')}
        >
          <Text style={[styles.tabBtnText, activeTab === 'overview' && styles.tabBtnTextActive]}>Players</Text>
        </Pressable>
        <Pressable
          style={[styles.tabBtn, activeTab === 'history' && styles.tabBtnActive]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabBtnText, activeTab === 'history' && styles.tabBtnTextActive]}>All Transactions</Text>
        </Pressable>
      </View>

      {activeTab === 'overview' ? (
        <FlatList
          data={sortedPlayers}
          renderItem={renderPlayerRow}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Wallet size={52} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No players yet</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={allPayments}
          renderItem={renderHistoryRow}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Wallet size={52} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No transactions yet</Text>
            </View>
          }
        />
      )}

      <Pressable
        style={styles.settingsFab}
        onPress={() => {
          setCostPerGame(String(subsSettings.costPerGame));
          setLateFeeAmount(String(subsSettings.lateFee));
          setGameCostAmount(String(subsSettings.gameCost));
          setSettingsVisible(true);
        }}
      >
        <Settings size={22} color={Colors.background} />
      </Pressable>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{selectedPlayer?.name}</Text>
                <Text style={styles.modalSubtitle}>{selectedPlayer?.position}</Text>
              </View>
              <Pressable onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <X size={22} color={Colors.text} />
              </Pressable>
            </View>

            <View style={[
              styles.balanceBanner,
              playerBalance < 0 ? styles.balanceBannerNeg : playerBalance > 0 ? styles.balanceBannerPos : styles.balanceBannerNeutral,
            ]}>
              <Text style={styles.balanceBannerLabel}>
                {playerBalance < 0 ? 'Outstanding Balance' : playerBalance > 0 ? 'Credit Balance' : 'Account Settled'}
              </Text>
              <Text style={styles.balanceBannerValue}>
                {playerBalance < 0 ? `-${formatCurrency(playerBalance)}` : playerBalance > 0 ? `+${formatCurrency(playerBalance)}` : '£0.00'}
              </Text>
            </View>

            <View style={styles.paymentBtns}>
              <Pressable style={styles.paymentBtnCredit} onPress={() => openPaymentForm('credit')}>
                <Plus size={15} color="#fff" />
                <Text style={styles.paymentBtnText}>Credit</Text>
              </Pressable>
              <Pressable style={styles.paymentBtnDebit} onPress={() => openPaymentForm('debit')}>
                <TrendingDown size={15} color="#fff" />
                <Text style={styles.paymentBtnText}>Debit</Text>
              </Pressable>
              <Pressable style={styles.paymentBtnLateFee} onPress={() => openPaymentForm('latefee')}>
                <AlertTriangle size={15} color="#fff" />
                <Text style={styles.paymentBtnText}>Late Fee</Text>
              </Pressable>
              <Pressable style={styles.paymentBtnGuest} onPress={() => openPaymentForm('guest')}>
                <UserPlus size={15} color="#fff" />
                <Text style={styles.paymentBtnText}>Guest</Text>
              </Pressable>
            </View>

            <Text style={styles.sectionLabel}>Transaction History</Text>
            <ScrollView style={styles.transactionList} showsVerticalScrollIndicator={false}>
              {playerPayments.length === 0 ? (
                <Text style={styles.noTransactions}>No transactions yet</Text>
              ) : (
                playerPayments.map(payment => (
                  <View key={payment.id} style={styles.transactionRow}>
                    <View style={[styles.txIcon, {
                      backgroundColor: payment.guestName ? 'rgba(99,102,241,0.12)' : payment.type === 'credit' ? 'rgba(22,163,74,0.12)' : 'rgba(220,53,69,0.12)',
                    }]}>
                      {payment.guestName
                        ? <UserPlus size={14} color="#6366f1" />
                        : payment.type === 'credit'
                        ? <TrendingUp size={14} color={Colors.success} />
                        : <TrendingDown size={14} color={Colors.danger} />
                      }
                    </View>
                    <View style={styles.txInfo}>
                      <Text style={styles.txDesc}>{payment.description}</Text>
                      <Text style={styles.txDate}>{payment.date}</Text>
                    </View>
                    <View style={styles.txRight}>
                      <Text style={[styles.txAmount, payment.type === 'credit' ? styles.balancePositive : styles.balanceNegative]}>
                        {payment.type === 'credit' ? '+' : '-'}{formatCurrency(payment.amount)}
                      </Text>
                      {payment.id.startsWith('synthetic-') ? (
                        <Pressable
                          onPress={() => handleDeletePayment(payment)}
                          style={styles.txVoid}
                          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                        >
                          <Ban size={14} color="#f59e0b" />
                        </Pressable>
                      ) : (
                        <Pressable
                          onPress={() => handleDeletePayment(payment)}
                          style={styles.txDelete}
                          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                        >
                          <Trash2 size={16} color={Colors.danger} />
                        </Pressable>
                      )}
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={addPaymentVisible}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setAddPaymentVisible(false);
          setTimeout(() => setModalVisible(true), 300);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.kavContainer}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setAddPaymentVisible(false)}>
            <Pressable style={styles.addPaymentSheet} onPress={e => e.stopPropagation()}>
              <View style={styles.dragHandle} />

              <View style={styles.modalHeader}>
                <Text style={[styles.formTitle, { color: getFormColor() }]}>{getFormTitle()}</Text>
                <Pressable onPress={() => { setAddPaymentVisible(false); setTimeout(() => setModalVisible(true), 300); }} style={styles.closeBtn}>
                  <X size={22} color={Colors.text} />
                </Pressable>
              </View>

              <View style={styles.addPaymentBody}>
                <View style={styles.datePicker}>
                  <Pressable style={styles.dateArrowBtn} onPress={() => adjustDate(-1)}>
                    <ChevronLeft size={20} color={Colors.text} />
                  </Pressable>
                  <View style={styles.dateCenter}>
                    <Text style={styles.dateLabelText}>Payment Date</Text>
                    <Text style={styles.dateValueText}>{formatDateDisplay(paymentDate)}</Text>
                  </View>
                  <Pressable style={styles.dateArrowBtn} onPress={() => adjustDate(1)}>
                    <ChevronRight size={20} color={Colors.text} />
                  </Pressable>
                </View>

                <View style={styles.inputRow}>
                  <Text style={styles.inputPrefix}>£</Text>
                  <TextInput
                    style={styles.amountInput}
                    value={amount}
                    onChangeText={setAmount}
                    placeholder="0.00"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="decimal-pad"
                    autoFocus
                    returnKeyType="next"
                  />
                </View>

                {paymentFormType === 'guest' && (
                  <TextInput
                    style={styles.descInput}
                    value={guestName}
                    onChangeText={setGuestName}
                    placeholder="Guest's name (required)"
                    placeholderTextColor={Colors.textMuted}
                    returnKeyType="next"
                    autoCapitalize="words"
                  />
                )}

                <TextInput
                  style={styles.descInput}
                  value={description}
                  onChangeText={setDescription}
                  placeholder={
                    paymentFormType === 'credit' ? 'e.g. Weekly subs payment' :
                    paymentFormType === 'latefee' ? 'e.g. Late fee' :
                    paymentFormType === 'guest' ? 'e.g. Guest brought by player' :
                    'e.g. Manual deduction'
                  }
                  placeholderTextColor={Colors.textMuted}
                  returnKeyType="done"
                />

                <View style={styles.formBtns}>
                  <Pressable style={styles.cancelFormBtn} onPress={() => { setAddPaymentVisible(false); setTimeout(() => setModalVisible(true), 300); }}>
                    <Text style={styles.cancelFormBtnText}>Cancel</Text>
                  </Pressable>
                  <Pressable style={[styles.saveFormBtn, { backgroundColor: getFormColor() }]} onPress={handleAddPayment}>
                    <Text style={styles.saveFormBtnText}>Save</Text>
                  </Pressable>
                </View>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={settingsVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setSettingsVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.kavContainer}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setSettingsVisible(false)}>
            <Pressable style={styles.addPaymentSheet} onPress={e => e.stopPropagation()}>
              <View style={styles.dragHandle} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Subs Settings</Text>
                <Pressable onPress={() => setSettingsVisible(false)} style={styles.closeBtn}>
                  <X size={22} color={Colors.text} />
                </Pressable>
              </View>
              <View style={styles.addPaymentBody}>
                <Text style={styles.settingsLabel}>Cost per game (£)</Text>
                <Text style={styles.settingsHint}>
                  Automatically deducted from each player{"'"}s balance when a match result is saved.
                </Text>
                <View style={styles.inputRow}>
                  <Text style={styles.inputPrefix}>£</Text>
                  <TextInput
                    style={styles.amountInput}
                    value={costPerGame}
                    onChangeText={setCostPerGame}
                    placeholder="5.00"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="decimal-pad"
                  />
                </View>

                <Text style={[styles.settingsLabel, { marginTop: 12 }]}>Default late fee (£)</Text>
                <Text style={styles.settingsHint}>
                  Pre-filled amount when tapping the Late Fee button on a player.
                </Text>
                <View style={styles.inputRow}>
                  <Text style={styles.inputPrefix}>£</Text>
                  <TextInput
                    style={styles.amountInput}
                    value={lateFeeAmount}
                    onChangeText={setLateFeeAmount}
                    placeholder="1.00"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="decimal-pad"
                  />
                </View>

                <Text style={[styles.settingsLabel, { marginTop: 12 }]}>Game cost (£)</Text>
                <Text style={styles.settingsHint}>
                  Total pitch/running cost per game. Used to calculate the kitty balance.
                </Text>
                <View style={styles.inputRow}>
                  <Text style={styles.inputPrefix}>£</Text>
                  <TextInput
                    style={styles.amountInput}
                    value={gameCostAmount}
                    onChangeText={setGameCostAmount}
                    placeholder="58.00"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="decimal-pad"
                  />
                </View>

                <Pressable style={styles.saveSettingsBtn} onPress={handleSaveSettings}>
                  <Text style={styles.saveSettingsBtnText}>Save Settings</Text>
                </Pressable>

                <Pressable
                  style={styles.priceHistoryLink}
                  onPress={() => {
                    setSettingsVisible(false);
                    setTimeout(() => router.push('/price-history' as any), 300);
                  }}
                  testID="price-history-link"
                >
                  <History size={16} color={Colors.gold} />
                  <View style={styles.priceHistoryLinkText}>
                    <Text style={styles.priceHistoryLinkTitle}>Subs Price History</Text>
                    <Text style={styles.priceHistoryLinkSub}>Track price changes over time</Text>
                  </View>
                  <ChevronRight size={16} color={Colors.textMuted} />
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
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
  filterSection: {
    paddingTop: 12,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
    backgroundColor: Colors.cardBackground,
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.background,
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
  },
  filterChipActive: {
    backgroundColor: 'rgba(200, 160, 42, 0.12)',
    borderColor: Colors.gold,
  },
  filterChipEmoji: {
    fontSize: 16,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    maxWidth: 120,
  },
  filterChipTextActive: {
    color: Colors.gold,
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: Colors.cardBackground,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.cardBorder,
    marginHorizontal: 8,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  summaryLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  kittyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.cardBackground,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  kittyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  kittyIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kittyTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  kittySubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  kittyRight: {
    alignItems: 'flex-end',
  },
  kittyAmount: {
    fontSize: 22,
    fontWeight: '800' as const,
  },
  kittyLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 9,
  },
  tabBtnActive: {
    backgroundColor: Colors.gold,
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  tabBtnTextActive: {
    color: Colors.background,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    gap: 12,
  },
  playerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerAvatarText: {
    fontSize: 17,
    fontWeight: '700' as const,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  playerPosition: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  playerBalance: {
    alignItems: 'flex-end',
    marginRight: 6,
  },
  balanceAmount: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  balancePositive: {
    color: Colors.success,
  },
  balanceNegative: {
    color: Colors.danger,
  },
  balanceLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    gap: 10,
  },
  historyIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyInfo: {
    flex: 1,
  },
  historyPlayerName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  historyDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  historyDate: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
  },
  historyAmount: {
    fontSize: 15,
    fontWeight: '700' as const,
  },
  historyRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  historyDeleteBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(220,53,69,0.1)',
  },
  historyVoidBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(245,158,11,0.12)',
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 12,
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: 15,
  },
  settingsFab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  kavContainer: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.cardBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: 32,
  },
  addPaymentSheet: {
    backgroundColor: Colors.cardBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 32,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.cardBorder,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  modalSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  closeBtn: {
    padding: 4,
  },
  balanceBanner: {
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceBannerPos: {
    backgroundColor: 'rgba(22,163,74,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(22,163,74,0.25)',
  },
  balanceBannerNeg: {
    backgroundColor: 'rgba(220,53,69,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(220,53,69,0.25)',
  },
  balanceBannerNeutral: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  balanceBannerLabel: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
  },
  balanceBannerValue: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: Colors.text,
  },
  paymentBtns: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: 20,
    marginTop: 16,
    gap: 8,
  },
  paymentBtnCredit: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.success,
    borderRadius: 12,
    paddingVertical: 11,
    gap: 5,
  },
  paymentBtnDebit: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.danger,
    borderRadius: 12,
    paddingVertical: 11,
    gap: 5,
  },
  paymentBtnLateFee: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.gold,
    borderRadius: 12,
    paddingVertical: 11,
    gap: 5,
  },
  paymentBtnGuest: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366f1',
    borderRadius: 12,
    paddingVertical: 11,
    gap: 5,
  },
  paymentBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600' as const,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  transactionList: {
    maxHeight: 260,
    marginHorizontal: 20,
  },
  noTransactions: {
    color: Colors.textMuted,
    textAlign: 'center',
    paddingVertical: 20,
    fontSize: 14,
  },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
    gap: 10,
  },
  txIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txInfo: {
    flex: 1,
  },
  txDesc: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.text,
  },
  txDate: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  txRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '700' as const,
  },
  txDelete: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(220,53,69,0.1)',
  },
  txVoid: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(245,158,11,0.12)',
  },
  addPaymentBody: {
    padding: 20,
    gap: 14,
  },
  datePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    overflow: 'hidden',
  },
  dateArrowBtn: {
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateCenter: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  dateLabelText: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '500' as const,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 3,
  },
  dateValueText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingHorizontal: 14,
  },
  inputPrefix: {
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
    paddingVertical: 14,
  },
  descInput: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.text,
  },
  formBtns: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  cancelFormBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  cancelFormBtnText: {
    color: Colors.textSecondary,
    fontWeight: '600' as const,
    fontSize: 15,
  },
  saveFormBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveFormBtnText: {
    color: '#fff',
    fontWeight: '700' as const,
    fontSize: 15,
  },
  settingsLabel: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  settingsHint: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
    marginTop: -6,
  },
  saveSettingsBtn: {
    backgroundColor: Colors.gold,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  saveSettingsBtnText: {
    color: Colors.background,
    fontWeight: '700' as const,
    fontSize: 15,
  },
  priceHistoryLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 10,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(200,160,42,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(200,160,42,0.2)',
  },
  priceHistoryLinkText: {
    flex: 1,
  },
  priceHistoryLinkTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.gold,
  },
  priceHistoryLinkSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 1,
  },
});

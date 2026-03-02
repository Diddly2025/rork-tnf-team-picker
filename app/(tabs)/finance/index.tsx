import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
  Switch,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  PiggyBank,
  TrendingUp,
  TrendingDown,
  Users,
  Calendar,
  ChevronDown,
  ChevronUp,
  Cloud,
  CloudUpload,
  CloudDownload,
  CheckCircle,
  AlertCircle,
  ShoppingBag,
  Plus,
  Trash2,
  X,
  Tag,
} from 'lucide-react-native';
import { useTNF } from '@/context/TNFContext';
import Colors from '@/constants/colors';
import { Expense } from '@/types';

type ActiveTab = 'kitty' | 'players' | 'expenses' | 'cloud';

type ExpenseCategory = Expense['category'];

const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string; icon: string }[] = [
  { value: 'equipment', label: 'Equipment', icon: 'bibs, balls, cones' },
  { value: 'pitch', label: 'Pitch', icon: 'booking, maintenance' },
  { value: 'social', label: 'Social', icon: 'food, drinks, events' },
  { value: 'other', label: 'Other', icon: 'miscellaneous' },
];

const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  equipment: '#2563eb',
  pitch: '#059669',
  social: '#d97706',
  other: '#7c3aed',
};

export default function FinanceScreen() {
  const {
    players,
    matchHistory,
    subsSettings,
    getTotalCollected,
    getKittyBalance,
    getPlayerTotalPaid,
    getPlayerBalance,
    subsPayments,
    expenses,
    addExpense,
    deleteExpense,
    getTotalExpenses,
    forceCloudSync,
    forceCloudRestore,
    syncStatus,
    cloudSyncEnabled,
    toggleCloudSync,
  } = useTNF();

  const [activeTab, setActiveTab] = useState<ActiveTab>('kitty');
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState<ExpenseCategory>('equipment');

  const totalCollected = getTotalCollected();
  const kittyBalance = getKittyBalance();
  const totalGameCosts = matchHistory.length * subsSettings.gameCost;
  const totalExpenses = getTotalExpenses();

  const sortedPlayersByPaid = useMemo(() => {
    return [...players].sort((a, b) => getPlayerTotalPaid(b.id) - getPlayerTotalPaid(a.id));
  }, [players, getPlayerTotalPaid]);

  const matchesWithRunning = useMemo(() => {
    let running = 0;
    return [...matchHistory]
      .sort((a, b) => a.createdAt - b.createdAt)
      .map(m => {
        const expectedSubs = m.playerIds.length * subsSettings.costPerGame;
        const delta = expectedSubs - subsSettings.gameCost;
        running += delta;
        return { ...m, expectedSubs, delta, runningKitty: running };
      })
      .reverse();
  }, [matchHistory, subsSettings]);

  const formatCurrency = (v: number) => `£${Math.abs(v).toFixed(2)}`;

  const toggleMatch = useCallback((id: string) => {
    setExpandedMatchId(prev => prev === id ? null : id);
  }, []);

  const handleAddExpense = useCallback(() => {
    const amount = parseFloat(expenseAmount);
    if (!expenseDesc.trim()) {
      Alert.alert('Missing Description', 'Please enter what was purchased.');
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount.');
      return;
    }
    const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    addExpense({
      description: expenseDesc.trim(),
      amount,
      category: expenseCategory,
      date: today,
    });
    setExpenseDesc('');
    setExpenseAmount('');
    setExpenseCategory('equipment');
    setShowAddExpense(false);
    console.log('[Finance] Expense added:', expenseDesc.trim(), amount);
  }, [expenseDesc, expenseAmount, expenseCategory, addExpense]);

  const handleDeleteExpense = useCallback((expense: Expense) => {
    Alert.alert(
      'Delete Expense',
      `Remove "${expense.description}" (£${expense.amount.toFixed(2)}) from expenses?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteExpense(expense.id) },
      ]
    );
  }, [deleteExpense]);

  const sortedExpenses = useMemo(() => {
    return [...expenses].sort((a, b) => b.createdAt - a.createdAt);
  }, [expenses]);

  const expensesByCategory = useMemo(() => {
    const grouped: Record<string, number> = {};
    expenses.forEach(e => {
      grouped[e.category] = (grouped[e.category] ?? 0) + e.amount;
    });
    return grouped;
  }, [expenses]);

  const renderKittyTab = () => (
    <FlatList
      data={matchesWithRunning}
      keyExtractor={item => item.id}
      contentContainerStyle={styles.listContent}
      ListHeaderComponent={
        <View style={styles.kittyBreakdownHeader}>
          <Text style={styles.sectionTitle}>Per-Game Breakdown</Text>
          <Text style={styles.sectionSubtitle}>
            Expected subs vs £{subsSettings.gameCost.toFixed(0)} pitch cost
          </Text>
        </View>
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <PiggyBank size={48} color={Colors.textMuted} />
          <Text style={styles.emptyText}>No matches yet</Text>
        </View>
      }
      renderItem={({ item }) => {
        const isExpanded = expandedMatchId === item.id;
        const isPositive = item.delta >= 0;
        return (
          <Pressable
            style={[styles.matchCard, isExpanded && styles.matchCardExpanded]}
            onPress={() => toggleMatch(item.id)}
          >
            <View style={styles.matchCardTop}>
              <View style={styles.matchDateWrap}>
                <Calendar size={14} color={Colors.textMuted} />
                <Text style={styles.matchDate}>{item.date}</Text>
              </View>
              <View style={styles.matchCardRight}>
                <View style={[styles.deltaBadge, { backgroundColor: isPositive ? 'rgba(22,163,74,0.12)' : 'rgba(220,53,69,0.12)' }]}>
                  <Text style={[styles.deltaBadgeText, { color: isPositive ? Colors.success : Colors.danger }]}>
                    {isPositive ? '+' : '-'}{formatCurrency(item.delta)}
                  </Text>
                </View>
                {isExpanded
                  ? <ChevronUp size={16} color={Colors.textMuted} />
                  : <ChevronDown size={16} color={Colors.textMuted} />
                }
              </View>
            </View>
            <View style={styles.matchCardStats}>
              <View style={styles.matchStat}>
                <Users size={12} color={Colors.textMuted} />
                <Text style={styles.matchStatText}>{item.playerIds.length} players</Text>
              </View>
              <View style={styles.matchStatDivider} />
              <Text style={styles.matchStatLabel}>Expected:</Text>
              <Text style={styles.matchStatValue}>£{item.expectedSubs.toFixed(2)}</Text>
              <View style={styles.matchStatDivider} />
              <Text style={styles.matchStatLabel}>Cost:</Text>
              <Text style={styles.matchStatValue}>£{subsSettings.gameCost.toFixed(2)}</Text>
              <View style={styles.matchStatDivider} />
              <Text style={styles.matchStatLabel}>Running:</Text>
              <Text style={[styles.matchStatValue, { color: item.runningKitty >= 0 ? Colors.success : Colors.danger }]}>
                {item.runningKitty >= 0 ? '+' : '-'}{formatCurrency(item.runningKitty)}
              </Text>
            </View>
            {isExpanded && (
              <View style={styles.matchExpanded}>
                <Text style={styles.expandedLabel}>Score</Text>
                <Text style={styles.expandedValue}>
                  {item.teamA.players.length > 0 ? 'Team A' : '?'} {item.scoreA} – {item.scoreB} {item.teamB.players.length > 0 ? 'Team B' : '?'}
                </Text>
                <View style={styles.expandedDivider} />
                <Text style={styles.expandedLabel}>Players</Text>
                <Text style={styles.expandedValue}>
                  {[...item.teamA.players, ...item.teamB.players].map(p => p.name).join(', ')}
                </Text>
              </View>
            )}
          </Pressable>
        );
      }}
    />
  );

  const handleCloudSync = useCallback(() => {
    Alert.alert(
      'Sync to Cloud',
      'This will upload all your local data to Supabase. Any existing cloud data will be overwritten.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sync', onPress: () => forceCloudSync() },
      ]
    );
  }, [forceCloudSync]);

  const handleCloudRestore = useCallback(() => {
    Alert.alert(
      'Restore from Cloud',
      'This will download all data from Supabase and replace your local data. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          style: 'destructive',
          onPress: () => forceCloudRestore(),
        },
      ]
    );
  }, [forceCloudRestore]);

  const handleToggleCloudSync = useCallback((enabled: boolean) => {
    if (enabled) {
      Alert.alert(
        'Enable Cloud Sync',
        'This will automatically sync your data to Supabase when you make changes. Make sure your Supabase tables are set up first.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Enable', onPress: () => toggleCloudSync(true) },
        ]
      );
    } else {
      toggleCloudSync(false);
    }
  }, [toggleCloudSync]);

  const renderCloudTab = () => (
    <ScrollView contentContainerStyle={styles.cloudContent}>
      <View style={styles.cloudToggleCard}>
        <View style={styles.cloudToggleLeft}>
          <Cloud size={22} color={cloudSyncEnabled ? Colors.gold : Colors.textMuted} />
          <View style={styles.cloudToggleText}>
            <Text style={styles.cloudToggleTitle}>Cloud Sync</Text>
            <Text style={styles.cloudToggleSubtitle}>
              {cloudSyncEnabled ? 'Auto-syncing changes to Supabase' : 'Disabled — data stays local only'}
            </Text>
          </View>
        </View>
        <Switch
          value={cloudSyncEnabled}
          onValueChange={handleToggleCloudSync}
          trackColor={{ false: Colors.cardBorder, true: Colors.gold }}
          thumbColor="#fff"
        />
      </View>

      <View style={styles.cloudStatusCard}>
        {syncStatus === 'syncing' ? (
          <ActivityIndicator size="small" color={Colors.gold} />
        ) : syncStatus === 'synced' ? (
          <CheckCircle size={24} color={Colors.success} />
        ) : syncStatus === 'error' ? (
          <AlertCircle size={24} color={Colors.danger} />
        ) : (
          <Cloud size={24} color={Colors.textMuted} />
        )}
        <Text style={styles.cloudStatusText}>
          {syncStatus === 'syncing' ? 'Syncing...' :
           syncStatus === 'synced' ? 'Last sync completed' :
           syncStatus === 'error' ? 'Sync failed' :
           'Not synced yet'}
        </Text>
      </View>

      <View style={styles.cloudInfoCard}>
        <Text style={styles.cloudInfoTitle}>How it works</Text>
        <Text style={styles.cloudInfoText}>
          Your data is stored locally on your device first. When cloud sync is enabled, changes are automatically backed up to Supabase so you can restore on a new device.
        </Text>
        <View style={styles.cloudInfoStats}>
          <Text style={styles.cloudInfoStat}>{players.length} players</Text>
          <View style={styles.cloudInfoDot} />
          <Text style={styles.cloudInfoStat}>{matchHistory.length} matches</Text>
          <View style={styles.cloudInfoDot} />
          <Text style={styles.cloudInfoStat}>{subsPayments.length} payments</Text>
        </View>
      </View>

      <Pressable
        style={[styles.cloudButton, styles.cloudButtonSync, !cloudSyncEnabled && styles.cloudButtonDisabled]}
        onPress={handleCloudSync}
        disabled={syncStatus === 'syncing' || !cloudSyncEnabled}
      >
        <CloudUpload size={22} color="#fff" />
        <View style={styles.cloudButtonTextWrap}>
          <Text style={styles.cloudButtonTitle}>Sync to Cloud</Text>
          <Text style={styles.cloudButtonSub}>{cloudSyncEnabled ? 'Upload local data to Supabase' : 'Enable cloud sync first'}</Text>
        </View>
      </Pressable>

      <Pressable
        style={[styles.cloudButton, styles.cloudButtonRestore, !cloudSyncEnabled && styles.cloudButtonDisabled]}
        onPress={handleCloudRestore}
        disabled={syncStatus === 'syncing' || !cloudSyncEnabled}
      >
        <CloudDownload size={22} color="#fff" />
        <View style={styles.cloudButtonTextWrap}>
          <Text style={styles.cloudButtonTitle}>Restore from Cloud</Text>
          <Text style={styles.cloudButtonSub}>{cloudSyncEnabled ? 'Download data from Supabase' : 'Enable cloud sync first'}</Text>
        </View>
      </Pressable>

      <Text style={styles.cloudDisclaimer}>
        {cloudSyncEnabled
          ? 'Data syncs automatically when you make changes. Use these buttons for manual full sync/restore.'
          : 'Turn on Cloud Sync above to enable automatic backup to Supabase.'}
      </Text>
    </ScrollView>
  );

  const renderExpensesTab = () => (
    <FlatList
      data={sortedExpenses}
      keyExtractor={item => item.id}
      contentContainerStyle={styles.listContent}
      ListHeaderComponent={
        <View>
          {expenses.length > 0 && (
            <View style={styles.expenseSummaryCard}>
              <Text style={styles.expenseSummaryTitle}>Breakdown by Category</Text>
              {EXPENSE_CATEGORIES.map(cat => {
                const catTotal = expensesByCategory[cat.value] ?? 0;
                if (catTotal === 0) return null;
                const pct = totalExpenses > 0 ? (catTotal / totalExpenses) * 100 : 0;
                return (
                  <View key={cat.value} style={styles.catBreakdownRow}>
                    <View style={[styles.catDot, { backgroundColor: CATEGORY_COLORS[cat.value] }]} />
                    <Text style={styles.catBreakdownLabel}>{cat.label}</Text>
                    <View style={styles.catBarOuter}>
                      <View
                        style={[
                          styles.catBarInner,
                          { width: `${Math.max(pct, 4)}%`, backgroundColor: CATEGORY_COLORS[cat.value] },
                        ]}
                      />
                    </View>
                    <Text style={styles.catBreakdownValue}>£{catTotal.toFixed(2)}</Text>
                  </View>
                );
              })}
            </View>
          )}
          <View style={styles.expensesHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>All Expenses</Text>
              <Text style={styles.sectionSubtitle}>{expenses.length} item{expenses.length !== 1 ? 's' : ''} totalling £{totalExpenses.toFixed(2)}</Text>
            </View>
            <Pressable
              style={styles.addExpenseFab}
              onPress={() => setShowAddExpense(true)}
            >
              <Plus size={18} color="#fff" />
              <Text style={styles.addExpenseFabText}>Add</Text>
            </Pressable>
          </View>
        </View>
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <ShoppingBag size={48} color={Colors.textMuted} />
          <Text style={styles.emptyText}>No expenses recorded</Text>
          <Pressable
            style={styles.emptyAddBtn}
            onPress={() => setShowAddExpense(true)}
          >
            <Plus size={16} color={Colors.gold} />
            <Text style={styles.emptyAddBtnText}>Add your first expense</Text>
          </Pressable>
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.expenseCard}>
          <View style={[styles.expenseCatStrip, { backgroundColor: CATEGORY_COLORS[item.category] }]} />
          <View style={styles.expenseCardBody}>
            <View style={styles.expenseCardTop}>
              <View style={styles.expenseCardInfo}>
                <Text style={styles.expenseCardDesc}>{item.description}</Text>
                <View style={styles.expenseCardMeta}>
                  <Tag size={11} color={Colors.textMuted} />
                  <Text style={styles.expenseCardCat}>
                    {EXPENSE_CATEGORIES.find(c => c.value === item.category)?.label ?? item.category}
                  </Text>
                  <View style={styles.matchStatDivider} />
                  <Calendar size={11} color={Colors.textMuted} />
                  <Text style={styles.expenseCardDate}>{item.date}</Text>
                </View>
              </View>
              <View style={styles.expenseCardRight}>
                <Text style={styles.expenseCardAmount}>-£{item.amount.toFixed(2)}</Text>
                <Pressable
                  onPress={() => handleDeleteExpense(item)}
                  hitSlop={10}
                  style={styles.expenseDeleteBtn}
                >
                  <Trash2 size={15} color={Colors.danger} />
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      )}
    />
  );

  const renderPlayersTab = () => (
    <FlatList
      data={sortedPlayersByPaid}
      keyExtractor={item => item.id}
      contentContainerStyle={styles.listContent}
      ListHeaderComponent={
        <View style={styles.kittyBreakdownHeader}>
          <Text style={styles.sectionTitle}>Player Payments</Text>
          <Text style={styles.sectionSubtitle}>Total amount each player has sent</Text>
        </View>
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Users size={48} color={Colors.textMuted} />
          <Text style={styles.emptyText}>No players yet</Text>
        </View>
      }
      renderItem={({ item }) => {
        const totalPaid = getPlayerTotalPaid(item.id);
        const balance = getPlayerBalance(item.id);
        const isNeg = balance < 0;
        const isPos = balance > 0;
        return (
          <View style={styles.playerCard}>
            <View style={[styles.playerAvatar, {
              backgroundColor: totalPaid > 0 ? 'rgba(22,163,74,0.12)' : 'rgba(0,0,0,0.06)',
            }]}>
              <Text style={[styles.playerAvatarText, {
                color: totalPaid > 0 ? Colors.success : Colors.textMuted,
              }]}>
                {item.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.playerInfo}>
              <Text style={styles.playerName}>{item.name}</Text>
              <Text style={styles.playerPos}>{item.position}</Text>
            </View>
            <View style={styles.playerFinance}>
              <View style={styles.playerFinanceRow}>
                <Text style={styles.playerFinanceLabel}>Sent</Text>
                <Text style={[styles.playerFinanceValue, { color: Colors.success }]}>
                  £{totalPaid.toFixed(2)}
                </Text>
              </View>
              <View style={styles.playerFinanceRow}>
                <Text style={styles.playerFinanceLabel}>Balance</Text>
                <Text style={[styles.playerFinanceValue, isNeg && styles.negText, isPos && styles.posText]}>
                  {isNeg ? `-${formatCurrency(balance)}` : isPos ? `+${formatCurrency(balance)}` : '£0.00'}
                </Text>
              </View>
            </View>
          </View>
        );
      }}
    />
  );

  return (
    <View style={styles.container}>
      <View style={styles.topSection}>
        <View style={styles.kittyHero}>
          <View style={styles.kittyHeroLeft}>
            <PiggyBank size={32} color={kittyBalance >= 0 ? Colors.gold : Colors.danger} />
            <View style={styles.kittyHeroText}>
              <Text style={styles.kittyHeroLabel}>TNF Kitty Balance</Text>
              <Text style={styles.kittyHeroSub}>{matchHistory.length} games played</Text>
            </View>
          </View>
          <Text style={[styles.kittyHeroAmount, { color: kittyBalance >= 0 ? Colors.success : Colors.danger }]}>
            {kittyBalance >= 0 ? '+' : ''}£{kittyBalance.toFixed(2)}
          </Text>
        </View>

        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <TrendingUp size={16} color={Colors.success} />
            <Text style={styles.metricValue}>£{totalCollected.toFixed(2)}</Text>
            <Text style={styles.metricLabel}>Subs In</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricCard}>
            <TrendingDown size={16} color={Colors.danger} />
            <Text style={styles.metricValue}>£{totalGameCosts.toFixed(2)}</Text>
            <Text style={styles.metricLabel}>Pitch Costs</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricCard}>
            <ShoppingBag size={16} color={'#7c3aed'} />
            <Text style={styles.metricValue}>£{totalExpenses.toFixed(2)}</Text>
            <Text style={styles.metricLabel}>Expenses</Text>
          </View>
        </View>
      </View>

      <View style={styles.tabRow}>
        <Pressable
          style={[styles.tabBtn, activeTab === 'kitty' && styles.tabBtnActive]}
          onPress={() => setActiveTab('kitty')}
        >
          <PiggyBank size={14} color={activeTab === 'kitty' ? Colors.background : Colors.textSecondary} />
          <Text style={[styles.tabBtnText, activeTab === 'kitty' && styles.tabBtnTextActive]}>
            Kitty
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tabBtn, activeTab === 'players' && styles.tabBtnActive]}
          onPress={() => setActiveTab('players')}
        >
          <Users size={14} color={activeTab === 'players' ? Colors.background : Colors.textSecondary} />
          <Text style={[styles.tabBtnText, activeTab === 'players' && styles.tabBtnTextActive]}>
            Players
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tabBtn, activeTab === 'expenses' && styles.tabBtnActive]}
          onPress={() => setActiveTab('expenses')}
        >
          <ShoppingBag size={14} color={activeTab === 'expenses' ? Colors.background : Colors.textSecondary} />
          <Text style={[styles.tabBtnText, activeTab === 'expenses' && styles.tabBtnTextActive]}>
            Expenses
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tabBtn, activeTab === 'cloud' && styles.tabBtnActive]}
          onPress={() => setActiveTab('cloud')}
        >
          <Cloud size={14} color={activeTab === 'cloud' ? Colors.background : Colors.textSecondary} />
          <Text style={[styles.tabBtnText, activeTab === 'cloud' && styles.tabBtnTextActive]}>
            Cloud
          </Text>
        </Pressable>
      </View>

      {activeTab === 'kitty' && renderKittyTab()}
      {activeTab === 'players' && renderPlayersTab()}
      {activeTab === 'expenses' && renderExpensesTab()}
      {activeTab === 'cloud' && renderCloudTab()}

      <Modal
        visible={showAddExpense}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAddExpense(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setShowAddExpense(false)} />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Expense</Text>
              <Pressable onPress={() => setShowAddExpense(false)} hitSlop={12}>
                <X size={22} color={Colors.textSecondary} />
              </Pressable>
            </View>

            <Text style={styles.fieldLabel}>Description</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. New bibs, footballs"
              placeholderTextColor={Colors.textMuted}
              value={expenseDesc}
              onChangeText={setExpenseDesc}
              autoFocus
            />

            <Text style={styles.fieldLabel}>Amount (£)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="0.00"
              placeholderTextColor={Colors.textMuted}
              value={expenseAmount}
              onChangeText={setExpenseAmount}
              keyboardType="decimal-pad"
            />

            <Text style={styles.fieldLabel}>Category</Text>
            <View style={styles.categoryRow}>
              {EXPENSE_CATEGORIES.map(cat => (
                <Pressable
                  key={cat.value}
                  style={[
                    styles.categoryChip,
                    expenseCategory === cat.value && {
                      backgroundColor: CATEGORY_COLORS[cat.value],
                      borderColor: CATEGORY_COLORS[cat.value],
                    },
                  ]}
                  onPress={() => setExpenseCategory(cat.value)}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      expenseCategory === cat.value && styles.categoryChipTextActive,
                    ]}
                  >
                    {cat.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable style={styles.addExpenseButton} onPress={handleAddExpense}>
              <Text style={styles.addExpenseButtonText}>Add Expense</Text>
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
  topSection: {
    backgroundColor: Colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
    paddingBottom: 16,
  },
  kittyHero: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  kittyHeroLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  kittyHeroText: {
    gap: 2,
  },
  kittyHeroLabel: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  kittyHeroSub: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  kittyHeroAmount: {
    fontSize: 30,
    fontWeight: '800' as const,
  },
  metricsRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    backgroundColor: Colors.background,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingVertical: 12,
    alignItems: 'center',
  },
  metricCard: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  metricDivider: {
    width: 1,
    height: 36,
    backgroundColor: Colors.cardBorder,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  metricLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
  },
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 4,
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 9,
    gap: 6,
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
    paddingTop: 8,
  },
  kittyBreakdownHeader: {
    marginBottom: 12,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  matchCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  matchCardExpanded: {
    borderColor: Colors.gold,
  },
  matchCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  matchDateWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  matchDate: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  matchCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deltaBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  deltaBadgeText: {
    fontSize: 13,
    fontWeight: '700' as const,
  },
  matchCardStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap' as const,
  },
  matchStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  matchStatText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  matchStatDivider: {
    width: 1,
    height: 12,
    backgroundColor: Colors.cardBorder,
  },
  matchStatLabel: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  matchStatValue: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  matchExpanded: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
    gap: 4,
  },
  expandedLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.textMuted,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.4,
  },
  expandedValue: {
    fontSize: 13,
    color: Colors.text,
    marginBottom: 8,
    lineHeight: 18,
  },
  expandedDivider: {
    height: 1,
    backgroundColor: Colors.cardBorder,
    marginVertical: 4,
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
  playerCard: {
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
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerAvatarText: {
    fontSize: 18,
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
  playerPos: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  playerFinance: {
    alignItems: 'flex-end',
    gap: 4,
  },
  playerFinanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  playerFinanceLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    minWidth: 40,
    textAlign: 'right' as const,
  },
  playerFinanceValue: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.text,
    minWidth: 60,
    textAlign: 'right' as const,
  },
  posText: {
    color: Colors.success,
  },
  negText: {
    color: Colors.danger,
  },
  cloudContent: {
    padding: 16,
    paddingBottom: 100,
    gap: 14,
  },
  cloudStatusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  cloudStatusText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  cloudInfoCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    gap: 8,
  },
  cloudInfoTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  cloudInfoText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  cloudInfoStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  cloudInfoStat: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.gold,
  },
  cloudInfoDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.textMuted,
  },
  cloudButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: 14,
    gap: 14,
  },
  cloudButtonSync: {
    backgroundColor: '#2563eb',
  },
  cloudButtonRestore: {
    backgroundColor: '#059669',
  },
  cloudButtonTextWrap: {
    flex: 1,
    gap: 2,
  },
  cloudButtonTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#fff',
  },
  cloudButtonSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
  },
  cloudDisclaimer: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 20,
    lineHeight: 17,
  },
  cloudToggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  cloudToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  cloudToggleText: {
    flex: 1,
    gap: 2,
  },
  cloudToggleTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  cloudToggleSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  cloudButtonDisabled: {
    opacity: 0.4,
  },
  expenseSummaryCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    gap: 10,
  },
  expenseSummaryTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  catBreakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  catDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  catBreakdownLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    width: 80,
  },
  catBarOuter: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.background,
    borderRadius: 4,
    overflow: 'hidden' as const,
  },
  catBarInner: {
    height: 8,
    borderRadius: 4,
  },
  catBreakdownValue: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text,
    width: 65,
    textAlign: 'right' as const,
  },
  expensesHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    marginTop: 4,
  },
  addExpenseFab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gold,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 5,
  },
  addExpenseFabText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#fff',
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.gold,
  },
  emptyAddBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.gold,
  },
  expenseCard: {
    flexDirection: 'row',
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    overflow: 'hidden' as const,
  },
  expenseCatStrip: {
    width: 5,
  },
  expenseCardBody: {
    flex: 1,
    padding: 14,
  },
  expenseCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  expenseCardInfo: {
    flex: 1,
    gap: 4,
  },
  expenseCardDesc: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  expenseCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  expenseCardCat: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  expenseCardDate: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  expenseCardRight: {
    alignItems: 'flex-end',
    gap: 6,
    marginLeft: 12,
  },
  expenseCardAmount: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.danger,
  },
  expenseDeleteBtn: {
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalContent: {
    backgroundColor: Colors.cardBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginBottom: 6,
    marginTop: 12,
  },
  textInput: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.text,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap' as const,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.background,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  categoryChipTextActive: {
    color: '#fff',
  },
  addExpenseButton: {
    backgroundColor: Colors.gold,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 24,
  },
  addExpenseButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#fff',
  },
});

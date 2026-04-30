import React, { useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus, ChevronRight, Users, Calendar, Trophy } from 'lucide-react-native';
import { useGroup } from '@/context/GroupContext';
import { SPORT_CONFIGS, getSportLabel } from '@/constants/sports';
import { Group } from '@/types';
import Colors from '@/constants/colors';

export default function HomeScreen() {
  console.log('[Home] Screen rendered');
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { groups, setActiveGroup, isLoading } = useGroup();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const handleGroupPress = useCallback((group: Group) => {
    setActiveGroup(group.id);
    console.log('[Home] Selected group:', group.name);
    router.push('/(tabs)/players');
  }, [setActiveGroup, router]);

  const handleCreateGroup = useCallback(() => {
    router.push('/group-setup');
  }, [router]);

  const onButtonPressIn = useCallback(() => {
    Animated.spring(buttonScale, {
      toValue: 0.96,
      useNativeDriver: true,
    }).start();
  }, [buttonScale]);

  const onButtonPressOut = useCallback(() => {
    Animated.spring(buttonScale, {
      toValue: 1,
      friction: 3,
      useNativeDriver: true,
    }).start();
  }, [buttonScale]);

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.gold} />
      </View>
    );
  }

  const renderGroupCard = ({ item, index }: { item: Group; index: number }) => {
    const config = SPORT_CONFIGS[item.sport];
    const sportName = getSportLabel(item.sport, item.customSport);

    return (
      <Pressable
        style={({ pressed }) => [
          styles.groupCard,
          pressed && styles.groupCardPressed,
        ]}
        onPress={() => handleGroupPress(item)}
        testID={`group-card-${index}`}
      >
        <View style={[styles.sportIconContainer, { backgroundColor: config.courtColor + '18' }]}>
          <Text style={styles.sportEmoji}>{config.emoji}</Text>
        </View>
        <View style={styles.groupCardContent}>
          <Text style={styles.groupCardName} numberOfLines={1}>{item.name}</Text>
          <View style={styles.groupCardMeta}>
            <Text style={styles.groupCardSport}>{sportName}</Text>
            <View style={styles.metaDot} />
            <Text style={styles.groupCardDetail}>{item.playersPerTeam}v{item.playersPerTeam}</Text>
            <View style={styles.metaDot} />
            <Text style={styles.groupCardDetail}>{item.playDay}s</Text>
          </View>
          <View style={styles.groupCardSchedule}>
            <Calendar size={11} color={Colors.textMuted} />
            <Text style={styles.scheduleText}>{item.playDay} at {item.playTime}</Text>
          </View>
        </View>
        <ChevronRight size={20} color={Colors.textMuted} />
      </Pressable>
    );
  };

  const renderEmpty = () => (
    <Animated.View
      style={[
        styles.emptyContainer,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <View style={styles.emptyIconRing}>
        <View style={styles.emptyIconInner}>
          <Trophy size={40} color={Colors.gold} />
        </View>
      </View>
      <Text style={styles.emptyTitle}>Welcome to PlayDay</Text>
      <Text style={styles.emptySubtitle}>
        Organise your recreational sports groups, generate balanced teams, track results and manage subs — all in one place.
      </Text>
      <Animated.View style={{ transform: [{ scale: buttonScale }], width: '100%' }}>
        <Pressable
          style={styles.emptyCreateButton}
          onPress={handleCreateGroup}
          onPressIn={onButtonPressIn}
          onPressOut={onButtonPressOut}
          testID="create-first-group"
        >
          <Plus size={20} color="#fff" />
          <Text style={styles.emptyCreateText}>Create Your First Group</Text>
        </Pressable>
      </Animated.View>
      <View style={styles.featureRow}>
        <View style={styles.featureItem}>
          <Users size={16} color={Colors.textSecondary} />
          <Text style={styles.featureText}>Team Generator</Text>
        </View>
        <View style={styles.featureItem}>
          <Trophy size={16} color={Colors.textSecondary} />
          <Text style={styles.featureText}>Match Tracker</Text>
        </View>
        <View style={styles.featureItem}>
          <Calendar size={16} color={Colors.textSecondary} />
          <Text style={styles.featureText}>Subs Manager</Text>
        </View>
      </View>
    </Animated.View>
  );

  const renderHeader = () => (
    <Animated.View
      style={[
        styles.listHeader,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <Text style={styles.sectionLabel}>YOUR GROUPS</Text>
      <Text style={styles.sectionHint}>Tap a group to open it</Text>
    </Animated.View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]} testID="home-screen">
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <View style={styles.logoMark}>
            <Text style={styles.logoIcon}>▶</Text>
          </View>
          <View>
            <Text style={styles.brandName}>PlayDay</Text>
            <Text style={styles.brandTagline}>Sports Group Manager</Text>
          </View>
        </View>
      </View>

      {groups.length === 0 ? (
        renderEmpty()
      ) : (
        <>
          <FlatList
            data={groups}
            renderItem={renderGroupCard}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={renderHeader}
            showsVerticalScrollIndicator={false}
          />
          <Animated.View
            style={[
              styles.fabContainer,
              { transform: [{ scale: buttonScale }], bottom: 24 + insets.bottom },
            ]}
          >
            <Pressable
              style={styles.fab}
              onPress={handleCreateGroup}
              onPressIn={onButtonPressIn}
              onPressOut={onButtonPressOut}
              testID="create-new-group"
            >
              <Plus size={22} color="#fff" />
              <Text style={styles.fabText}>New Group</Text>
            </Pressable>
          </Animated.View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoMark: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: Colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  logoIcon: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '900' as const,
  },
  brandName: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: Colors.text,
    letterSpacing: -0.5,
  },
  brandTagline: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: -1,
  },
  listContent: {
    padding: 20,
    paddingBottom: 120,
  },
  listHeader: {
    marginBottom: 14,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  sectionHint: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  groupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  groupCardPressed: {
    backgroundColor: '#f5f5f7',
    transform: [{ scale: 0.985 }],
  },
  sportIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sportEmoji: {
    fontSize: 26,
  },
  groupCardContent: {
    flex: 1,
  },
  groupCardName: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  groupCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  groupCardSport: {
    fontSize: 13,
    color: Colors.gold,
    fontWeight: '600' as const,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: Colors.textMuted,
  },
  groupCardDetail: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  groupCardSchedule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 5,
  },
  scheduleText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 40,
  },
  emptyIconRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: 'rgba(200, 160, 42, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyIconInner: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: 'rgba(200, 160, 42, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: Colors.text,
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  emptyCreateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.gold,
    paddingVertical: 16,
    borderRadius: 16,
    gap: 10,
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  emptyCreateText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700' as const,
  },
  featureRow: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 36,
  },
  featureItem: {
    alignItems: 'center',
    gap: 6,
  },
  featureText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  fabContainer: {
    position: 'absolute',
    right: 20,
    left: 20,
  },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.gold,
    paddingVertical: 16,
    borderRadius: 16,
    gap: 10,
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700' as const,
  },
});

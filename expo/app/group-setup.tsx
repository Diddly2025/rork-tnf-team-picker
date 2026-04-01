import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Check, Users } from 'lucide-react-native';
import { useGroup } from '@/context/GroupContext';
import { SPORT_OPTIONS, DAY_OPTIONS, SPORT_CONFIGS } from '@/constants/sports';
import { SportType } from '@/types';
import Colors from '@/constants/colors';

export default function GroupSetupScreen() {
  const router = useRouter();
  const { addGroup } = useGroup();

  const [groupName, setGroupName] = useState('');
  const [sport, setSport] = useState<SportType>('football');
  const [customSport, setCustomSport] = useState('');
  const [playersPerTeam, setPlayersPerTeam] = useState('7');
  const [playDay, setPlayDay] = useState('Tuesday');
  const [playTime, setPlayTime] = useState('19:00');
  const [costPerSession, setCostPerSession] = useState('5');

  const handleSportChange = useCallback((s: SportType) => {
    setSport(s);
    setPlayersPerTeam(String(SPORT_CONFIGS[s].defaultPlayersPerTeam));
  }, []);

  const handleCreate = useCallback(() => {
    if (!groupName.trim()) {
      Alert.alert('Group Name Required', 'Please enter a name for your group.');
      return;
    }
    if (sport === 'other' && !customSport.trim()) {
      Alert.alert('Sport Name Required', 'Please enter the name of your sport.');
      return;
    }
    const ppt = parseInt(playersPerTeam, 10);
    if (isNaN(ppt) || ppt < 1 || ppt > 20) {
      Alert.alert('Invalid Team Size', 'Players per team must be between 1 and 20.');
      return;
    }

    const cps = parseFloat(costPerSession);

    addGroup({
      name: groupName.trim(),
      sport,
      customSport: sport === 'other' ? customSport.trim() : undefined,
      playersPerTeam: ppt,
      playDay,
      playTime,
      costPerSession: isNaN(cps) || cps < 0 ? 5 : cps,
    });

    console.log('[GroupSetup] Group created:', groupName.trim(), sport);
    router.replace('/(tabs)/players' as any);
  }, [groupName, sport, customSport, playersPerTeam, playDay, playTime, costPerSession, addGroup, router]);

  return (
    <View style={styles.container} testID="group-setup-screen">
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroSection}>
            <View style={styles.iconCircle}>
              <Users size={36} color={Colors.gold} />
            </View>
            <Text style={styles.heroTitle}>Create Your Group</Text>
            <Text style={styles.heroSubtitle}>
              Set up a group for your regular sports sessions
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Group Name</Text>
            <TextInput
              style={styles.input}
              value={groupName}
              onChangeText={setGroupName}
              placeholder="e.g. Tuesday Night Football"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Sport</Text>
            <View style={styles.sportGrid}>
              {SPORT_OPTIONS.map(opt => (
                <Pressable
                  key={opt.value}
                  style={[styles.sportChip, sport === opt.value && styles.sportChipActive]}
                  onPress={() => handleSportChange(opt.value)}
                >
                  <Text style={styles.sportEmoji}>{opt.emoji}</Text>
                  <Text style={[styles.sportLabel, sport === opt.value && styles.sportLabelActive]}>
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            {sport === 'other' && (
              <TextInput
                style={[styles.input, { marginTop: 12 }]}
                value={customSport}
                onChangeText={setCustomSport}
                placeholder="Enter sport name"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="words"
              />
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Players Per Team</Text>
            <Text style={styles.hint}>
              How many players on each side?
            </Text>
            <TextInput
              style={styles.input}
              value={playersPerTeam}
              onChangeText={setPlayersPerTeam}
              keyboardType="number-pad"
              maxLength={2}
              placeholder="7"
              placeholderTextColor={Colors.textMuted}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Regular Play Day</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayScroll}>
              <View style={styles.dayRow}>
                {DAY_OPTIONS.map(day => (
                  <Pressable
                    key={day}
                    style={[styles.dayChip, playDay === day && styles.dayChipActive]}
                    onPress={() => setPlayDay(day)}
                  >
                    <Text style={[styles.dayText, playDay === day && styles.dayTextActive]}>
                      {day.slice(0, 3)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Play Time</Text>
            <TextInput
              style={styles.input}
              value={playTime}
              onChangeText={setPlayTime}
              placeholder="e.g. 19:00"
              placeholderTextColor={Colors.textMuted}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Cost Per Session (£)</Text>
            <Text style={styles.hint}>
              How much each player pays per session
            </Text>
            <TextInput
              style={styles.input}
              value={costPerSession}
              onChangeText={setCostPerSession}
              keyboardType="decimal-pad"
              placeholder="5.00"
              placeholderTextColor={Colors.textMuted}
            />
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <Pressable style={styles.createButton} onPress={handleCreate}>
        <Check size={22} color={Colors.background} />
        <Text style={styles.createButtonText}>Create Group</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingTop: 60,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(200, 160, 42, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  hint: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 8,
    marginTop: -4,
  },
  input: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  sportGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sportChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.cardBackground,
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
  },
  sportChipActive: {
    borderColor: Colors.gold,
    backgroundColor: 'rgba(200, 160, 42, 0.1)',
  },
  sportEmoji: {
    fontSize: 18,
  },
  sportLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  sportLabelActive: {
    color: Colors.gold,
  },
  dayScroll: {
    marginHorizontal: -4,
  },
  dayRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 4,
  },
  dayChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.cardBackground,
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
  },
  dayChipActive: {
    borderColor: Colors.gold,
    backgroundColor: 'rgba(200, 160, 42, 0.1)',
  },
  dayText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  dayTextActive: {
    color: Colors.gold,
  },
  createButton: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
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
    elevation: 8,
  },
  createButtonText: {
    color: Colors.background,
    fontSize: 17,
    fontWeight: '700' as const,
  },
});

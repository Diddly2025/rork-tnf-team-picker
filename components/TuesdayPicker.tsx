import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Calendar } from 'lucide-react-native';
import Colors from '@/constants/colors';

interface TuesdayPickerProps {
  selectedDate: string;
  onSelect: (date: string) => void;
  weeksBack?: number;
  playDay?: string;
}

const DAY_MAP: Record<string, number> = {
  'Sunday': 0,
  'Monday': 1,
  'Tuesday': 2,
  'Wednesday': 3,
  'Thursday': 4,
  'Friday': 5,
  'Saturday': 6,
};

function getDayNumber(dayName: string): number {
  return DAY_MAP[dayName] ?? 2;
}

function getRecentDays(weeksBack: number, targetDay: number): Date[] {
  const days: Date[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const currentDayOfWeek = today.getDay();

  let daysBack = (currentDayOfWeek - targetDay + 7) % 7;
  if (daysBack === 0) {
    daysBack = 0;
  }

  const lastTargetDay = new Date(today);
  lastTargetDay.setDate(today.getDate() - daysBack);

  for (let i = 0; i < weeksBack; i++) {
    const day = new Date(lastTargetDay);
    day.setDate(lastTargetDay.getDate() - i * 7);
    days.push(day);
  }
  return days;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getRelativeLabel(date: Date, dayName: string): string | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffMs = today.getTime() - date.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 7) return `This ${dayName}`;
  if (diffDays < 14) return `Last ${dayName}`;
  if (diffDays < 21) return '2 weeks ago';
  if (diffDays < 28) return '3 weeks ago';
  return null;
}

export default function TuesdayPicker({ selectedDate, onSelect, weeksBack = 16, playDay = 'Tuesday' }: TuesdayPickerProps) {
  const targetDayNum = getDayNumber(playDay);
  const recentDays = useMemo(() => getRecentDays(weeksBack, targetDayNum), [weeksBack, targetDayNum]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Calendar size={16} color={Colors.textSecondary} />
        <Text style={styles.headerText}>Select a {playDay}</Text>
      </View>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {recentDays.map((date) => {
          const formatted = formatDate(date);
          const isSelected = selectedDate === formatted;
          const label = getRelativeLabel(date, playDay);

          return (
            <Pressable
              key={formatted}
              style={[styles.row, isSelected && styles.rowSelected]}
              onPress={() => onSelect(formatted)}
              testID={`day-${formatted}`}
            >
              <View style={styles.rowLeft}>
                <View style={[styles.dot, isSelected && styles.dotSelected]} />
                <View>
                  <Text style={[styles.dateText, isSelected && styles.dateTextSelected]}>
                    {formatted}
                  </Text>
                  {label && (
                    <Text style={[styles.labelText, isSelected && styles.labelTextSelected]}>
                      {label}
                    </Text>
                  )}
                </View>
              </View>
              {isSelected && (
                <View style={styles.checkBadge}>
                  <Text style={styles.checkText}>✓</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  headerText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  scroll: {
    maxHeight: 400,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
    marginBottom: 8,
  },
  rowSelected: {
    borderColor: Colors.gold,
    backgroundColor: 'rgba(200, 160, 42, 0.06)',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.cardBorder,
    borderWidth: 1.5,
    borderColor: Colors.textMuted,
  },
  dotSelected: {
    backgroundColor: Colors.gold,
    borderColor: Colors.gold,
  },
  dateText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  dateTextSelected: {
    color: Colors.gold,
  },
  labelText: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  labelTextSelected: {
    color: Colors.goldDark,
  },
  checkBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: {
    fontSize: 12,
    color: Colors.background,
    fontWeight: '700' as const,
  },
});

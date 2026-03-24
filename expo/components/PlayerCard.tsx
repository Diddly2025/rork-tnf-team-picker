import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Player } from '@/types';
import { getRatingTier, getPositionColor } from '@/utils/teamGenerator';
import PlayerAvatar from './PlayerAvatar';

interface PlayerCardProps {
  player: Player;
  onPress?: () => void;
  onLongPress?: () => void;
  selected?: boolean;
  size?: 'small' | 'medium' | 'large';
  showSelection?: boolean;
}

const tierColors = {
  gold: {
    primary: '#c8a02a',
    secondary: '#e6c84a',
    bg: '#fdf6e3',
    bgDark: '#f0e4b8',
  },
  silver: {
    primary: '#6b7280',
    secondary: '#9ca3af',
    bg: '#f3f4f6',
    bgDark: '#dcdee2',
  },
  bronze: {
    primary: '#b5651d',
    secondary: '#d4874a',
    bg: '#fef3e8',
    bgDark: '#f0d9be',
  },
};

export default function PlayerCard({ 
  player, 
  onPress, 
  onLongPress,
  selected = false, 
  size = 'medium',
  showSelection = false,
}: PlayerCardProps) {
  const tier = getRatingTier(player.rating);
  const colors = tierColors[tier];
  const positionColor = getPositionColor(player.position);
  
  const dimensions = {
    small: { width: 68, height: 92, photoSize: 44, nameSize: 8, metaSize: 7, ratingSize: 9, iconSize: 22, borderW: 1, pad: 3, namePad: 2 },
    medium: { width: 105, height: 148, photoSize: 76, nameSize: 11, metaSize: 9, ratingSize: 11, iconSize: 34, borderW: 1.5, pad: 5, namePad: 4 },
    large: { width: 145, height: 200, photoSize: 110, nameSize: 13, metaSize: 11, ratingSize: 13, iconSize: 48, borderW: 2, pad: 7, namePad: 5 },
  };
  
  const d = dimensions[size];

  return (
    <Pressable 
      onPress={onPress} 
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.container,
        { width: d.width, margin: size === 'small' ? 2 : 4 },
        selected && styles.selected,
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.card, { backgroundColor: colors.bg, borderColor: colors.primary, borderWidth: d.borderW, borderRadius: size === 'small' ? 6 : 8 }]}>
        <View style={[styles.photoWrapper, { marginTop: d.pad, marginBottom: size === 'small' ? 4 : 6 }]}>
          <View style={[styles.photoContainer, { width: d.photoSize, height: d.photoSize, borderRadius: d.photoSize / 2 }]}>
            <PlayerAvatar
              name={player.name}
              photoUrl={player.photo}
              size={d.photoSize}
              borderColor={colors.bgDark}
              borderWidth={1}
            />
          </View>
          <View style={[styles.ratingBadge, { backgroundColor: colors.primary, borderRadius: size === 'small' ? 6 : 8, paddingHorizontal: size === 'small' ? 4 : 6, paddingVertical: size === 'small' ? 1 : 2, minWidth: size === 'small' ? 18 : 24 }]}>
            <Text style={[styles.ratingText, { fontSize: d.ratingSize }]}>{player.rating}</Text>
          </View>
        </View>

        <View style={[styles.infoSection, { paddingHorizontal: d.pad, paddingTop: d.namePad, paddingBottom: d.pad }]}>
          <Text 
            style={[styles.name, { fontSize: d.nameSize, color: colors.primary }]} 
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {player.name.toUpperCase()}
          </Text>
          <Text style={[styles.position, { fontSize: d.metaSize, color: positionColor }]}>
            {player.position}
          </Text>
        </View>

        {showSelection && (
          <View style={[
            styles.selectionIndicator, 
            { 
              backgroundColor: selected ? '#16a34a' : 'transparent', 
              borderColor: selected ? '#16a34a' : colors.primary,
              width: size === 'small' ? 10 : 14,
              height: size === 'small' ? 10 : 14,
              borderRadius: size === 'small' ? 5 : 7,
            }
          ]} />
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {},
  card: {
    alignItems: 'center',
    overflow: 'visible',
  },
  selected: {
    transform: [{ scale: 1.05 }],
  },
  pressed: {
    opacity: 0.9,
  },
  photoWrapper: {
    alignSelf: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  photoContainer: {
    overflow: 'hidden',
  },
  ratingBadge: {
    position: 'absolute',
    bottom: -6,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingText: {
    color: '#ffffff',
    fontWeight: '800' as const,
  },
  infoSection: {
    alignItems: 'center',
    width: '100%',
  },
  name: {
    fontWeight: '700' as const,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  position: {
    fontWeight: '600' as const,
    textAlign: 'center',
    marginTop: 1,
  },
  selectionIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
    borderWidth: 1.5,
  },
});

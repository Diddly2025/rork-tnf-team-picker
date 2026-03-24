import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';

interface PlayerAvatarProps {
  name: string;
  photoUrl?: string;
  size: number;
  borderColor?: string;
  borderWidth?: number;
}

const AVATAR_COLORS = [
  '#E57373', '#F06292', '#BA68C8', '#9575CD',
  '#7986CB', '#64B5F6', '#4FC3F7', '#4DD0E1',
  '#4DB6AC', '#81C784', '#AED581', '#DCE775',
  '#FFD54F', '#FFB74D', '#FF8A65', '#A1887F',
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.trim().substring(0, 2).toUpperCase();
}

function getColorForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default React.memo(function PlayerAvatar({
  name,
  photoUrl,
  size,
  borderColor,
  borderWidth: bw = 0,
}: PlayerAvatarProps) {
  const initials = getInitials(name);
  const bgColor = getColorForName(name);
  const fontSize = Math.max(size * 0.38, 8);

  if (photoUrl) {
    return (
      <Image
        source={{ uri: photoUrl }}
        style={[
          styles.image,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: borderColor ?? 'transparent',
            borderWidth: bw,
          },
        ]}
        contentFit="cover"
        transition={200}
        cachePolicy="memory-disk"
      />
    );
  }

  return (
    <View
      style={[
        styles.initialsContainer,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bgColor,
          borderColor: borderColor ?? 'transparent',
          borderWidth: bw,
        },
      ]}
    >
      <Text style={[styles.initialsText, { fontSize }]}>{initials}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  image: {
    backgroundColor: '#e0e0e0',
  },
  initialsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: {
    color: '#ffffff',
    fontWeight: '700' as const,
    letterSpacing: 0.5,
  },
});

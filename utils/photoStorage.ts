import { Platform } from 'react-native';
import { supabase, isSupabaseConfigured } from '@/utils/supabase';

export async function uploadPlayerPhoto(
  localUri: string,
  playerId: string
): Promise<string | undefined> {
  if (!isSupabaseConfigured()) {
    console.log('[Photo] Supabase not configured, returning local URI');
    return localUri;
  }

  if (localUri.startsWith('http://') || localUri.startsWith('https://')) {
    console.log('[Photo] Already a remote URL, skipping upload');
    return localUri;
  }

  try {
    console.log('[Photo] Uploading photo for player:', playerId);
    const fileName = `player-${playerId}-${Date.now()}.jpg`;
    const filePath = `players/${fileName}`;

    if (Platform.OS === 'web') {
      const response = await fetch(localUri);
      const blob = await response.blob();
      const { error } = await supabase.storage
        .from('player-photos')
        .upload(filePath, blob, { contentType: 'image/jpeg', upsert: true });
      if (error) throw error;
    } else {
      const response = await fetch(localUri);
      const blob = await response.blob();
      const arrayBuffer = await new Response(blob).arrayBuffer();
      const { error } = await supabase.storage
        .from('player-photos')
        .upload(filePath, arrayBuffer, { contentType: 'image/jpeg', upsert: true });
      if (error) throw error;
    }

    const { data: urlData } = supabase.storage
      .from('player-photos')
      .getPublicUrl(filePath);

    console.log('[Photo] Upload successful:', urlData.publicUrl);
    return urlData.publicUrl;
  } catch (err) {
    console.error('[Photo] Upload failed, using local URI:', err);
    return localUri;
  }
}

export async function migrateLocalPhotosToCloud(
  players: { id: string; photo?: string }[]
): Promise<Map<string, string>> {
  const updatedPhotos = new Map<string, string>();

  if (!isSupabaseConfigured()) {
    console.log('[Photo] Supabase not configured, skipping migration');
    return updatedPhotos;
  }

  for (const player of players) {
    if (!player.photo) continue;
    if (player.photo.startsWith('http://') || player.photo.startsWith('https://')) continue;

    try {
      console.log('[Photo] Migrating photo for player:', player.id);
      const remoteUrl = await uploadPlayerPhoto(player.photo, player.id);
      if (remoteUrl && remoteUrl !== player.photo) {
        updatedPhotos.set(player.id, remoteUrl);
      }
    } catch (err) {
      console.error('[Photo] Migration failed for player:', player.id, err);
    }
  }

  console.log('[Photo] Migration complete. Updated:', updatedPhotos.size, 'photos');
  return updatedPhotos;
}

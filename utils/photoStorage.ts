import { Platform } from 'react-native';
import { supabase, isSupabaseConfigured } from './supabase';

const BUCKET = 'player-photos';

function isRemoteUrl(uri: string): boolean {
  return uri.startsWith('http://') || uri.startsWith('https://');
}

export async function uploadPlayerPhoto(
  localUri: string,
  playerId: string
): Promise<string | undefined> {
  if (!isSupabaseConfigured()) {
    console.log('[PhotoStorage] Supabase not configured, keeping local URI');
    return localUri;
  }

  if (isRemoteUrl(localUri)) {
    console.log('[PhotoStorage] Already a remote URL, skipping upload');
    return localUri;
  }

  try {
    console.log('[PhotoStorage] Uploading photo for player:', playerId);

    const fileName = `${playerId}-${Date.now()}.jpg`;
    const filePath = `photos/${fileName}`;

    let fileBody: Blob | ArrayBuffer;

    if (Platform.OS === 'web') {
      const response = await fetch(localUri);
      fileBody = await response.blob();
    } else {
      const response = await fetch(localUri);
      fileBody = await response.arrayBuffer();
    }

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, fileBody, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (uploadError) {
      console.log('[PhotoStorage] Upload error:', uploadError.message);
      return localUri;
    }

    const { data: urlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(filePath);

    console.log('[PhotoStorage] Upload success:', urlData.publicUrl);
    return urlData.publicUrl;
  } catch (e) {
    console.log('[PhotoStorage] Upload failed:', e);
    return localUri;
  }
}

export async function migrateLocalPhotosToCloud(
  players: { id: string; photo?: string }[]
): Promise<Map<string, string>> {
  const updatedPhotos = new Map<string, string>();

  if (!isSupabaseConfigured()) return updatedPhotos;

  const playersWithLocalPhotos = players.filter(
    (p) => p.photo && !isRemoteUrl(p.photo)
  );

  if (playersWithLocalPhotos.length === 0) {
    console.log('[PhotoStorage] No local photos to migrate');
    return updatedPhotos;
  }

  console.log('[PhotoStorage] Migrating', playersWithLocalPhotos.length, 'local photos...');

  for (const player of playersWithLocalPhotos) {
    if (!player.photo) continue;
    try {
      const remoteUrl = await uploadPlayerPhoto(player.photo, player.id);
      if (remoteUrl && isRemoteUrl(remoteUrl)) {
        updatedPhotos.set(player.id, remoteUrl);
        console.log('[PhotoStorage] Migrated photo for:', player.id);
      }
    } catch (e) {
      console.log('[PhotoStorage] Failed to migrate photo for:', player.id, e);
    }
  }

  console.log('[PhotoStorage] Migration complete:', updatedPhotos.size, 'photos uploaded');
  return updatedPhotos;
}

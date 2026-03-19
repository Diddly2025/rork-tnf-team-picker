import { supabase, isSupabaseConfigured } from './supabase';
import { Platform } from 'react-native';

const BUCKET_NAME = 'player-photos';

export function isLocalUri(uri: string): boolean {
  if (!uri) return false;
  return (
    uri.startsWith('file://') ||
    uri.startsWith('content://') ||
    uri.startsWith('ph://') ||
    uri.startsWith('assets-library://') ||
    (uri.startsWith('blob:') && Platform.OS === 'web') ||
    (uri.startsWith('/') && !uri.startsWith('http'))
  );
}

export function isSupabaseUrl(uri: string): boolean {
  if (!uri) return false;
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
  return uri.includes(supabaseUrl) || uri.includes('supabase.co/storage');
}

async function uriToBlob(uri: string): Promise<Blob> {
  const response = await fetch(uri);
  const blob = await response.blob();
  return blob;
}

export async function uploadPlayerPhoto(
  playerId: string,
  localUri: string,
): Promise<string | null> {
  if (!isSupabaseConfigured()) {
    console.log('[PhotoUpload] Supabase not configured, skipping upload');
    return null;
  }

  if (!isLocalUri(localUri)) {
    console.log('[PhotoUpload] URI is already remote, skipping upload:', localUri.substring(0, 50));
    return localUri;
  }

  try {
    console.log('[PhotoUpload] Starting upload for player:', playerId);

    const timestamp = Date.now();
    const filePath = `${playerId}/${timestamp}.jpg`;

    const blob = await uriToBlob(localUri);
    console.log('[PhotoUpload] Blob created, size:', blob.size);

    const { error: removeError } = await supabase.storage
      .from(BUCKET_NAME)
      .list(playerId);

    if (!removeError) {
      const { data: existingFiles } = await supabase.storage
        .from(BUCKET_NAME)
        .list(playerId);

      if (existingFiles && existingFiles.length > 0) {
        const filesToRemove = existingFiles.map(f => `${playerId}/${f.name}`);
        await supabase.storage.from(BUCKET_NAME).remove(filesToRemove);
        console.log('[PhotoUpload] Cleaned up old photos:', filesToRemove.length);
      }
    }

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, blob, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (uploadError) {
      console.log('[PhotoUpload] Upload error:', uploadError.message);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    if (!urlData?.publicUrl) {
      console.log('[PhotoUpload] Failed to get public URL');
      return null;
    }

    console.log('[PhotoUpload] Upload successful:', urlData.publicUrl);
    return urlData.publicUrl;
  } catch (e) {
    console.log('[PhotoUpload] Upload failed:', e);
    return null;
  }
}

export async function migratePlayerPhotos(
  players: Array<{ id: string; photo?: string }>,
  onPlayerUpdated: (playerId: string, newPhotoUrl: string) => void,
): Promise<number> {
  if (!isSupabaseConfigured()) return 0;

  const playersWithLocalPhotos = players.filter(
    p => p.photo && isLocalUri(p.photo),
  );

  if (playersWithLocalPhotos.length === 0) {
    console.log('[PhotoMigration] No local photos to migrate');
    return 0;
  }

  console.log('[PhotoMigration] Migrating', playersWithLocalPhotos.length, 'player photos');
  let successCount = 0;

  for (const player of playersWithLocalPhotos) {
    if (!player.photo) continue;
    try {
      const cloudUrl = await uploadPlayerPhoto(player.id, player.photo);
      if (cloudUrl) {
        onPlayerUpdated(player.id, cloudUrl);
        successCount++;
        console.log('[PhotoMigration] Migrated photo for:', player.id);
      }
    } catch (e) {
      console.log('[PhotoMigration] Failed to migrate photo for:', player.id, e);
    }
  }

  console.log('[PhotoMigration] Migration complete:', successCount, '/', playersWithLocalPhotos.length);
  return successCount;
}

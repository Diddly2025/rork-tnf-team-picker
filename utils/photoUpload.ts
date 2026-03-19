import { Platform } from 'react-native';
import { supabase, isSupabaseConfigured } from './supabase';

const BUCKET_NAME = 'player-photos';

export async function uploadPlayerPhoto(
  localUri: string,
  playerId: string
): Promise<string | null> {
  if (!isSupabaseConfigured()) {
    console.log('[PhotoUpload] Supabase not configured, skipping upload');
    return null;
  }

  try {
    const fileExt = localUri.split('.').pop()?.toLowerCase() ?? 'jpg';
    const fileName = `${playerId}_${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    console.log('[PhotoUpload] Starting upload for:', filePath);

    let uploadData: Blob | ArrayBuffer;

    if (Platform.OS === 'web') {
      const response = await fetch(localUri);
      uploadData = await response.blob();
    } else {
      const response = await fetch(localUri);
      uploadData = await response.arrayBuffer();
    }

    const contentType = fileExt === 'png' ? 'image/png' : 'image/jpeg';

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, uploadData, {
        contentType,
        upsert: true,
      });

    if (error) {
      console.log('[PhotoUpload] Upload error:', error.message);
      return null;
    }

    console.log('[PhotoUpload] Upload success:', data.path);

    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(data.path);

    console.log('[PhotoUpload] Public URL:', urlData.publicUrl);
    return urlData.publicUrl;
  } catch (e) {
    console.log('[PhotoUpload] Upload failed:', e);
    return null;
  }
}

export async function deletePlayerPhoto(photoUrl: string): Promise<void> {
  if (!isSupabaseConfigured()) return;

  try {
    const urlParts = photoUrl.split(`/${BUCKET_NAME}/`);
    if (urlParts.length < 2) return;

    const filePath = urlParts[1];
    console.log('[PhotoUpload] Deleting:', filePath);

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath]);

    if (error) {
      console.log('[PhotoUpload] Delete error:', error.message);
    }
  } catch (e) {
    console.log('[PhotoUpload] Delete failed:', e);
  }
}

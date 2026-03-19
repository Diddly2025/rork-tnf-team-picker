const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const BUCKET_NAME = 'player-photos';

export function getPlayerPhotoUrl(playerName: string): string {
  const encoded = encodeURIComponent(playerName.trim());
  return `${supabaseUrl}/storage/v1/object/public/${BUCKET_NAME}/${encoded}.jpeg`;
}

export function getEffectivePhoto(playerName: string, localPhoto?: string): string {
  if (localPhoto && localPhoto.length > 0) {
    return localPhoto;
  }
  return getPlayerPhotoUrl(playerName);
}

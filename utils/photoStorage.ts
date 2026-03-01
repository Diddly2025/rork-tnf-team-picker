export async function uploadPlayerPhoto(
  localUri: string,
  _playerId: string
): Promise<string | undefined> {
  console.log('[Photo] Using local photo storage');
  return localUri;
}

export async function uploadPlayerPhoto(
  localUri: string,
  _playerId: string
): Promise<string | undefined> {
  return localUri;
}

export async function migrateLocalPhotosToCloud(
  _players: { id: string; photo?: string }[]
): Promise<Map<string, string>> {
  return new Map();
}

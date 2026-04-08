export function redirectSystemPath({
  path,
  initial,
}: { path: string; initial: boolean }) {
  console.log('[NativeIntent] Redirect:', path, 'initial:', initial);
  if (initial) {
    return '/';
  }
  return path;
}

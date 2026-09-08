/** Returns a normalized app deep link only when it has a valid bcs:// authority. */
export function normalizeBcsDeepLink(destination: string): string | undefined {
  try {
    const parsed = new URL(destination);
    return parsed.protocol === 'bcs:' && parsed.hostname ? parsed.href : undefined;
  } catch {
    return undefined;
  }
}

export function isBcsDeepLink(destination: string): boolean {
  return normalizeBcsDeepLink(destination) !== undefined;
}

/** Opens an existing content-owned deep link from a direct user gesture. */
export function openDeepLink(destination: string): boolean {
  const normalizedDestination = normalizeBcsDeepLink(destination);
  if (!normalizedDestination) return false;

  try {
    window.location.assign(normalizedDestination);
    return true;
  } catch {
    // The Course Error modal remains visible when the host cannot handle the scheme.
    return false;
  }
}

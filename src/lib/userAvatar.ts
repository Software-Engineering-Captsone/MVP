/** Deterministic SVG avatar (no external services). */
export function userAvatarDataUrl(name: string): string {
  const initial = (name?.trim()?.[0] || '?').toUpperCase();
  const bg = '#2A90B0';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect fill="${bg}" width="64" height="64" rx="12"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="white" font-family="system-ui,sans-serif" font-size="28" font-weight="700">${initial}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

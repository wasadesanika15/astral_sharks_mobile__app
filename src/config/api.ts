/**
 * HTTP/Socket.IO base URL (no trailing slash). Use http:// or https:// only — never ws://.
 * The Socket.IO client upgrades to WebSocket automatically.
 *
 * - Same machine (Expo Web): http://localhost:3000
 * - Phone on LAN: http://YOUR_LAN_IP:3000
 */
const raw = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

export const API_BASE_URL = raw.replace(/\/$/, '');

/** Must match server `path` (default /socket.io). */
function normalizeSocketPath(): string {
  const fromEnv = process.env.EXPO_PUBLIC_SOCKET_PATH?.trim();
  if (!fromEnv) return '/socket.io';
  const withSlash = fromEnv.startsWith('/') ? fromEnv : `/${fromEnv}`;
  return withSlash.replace(/\/+$/, '') || '/socket.io';
}

export const SOCKET_IO_PATH = normalizeSocketPath();

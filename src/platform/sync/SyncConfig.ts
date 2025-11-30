/**
 * Sync Configuration
 * Determines if this Electron instance runs as Master or Client
 */

export interface SyncConfig {
  mode: 'master' | 'client';
  serverUrl?: string; // For client mode: ws://192.168.1.100:3001
  deviceName?: string; // For client mode: "Tablet 1 - Ron"
}

/**
 * Get sync configuration from environment or config file
 */
export function getSyncConfig(): SyncConfig {
  // Check environment variable first
  const mode = process.env.AETHER_SYNC_MODE as 'master' | 'client' | undefined;
  const serverUrl = process.env.AETHER_SYNC_SERVER_URL;
  const deviceName = process.env.AETHER_DEVICE_NAME;

  // Default: master mode
  return {
    mode: mode || 'master',
    serverUrl: serverUrl || 'ws://localhost:3001',
    deviceName: deviceName || 'Unknown Device'
  };
}

/**
 * Check if running as sync master
 */
export function isMasterMode(): boolean {
  return getSyncConfig().mode === 'master';
}

/**
 * Check if running as sync client
 */
export function isClientMode(): boolean {
  return getSyncConfig().mode === 'client';
}

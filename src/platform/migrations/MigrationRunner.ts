/**
 * Migration System for Aether 4TSS
 * Provides versioned schema migrations with rollback capability
 */

import { PlatformStorage } from '../../storage/core/PlatformStorage';
import { EventBus } from '../../events/core/EventBus';

export interface Migration {
  id: string;
  version: number;
  name: string;
  description: string;
  dependencies?: string[]; // Migration IDs this depends on
  up: (storage: PlatformStorage, eventBus: EventBus) => Promise<void>;
  down: (storage: PlatformStorage, eventBus: EventBus) => Promise<void>;
  validate?: (storage: PlatformStorage) => Promise<boolean>;
}

export interface MigrationRecord {
  id: string;
  version: number;
  name: string;
  appliedAt: number;
  checksum: string;
  success: boolean;
  rollbackAvailable: boolean;
}

export interface MigrationState {
  currentVersion: number;
  appliedMigrations: MigrationRecord[];
  pendingMigrations: string[];
  lastBackupAt?: number;
}

export interface MigrationOptions {
  dryRun?: boolean;
  skipBackup?: boolean;
  skipValidation?: boolean;
  rollbackOnFailure?: boolean;
}

export class MigrationError extends Error {
  constructor(
    message: string,
    public migrationId: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'MigrationError';
  }
}

export class MigrationRunner {
  private storage: PlatformStorage;
  private eventBus: EventBus;
  private migrations: Map<string, Migration> = new Map();
  private readonly stateKey = 'system:migration:state';
  private readonly backupPrefix = 'system:migration:backup:';

  constructor(storage: PlatformStorage, eventBus: EventBus) {
    this.storage = storage;
    this.eventBus = eventBus;
  }

  /**
   * Register a migration
   */
  registerMigration(migration: Migration): void {
    if (this.migrations.has(migration.id)) {
      throw new Error(`Migration ${migration.id} already registered`);
    }
    this.migrations.set(migration.id, migration);
  }

  /**
   * Get current migration state
   */
  async getState(): Promise<MigrationState> {
    try {
      const state = await this.storage.load(this.stateKey, 'cold');
      return state || {
        currentVersion: 0,
        appliedMigrations: [],
        pendingMigrations: []
      };
    } catch {
      return {
        currentVersion: 0,
        appliedMigrations: [],
        pendingMigrations: []
      };
    }
  }

  /**
   * Save migration state
   */
  private async saveState(state: MigrationState): Promise<void> {
    await this.storage.save(this.stateKey, state, 'cold');
  }

  /**
   * Calculate checksum for migration validation
   */
  private calculateChecksum(migration: Migration): string {
    const content = `${migration.id}:${migration.version}:${migration.name}:${migration.up.toString()}:${migration.down.toString()}`;
    // Simple hash - in production, use crypto.createHash
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Validate migration dependencies
   */
  private validateDependencies(migration: Migration, appliedMigrations: MigrationRecord[]): boolean {
    if (!migration.dependencies) return true;
    
    const appliedIds = new Set(appliedMigrations.map(m => m.id));
    return migration.dependencies.every(depId => appliedIds.has(depId));
  }

  /**
   * Create backup before migration
   */
  private async createBackup(migrationId: string): Promise<string> {
    const backupId = `${migrationId}_${Date.now()}`;
    const backupKey = `${this.backupPrefix}${backupId}`;
    
    console.log(`📦 Creating backup for migration ${migrationId}...`);
    
    // Get all keys from all tiers
    const hotKeys = await this.storage.listKeys('hot');
    const coldKeys = await this.storage.listKeys('cold');
    const archiveKeys = await this.storage.listKeys('archive');
    
    const backup = {
      id: backupId,
      migrationId,
      createdAt: Date.now(),
      tiers: {
        hot: {} as Record<string, any>,
        cold: {} as Record<string, any>,
        archive: {} as Record<string, any>
      }
    };

    // Backup hot tier
    for (const key of hotKeys) {
      try {
        backup.tiers.hot[key] = await this.storage.load(key, 'hot');
      } catch (error) {
        console.warn(`Failed to backup hot key ${key}:`, error);
      }
    }

    // Backup cold tier  
    for (const key of coldKeys) {
      try {
        backup.tiers.cold[key] = await this.storage.load(key, 'cold');
      } catch (error) {
        console.warn(`Failed to backup cold key ${key}:`, error);
      }
    }

    // Backup archive tier
    for (const key of archiveKeys) {
      try {
        backup.tiers.archive[key] = await this.storage.load(key, 'archive');
      } catch (error) {
        console.warn(`Failed to backup archive key ${key}:`, error);
      }
    }

    await this.storage.save(backupKey, backup, 'archive');
    console.log(`✅ Backup created: ${backupId}`);
    
    return backupId;
  }

  /**
   * Apply a single migration
   */
  async applyMigration(migrationId: string, options: MigrationOptions = {}): Promise<void> {
    const migration = this.migrations.get(migrationId);
    if (!migration) {
      throw new MigrationError(`Migration ${migrationId} not found`, migrationId);
    }

    const state = await this.getState();
    
    // Check if already applied
    const existing = state.appliedMigrations.find(m => m.id === migrationId);
    if (existing && existing.success) {
      console.log(`⚠️ Migration ${migrationId} already applied`);
      return;
    }

    // Validate dependencies
    if (!this.validateDependencies(migration, state.appliedMigrations)) {
      throw new MigrationError(`Migration ${migrationId} has unmet dependencies`, migrationId);
    }

    // Create backup unless skipped
    let backupId: string | undefined;
    if (!options.skipBackup) {
      backupId = await this.createBackup(migrationId);
    }

    const record: MigrationRecord = {
      id: migration.id,
      version: migration.version,
      name: migration.name,
      appliedAt: Date.now(),
      checksum: this.calculateChecksum(migration),
      success: false,
      rollbackAvailable: !!backupId
    };

    try {
      console.log(`🔄 Applying migration: ${migration.name} (${migrationId})`);
      
      if (!options.dryRun) {
        await migration.up(this.storage, this.eventBus);
        
        // Validate if validation function provided
        if (!options.skipValidation && migration.validate) {
          const isValid = await migration.validate(this.storage);
          if (!isValid) {
            throw new Error('Migration validation failed');
          }
        }
      } else {
        console.log(`🏃‍♀️ Dry run: would apply migration ${migration.name}`);
      }

      record.success = true;
      
      // Update state
      const updatedApplied = state.appliedMigrations.filter(m => m.id !== migrationId);
      updatedApplied.push(record);
      
      const newState: MigrationState = {
        ...state,
        currentVersion: Math.max(state.currentVersion, migration.version),
        appliedMigrations: updatedApplied,
        lastBackupAt: backupId ? Date.now() : state.lastBackupAt
      };

      if (!options.dryRun) {
        await this.saveState(newState);
      }

      console.log(`✅ Migration applied successfully: ${migration.name}`);

      // Emit event
      await this.eventBus.emit('migration.applied', {
        migrationId: migration.id,
        version: migration.version,
        name: migration.name,
        appliedAt: record.appliedAt,
        dryRun: !!options.dryRun
      });

    } catch (error) {
      record.success = false;
      console.error(`❌ Migration failed: ${migration.name}`, error);

      // Attempt rollback if requested and backup available
      if (options.rollbackOnFailure && backupId && !options.dryRun) {
        console.log(`🔄 Attempting rollback for ${migrationId}...`);
        try {
          await this.rollback(backupId);
          console.log(`✅ Rollback completed for ${migrationId}`);
        } catch (rollbackError) {
          console.error(`❌ Rollback failed for ${migrationId}:`, rollbackError);
        }
      }

      throw new MigrationError(
        `Migration ${migrationId} failed: ${error instanceof Error ? error.message : String(error)}`,
        migrationId,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Apply all pending migrations
   */
  async migrate(options: MigrationOptions = {}): Promise<void> {
    const state = await this.getState();
    const appliedIds = new Set(state.appliedMigrations.filter(m => m.success).map(m => m.id));
    
    // Find pending migrations
    const pendingMigrations = Array.from(this.migrations.values())
      .filter(m => !appliedIds.has(m.id))
      .sort((a, b) => a.version - b.version);

    if (pendingMigrations.length === 0) {
      console.log('✅ No pending migrations');
      return;
    }

    console.log(`🔄 Found ${pendingMigrations.length} pending migrations`);
    
    for (const migration of pendingMigrations) {
      await this.applyMigration(migration.id, options);
    }

    console.log('✅ All migrations completed successfully');
  }

  /**
   * Rollback to a previous backup
   */
  async rollback(backupId: string): Promise<void> {
    const backupKey = `${this.backupPrefix}${backupId}`;
    const backup = await this.storage.load(backupKey, 'archive');
    
    if (!backup) {
      throw new Error(`Backup ${backupId} not found`);
    }

    console.log(`🔄 Rolling back to backup ${backupId}...`);

    // Clear all tiers
    await this.storage.clearTier('hot');
    await this.storage.clearTier('cold');
    // Don't clear archive tier to preserve backups

    // Restore from backup
    for (const [key, value] of Object.entries(backup.tiers.hot)) {
      await this.storage.save(key, value, 'hot');
    }
    
    for (const [key, value] of Object.entries(backup.tiers.cold)) {
      await this.storage.save(key, value, 'cold');
    }

    for (const [key, value] of Object.entries(backup.tiers.archive)) {
      if (!key.startsWith('system:migration:backup:')) { // Don't overwrite other backups
        await this.storage.save(key, value, 'archive');
      }
    }

    console.log(`✅ Rollback completed to backup ${backupId}`);

    // Emit event
    await this.eventBus.emit('migration.rollback', {
      backupId,
      rolledBackAt: Date.now()
    });
  }

  /**
   * List available backups
   */
  async listBackups(): Promise<Array<{ id: string; migrationId: string; createdAt: number }>> {
    const keys = await this.storage.listKeys('archive');
    const backupKeys = keys.filter((key: string) => key.startsWith(this.backupPrefix));
    
    const backups = [];
    for (const key of backupKeys) {
      try {
        const backup = await this.storage.load(key, 'archive');
        if (backup) {
          backups.push({
            id: backup.id,
            migrationId: backup.migrationId,
            createdAt: backup.createdAt
          });
        }
      } catch (error) {
        console.warn(`Failed to load backup metadata for ${key}:`, error);
      }
    }
    
    return backups.sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Get registered migrations
   */
  getRegisteredMigrations(): Migration[] {
    return Array.from(this.migrations.values()).sort((a, b) => a.version - b.version);
  }
}

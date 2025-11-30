/**
 * Migration Registry for Aether 4TSS
 * Central registry for all system migrations
 */

import { Migration, MigrationRunner } from './MigrationRunner';
import { PlatformStorage } from '../../storage/core/PlatformStorage';
import { EventBus } from '../../events/core/EventBus';

// Import individual migrations
import { migration001_InitialSchema } from './migrations/001_InitialSchema';
import { migration002_AddProductCategories } from './migrations/002_AddProductCategories';
import { migration003_AddEmployeeRoles } from './migrations/003_AddEmployeeRoles';

export class MigrationRegistry {
  private runner: MigrationRunner;

  constructor(storage: PlatformStorage, eventBus: EventBus) {
    this.runner = new MigrationRunner(storage, eventBus);
    this.registerAllMigrations();
  }

  /**
   * Register all available migrations
   */
  private registerAllMigrations(): void {
    // Core schema migrations
    this.runner.registerMigration(migration001_InitialSchema);
    this.runner.registerMigration(migration002_AddProductCategories);
    this.runner.registerMigration(migration003_AddEmployeeRoles);
  }

  /**
   * Get the migration runner instance
   */
  getRunner(): MigrationRunner {
    return this.runner;
  }

  /**
   * Initialize and run any pending migrations
   */
  async initialize(): Promise<void> {
    console.log('🔄 Initializing migration system...');
    
    const state = await this.runner.getState();
    console.log(`📊 Current migration state:`, {
      currentVersion: state.currentVersion,
      appliedMigrations: state.appliedMigrations.length,
      lastBackup: state.lastBackupAt ? new Date(state.lastBackupAt).toISOString() : 'none'
    });

    // Auto-run migrations in development/test
    if (process.env.NODE_ENV !== 'production') {
      await this.runner.migrate({
        rollbackOnFailure: true,
        skipValidation: false
      });
    } else {
      // In production, just check for pending migrations
      const registered = this.runner.getRegisteredMigrations();
      const appliedIds = new Set(state.appliedMigrations.filter(m => m.success).map(m => m.id));
      const pending = registered.filter(m => !appliedIds.has(m.id));
      
      if (pending.length > 0) {
        console.warn(`⚠️ ${pending.length} pending migrations in production:`, pending.map(m => m.name));
        console.warn('Run migrations manually using MigrationRunner.migrate()');
      }
    }

    console.log('✅ Migration system initialized');
  }

  /**
   * Run migrations manually (for production use)
   */
  async runPendingMigrations(options?: { dryRun?: boolean; skipBackup?: boolean }): Promise<void> {
    await this.runner.migrate({
      rollbackOnFailure: true,
      skipValidation: false,
      ...options
    });
  }

  /**
   * Create backup manually
   */
  async createManualBackup(reason: string): Promise<string> {
    const migrationId = `manual_${Date.now()}_${reason.replace(/[^a-zA-Z0-9]/g, '_')}`;
    // Access private method - in real implementation, make this public or create a wrapper
    return (this.runner as any).createBackup(migrationId);
  }
}

// Export singleton factory
let migrationRegistry: MigrationRegistry | null = null;

export function createMigrationRegistry(storage: PlatformStorage, eventBus: EventBus): MigrationRegistry {
  if (!migrationRegistry) {
    migrationRegistry = new MigrationRegistry(storage, eventBus);
  }
  return migrationRegistry;
}

export function getMigrationRegistry(): MigrationRegistry | null {
  return migrationRegistry;
}

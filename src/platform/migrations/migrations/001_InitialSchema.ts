/**
 * Migration 001: Initial Schema Setup
 * Sets up basic schema version tracking and initial indices
 */

import { Migration } from '../MigrationRunner';
import { PlatformStorage } from '../../../storage/core/PlatformStorage';
import { EventBus } from '../../../events/core/EventBus';

export const migration001_InitialSchema: Migration = {
  id: '001_initial_schema',
  version: 1,
  name: 'Initial Schema Setup',
  description: 'Sets up schema version tracking and creates initial product/category indices',
  
  async up(storage: PlatformStorage, eventBus: EventBus): Promise<void> {
    console.log('📝 Setting up initial schema...');
    
    // Create schema version marker
    await storage.save('system:schema:version', {
      version: 1,
      createdAt: Date.now(),
      description: 'Initial schema with product and category indices'
    }, 'cold');

    // Initialize product index if it doesn't exist
    try {
      await storage.load('meta:index:products', 'cold');
    } catch {
      await storage.save('meta:index:products', {
        ids: [],
        updatedAt: Date.now(),
        version: 1
      }, 'cold');
      console.log('✅ Created product index');
    }

    // Initialize category index if it doesn't exist  
    try {
      await storage.load('meta:index:categories', 'cold');
    } catch {
      await storage.save('meta:index:categories', {
        ids: [],
        updatedAt: Date.now(),
        version: 1
      }, 'cold');
      console.log('✅ Created category index');
    }

    // Create migration tracking metadata
    await storage.save('system:migration:initialized', {
      initializedAt: Date.now(),
      version: 1
    }, 'cold');

    console.log('✅ Initial schema setup complete');
  },

  async down(storage: PlatformStorage, eventBus: EventBus): Promise<void> {
    console.log('🔄 Rolling back initial schema...');
    
    // Remove migration tracking
    await storage.remove('system:migration:initialized', 'cold');
    await storage.remove('system:schema:version', 'cold');
    
    // Note: We don't remove indices as they might contain data
    console.log('✅ Initial schema rollback complete');
  },

  async validate(storage: PlatformStorage): Promise<boolean> {
    try {
      const schemaVersion = await storage.load('system:schema:version', 'cold');
      const productIndex = await storage.load('meta:index:products', 'cold');
      const categoryIndex = await storage.load('meta:index:categories', 'cold');
      
      return !!(schemaVersion && productIndex && categoryIndex);
    } catch {
      return false;
    }
  }
};

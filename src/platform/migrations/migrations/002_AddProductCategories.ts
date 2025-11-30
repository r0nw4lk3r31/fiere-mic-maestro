/**
 * Migration 002: Add Product Categories
 * Ensures default product categories exist and are properly indexed
 */

import { Migration } from '../MigrationRunner';
import { PlatformStorage } from '../../../storage/core/PlatformStorage';
import { EventBus } from '../../../events/core/EventBus';

export const migration002_AddProductCategories: Migration = {
  id: '002_add_product_categories',
  version: 2,
  name: 'Add Default Product Categories',
  description: 'Creates default product categories and ensures they are properly indexed',
  dependencies: ['001_initial_schema'],
  
  async up(storage: PlatformStorage, eventBus: EventBus): Promise<void> {
    console.log('📝 Adding default product categories...');
    
    const defaultCategories = [
      {
        id: 'all_products',
        name: 'All Products',
        description: 'Root category for all products',
        parentId: null,
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        id: 'beverages',
        name: 'Beverages',
        description: 'All beverage products',
        parentId: 'all_products',
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        id: 'beer',
        name: 'Beer',
        description: 'Beer products',
        parentId: 'beverages',
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        id: 'wine',
        name: 'Wine',
        description: 'Wine products',
        parentId: 'beverages',
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        id: 'spirits',
        name: 'Spirits',
        description: 'Spirit products',
        parentId: 'beverages',
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    ];

    // Create categories
    for (const category of defaultCategories) {
      const key = `category:${category.id}`;
      try {
        const existing = await storage.load(key, 'cold');
        if (!existing) {
          await storage.save(key, category, 'cold');
          console.log(`✅ Created category: ${category.name}`);
        } else {
          console.log(`⚠️ Category already exists: ${category.name}`);
        }
      } catch {
        await storage.save(key, category, 'cold');
        console.log(`✅ Created category: ${category.name}`);
      }
    }

    // Update category index
    try {
      const categoryIndex = await storage.load('meta:index:categories', 'cold');
      const existingIds = new Set(categoryIndex?.ids || []);
      
      for (const category of defaultCategories) {
        existingIds.add(category.id);
      }
      
      await storage.save('meta:index:categories', {
        ids: Array.from(existingIds),
        updatedAt: Date.now(),
        version: (categoryIndex?.version || 0) + 1
      }, 'cold');
      
      console.log('✅ Updated category index');
    } catch (error) {
      console.error('Failed to update category index:', error);
      throw error;
    }

    // Update schema version
    await storage.save('system:schema:version', {
      version: 2,
      updatedAt: Date.now(),
      description: 'Added default product categories'
    }, 'cold');

    console.log('✅ Default product categories setup complete');
  },

  async down(storage: PlatformStorage, eventBus: EventBus): Promise<void> {
    console.log('🔄 Rolling back product categories...');
    
    const defaultCategoryIds = ['all_products', 'beverages', 'beer', 'wine', 'spirits'];
    
    // Remove default categories (only if they have no children/products)
    for (const categoryId of defaultCategoryIds) {
      try {
        await storage.remove(`category:${categoryId}`, 'cold');
        console.log(`✅ Removed category: ${categoryId}`);
      } catch (error) {
        console.warn(`Failed to remove category ${categoryId}:`, error);
      }
    }

    // Update category index
    try {
      const categoryIndex = await storage.load('meta:index:categories', 'cold');
      if (categoryIndex) {
        const filteredIds = categoryIndex.ids.filter((id: string) => !defaultCategoryIds.includes(id));
        await storage.save('meta:index:categories', {
          ids: filteredIds,
          updatedAt: Date.now(),
          version: categoryIndex.version + 1
        }, 'cold');
      }
    } catch (error) {
      console.warn('Failed to update category index during rollback:', error);
    }

    // Revert schema version
    await storage.save('system:schema:version', {
      version: 1,
      updatedAt: Date.now(),
      description: 'Rolled back to initial schema'
    }, 'cold');

    console.log('✅ Product categories rollback complete');
  },

  async validate(storage: PlatformStorage): Promise<boolean> {
    try {
      const requiredCategories = ['all_products', 'beverages', 'beer', 'wine', 'spirits'];
      
      for (const categoryId of requiredCategories) {
        const category = await storage.load(`category:${categoryId}`, 'cold');
        if (!category) {
          return false;
        }
      }
      
      const categoryIndex = await storage.load('meta:index:categories', 'cold');
      if (!categoryIndex || !categoryIndex.ids) {
        return false;
      }
      
      const hasAllCategories = requiredCategories.every(id => categoryIndex.ids.includes(id));
      return hasAllCategories;
    } catch {
      return false;
    }
  }
};

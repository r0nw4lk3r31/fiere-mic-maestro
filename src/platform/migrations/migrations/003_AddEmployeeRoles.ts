/**
 * Migration 003: Add Employee Roles
 * Sets up default employee roles and permissions structure
 */

import { Migration } from '../MigrationRunner';
import { PlatformStorage } from '../../../storage/core/PlatformStorage';
import { EventBus } from '../../../events/core/EventBus';

export const migration003_AddEmployeeRoles: Migration = {
  id: '003_add_employee_roles',
  version: 3,
  name: 'Add Employee Roles',
  description: 'Creates default employee roles and permissions structure',
  dependencies: ['001_initial_schema'],
  
  async up(storage: PlatformStorage, eventBus: EventBus): Promise<void> {
    console.log('📝 Adding default employee roles...');
    
    const defaultRoles = [
      {
        id: 'manager',
        name: 'Manager',
        description: 'Full access to all operations',
        permissions: [
          'products.create', 'products.update', 'products.delete',
          'employees.create', 'employees.update', 'employees.delete',
          'stock.create', 'stock.update', 'stock.view',
          'tables.create', 'tables.update', 'tables.delete',
          'reports.view', 'settings.update'
        ],
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        id: 'bartender',
        name: 'Bartender',
        description: 'Can serve customers and manage tables',
        permissions: [
          'products.view',
          'stock.view', 'stock.update',
          'tables.update',
          'orders.create', 'orders.update'
        ],
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        id: 'server',
        name: 'Server',
        description: 'Can take orders and manage tables',
        permissions: [
          'products.view',
          'tables.update',
          'orders.create', 'orders.view'
        ],
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        id: 'cashier',
        name: 'Cashier',
        description: 'Can process payments and handle basic operations',
        permissions: [
          'products.view',
          'orders.view', 'orders.update',
          'payments.process'
        ],
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    ];

    // Create roles
    for (const role of defaultRoles) {
      const key = `employee_role:${role.id}`;
      try {
        const existing = await storage.load(key, 'cold');
        if (!existing) {
          await storage.save(key, role, 'cold');
          console.log(`✅ Created role: ${role.name}`);
        } else {
          console.log(`⚠️ Role already exists: ${role.name}`);
        }
      } catch {
        await storage.save(key, role, 'cold');
        console.log(`✅ Created role: ${role.name}`);
      }
    }

    // Create role index
    const roleIndex = {
      ids: defaultRoles.map(r => r.id),
      updatedAt: Date.now(),
      version: 1
    };
    
    await storage.save('meta:index:employee_roles', roleIndex, 'cold');
    console.log('✅ Created employee role index');

    // Create permissions registry
    const allPermissions = Array.from(new Set(
      defaultRoles.flatMap(role => role.permissions)
    )).sort();
    
    const permissionsRegistry = {
      permissions: allPermissions,
      categories: {
        'products': allPermissions.filter(p => p.startsWith('products.')),
        'employees': allPermissions.filter(p => p.startsWith('employees.')),
        'stock': allPermissions.filter(p => p.startsWith('stock.')),
        'tables': allPermissions.filter(p => p.startsWith('tables.')),
        'orders': allPermissions.filter(p => p.startsWith('orders.')),
        'payments': allPermissions.filter(p => p.startsWith('payments.')),
        'reports': allPermissions.filter(p => p.startsWith('reports.')),
        'settings': allPermissions.filter(p => p.startsWith('settings.'))
      },
      updatedAt: Date.now(),
      version: 1
    };
    
    await storage.save('system:permissions:registry', permissionsRegistry, 'cold');
    console.log('✅ Created permissions registry');

    // Update schema version
    await storage.save('system:schema:version', {
      version: 3,
      updatedAt: Date.now(),
      description: 'Added employee roles and permissions'
    }, 'cold');

    console.log('✅ Employee roles setup complete');
  },

  async down(storage: PlatformStorage, eventBus: EventBus): Promise<void> {
    console.log('🔄 Rolling back employee roles...');
    
    const defaultRoleIds = ['manager', 'bartender', 'server', 'cashier'];
    
    // Remove default roles
    for (const roleId of defaultRoleIds) {
      try {
        await storage.remove(`employee_role:${roleId}`, 'cold');
        console.log(`✅ Removed role: ${roleId}`);
      } catch (error) {
        console.warn(`Failed to remove role ${roleId}:`, error);
      }
    }

    // Remove indices and registries
    try {
      await storage.remove('meta:index:employee_roles', 'cold');
      await storage.remove('system:permissions:registry', 'cold');
    } catch (error) {
      console.warn('Failed to remove role indices:', error);
    }

    // Revert schema version
    await storage.save('system:schema:version', {
      version: 2,
      updatedAt: Date.now(),
      description: 'Rolled back employee roles'
    }, 'cold');

    console.log('✅ Employee roles rollback complete');
  },

  async validate(storage: PlatformStorage): Promise<boolean> {
    try {
      const requiredRoles = ['manager', 'bartender', 'server', 'cashier'];
      
      // Check all roles exist
      for (const roleId of requiredRoles) {
        const role = await storage.load(`employee_role:${roleId}`, 'cold');
        if (!role) {
          return false;
        }
      }
      
      // Check role index exists
      const roleIndex = await storage.load('meta:index:employee_roles', 'cold');
      if (!roleIndex || !roleIndex.ids) {
        return false;
      }
      
      // Check permissions registry exists
      const permissionsRegistry = await storage.load('system:permissions:registry', 'cold');
      if (!permissionsRegistry || !permissionsRegistry.permissions) {
        return false;
      }
      
      return true;
    } catch {
      return false;
    }
  }
};

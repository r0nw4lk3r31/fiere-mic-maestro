/**
 * Validated Storage Wrapper
 * Adds JSON schema validation to PlatformStorage operations
 */

import { PlatformStorage } from '../../storage/core/PlatformStorage';
import { StorageTier } from '../../storage/adapters/StorageAdapter';
import { InputValidator, ValidationResult, getValidator } from './InputValidator';

export interface ValidationConfig {
  enforceValidation: boolean;
  validateOnRead: boolean;
  validateOnWrite: boolean;
  logValidationErrors: boolean;
  throwOnValidationError: boolean;
}

export const DEFAULT_VALIDATION_CONFIG: ValidationConfig = {
  enforceValidation: true,
  validateOnRead: false, // Usually don't validate reads (trust stored data)
  validateOnWrite: true,
  logValidationErrors: true,
  throwOnValidationError: true
};

export class ValidationError extends Error {
  constructor(
    message: string,
    public validationResult: ValidationResult,
    public operation: string,
    public key: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class ValidatedStorage {
  private storage: PlatformStorage;
  private validator: InputValidator;
  private config: ValidationConfig;
  private keySchemaMap: Map<string, string> = new Map();

  constructor(
    storage: PlatformStorage, 
    validator?: InputValidator,
    config?: Partial<ValidationConfig>
  ) {
    this.storage = storage;
    this.validator = validator || getValidator();
    this.config = { ...DEFAULT_VALIDATION_CONFIG, ...config };
    
    this.setupKeySchemaMapping();
  }

  /**
   * Setup automatic schema mapping based on key patterns
   */
  private setupKeySchemaMapping(): void {
    // Map key prefixes to schemas
    this.keySchemaMap.set('product:', 'product');
    this.keySchemaMap.set('employee:', 'employee');
    this.keySchemaMap.set('table:', 'table');
    this.keySchemaMap.set('stock_level:', 'stockLevel');
    this.keySchemaMap.set('category:', 'category');
    this.keySchemaMap.set('evt:', 'event');
    this.keySchemaMap.set('system:migration:', 'migrationRecord');
  }

  /**
   * Determine schema for a given key
   */
  private getSchemaForKey(key: string): string | null {
    for (const [prefix, schema] of this.keySchemaMap) {
      if (key.startsWith(prefix)) {
        return schema;
      }
    }
    return null;
  }

  /**
   * Validate data if validation is enabled
   */
  private validateData(data: any, key: string, operation: string): void {
    if (!this.config.enforceValidation) return;

    const schema = this.getSchemaForKey(key);
    if (!schema) {
      // No schema defined for this key - allow it to pass
      return;
    }

    const result = this.validator.validate(data, schema);
    
    if (!result.valid) {
      const errorMessage = `Validation failed for ${operation} on ${key}`;
      
      if (this.config.logValidationErrors) {
        console.error(errorMessage, result.errors);
      }
      
      if (this.config.throwOnValidationError) {
        throw new ValidationError(errorMessage, result, operation, key);
      }
    }
  }

  /**
   * Register a custom schema for a key pattern
   */
  registerKeySchema(keyPrefix: string, schemaId: string): void {
    this.keySchemaMap.set(keyPrefix, schemaId);
  }

  /**
   * Save with validation
   */
  async save(key: string, value: any, tier: StorageTier = 'cold'): Promise<void> {
    if (this.config.validateOnWrite) {
      this.validateData(value, key, 'save');
    }
    
    return this.storage.save(key, value, tier);
  }

  /**
   * Load with optional validation
   */
  async load(key: string, tier: StorageTier = 'cold'): Promise<any> {
    const data = await this.storage.load(key, tier);
    
    if (data && this.config.validateOnRead) {
      this.validateData(data, key, 'load');
    }
    
    return data;
  }

  /**
   * Update with optimistic locking and validation
   */
  async updateWithOptimisticLock<T>(
    key: string, 
    tier: StorageTier, 
    mutator: (current: any) => T
  ): Promise<T> {
    // Load current data
    const current = await this.storage.load(key, tier);
    
    // Apply mutation
    const updated = mutator(current);
    
    // Validate the updated data
    if (this.config.validateOnWrite) {
      this.validateData(updated, key, 'updateWithOptimisticLock');
    }
    
    // Use storage's optimistic update
    return this.storage.updateWithOptimisticLock(key, tier, () => updated);
  }

  /**
   * Batch save with validation
   */
  async batchSave(entries: Array<{ key: string; value: any }>, tier: StorageTier = 'cold'): Promise<void> {
    if (this.config.validateOnWrite) {
      for (const entry of entries) {
        this.validateData(entry.value, entry.key, 'batchSave');
      }
    }
    
    return this.storage.batchSave(entries, tier);
  }

  /**
   * Pass-through methods that don't need validation
   */
  async remove(key: string, tier: StorageTier = 'cold'): Promise<boolean> {
    return this.storage.remove(key, tier);
  }

  async listKeys(tier: StorageTier = 'cold', prefix?: string): Promise<string[]> {
    return this.storage.listKeys(tier, prefix);
  }

  async batchLoad(keys: string[], tier: StorageTier = 'cold'): Promise<Record<string, any>> {
    const data = await this.storage.batchLoad(keys, tier);
    
    if (this.config.validateOnRead) {
      for (const [key, value] of Object.entries(data)) {
        if (value) {
          this.validateData(value, key, 'batchLoad');
        }
      }
    }
    
    return data;
  }

  async clearTier(tier: StorageTier): Promise<void> {
    return this.storage.clearTier(tier);
  }

  /**
   * Validate existing data in storage
   */
  async validateStoredData(tier: StorageTier = 'cold', keyPrefix?: string): Promise<{
    totalChecked: number;
    validCount: number;
    invalidCount: number;
    errors: Array<{ key: string; errors: any[] }>;
  }> {
    const keys = await this.storage.listKeys(tier, keyPrefix);
    const results = {
      totalChecked: 0,
      validCount: 0,
      invalidCount: 0,
      errors: [] as Array<{ key: string; errors: any[] }>
    };

    for (const key of keys) {
      const schema = this.getSchemaForKey(key);
      if (!schema) continue; // Skip keys without schemas
      
      try {
        const data = await this.storage.load(key, tier);
        if (!data) continue;
        
        results.totalChecked++;
        const result = this.validator.validate(data, schema);
        
        if (result.valid) {
          results.validCount++;
        } else {
          results.invalidCount++;
          results.errors.push({
            key,
            errors: result.errors
          });
        }
      } catch (error) {
        results.invalidCount++;
        results.errors.push({
          key,
          errors: [{ path: '$', message: `Failed to load: ${error}`, value: null, schema: null }]
        });
      }
    }

    return results;
  }

  /**
   * Get the underlying storage instance
   */
  getStorage(): PlatformStorage {
    return this.storage;
  }

  /**
   * Get the validator instance
   */
  getValidator(): InputValidator {
    return this.validator;
  }

  /**
   * Update validation configuration
   */
  updateConfig(config: Partial<ValidationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current validation configuration
   */
  getConfig(): ValidationConfig {
    return { ...this.config };
  }
}

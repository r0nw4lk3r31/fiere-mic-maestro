/**
 * JSON Schema Validation System for Aether 4TSS
 * Provides runtime validation at storage boundaries
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';

export interface ValidationError {
  path: string;
  message: string;
  value: any;
  schema: any;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface SchemaRegistry {
  [schemaId: string]: any; // JSON Schema
}

export class InputValidator {
  private ajv: Ajv;
  private schemas: Map<string, any> = new Map();

  constructor() {
    this.ajv = new Ajv({ 
      allErrors: true, 
      removeAdditional: false,
      useDefaults: true,
      coerceTypes: false,
      strict: true
    });
    
    // Add format validators (email, date, etc.)
    addFormats(this.ajv);
    
    // Register built-in schemas
    this.registerBuiltInSchemas();
  }

  /**
   * Register a JSON schema
   */
  registerSchema(schemaId: string, schema: any): void {
    this.schemas.set(schemaId, schema);
    
    try {
      this.ajv.addSchema(schema, schemaId);
    } catch (error) {
      throw new Error(`Failed to register schema ${schemaId}: ${error}`);
    }
  }

  /**
   * Validate data against a schema
   */
  validate(data: any, schemaId: string): ValidationResult {
    const validator = this.ajv.getSchema(schemaId);
    
    if (!validator) {
      return {
        valid: false,
        errors: [{
          path: '$',
          message: `Schema ${schemaId} not found`,
          value: data,
          schema: null
        }]
      };
    }

    const valid = validator(data);
    
    if (valid) {
      return { valid: true, errors: [] };
    }

    const errors: ValidationError[] = (validator.errors || []).map(error => ({
      path: error.instancePath || '$',
      // Include AJV keyword so callers can assert on specific rules (e.g., minLength, enum, minimum)
      message: (error.keyword ? `[${error.keyword}] ` : '') + (error.message || 'Validation failed'),
      // These are available only with ajv option verbose=true; may be undefined otherwise
      value: (error as any).data,
      schema: (error as any).schema
    }));

    return { valid: false, errors };
  }

  /**
   * Validate and throw on error
   */
  validateOrThrow(data: any, schemaId: string): void {
    const result = this.validate(data, schemaId);
    
    if (!result.valid) {
      const errorMessages = result.errors.map(e => `${e.path}: ${e.message}`).join(', ');
      throw new Error(`Validation failed for ${schemaId}: ${errorMessages}`);
    }
  }

  /**
   * Get registered schema
   */
  getSchema(schemaId: string): any | null {
    return this.schemas.get(schemaId) || null;
  }

  /**
   * List all registered schemas
   */
  listSchemas(): string[] {
    return Array.from(this.schemas.keys());
  }

  /**
   * Register built-in schemas for common types
   */
  private registerBuiltInSchemas(): void {
    // Product schema
    this.registerSchema('product', {
      type: 'object',
      required: ['id', 'name', 'type', 'price', 'isActive'],
      properties: {
        id: { type: 'string', minLength: 1 },
        name: { type: 'string', minLength: 1, maxLength: 200 },
        type: { 
          type: 'string', 
          enum: ['case', 'bottle', 'draught', 'spirit', 'wine', 'other'] 
        },
        brewery: { type: 'string', maxLength: 100 },
        price: { type: 'number', minimum: 0 },
        alcoholPercentage: { type: 'number', minimum: 0, maximum: 100 },
        volumeCL: { type: 'number', minimum: 0 },
        caseSizeBottles: { type: 'integer', minimum: 1 },
        categoryIds: { 
          type: 'array', 
          items: { type: 'string' },
          minItems: 1 
        },
        colorCode: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
        description: { type: 'string', maxLength: 1000 },
        isActive: { type: 'boolean' },
        createdAt: { type: 'number', minimum: 0 },
        updatedAt: { type: 'number', minimum: 0 }
      },
      additionalProperties: false
    });

    // Employee schema
    this.registerSchema('employee', {
      type: 'object',
      required: ['id', 'firstName', 'lastName', 'status', 'isActive'],
      properties: {
        id: { type: 'string', minLength: 1 },
        firstName: { type: 'string', minLength: 1, maxLength: 50 },
        lastName: { type: 'string', minLength: 1, maxLength: 50 },
        email: { type: 'string', format: 'email' },
        phone: { type: 'string', maxLength: 20 },
        status: { 
          type: 'string', 
          enum: ['active', 'inactive', 'terminated', 'on_leave'] 
        },
        role: { type: 'string', maxLength: 50 },
        startDate: { type: 'number', minimum: 0 },
        endDate: { type: 'number', minimum: 0 },
        contractType: { 
          type: 'string', 
          enum: ['permanent', 'temporary', 'contract', 'freelance'] 
        },
        contractHours: { type: 'number', minimum: 0, maximum: 168 },
        hourlyRate: { type: 'number', minimum: 0 },
        country: { type: 'string', maxLength: 2 },
        isActive: { type: 'boolean' },
        createdAt: { type: 'number', minimum: 0 },
        updatedAt: { type: 'number', minimum: 0 }
      },
      additionalProperties: false
    });

    // Table schema
    this.registerSchema('table', {
      type: 'object',
      required: ['id', 'number', 'capacity', 'status', 'isActive'],
      properties: {
        id: { type: 'string', minLength: 1 },
        number: { type: 'string', minLength: 1, maxLength: 10 },
        capacity: { type: 'string', maxLength: 10 },
        location: { type: 'string', maxLength: 50 },
        status: { 
          type: 'string', 
          enum: ['available', 'occupied', 'reserved', 'out_of_order'] 
        },
        notes: { type: 'string', maxLength: 500 },
        isActive: { type: 'boolean' },
        createdAt: { type: 'number', minimum: 0 },
        updatedAt: { type: 'number', minimum: 0 }
      },
      additionalProperties: false
    });

    // Stock Level schema
    this.registerSchema('stockLevel', {
      type: 'object',
      required: ['id', 'productId', 'currentStock', 'stockStatus'],
      properties: {
        id: { type: 'string', minLength: 1 },
        productId: { type: 'string', minLength: 1 },
        currentStock: { type: 'number', minimum: 0 },
        minimumLevel: { type: 'number', minimum: 0 },
        maximumLevel: { type: 'number', minimum: 0 },
        reorderQuantity: { type: 'number', minimum: 0 },
        stockStatus: { 
          type: 'string', 
          enum: ['in_stock', 'low_stock', 'out_of_stock', 'overstocked'] 
        },
        primaryLocation: { 
          type: 'string', 
          enum: ['bar', 'cellar', 'kitchen', 'storage', 'fridge_white', 'fridge_red', 'fridge_draught'] 
        },
        unit: { 
          type: 'string', 
          enum: ['bottles', 'cases', 'litres', 'gallons', 'kegs', 'units'] 
        },
        createdAt: { type: 'number', minimum: 0 },
        updatedAt: { type: 'number', minimum: 0 }
      },
      additionalProperties: false
    });

    // Event schema
    this.registerSchema('event', {
      type: 'object',
      required: ['type', 'timestamp'],
      properties: {
        type: { type: 'string', minLength: 1, maxLength: 100 },
        timestamp: { type: 'number', minimum: 0 },
        entityId: { type: 'string' },
        entityType: { type: 'string', maxLength: 50 },
        staffId: { type: 'string' },
        changes: { type: 'object' },
        metadata: { type: 'object' }
      },
      additionalProperties: true // Events can have additional properties
    });

    // Migration Record schema
    this.registerSchema('migrationRecord', {
      type: 'object',
      required: ['id', 'version', 'name', 'appliedAt', 'success'],
      properties: {
        id: { type: 'string', minLength: 1 },
        version: { type: 'number', minimum: 1 },
        name: { type: 'string', minLength: 1 },
        appliedAt: { type: 'number', minimum: 0 },
        checksum: { type: 'string' },
        success: { type: 'boolean' },
        rollbackAvailable: { type: 'boolean' }
      },
      additionalProperties: false
    });

    // Category schema
    this.registerSchema('category', {
      type: 'object',
      required: ['id', 'name', 'isActive'],
      properties: {
        id: { type: 'string', minLength: 1 },
        name: { type: 'string', minLength: 1, maxLength: 100 },
        description: { type: 'string', maxLength: 500 },
        parentId: { 
          oneOf: [
            { type: 'string', minLength: 1 },
            { type: 'null' }
          ]
        },
        isActive: { type: 'boolean' },
        createdAt: { type: 'number', minimum: 0 },
        updatedAt: { type: 'number', minimum: 0 }
      },
      additionalProperties: false
    });
  }
}

// Singleton instance
let validatorInstance: InputValidator | null = null;

export function getValidator(): InputValidator {
  if (!validatorInstance) {
    validatorInstance = new InputValidator();
  }
  return validatorInstance;
}

export function createValidator(): InputValidator {
  return new InputValidator();
}

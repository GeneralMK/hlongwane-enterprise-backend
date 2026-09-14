import { BaseService, ServiceContext } from './BaseService';

// Validation schema types
export interface ValidationSchema {
  [field: string]: FieldValidation;
}

export interface FieldValidation {
  type: 'string' | 'number' | 'boolean' | 'email' | 'phone' | 'date' | 'array' | 'object';
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: any[];
  custom?: (value: any) => string | null; // Return error message or null if valid
  nested?: ValidationSchema; // For object type
  arrayOf?: FieldValidation; // For array type
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: any;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  sanitizedData?: any;
}

/**
 * Comprehensive validation service for input validation and sanitization
 */
export class ValidationService extends BaseService {
  private static instance: ValidationService;

  constructor(prisma: any) {
    super(prisma, 'ValidationService');
  }

  static getInstance(prisma: any): ValidationService {
    if (!ValidationService.instance) {
      ValidationService.instance = new ValidationService(prisma);
    }
    return ValidationService.instance;
  }

  /**
   * Validate data against a schema
   */
  async validate(
    data: any,
    schema: ValidationSchema,
    context?: ServiceContext
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const sanitizedData: any = {};

    for (const [field, validation] of Object.entries(schema)) {
      const value = data[field];
      const fieldErrors = this.validateField(field, value, validation);
      
      if (fieldErrors.length > 0) {
        errors.push(...fieldErrors);
      } else {
        // Sanitize and store valid data
        sanitizedData[field] = this.sanitizeValue(value, validation);
      }
    }

    const result: ValidationResult = {
      isValid: errors.length === 0,
      errors,
      sanitizedData: errors.length === 0 ? sanitizedData : undefined
    };

    if (errors.length > 0) {
      this.logger.warn('Validation failed', {
        errors,
        context
      });
    }

    return result;
  }

  /**
   * Validate schema and throw if validation fails
   */
  async validateSchemaAndThrow(
    data: any,
    schema: ValidationSchema,
    context?: ServiceContext
  ): Promise<any> {
    const result = await this.validate(data, schema, context);
    
    if (!result.isValid) {
      const errorMessage = result.errors.map(e => `${e.field}: ${e.message}`).join(', ');
      throw new Error(`Validation failed: ${errorMessage}`);
    }

    return result.sanitizedData;
  }

  /**
   * Create a validation schema builder for fluent API
   */
  static schema(): ValidationSchemaBuilder {
    return new ValidationSchemaBuilder();
  }

  /**
   * Common validation patterns
   */
  static commonPatterns = {
    email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    phone: /^\+?[1-9]\d{1,14}$/,
    strongPassword: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    slug: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    hexColor: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
  };

  /**
   * Common validation rules
   */
  static rules = {
    required: (message = 'This field is required'): Partial<FieldValidation> => ({
      required: true,
      custom: (value) => value == null || value === '' ? message : null
    }),

    email: (message = 'Invalid email format'): Partial<FieldValidation> => ({
      type: 'email',
      pattern: ValidationService.commonPatterns.email,
      custom: (value) => {
        if (!value) return null;
        return ValidationService.commonPatterns.email.test(value) ? null : message;
      }
    }),

    minLength: (min: number, message?: string): Partial<FieldValidation> => ({
      minLength: min,
      custom: (value) => {
        if (!value) return null;
        return value.length >= min ? null : message || `Must be at least ${min} characters`;
      }
    }),

    maxLength: (max: number, message?: string): Partial<FieldValidation> => ({
      maxLength: max,
      custom: (value) => {
        if (!value) return null;
        return value.length <= max ? null : message || `Must be no more than ${max} characters`;
      }
    }),

    range: (min: number, max: number, message?: string): Partial<FieldValidation> => ({
      min,
      max,
      custom: (value) => {
        if (value == null) return null;
        const num = Number(value);
        return num >= min && num <= max ? null : message || `Must be between ${min} and ${max}`;
      }
    }),

    oneOf: (options: any[], message?: string): Partial<FieldValidation> => ({
      enum: options,
      custom: (value) => {
        if (value == null) return null;
        return options.includes(value) ? null : message || `Must be one of: ${options.join(', ')}`;
      }
    }),

    strongPassword: (message = 'Password must contain at least 8 characters, uppercase, lowercase, number, and special character'): Partial<FieldValidation> => ({
      pattern: ValidationService.commonPatterns.strongPassword,
      custom: (value) => {
        if (!value) return null;
        return ValidationService.commonPatterns.strongPassword.test(value) ? null : message;
      }
    })
  };

  /**
   * Private validation methods
   */

  private validateField(field: string, value: any, validation: FieldValidation): ValidationError[] {
    const errors: ValidationError[] = [];

    // Check required
    if (validation.required && (value === undefined || value === null || value === '')) {
      errors.push({
        field,
        message: 'This field is required',
        code: 'REQUIRED',
        value
      });
      return errors; // Don't validate further if required field is missing
    }

    // Skip validation if value is empty and not required
    if (value === undefined || value === null || value === '') {
      return errors;
    }

    // Type validation
    const typeError = this.validateType(field, value, validation.type);
    if (typeError) {
      errors.push(typeError);
      return errors; // Don't validate further if type is wrong
    }

    // Length validation for strings
    if (validation.type === 'string' || typeof value === 'string') {
      if (validation.minLength && value.length < validation.minLength) {
        errors.push({
          field,
          message: `Must be at least ${validation.minLength} characters`,
          code: 'MIN_LENGTH',
          value
        });
      }

      if (validation.maxLength && value.length > validation.maxLength) {
        errors.push({
          field,
          message: `Must be no more than ${validation.maxLength} characters`,
          code: 'MAX_LENGTH',
          value
        });
      }
    }

    // Numeric range validation
    if (validation.type === 'number' || typeof value === 'number') {
      if (validation.min !== undefined && value < validation.min) {
        errors.push({
          field,
          message: `Must be at least ${validation.min}`,
          code: 'MIN_VALUE',
          value
        });
      }

      if (validation.max !== undefined && value > validation.max) {
        errors.push({
          field,
          message: `Must be no more than ${validation.max}`,
          code: 'MAX_VALUE',
          value
        });
      }
    }

    // Pattern validation
    if (validation.pattern && typeof value === 'string') {
      if (!validation.pattern.test(value)) {
        errors.push({
          field,
          message: 'Invalid format',
          code: 'PATTERN_MISMATCH',
          value
        });
      }
    }

    // Enum validation
    if (validation.enum && !validation.enum.includes(value)) {
      errors.push({
        field,
        message: `Must be one of: ${validation.enum.join(', ')}`,
        code: 'INVALID_ENUM',
        value
      });
    }

    // Array validation
    if (validation.type === 'array' && Array.isArray(value)) {
      if (validation.arrayOf) {
        value.forEach((item, index) => {
          const itemErrors = this.validateField(`${field}[${index}]`, item, validation.arrayOf!);
          errors.push(...itemErrors);
        });
      }
    }

    // Object validation
    if (validation.type === 'object' && validation.nested && typeof value === 'object') {
      for (const [nestedField, nestedValidation] of Object.entries(validation.nested)) {
        const nestedErrors = this.validateField(`${field}.${nestedField}`, value[nestedField], nestedValidation);
        errors.push(...nestedErrors);
      }
    }

    // Custom validation
    if (validation.custom) {
      const customError = validation.custom(value);
      if (customError) {
        errors.push({
          field,
          message: customError,
          code: 'CUSTOM_VALIDATION',
          value
        });
      }
    }

    return errors;
  }

  private validateType(field: string, value: any, type: FieldValidation['type']): ValidationError | null {
    switch (type) {
      case 'string':
        if (typeof value !== 'string') {
          return {
            field,
            message: 'Must be a string',
            code: 'INVALID_TYPE',
            value
          };
        }
        break;

      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          return {
            field,
            message: 'Must be a valid number',
            code: 'INVALID_TYPE',
            value
          };
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean') {
          return {
            field,
            message: 'Must be a boolean',
            code: 'INVALID_TYPE',
            value
          };
        }
        break;

      case 'email':
        if (typeof value !== 'string' || !ValidationService.commonPatterns.email.test(value)) {
          return {
            field,
            message: 'Must be a valid email address',
            code: 'INVALID_EMAIL',
            value
          };
        }
        break;

      case 'phone':
        if (typeof value !== 'string' || !ValidationService.commonPatterns.phone.test(value)) {
          return {
            field,
            message: 'Must be a valid phone number',
            code: 'INVALID_PHONE',
            value
          };
        }
        break;

      case 'date':
        if (!(value instanceof Date) && !this.isValidDateString(value)) {
          return {
            field,
            message: 'Must be a valid date',
            code: 'INVALID_DATE',
            value
          };
        }
        break;

      case 'array':
        if (!Array.isArray(value)) {
          return {
            field,
            message: 'Must be an array',
            code: 'INVALID_TYPE',
            value
          };
        }
        break;

      case 'object':
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
          return {
            field,
            message: 'Must be an object',
            code: 'INVALID_TYPE',
            value
          };
        }
        break;
    }

    return null;
  }

  private sanitizeValue(value: any, validation: FieldValidation): any {
    if (value === undefined || value === null) {
      return value;
    }

    switch (validation.type) {
      case 'string':
      case 'email':
        return typeof value === 'string' ? value.trim() : value;
      
      case 'phone':
        return typeof value === 'string' ? value.replace(/\s+/g, '') : value;
      
      case 'number':
        return typeof value === 'string' ? Number(value) : value;
      
      case 'boolean':
        if (typeof value === 'string') {
          return value.toLowerCase() === 'true';
        }
        return Boolean(value);
      
      case 'date':
        if (typeof value === 'string') {
          return new Date(value);
        }
        return value;
      
      case 'array':
        if (Array.isArray(value) && validation.arrayOf) {
          return value.map(item => this.sanitizeValue(item, validation.arrayOf!));
        }
        return value;
      
      case 'object':
        if (typeof value === 'object' && validation.nested) {
          const sanitized: any = {};
          for (const [field, fieldValidation] of Object.entries(validation.nested)) {
            if (value[field] !== undefined) {
              sanitized[field] = this.sanitizeValue(value[field], fieldValidation);
            }
          }
          return sanitized;
        }
        return value;
      
      default:
        return value;
    }
  }

  private isValidDateString(value: any): boolean {
    if (typeof value !== 'string') return false;
    const date = new Date(value);
    return !isNaN(date.getTime());
  }
}

/**
 * Fluent API for building validation schemas
 */
export class ValidationSchemaBuilder {
  private schema: ValidationSchema = {};

  field(name: string): FieldBuilder {
    return new FieldBuilder(this, name);
  }

  build(): ValidationSchema {
    return { ...this.schema };
  }

  setField(name: string, validation: FieldValidation): ValidationSchemaBuilder {
    this.schema[name] = validation;
    return this;
  }
}

export class FieldBuilder {
  private validation: FieldValidation = { type: 'string' };

  constructor(
    private schemaBuilder: ValidationSchemaBuilder,
    private fieldName: string
  ) {}

  type(type: FieldValidation['type']): FieldBuilder {
    this.validation.type = type;
    return this;
  }

  required(message?: string): FieldBuilder {
    this.validation.required = true;
    if (message) {
      this.validation.custom = (value) => 
        value == null || value === '' ? message : null;
    }
    return this;
  }

  minLength(min: number): FieldBuilder {
    this.validation.minLength = min;
    return this;
  }

  maxLength(max: number): FieldBuilder {
    this.validation.maxLength = max;
    return this;
  }

  min(min: number): FieldBuilder {
    this.validation.min = min;
    return this;
  }

  max(max: number): FieldBuilder {
    this.validation.max = max;
    return this;
  }

  pattern(pattern: RegExp): FieldBuilder {
    this.validation.pattern = pattern;
    return this;
  }

  oneOf(options: any[]): FieldBuilder {
    this.validation.enum = options;
    return this;
  }

  custom(validator: (value: any) => string | null): FieldBuilder {
    this.validation.custom = validator;
    return this;
  }

  arrayOf(itemValidation: FieldValidation): FieldBuilder {
    this.validation.type = 'array';
    this.validation.arrayOf = itemValidation;
    return this;
  }

  nested(nestedSchema: ValidationSchema): FieldBuilder {
    this.validation.type = 'object';
    this.validation.nested = nestedSchema;
    return this;
  }

  build(): ValidationSchemaBuilder {
    return this.schemaBuilder.setField(this.fieldName, this.validation);
  }
}
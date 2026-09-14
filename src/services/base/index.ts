export {
  BaseService,
  DefaultServiceFactory,
  ServiceErrorCode,
  NotFoundError,
  AuthorizationError,
  BusinessRuleViolationError,
  ConflictError,
  type ServiceContext,
  type ServiceResult,
  type ServiceError,
  type ServiceMetrics,
  type RetryConfig,
  type ValidationResult as BaseValidationResult,
  type ServiceFactory
} from './BaseService';

export {
  ValidationService,
  ValidationSchemaBuilder,
  FieldBuilder,
  type ValidationSchema,
  type FieldValidation,
  type ValidationError,
  type ValidationResult
} from './ValidationService';

// Import services for local use
import { ValidationService, ValidationSchemaBuilder } from './ValidationService';
import { BaseService, ServiceErrorCode } from './BaseService';
import type { ServiceResult, ServiceError } from './BaseService';
import type { ValidationResult } from './ValidationService';

// Re-export commonly used validation patterns and rules
export const ValidationPatterns = ValidationService.commonPatterns;
export const ValidationRules = ValidationService.rules;

/**
 * Convenience function to create a validation schema
 */
export function createValidationSchema(): ValidationSchemaBuilder {
  return ValidationService.schema();
}

/**
 * Common service utilities
 */
export const ServiceUtils = {

  generateOperationId(serviceName: string): string {
    return `${serviceName}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  },

  sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  async withExponentialBackoff<T>(
    operation: () => Promise<T>,
    maxAttempts: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        if (attempt === maxAttempts) {
          throw error;
        }

        const delay = baseDelay * Math.pow(2, attempt - 1);
        await ServiceUtils.sleep(delay);
      }
    }

    throw lastError!;
  },

  normalizePagination(limit?: number, offset?: number): { limit: number; offset: number } {
    return {
      limit: Math.min(limit || 20, 100),
      offset: Math.max(offset || 0, 0)
    };
  },

  createServiceError(code: ServiceErrorCode, message: string, details?: any): ServiceError {
    return {
      code,
      message,
      details
    };
  },

  formatError(error: any): string {
    if (error instanceof Error) {
      return `${error.name}: ${error.message}`;
    }
    return String(error);
  }
};

/**
 * Service decorators for common patterns
 */
export const ServiceDecorators = {
  withMetrics(operationName?: string) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
      const originalMethod = descriptor.value;
      const operation = operationName || `${target.constructor.name}.${propertyKey}`;

      descriptor.value = async function (this: BaseService, ...args: any[]) {
        return this.executeWithMetrics(operation, () => originalMethod.apply(this, args));
      };

      return descriptor;
    };
  },

  withRetry(maxAttempts: number = 3, baseDelay: number = 1000) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
      const originalMethod = descriptor.value;

      descriptor.value = async function (this: BaseService, ...args: any[]) {
        return this.withRetry(() => originalMethod.apply(this, args), { maxAttempts, baseDelay });
      };

      return descriptor;
    };
  },

  withTransaction(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

      descriptor.value = async function (this: BaseService, ...args: any[]) {
        return this.executeTransaction(async (tx: any) => {
        const originalPrisma = this.prisma;
        (this as any).prisma = tx;
        
        try {
          return await originalMethod.apply(this, args);
        } finally {
          (this as any).prisma = originalPrisma;
        }
      });
    };

    return descriptor;
  }
};

/**
 * Type guards for service results
 */
export const ServiceTypeGuards = {
  isServiceResult<T>(result: any): result is ServiceResult<T> {
    return typeof result === 'object' && 
           result !== null && 
           typeof result.success === 'boolean';
  },

  isServiceError(error: any): error is ServiceError {
    return typeof error === 'object' && 
           error !== null && 
           typeof error.code === 'string' && 
           typeof error.message === 'string';
  },

  isValidationResult(result: any): result is ValidationResult {
    return typeof result === 'object' && 
           result !== null && 
           typeof result.isValid === 'boolean' && 
           Array.isArray(result.errors);
  }
};

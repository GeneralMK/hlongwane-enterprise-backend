import { PrismaClient, Prisma } from "@prisma/client";

/** =========================
 *  Types
 *  ========================= */

export interface ServiceContext {
  requestId?: string;
  sessionId?: string;
  userAgent?: string;
  ipAddress?: string;
  timestamp?: Date;
  metadata?: Record<string, any>;
  skipEmail?: boolean;
  skipAuthorization?: boolean;
  createUserImmediately?: boolean;
}

export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: ServiceError;
  metadata?: Record<string, any>;
}

export enum ServiceErrorCode {
  // Validation errors
  VALIDATION_ERROR = "VALIDATION_ERROR",
  REQUIRED_FIELD_MISSING = "REQUIRED_FIELD_MISSING",
  INVALID_FORMAT = "INVALID_FORMAT",
  INVALID_INPUT = "INVALID_INPUT",

  // Authorization errors
  AUTHENTICATION_REQUIRED = "AUTHENTICATION_REQUIRED",
  INSUFFICIENT_PERMISSIONS = "INSUFFICIENT_PERMISSIONS",
  RESOURCE_ACCESS_DENIED = "RESOURCE_ACCESS_DENIED",
  UNAUTHORIZED = "UNAUTHORIZED",

  // Business logic errors
  BUSINESS_RULE_VIOLATION = "BUSINESS_RULE_VIOLATION",
  INVALID_STATE_TRANSITION = "INVALID_STATE_TRANSITION",
  RESOURCE_CONFLICT = "RESOURCE_CONFLICT",
  DUPLICATE_RESOURCE = "DUPLICATE_RESOURCE",

  // System errors
  RESOURCE_NOT_FOUND = "RESOURCE_NOT_FOUND",
  DATABASE_ERROR = "DATABASE_ERROR",
  EXTERNAL_SERVICE_ERROR = "EXTERNAL_SERVICE_ERROR",
  INTERNAL_ERROR = "INTERNAL_ERROR",
  TIMEOUT_ERROR = "TIMEOUT_ERROR",
  CONNECTION_ERROR = "CONNECTION_ERROR",

  // Prisma specific errors
  UNIQUE_CONSTRAINT_VIOLATION = "UNIQUE_CONSTRAINT_VIOLATION",
  FOREIGN_KEY_CONSTRAINT_VIOLATION = "FOREIGN_KEY_CONSTRAINT_VIOLATION",
  RECORD_NOT_FOUND = "RECORD_NOT_FOUND",
  INVALID_RELATION = "INVALID_RELATION",

  NOT_FOUND = "NOT_FOUND",
}

export interface ServiceError {
  code: ServiceErrorCode;
  message: string;
  details?: any;
  field?: string;
  stack?: string;
  timestamp?: Date;
  operationId?: string;
}

export interface ServiceMetrics {
  operationName: string;
  duration: number;
  success: boolean;
  error?: string;
  context?: ServiceContext;
  serviceName?: string;
  timestamp?: Date;
  operationId?: string;
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: string[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: Array<{
    field: string;
    message: string;
    code: string;
  }>;
}

/** =========================
 *  Error Classes
 *  ========================= */

export class ValidationError extends Error {
  public field?: string;
  public details?: any;
  constructor(message: string, field?: string, details?: any) {
    super(message);
    this.name = "ValidationError";
    this.field = field;
    this.details = details;
  }
}

export class NotFoundError extends Error {
  public resourceType?: string;
  public resourceId?: string;
  public details?: any;
  constructor(message: string, resourceType?: string, resourceId?: string, details?: any) {
    super(message);
    this.name = "NotFoundError";
    this.resourceType = resourceType;
    this.resourceId = resourceId;
    this.details = details;
  }
}

export class AuthorizationError extends Error {
  public action?: string;
  public resource?: string;
  public details?: any;
  constructor(message: string, action?: string, resource?: string, details?: any) {
    super(message);
    this.name = "AuthorizationError";
    this.action = action;
    this.resource = resource;
    this.details = details;
  }
}

export class BusinessRuleViolationError extends Error {
  public rule?: string;
  public details?: any;
  constructor(message: string, rule?: string, details?: any) {
    super(message);
    this.name = "BusinessRuleViolationError";
    this.rule = rule;
    this.details = details;
  }
}

export class ConflictError extends Error {
  public conflictType?: string;
  public details?: any;
  constructor(message: string, conflictType?: string, details?: any) {
    super(message);
    this.name = "ConflictError";
    this.conflictType = conflictType;
    this.details = details;
  }
}

/** =========================
 *  Logger + Safe stringify
 *  ========================= */

export interface Logger {
  debug(message: string, data?: any): void;
  info(message: string, data?: any): void;
  warn(message: string, data?: any): void;
  error(message: string, data?: any): void;
}

const safeStringify = (obj: any, space: number = 2): string => {
  const seen = new WeakSet();
  try {
    return JSON.stringify(
      obj,
      (key, value) => {
        if (typeof value === "object" && value !== null) {
          if (seen.has(value)) return "[Circular]";
          seen.add(value);
        }
        if (value instanceof Date) return value.toISOString();
        if (value === undefined) return "[undefined]";
        if (typeof value === "bigint") return value.toString();
        return value;
      },
      space
    );
  } catch (e: any) {
    return `[Error stringifying: ${e?.message || String(e)}]`;
  }
};

export class ServiceLogger implements Logger {
  constructor(private serviceName: string) {}

  debug(message: string, data?: any): void {
   
    console.log(`[DEBUG][${this.serviceName}] ${message}`, data ? safeStringify(data) : "");
  }
  info(message: string, data?: any): void {
  
    console.info(`[INFO][${this.serviceName}] ${message}`, data ? safeStringify(data) : "");
  }
  warn(message: string, data?: any): void {
  
    console.warn(`[WARN][${this.serviceName}] ${message}`, data ? safeStringify(data) : "");
  }
  error(message: string, data?: any): void {
  
    console.error(`[ERROR][${this.serviceName}] ${message}`, data ? safeStringify(data) : "");
  }
}

/** =========================
 *  BaseService
 *  ========================= */

type PrismaTransaction = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends"
>;

type CacheEntry = { data: any; expiry: number };

export abstract class BaseService {
  protected prisma: PrismaClient;
  protected serviceName: string;
  protected logger: Logger;

  private metrics: ServiceMetrics[] = [];
  private cache = new Map<string, CacheEntry>();

  constructor(prisma: PrismaClient, serviceName: string, logger?: Logger) {
    this.prisma = prisma;
    this.serviceName = serviceName;
    this.logger = logger ?? new ServiceLogger(serviceName);
  }

  /** =========================
   *  Public helpers
   *  ========================= */

  getMetrics(): ServiceMetrics[] {
    return [...this.metrics];
  }

  clearMetrics(): void {
    this.metrics = [];
  }

  /** =========================
   *  Core execution wrapper
   *  ========================= */

  protected async executeWithMetrics<T>(
    operationName: string,
    operation: () => Promise<T>,
    context?: ServiceContext
  ): Promise<ServiceResult<T>> {
    const startTime = Date.now();
    const operationId = this.generateOperationId();

    this.logger.debug(`Starting operation: ${operationName}`, { operationId, context });

    try {
      const result = await operation();
      const duration = Date.now() - startTime;

      this.recordMetrics({
        operationName,
        duration,
        success: true,
        context,
        serviceName: this.serviceName,
        timestamp: new Date(),
        operationId,
      });

      this.logger.info(`Operation completed: ${operationName}`, { operationId, duration, context });

      return {
        success: true,
        data: result,
        metadata: { operationId, duration, timestamp: new Date() },
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      const serviceResult = this.handleError(error, operationName, context, operationId);

      this.recordMetrics({
        operationName,
        duration,
        success: false,
        error: serviceResult.error?.code || "UNKNOWN_ERROR",
        context,
        serviceName: this.serviceName,
        timestamp: new Date(),
        operationId,
      });

      this.logger.error(`Operation failed: ${operationName}`, {
        operationId,
        duration,
        error: serviceResult.error,
        context,
      });

      return {
        success: false,
        error: serviceResult.error,
        metadata: { operationId, duration, timestamp: new Date() },
      };
    }
  }

  /** =========================
   *  Transactions
   *  ========================= */

  protected async executeTransaction<T>(
    operation: (tx: PrismaTransaction) => Promise<T>,
    context?: ServiceContext
  ): Promise<T> {
    const operationId = this.generateOperationId();

    this.logger.debug("Starting transaction", { operationId, context });

    try {
      const result = await this.prisma.$transaction(async (tx) => operation(tx as PrismaTransaction));
      this.logger.debug("Transaction completed", { operationId, context });
      return result;
    } catch (error: any) {
      this.logger.error("Transaction failed", {
        operationId,
        error: this.normalizeError(error),
        context,
      });
      throw error;
    }
  }

  /** =========================
   *  Retry
   *  ========================= */

  protected async withRetry<T>(
    operation: () => Promise<T>,
    config: Partial<RetryConfig> = {},
    context?: ServiceContext
  ): Promise<T> {
    const defaultConfig: RetryConfig = {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2,
      retryableErrors: ["TIMEOUT", "CONNECTION_ERROR", "TEMPORARY_FAILURE", "P1001", "P1002", "ETIMEDOUT"],
    };

    const retryConfig: RetryConfig = { ...defaultConfig, ...config };
    let lastError: any;

    for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;
        const isRetryable = this.isRetryableError(error, retryConfig.retryableErrors);

        if (!isRetryable || attempt === retryConfig.maxAttempts) {
          throw error;
        }

        const delay = Math.min(
          retryConfig.baseDelay * Math.pow(retryConfig.backoffMultiplier, attempt - 1),
          retryConfig.maxDelay
        );

        this.logger.warn(`Operation failed, retrying in ${delay}ms`, {
          attempt,
          maxAttempts: retryConfig.maxAttempts,
          delay,
          error: this.normalizeError(error),
          context,
        });

        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  /** =========================
   *  Validation
   *  ========================= */

  protected validateRequired(data: Record<string, any>, requiredFields: string[]): ValidationResult {
    const errors: ValidationResult["errors"] = [];

    for (const field of requiredFields) {
      const val = data[field];
      if (val === undefined || val === null || val === "") {
        errors.push({
          field,
          message: `${field} is required`,
          code: "FIELD_REQUIRED",
        });
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  protected validateAndThrow(data: Record<string, any>, requiredFields: string[]): void {
    const validation = this.validateRequired(data, requiredFields);
    if (!validation.isValid) {
      throw new ValidationError(
        `Validation failed: ${validation.errors.map((e) => e.message).join(", ")}`,
        validation.errors[0]?.field,
        validation.errors
      );
    }
  }

  protected validateAndThrowSingle(data: Record<string, any>, requiredField: string): void {
    this.validateAndThrow(data, [requiredField]);
  }

  protected validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  protected validatePhoneNumber(phone: string): boolean {
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
    return phoneRegex.test(phone);
  }

  protected validateUrl(url: string): boolean {
    try {
      
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  protected validateDateRange(startDate: Date, endDate: Date): boolean {
    return startDate <= endDate;
  }

  protected sanitizeString(input: string): string {
    return String(input ?? "")
      .trim()
      .replace(/\s+/g, " ");
  }

  protected validateBusinessRule(
    condition: boolean,
    message: string,
    rule?: string,
    details?: any
  ): void {
    if (!condition) {
      throw new BusinessRuleViolationError(message, rule, details);
    }
  }

  protected throwNotFound(message: string, resourceType?: string, resourceId?: string, details?: any): never {
    throw new NotFoundError(message, resourceType, resourceId, details);
  }

  protected throwUnauthorized(message: string, action?: string, resource?: string, details?: any): never {
    throw new AuthorizationError(message, action, resource, details);
  }

  protected throwConflict(message: string, conflictType?: string, details?: any): never {
    throw new ConflictError(message, conflictType, details);
  }

  protected normalizePagination(limit?: number, offset?: number): { limit: number; offset: number } {
    return {
      limit: Math.min(limit || 20, 100),
      offset: Math.max(offset || 0, 0),
    };
  }

  /** =========================
   *  Cache
   *  ========================= */

  protected async withCache<T>(key: string, operation: () => Promise<T>, ttlSeconds: number = 300): Promise<T> {
    const cached = this.cache.get(key);
    const now = Date.now();

    if (cached && cached.expiry > now) {
      this.logger.debug(`Cache hit`, { key });
      return cached.data as T;
    }

    const result = await operation();
    this.cache.set(key, { data: result, expiry: now + ttlSeconds * 1000 });
    this.logger.debug(`Cache set`, { key, ttlSeconds });
    return result;
  }

  protected invalidateCache(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) this.cache.delete(key);
    }
  }

  /** =========================
   *  Batch
   *  ========================= */

  protected async executeBatch<T, R>(
    items: T[],
    operation: (item: T) => Promise<R>,
    batchSize: number = 10,
    context?: ServiceContext
  ): Promise<R[]> {
    const results: R[] = [];

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map((item) => operation(item)));
      results.push(...batchResults);

      this.logger.debug(`Processed batch`, {
        batch: Math.floor(i / batchSize) + 1,
        totalBatches: Math.ceil(items.length / batchSize),
        batchSize: batch.length,
        totalProcessed: results.length,
        context,
      });
    }

    return results;
  }

  protected async executeBatchWithTransaction<T, R>(
    items: T[],
    operation: (item: T, tx: PrismaTransaction) => Promise<R>,
    context?: ServiceContext
  ): Promise<R[]> {
    return this.executeTransaction(async (tx) => {
      const results: R[] = [];
      for (const item of items) {
        results.push(await operation(item, tx));
      }
      return results;
    }, context);
  }

  /** =========================
   *  Error handling
   *  ========================= */

  protected handleError(
    error: any,
    operationName: string,
    context?: ServiceContext,
    operationId: string = this.generateOperationId()
  ): ServiceResult<any> {
    const normalized = this.normalizeError(error);

    // Prisma known request errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return {
        success: false,
        error: {
          ...this.mapPrismaKnownError(error),
          timestamp: new Date(),
          operationId,
        },
      };
    }

    // Prisma initialization / unknown errors
    if (error instanceof Prisma.PrismaClientInitializationError) {
      return {
        success: false,
        error: {
          code: ServiceErrorCode.DATABASE_ERROR,
          message: "Database initialization failed",
          details: { ...normalized, operationName, context },
          stack: error.stack,
          timestamp: new Date(),
          operationId,
        },
      };
    }

    if (error instanceof Prisma.PrismaClientRustPanicError) {
      return {
        success: false,
        error: {
          code: ServiceErrorCode.DATABASE_ERROR,
          message: "Database client panicked (Rust panic)",
          details: { ...normalized, operationName, context },
          stack: error.stack,
          timestamp: new Date(),
          operationId,
        },
      };
    }

    // Custom errors
    if (error?.name === "ValidationError") {
      return {
        success: false,
        error: {
          code: ServiceErrorCode.VALIDATION_ERROR,
          message: error.message,
          details: error.details,
          field: error.field,
          timestamp: new Date(),
          operationId,
        },
      };
    }

    if (error?.name === "NotFoundError") {
      return {
        success: false,
        error: {
          code: ServiceErrorCode.RESOURCE_NOT_FOUND,
          message: error.message,
          details: error.details,
          timestamp: new Date(),
          operationId,
        },
      };
    }

    if (error?.name === "AuthorizationError") {
      return {
        success: false,
        error: {
          code: ServiceErrorCode.INSUFFICIENT_PERMISSIONS,
          message: error.message,
          details: error.details,
          timestamp: new Date(),
          operationId,
        },
      };
    }

    if (error?.name === "BusinessRuleViolationError") {
      return {
        success: false,
        error: {
          code: ServiceErrorCode.BUSINESS_RULE_VIOLATION,
          message: error.message,
          details: error.details,
          timestamp: new Date(),
          operationId,
        },
      };
    }

    if (error?.name === "ConflictError") {
      return {
        success: false,
        error: {
          code: ServiceErrorCode.RESOURCE_CONFLICT,
          message: error.message,
          details: error.details,
          timestamp: new Date(),
          operationId,
        },
      };
    }

    // Fallback
    return {
      success: false,
      error: {
        code: ServiceErrorCode.INTERNAL_ERROR,
        message: normalized.message || "An unexpected error occurred",
        details: { ...normalized, operationName, context },
        stack: error?.stack,
        timestamp: new Date(),
        operationId,
      },
    };
  }

  private mapPrismaKnownError(
    error: Prisma.PrismaClientKnownRequestError
  ): Omit<ServiceError, "timestamp" | "operationId"> {
    switch (error.code) {
      case "P2002":
        return {
          code: ServiceErrorCode.UNIQUE_CONSTRAINT_VIOLATION,
          message: "A record with this information already exists",
          details: error.meta,
          field: this.extractFieldFromPrismaMeta(error.meta),
        };
      case "P2025":
        return {
          code: ServiceErrorCode.RECORD_NOT_FOUND,
          message: "The requested record was not found",
          details: error.meta,
        };
      case "P2003":
        return {
          code: ServiceErrorCode.FOREIGN_KEY_CONSTRAINT_VIOLATION,
          message: "This operation violates a data relationship constraint",
          details: error.meta,
          field: this.extractFieldFromPrismaMeta(error.meta),
        };
      case "P2014":
        return {
          code: ServiceErrorCode.INVALID_RELATION,
          message: "The operation violates a relation constraint",
          details: error.meta,
        };
      case "P2016":
        return {
          code: ServiceErrorCode.RESOURCE_NOT_FOUND,
          message: "Query interpretation error",
          details: error.meta,
        };
      case "P2021":
        return {
          code: ServiceErrorCode.DATABASE_ERROR,
          message: "The table does not exist in the current database",
          details: error.meta,
        };
      case "P2022":
        return {
          code: ServiceErrorCode.DATABASE_ERROR,
          message: "The column does not exist in the current database",
          details: error.meta,
        };
      case "P1000":
      case "P1001":
      case "P1002":
        return {
          code: ServiceErrorCode.CONNECTION_ERROR,
          message: "Database connection error",
          details: { prismaCode: error.code, meta: error.meta },
        };
      default:
        return {
          code: ServiceErrorCode.DATABASE_ERROR,
          message: error.message,
          details: { prismaCode: error.code, meta: error.meta },
        };
    }
  }

  private extractFieldFromPrismaMeta(meta: Prisma.PrismaClientKnownRequestError["meta"]): string | undefined {
    if (!meta || typeof meta !== "object") return undefined;


    const anyMeta: any = meta;

    const target = anyMeta?.target;
    if (Array.isArray(target) && target.length > 0) return String(target[0]);
    if (typeof target === "string") return target;

    const fieldName = anyMeta?.field_name;
    if (typeof fieldName === "string") return fieldName;

    return undefined;
  }

  private normalizeError(error: any): { message: string; [key: string]: any } {
    if (error instanceof Error) {
      return { message: error.message, name: error.name, stack: error.stack };
    }
    if (typeof error === "string") return { message: error };
    if (typeof error === "object" && error !== null) {
      return { message: error.message || "Unknown error", ...error };
    }
    return { message: "Unknown error occurred" };
  }

  private isRetryableError(error: any, retryableErrors: string[]): boolean {
    const normalized = this.normalizeError(error);

    if (normalized?.code && retryableErrors.includes(String(normalized.code))) return true;
    if (error?.code && retryableErrors.includes(String(error.code))) return true;

    const msg = String(normalized.message || "").toLowerCase();
    const patterns = ["timeout", "timed out", "connection", "network", "temporary", "throttle", "rate limit", "econnreset"];
    return patterns.some((p) => msg.includes(p));
  }

  /** =========================
   *  Metrics + IDs
   *  ========================= */

  private recordMetrics(m: ServiceMetrics): void {
    this.metrics.push(m);
    if (this.metrics.length > 200) this.metrics = this.metrics.slice(-200);
  }

  protected generateOperationId(): string {
    return `${this.serviceName}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }

  private async sleep(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/** =========================
 *  Service Factory
 *  ========================= */

export interface ServiceFactory {
  create<T extends BaseService>(ServiceClass: new (prisma: PrismaClient, serviceName?: string) => T): T;
  get<T extends BaseService>(serviceKey: string): T | undefined;
  register<T extends BaseService>(serviceKey: string, service: T): void;
  clear(): void;
}

export class DefaultServiceFactory implements ServiceFactory {
  private services = new Map<string, BaseService>();

  constructor(private prisma: PrismaClient) {}

  create<T extends BaseService>(ServiceClass: new (prisma: PrismaClient, serviceName?: string) => T): T {
    return new ServiceClass(this.prisma);
  }

  get<T extends BaseService>(serviceKey: string): T | undefined {
    return this.services.get(serviceKey) as T | undefined;
  }

  register<T extends BaseService>(serviceKey: string, service: T): void {
    this.services.set(serviceKey, service);
  }

  clear(): void {
    this.services.clear();
  }
}
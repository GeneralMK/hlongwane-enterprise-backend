import { ValidationError } from '../services/base/BaseService';

// Re-export error classes from BaseService for backward compatibility
export {
  ValidationError,
  NotFoundError,
  AuthorizationError,
  BusinessRuleViolationError,
  ConflictError
} from '../services/base/BaseService';

// Additional error types that might be used in the application
export class BusinessLogicError extends Error {
  public details?: any;
  
  constructor(message: string, details?: any) {
    super(message);
    this.name = 'BusinessLogicError';
    this.details = details;
  }
}

export class ExternalServiceError extends Error {
  public service?: string;
  public details?: any;
  
  constructor(message: string, service?: string, details?: any) {
    super(message);
    this.name = 'ExternalServiceError';
    this.service = service;
    this.details = details;
  }
}

export class TimeoutError extends Error {
  public timeout?: number;
  
  constructor(message: string, timeout?: number) {
    super(message);
    this.name = 'TimeoutError';
    this.timeout = timeout;
  }
}

export class RateLimitError extends Error {
  public retryAfter?: number;
  
  constructor(message: string, retryAfter?: number) {
    super(message);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

// Specific error types for school admin onboarding
export class InvitationError extends Error {
  public invitationType?: string;
  public invitationId?: string;
  public details?: any;
  
  constructor(message: string, invitationType?: string, invitationId?: string, details?: any) {
    super(message);
    this.name = 'InvitationError';
    this.invitationType = invitationType;
    this.invitationId = invitationId;
    this.details = details;
  }
}

export class InvitationValidationError extends ValidationError {
  public invitationType?: string;
  public validationRule?: string;
  
  constructor(message: string, field?: string, invitationType?: string, validationRule?: string, details?: any) {
    super(message, field, details);
    this.name = 'InvitationValidationError';
    this.invitationType = invitationType;
    this.validationRule = validationRule;
  }
}

export class InvitationTokenError extends Error {
  public tokenStatus?: 'EXPIRED' | 'INVALID' | 'ALREADY_USED' | 'NOT_FOUND';
  public tokenId?: string;
  
  constructor(message: string, tokenStatus?: 'EXPIRED' | 'INVALID' | 'ALREADY_USED' | 'NOT_FOUND', tokenId?: string) {
    super(message);
    this.name = 'InvitationTokenError';
    this.tokenStatus = tokenStatus;
    this.tokenId = tokenId;
  }
}

export class ContentProvisioningError extends Error {
  public learnerId?: number;
  public provisioningStage?: 'VALIDATION' | 'CONTENT_QUERY' | 'PROGRESS_CREATION' | 'CLEANUP';
  public details?: any;
  
  constructor(message: string, learnerId?: number, provisioningStage?: 'VALIDATION' | 'CONTENT_QUERY' | 'PROGRESS_CREATION' | 'CLEANUP', details?: any) {
    super(message);
    this.name = 'ContentProvisioningError';
    this.learnerId = learnerId;
    this.provisioningStage = provisioningStage;
    this.details = details;
  }
}

export class SchoolAdminError extends Error {
  public schoolId?: number;
  public adminId?: number;
  public operation?: string;
  public details?: any;
  
  constructor(message: string, schoolId?: number, adminId?: number, operation?: string, details?: any) {
    super(message);
    this.name = 'SchoolAdminError';
    this.schoolId = schoolId;
    this.adminId = adminId;
    this.operation = operation;
    this.details = details;
  }
}
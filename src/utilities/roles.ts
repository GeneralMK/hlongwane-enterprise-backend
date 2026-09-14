import { EnumUserRole } from "@prisma/client";

/**
 * Role constants for common permission checks
 * Use these instead of hardcoded string arrays throughout the application
 */

//  Izwi roles
export const ADMIN_ROLES: EnumUserRole[] = [
  EnumUserRole.ADMIN,
  EnumUserRole.TRUST_SAFETY, // include if Trust & Safety should have admin-like powers
];

export const STAFF_ROLES: EnumUserRole[] = [
  EnumUserRole.ADMIN,
  EnumUserRole.TRUST_SAFETY,
  EnumUserRole.B2B, // optional (if internal staff)
];

export const isAdmin = (role?: string | EnumUserRole): boolean => {
  if (!role) return false;
  return ADMIN_ROLES.includes(role as EnumUserRole);
};

export const isTrustSafety = (role?: string | EnumUserRole): boolean => {
  return role === EnumUserRole.TRUST_SAFETY;
};

/**
 * Get role hierarchy level (higher number = more permissions)
 */
export const getRoleLevel = (role?: string | EnumUserRole): number => {
  const roleLevels: Record<EnumUserRole, number> = {
    [EnumUserRole.REPORTER]: 1,
    [EnumUserRole.SUBSCRIBER]: 2,
    [EnumUserRole.B2B]: 3,
    [EnumUserRole.TRUST_SAFETY]: 9,
    [EnumUserRole.ADMIN]: 10,
  };

  return role ? roleLevels[role as EnumUserRole] ?? 0 : 0;
};

export const hasRolePermission = (
  userRole?: string | EnumUserRole,
  requiredRole?: string | EnumUserRole
): boolean => getRoleLevel(userRole) >= getRoleLevel(requiredRole);

// re-export for convenience
export { EnumUserRole };
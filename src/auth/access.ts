import type {
  AuthenticatedRole,
  AuthenticatedUserClaims,
} from "../types/context.js";

const ADMIN_ROLE_CODES = new Set([
  "ADMIN",
  "SUPER_ADMIN",
  "PRODUCT_MANAGER",
  "INVENTORY_MANAGER",
  "ORDER_MANAGER",
  "PAYMENT_MANAGER",
  "SUPPORT_AGENT",
]);

export const hasRole = (
  roles: AuthenticatedRole[] | null | undefined,
  roleCode: string,
): boolean => {
  if (!roles?.length) {
    return false;
  }

  const normalizedRoleCode = roleCode.trim().toUpperCase();

  return roles.some((role) => role.code === normalizedRoleCode);
};

export const hasAnyRole = (
  roles: AuthenticatedRole[] | null | undefined,
  roleCodes: string[],
): boolean => {
  if (!roles?.length) {
    return false;
  }

  const allowedRoles = new Set(
    roleCodes.map((roleCode) => roleCode.trim().toUpperCase()),
  );

  return roles.some((role) => allowedRoles.has(role.code));
};

export const isAdminRole = (
  roles: AuthenticatedRole[] | null | undefined,
): boolean => {
  if (!roles?.length) {
    return false;
  }

  return roles.some((role) => ADMIN_ROLE_CODES.has(role.code));
};

export const isSuperAdminRole = (
  roles: AuthenticatedRole[] | null | undefined,
): boolean => {
  return roles?.some((role) => role.code === "SUPER_ADMIN") ?? false;
};

export const hasPermission = (
  user: AuthenticatedUserClaims | null | undefined,
  permissionCode: string,
): boolean => {
  if (!user) {
    return false;
  }

  if (user.isSuperAdmin) {
    return true;
  }

  return user.permissions.includes(permissionCode);
};

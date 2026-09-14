export type RoleLike = {
  code: string;
};

export type UserWithRoles = {
  roles?: RoleLike[];
};

/**
 * System role codes.
 *
 * These values must match Role.code values stored in the database.
 */
export const ROLE_CODES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  CUSTOMER: "CUSTOMER",
} as const;

export type RoleCode =
  (typeof ROLE_CODES)[keyof typeof ROLE_CODES];

/**
 * Returns true when the user has the supplied role.
 */
export function hasRole(
  user: UserWithRoles | null | undefined,
  roleCode: string,
): boolean {
  if (!user?.roles) {
    return false;
  }

  return user.roles.some(
    (role) => role.code === roleCode,
  );
}

/**
 * Returns true when the user has at least one
 * of the supplied roles.
 */
export function hasAnyRole(
  user: UserWithRoles | null | undefined,
  roleCodes: readonly string[],
): boolean {
  if (!user?.roles) {
    return false;
  }

  const requiredRoles =
    new Set(roleCodes);

  return user.roles.some(
    (role) =>
      requiredRoles.has(role.code),
  );
}

/**
 * Returns true when the user has every
 * supplied role.
 */
export function hasAllRoles(
  user: UserWithRoles | null | undefined,
  roleCodes: readonly string[],
): boolean {
  if (!user?.roles) {
    return false;
  }

  const assignedRoles =
    new Set(
      user.roles.map(
        (role) => role.code,
      ),
    );

  return roleCodes.every(
    (roleCode) =>
      assignedRoles.has(roleCode),
  );
}

/**
 * Super admins have unrestricted platform-level
 * administrative access.
 */
export function isSuperAdmin(
  user: UserWithRoles | null | undefined,
): boolean {
  return hasRole(
    user,
    ROLE_CODES.SUPER_ADMIN,
  );
}

/**
 * Admin check.
 *
 * SUPER_ADMIN is also considered an administrator.
 */
export function isAdmin(
  user: UserWithRoles | null | undefined,
): boolean {
  return (
    isSuperAdmin(user) ||
    hasRole(
      user,
      ROLE_CODES.ADMIN,
    )
  );
}

/**
 * Customer check.
 */
export function isCustomer(
  user: UserWithRoles | null | undefined,
): boolean {
  return hasRole(
    user,
    ROLE_CODES.CUSTOMER,
  );
}
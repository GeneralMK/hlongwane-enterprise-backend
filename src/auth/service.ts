import type {
  AuthenticatedRole,
  AuthenticatedUserClaims,
} from "../types/context.js";

import { isAdminRole, isSuperAdminRole } from "./access.js";

import { findUserByAuthUserId, findUserWithAccess } from "./repository.js";

import { supabaseAdmin } from "../lib/supabase.js";

export const authenticateAccessToken = async (
  token: string,
): Promise<AuthenticatedUserClaims | null> => {
  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data.user) {
    return null;
  }

  const localUser = await findUserByAuthUserId(data.user.id);

  if (!localUser || !localUser.isActive) {
    return null;
  }

  return buildAuthenticatedUser(localUser.id);
};

export const buildAuthenticatedUser = async (
  userId: string,
): Promise<AuthenticatedUserClaims | null> => {
  const user = await findUserWithAccess(userId);

  if (!user || !user.isActive) {
    return null;
  }

  const activeRoles = user.userRoles
    .map((assignment) => assignment.role)
    .filter((role) => role.isActive);

  const roles: AuthenticatedRole[] = activeRoles.map((role) => ({
    id: role.id,
    code: role.code,
    name: role.name,
  }));

  const permissionSet = new Set<string>();

  for (const role of activeRoles) {
    for (const rolePermission of role.permissions) {
      const permission = rolePermission.permission;

      if (permission.isActive) {
        permissionSet.add(permission.code);
      }
    }
  }

  return {
    id: user.id,

    authUserId: user.authUserId,

    email: user.email,

    firstName: user.firstName,

    lastName: user.lastName,

    phone: user.phone,

    isActive: user.isActive,

    roles,

    permissions: Array.from(permissionSet),

    isAdmin: isAdminRole(roles),

    isSuperAdmin: isSuperAdminRole(roles),
  };
};

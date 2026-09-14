import { GraphQLError } from "graphql/error/GraphQLError.js";
import type { AuthenticatedUserClaims } from "../types/context.js";

import { hasPermission, hasRole } from "./access.js";

export const assertAuthenticated = (
  user: AuthenticatedUserClaims | null | undefined,
): AuthenticatedUserClaims => {
  if (!user) {
    throw new GraphQLError("Authentication required.", {
      extensions: {
        code: "UNAUTHENTICATED",

        http: {
          status: 401,
        },
      },
    });
  }

  if (!user.isActive) {
    throw new GraphQLError("User account is inactive.", {
      extensions: {
        code: "FORBIDDEN",

        http: {
          status: 403,
        },
      },
    });
  }

  return user;
};

export const assertPermission = (
  user: AuthenticatedUserClaims | null | undefined,

  permissionCode: string,
): AuthenticatedUserClaims => {
  const authenticatedUser = assertAuthenticated(user);

  if (!hasPermission(authenticatedUser, permissionCode)) {
    throw new GraphQLError(
      "You do not have permission to perform this action.",
      {
        extensions: {
          code: "FORBIDDEN",

          permission: permissionCode,

          http: {
            status: 403,
          },
        },
      },
    );
  }

  return authenticatedUser;
};

export const assertRole = (
  user: AuthenticatedUserClaims | null | undefined,

  roleCode: string,
): AuthenticatedUserClaims => {
  const authenticatedUser = assertAuthenticated(user);

  if (!hasRole(authenticatedUser.roles, roleCode)) {
    throw new GraphQLError("You do not have the required role.", {
      extensions: {
        code: "FORBIDDEN",

        role: roleCode,

        http: {
          status: 403,
        },
      },
    });
  }

  return authenticatedUser;
};

export const assertAdmin = (
  user: AuthenticatedUserClaims | null | undefined,
): AuthenticatedUserClaims => {
  const authenticatedUser = assertAuthenticated(user);

  if (!authenticatedUser.isAdmin) {
    throw new GraphQLError("Administrator access required.", {
      extensions: {
        code: "FORBIDDEN",

        http: {
          status: 403,
        },
      },
    });
  }

  return authenticatedUser;
};

export const assertSuperAdmin = (
  user: AuthenticatedUserClaims | null | undefined,
): AuthenticatedUserClaims => {
  const authenticatedUser = assertAuthenticated(user);

  if (!authenticatedUser.isSuperAdmin) {
    throw new GraphQLError("Super Administrator access required.", {
      extensions: {
        code: "FORBIDDEN",

        http: {
          status: 403,
        },
      },
    });
  }

  return authenticatedUser;
};

import prisma from "prisma";

export const ResourceOperations = Object.freeze({
  users: Object.freeze(["view", "create", "update", "delete"]),

  admins: Object.freeze([
    "view",
    "create",
    "update",
    "delete",
    "assign_roles",
  ]),

  products: Object.freeze(["view", "create", "update", "delete"]),

  brands: Object.freeze(["view", "create", "update", "delete", "manage"]),

  categories: Object.freeze(["view", "create", "update", "delete"]),

  inventory: Object.freeze(["view", "adjust"]),

  orders: Object.freeze(["view", "update", "cancel"]),

  payments: Object.freeze(["view", "refund"]),

  returns: Object.freeze(["view", "approve", "reject"]),

  shipments: Object.freeze(["view", "update"]),

  files: Object.freeze(["view", "upload", "delete"]),

  reports: Object.freeze(["view"]),

  dashboard: Object.freeze(["view"]),

  audit: Object.freeze(["view"]),
} as const);

export type Resource = keyof typeof ResourceOperations;

type OperationOf<R extends Resource> =
  (typeof ResourceOperations)[R][number];

export type Action = {
  [R in Resource]: `${OperationOf<R>}:${R}`;
}[Resource];

const ALL_ACTIONS: ReadonlySet<string> = new Set(
  Object.entries(ResourceOperations).flatMap(
    ([resource, operations]) =>
      (operations as readonly string[]).map(
        (operation) => `${operation}:${resource}`,
      ),
  ),
);

export function isValidAction(action: string): action is Action {
  return ALL_ACTIONS.has(action);
}

export function parseAction(action: Action) {
  const [operation, resource] = action.split(":");

  return {
    operation,
    resource: resource as Resource,
  };
}

function toPermissionCode(action: Action) {
  const { operation, resource } = parseAction(action);

  return `${resource}.${operation}`;
}

export async function hasPermission(params: {
  userId: string;
  action: Action;
}): Promise<boolean> {
  const { userId, action } = params;

  if (
    process.env.NODE_ENV !== "production" &&
    !isValidAction(action)
  ) {
    console.warn(`[RBAC] Unknown action: ${action}`);

    return false;
  }

  const permissionCode = toPermissionCode(action);

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      isActive: true,

      userRoles: {
        where: {
          isActive: true,
          revokedAt: null,
        },

        select: {
          role: {
            select: {
              code: true,
              isActive: true,

              permissions: {
                where: {
                  permission: {
                    isActive: true,
                    code: permissionCode,
                  },
                },

                select: {
                  permissionId: true,
                },

                take: 1,
              },
            },
          },
        },
      },
    },
  });

  if (!user?.isActive) {
    return false;
  }

  for (const userRole of user.userRoles) {
    const role = userRole.role;

    if (!role.isActive) {
      continue;
    }

    // SUPER_ADMIN bypasses granular permission checks.
    if (role.code === "SUPER_ADMIN") {
      return true;
    }

    if (role.permissions.length > 0) {
      return true;
    }
  }

  return false;
}
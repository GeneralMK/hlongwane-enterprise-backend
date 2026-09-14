import prisma from "../../../../prisma/index.js";

/**
 * Derive Prisma input types from the generated client
 * instead of depending on Prisma.AuditLogWhereInput.
 */

type AuditLogFindManyArgs =
  NonNullable<
    Parameters<
      typeof prisma.auditLog.findMany
    >[0]
  >;

type AuditLogWhereInput =
  NonNullable<
    AuditLogFindManyArgs["where"]
  >;

export type ListAuditLogsParams = {
  actorUserId?: string;
  entityType?: string;
  action?: string;
  skip: number;
  take: number;
};

export const list = (
  params: ListAuditLogsParams,
) => {
  const actorUserId =
    params.actorUserId?.trim();

  const entityType =
    params.entityType?.trim();

  const action =
    params.action?.trim();

  const where: AuditLogWhereInput = {
    ...(actorUserId
      ? {
          actorUserId,
        }
      : {}),

    ...(entityType
      ? {
          entityType,
        }
      : {}),

    ...(action
      ? {
          action,
        }
      : {}),
  };

  return Promise.all([
    prisma.auditLog.findMany({
      where,

      skip:
        params.skip,

      take:
        params.take,

      include: {
        actor: {
          select: {
            id:
              true,

            email:
              true,

            firstName:
              true,

            lastName:
              true,
          },
        },
      },

      orderBy: {
        createdAt:
          "desc",
      },
    }),

    prisma.auditLog.count({
      where,
    }),
  ]);
};
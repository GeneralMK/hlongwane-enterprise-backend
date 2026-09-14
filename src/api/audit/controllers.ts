import type { Context } from "koa";
import { pagination } from "../../utilities/index.js";
import * as service from "./service/index.js";
export const listAuditLogsController = async (ctx: Context) => {
  const { page, limit, skip } = pagination(ctx.query.page, ctx.query.limit);
  const [items, total] = await service.listAuditLogs({
    actorUserId:
      typeof ctx.query.actorUserId === "string"
        ? ctx.query.actorUserId
        : undefined,
    entityType:
      typeof ctx.query.entityType === "string"
        ? ctx.query.entityType
        : undefined,
    action: typeof ctx.query.action === "string" ? ctx.query.action : undefined,
    skip,
    take: limit,
  });
  ctx.body = {
    success: true,
    data: {
      items,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    },
  };
};

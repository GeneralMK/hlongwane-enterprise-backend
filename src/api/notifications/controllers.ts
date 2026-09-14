import type { Context } from "koa";
import { pagination } from "../../utilities/index.js";
import * as service from "./service/index.js";
export const listMyNotificationsController = async (ctx: Context) => {
  const { page, limit, skip } = pagination(ctx.query.page, ctx.query.limit);
  const r = await service.listMyNotifications({
    userId: ctx.state.user!.id,
    skip,
    take: limit,
  });
  ctx.body = {
    success: true,
    data: {
      items: r.items,
      pagination: {
        page,
        limit,
        total: r.total,
        pages: Math.ceil(r.total / limit),
      },
    },
  };
};

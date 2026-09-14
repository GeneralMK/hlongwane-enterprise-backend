import type { Context } from "koa";
import { pagination } from "../../utilities/index.js";
import * as service from "./service/index.js";

export const listUsersController = async (ctx: Context) => {
  const { page, limit, skip } = pagination(ctx.query.page, ctx.query.limit);
  const result = await service.listUsers({
    search: typeof ctx.query.search === "string" ? ctx.query.search : undefined,
    skip,
    take: limit,
  });
  ctx.body = {
    success: true,
    data: { items: result.items, pagination: { page, limit, total: result.total, pages: Math.ceil(result.total / limit) } },
  };
};

export const getUserController = async (ctx: Context) => {
  ctx.body = { success: true, data: await service.getUser(ctx.params.id) };
};

export const updateUserController = async (ctx: Context) => {
  ctx.body = {
    success: true,
    message: "User updated successfully.",
    data: await service.updateUser(ctx.params.id, ctx.request.body),
  };
};

import type { Context } from "koa";
import * as service from "./service/index.js";

export const registerController = async (ctx: Context) => {
  const data = await service.registerCustomer(ctx.request.body);
  ctx.status = 201;
  ctx.body = { success: true, message: "Customer registered successfully.", data };
};

export const meController = async (ctx: Context) => {
  ctx.body = { success: true, data: ctx.state.user };
};

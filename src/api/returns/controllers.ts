import type { Context } from "koa";
import * as service from "./service/index.js";
export const getReturnController = async (ctx: Context) => {
  ctx.body = { success: true, data: await service.getReturn(ctx.params.id) };
};
export const createReturnController = async (ctx: Context) => {
  ctx.status = 201;
  ctx.body = {
    success: true,
    message: "Return request created.",
    data: await service.createReturn({
      userId: ctx.state.user!.id,
      raw: ctx.request.body,
    }),
  };
};
export const approveReturnController = async (ctx: Context) => {
  ctx.body = {
    success: true,
    message: "Return approved.",
    data: await service.approveReturn(ctx.params.id),
  };
};
export const rejectReturnController = async (ctx: Context) => {
  ctx.body = {
    success: true,
    message: "Return rejected.",
    data: await service.rejectReturn(ctx.params.id),
  };
};

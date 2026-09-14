import type { Context } from "koa";
import * as service from "./service/index.js";
export const listRolesController = async (ctx: Context) => {
  ctx.body = { success: true, data: await service.listRoles() };
};
export const assignRoleController = async (ctx: Context) => {
  const roleId = String((ctx.request.body as { roleId?: string } | undefined)?.roleId ?? "");
  const data = await service.assignRole({ userId: ctx.params.userId, roleId, actorUserId: ctx.state.user!.id });
  ctx.status = 201;
  ctx.body = { success: true, message: "Role assigned successfully.", data };
};
export const revokeRoleController = async (ctx: Context) => {
  ctx.body = {
    success: true,
    message: "Role revoked successfully.",
    data: await service.revokeRole({
      userId: ctx.params.userId,
      roleId: ctx.params.roleId,
      actorUserId: ctx.state.user!.id,
    }),
  };
};

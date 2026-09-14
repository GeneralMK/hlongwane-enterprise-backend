import type {Context} from "koa"; import * as service from "./service/index.js";
export const listInventoryController=async(ctx:Context)=>{ctx.body={success:true,data:await service.listInventory()};};
export const getInventoryController=async(ctx:Context)=>{ctx.body={success:true,data:await service.getInventory(ctx.params.variantId)};};
export const adjustInventoryController=async(ctx:Context)=>{ctx.body={success:true,message:"Inventory adjusted successfully.",data:await service.adjustInventory({variantId:ctx.params.variantId,raw:ctx.request.body,actorUserId:ctx.state.user!.id})};};

import type {Context} from "koa"; import * as service from "./service/index.js";
export const getMyCartController=async(ctx:Context)=>{ctx.body={success:true,data:await service.getMyCart(ctx.state.user!.id)};};
export const addCartItemController=async(ctx:Context)=>{ctx.status=201;ctx.body={success:true,message:"Item added to cart.",data:await service.addItem(ctx.state.user!.id,ctx.request.body)};};
export const updateCartItemController=async(ctx:Context)=>{ctx.body={success:true,message:"Cart item updated.",data:await service.updateQuantity(ctx.state.user!.id,ctx.params.itemId,Number((ctx.request.body as any)?.quantity))};};
export const removeCartItemController=async(ctx:Context)=>{await service.removeItem(ctx.state.user!.id,ctx.params.itemId);ctx.status=204;};

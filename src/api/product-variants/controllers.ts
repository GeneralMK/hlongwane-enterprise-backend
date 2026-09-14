import type {Context} from "koa"; import * as service from "./service/index.js";
export const listProductVariantsController=async(ctx:Context)=>{ctx.body={success:true,data:await service.listProductVariants(ctx.params.productId)};};
export const getVariantController=async(ctx:Context)=>{ctx.body={success:true,data:await service.getVariant(ctx.params.id)};};
export const createVariantController=async(ctx:Context)=>{ctx.status=201;ctx.body={success:true,message:"Variant created successfully.",data:await service.createVariant(ctx.request.body)};};
export const updateVariantController=async(ctx:Context)=>{ctx.body={success:true,message:"Variant updated successfully.",data:await service.updateVariant(ctx.params.id,ctx.request.body)};};

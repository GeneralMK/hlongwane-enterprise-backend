import type { Context } from "koa"; import * as service from "./service/index.js";
export const listBrandsController=async(ctx:Context)=>{ctx.body={success:true,data:await service.listBrands()};};
export const getBrandController=async(ctx:Context)=>{ctx.body={success:true,data:await service.getBrand(ctx.params.id)};};
export const createBrandController=async(ctx:Context)=>{ctx.status=201;ctx.body={success:true,message:"Brand created successfully.",data:await service.createBrand(ctx.request.body)};};
export const updateBrandController=async(ctx:Context)=>{ctx.body={success:true,message:"Brand updated successfully.",data:await service.updateBrand(ctx.params.id,ctx.request.body)};};

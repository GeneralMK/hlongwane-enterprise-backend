import type {Context} from "koa"; import * as service from "./service/index.js";
export const listCategoriesController=async(ctx:Context)=>{ctx.body={success:true,data:await service.listCategories()};};
export const getCategoryController=async(ctx:Context)=>{ctx.body={success:true,data:await service.getCategory(ctx.params.id)};};
export const createCategoryController=async(ctx:Context)=>{ctx.status=201;ctx.body={success:true,message:"Category created successfully.",data:await service.createCategory(ctx.request.body)};};
export const updateCategoryController=async(ctx:Context)=>{ctx.body={success:true,message:"Category updated successfully.",data:await service.updateCategory(ctx.params.id,ctx.request.body)};};

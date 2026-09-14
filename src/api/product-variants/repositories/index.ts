import prisma from "prisma"; import type {Prisma} from "@prisma/client";
export const byId=(id:string)=>prisma.productVariant.findUnique({where:{id},include:{product:true,inventory:true,serializedDevices:true}});
export const byProduct=(productId:string)=>prisma.productVariant.findMany({where:{productId},include:{inventory:true},orderBy:{createdAt:"asc"}});
export const create=(data:Prisma.ProductVariantCreateInput)=>prisma.productVariant.create({data,include:{inventory:true}});
export const update=(id:string,data:Prisma.ProductVariantUpdateInput)=>prisma.productVariant.update({where:{id},data,include:{inventory:true}});

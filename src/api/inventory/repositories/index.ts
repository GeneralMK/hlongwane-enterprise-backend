import prisma from "prisma";
export const list=()=>prisma.inventory.findMany({include:{variant:{include:{product:true}}},orderBy:{updatedAt:"desc"}});
export const byVariant=(variantId:string)=>prisma.inventory.findUnique({where:{variantId},include:{variant:{include:{product:true}}}});

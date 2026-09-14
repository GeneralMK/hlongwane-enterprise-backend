import prisma from "prisma";
export const list=()=>prisma.category.findMany({orderBy:{name:"asc"},include:{imageFile:true,children:true}});
export const byId=(id:string)=>prisma.category.findUnique({where:{id},include:{imageFile:true,parent:true,children:true}});
export const create=(data:{name:string;slug:string;description?:string;imageFileId?:string;parentId?:string})=>prisma.category.create({data,include:{imageFile:true,parent:true}});
export const update=(id:string,data:{name?:string;slug?:string;description?:string|null;imageFileId?:string|null;parentId?:string|null;isActive?:boolean})=>prisma.category.update({where:{id},data,include:{imageFile:true,parent:true}});

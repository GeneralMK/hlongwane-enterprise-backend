import prisma from "prisma"; import type {ReturnStatus} from "@prisma/client";
export const byId=(id:string)=>prisma.returnRequest.findUnique({where:{id},include:{order:true,items:{include:{orderItem:true}},evidence:{include:{fileUpload:true}}}});
export const updateStatus=(id:string,status:ReturnStatus)=>prisma.returnRequest.update({where:{id},data:{status}});

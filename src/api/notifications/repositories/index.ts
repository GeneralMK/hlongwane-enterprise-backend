import prisma from "prisma";
export const listForUser=(userId:string,skip:number,take:number)=>prisma.notification.findMany({where:{userId},skip,take,orderBy:{createdAt:"desc"}});
export const countForUser=(userId:string)=>prisma.notification.count({where:{userId}});

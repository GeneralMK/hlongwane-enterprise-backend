import prisma from "prisma";
export const activeForUser=(userId:string)=>prisma.cart.findFirst({where:{userId,status:"ACTIVE"},include:{items:{include:{variant:{include:{product:{include:{images:{include:{fileUpload:true},where:{isPrimary:true}}}},inventory:true}}}}}});

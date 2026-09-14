import prisma from "prisma"; import type {PaymentProvider,PaymentStatus} from "@prisma/client";
export const byId=(id:string)=>prisma.payment.findUnique({where:{id},include:{order:true,events:true,refunds:true}});
export const byReference=(reference:string)=>prisma.payment.findUnique({where:{reference},include:{order:true,events:true,refunds:true}});
export const create=(data:{orderId:string;provider:PaymentProvider;reference:string;amount:number;currency:string})=>prisma.payment.create({data});
export const update=(id:string,data:{status?:PaymentStatus;providerReference?:string;checkoutUrl?:string;verifiedAt?:Date;paidAt?:Date;failureCode?:string;failureMessage?:string})=>prisma.payment.update({where:{id},data});

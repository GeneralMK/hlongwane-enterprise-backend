import type {Context} from "koa"; import * as service from "./service/index.js";
export const getShipmentController=async(ctx:Context)=>{ctx.body={success:true,data:await service.getShipment(ctx.params.id)};};
export const createShipmentController=async(ctx:Context)=>{ctx.status=201;ctx.body={success:true,message:"Shipment created successfully.",data:await service.createShipment(ctx.request.body)};};
export const updateShipmentController=async(ctx:Context)=>{ctx.body={success:true,message:"Shipment updated successfully.",data:await service.updateShipment(ctx.params.id,ctx.request.body)};};

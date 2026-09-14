import { ShipmentStatus } from "@prisma/client";
import { z } from "zod";

import * as repo from "../repositories/index.js";
import { notFound } from "src/types/app-errors.js";
const createSchema = z.object({
  orderId: z.string().uuid(),
  provider: z.string().min(1),
  serviceLevel: z.string().optional(),
  trackingNumber: z.string().optional(),
  trackingUrl: z.string().url().optional(),
});
const updateSchema = z.object({
  status: z.nativeEnum(ShipmentStatus),
  trackingNumber: z.string().optional(),
  trackingUrl: z.string().url().optional(),
  location: z.string().optional(),
  description: z.string().optional(),
});
export const getShipment = async (id: string) => {
  const x = await repo.byId(id);
  if (!x) throw notFound("SHIPMENT_NOT_FOUND", "Shipment not found.");
  return x;
};
export const createShipment = (raw: unknown) =>
  repo.create(createSchema.parse(raw));
export const updateShipment = async (id: string, raw: unknown) => {
  await getShipment(id);
  return repo.update(id, updateSchema.parse(raw));
};

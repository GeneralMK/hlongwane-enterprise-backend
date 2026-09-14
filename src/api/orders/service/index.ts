import prisma from "prisma";

import {
  OrderStatus,
  StockMovementType,
  type Prisma,
} from "@prisma/client";

import { z } from "zod";

import { generateUUID } from "../../../utilities/index.js";

import * as repo from "../repositories/index.js";

import {
  badRequest,
  notFound,
} from "../../../types/app-errors.js";

/**
 * Orders that may still be cancelled.
 *
 * Explicitly typed as Set<OrderStatus> so TypeScript
 * accepts a full OrderStatus value in `.has(...)`.
 */
const CANCELLABLE_ORDER_STATUSES =
  new Set<OrderStatus>([
    OrderStatus.PENDING_PAYMENT,
    OrderStatus.PAID,
    OrderStatus.PROCESSING,
  ]);

/**
 * Checkout input validation.
 */
const checkoutSchema = z.object({
  cartId: z.string().uuid(),

  deliveryAddress: z.record(
    z.string(),
    z.unknown(),
  ),

  billingAddress: z
    .record(
      z.string(),
      z.unknown(),
    )
    .optional(),

  deliveryFee: z.coerce
    .number()
    .nonnegative()
    .default(0),

  taxTotal: z.coerce
    .number()
    .nonnegative()
    .default(0),

  discountTotal: z.coerce
    .number()
    .nonnegative()
    .default(0),

  notes: z
    .string()
    .trim()
    .optional(),
});

/**
 * Repository passthrough used by admin and
 * customer order listing resolvers/controllers.
 */
export const listOrders =
  repo.list;

/**
 * Fetch an order with optional requester scoping.
 *
 * If allowAll = false, a requester with userId can
 * only retrieve an order belonging to themselves.
 */
export const getOrder = async (
  id: string,
  requester?: {
    userId?: string;
    allowAll?: boolean;
  },
) => {
  const order =
    await repo.byId(id);

  if (!order) {
    throw notFound(
      "ORDER_NOT_FOUND",
      "Order not found.",
    );
  }

  if (
    requester?.userId &&
    !requester.allowAll &&
    order.userId !==
      requester.userId
  ) {
    throw notFound(
      "ORDER_NOT_FOUND",
      "Order not found.",
    );
  }

  return order;
};

/**
 * Creates an order from an authenticated
 * user's active cart.
 *
 * Flow:
 *
 * 1. Validate checkout input.
 * 2. Load active customer cart.
 * 3. Validate cart ownership.
 * 4. Validate stock availability.
 * 5. Calculate totals.
 * 6. Create order + order-item snapshots.
 * 7. Create initial order history.
 * 8. Reserve inventory.
 * 9. Create inventory reservation records.
 * 10. Create stock movement records.
 * 11. Convert cart.
 */
export const createOrderFromCart =
  async (params: {
    userId: string;
    raw: unknown;
  }) => {
    const input =
      checkoutSchema.parse(
        params.raw,
      );

    return prisma.$transaction(
      async (tx) => {
        /**
         * Load active cart with all information
         * required to construct the order snapshot.
         */
        const cart =
          await tx.cart.findUnique({
            where: {
              id: input.cartId,
            },

            include: {
              items: {
                include: {
                  variant: {
                    include: {
                      product: true,
                      inventory: true,
                    },
                  },
                },
              },
            },
          });

        if (
          !cart ||
          cart.userId !==
            params.userId ||
          cart.status !==
            "ACTIVE"
        ) {
          throw notFound(
            "CART_NOT_FOUND",
            "Active cart not found.",
          );
        }

        if (
          cart.items.length === 0
        ) {
          throw badRequest(
            "EMPTY_CART",
            "Cart is empty.",
          );
        }

        /**
         * Validate inventory before creating
         * any order records.
         */
        let subtotal = 0;

        for (
          const item of
          cart.items
        ) {
          const inventory =
            item.variant
              .inventory;

          if (!inventory) {
            throw badRequest(
              "INVENTORY_NOT_CONFIGURED",
              `Inventory is not configured for ${item.variant.sku}.`,
            );
          }

          const availableQuantity =
            inventory
              .physicalQuantity -
            inventory
              .reservedQuantity;

          if (
            item.quantity >
            availableQuantity
          ) {
            throw badRequest(
              "INSUFFICIENT_STOCK",
              `Insufficient stock for ${item.variant.sku}.`,
            );
          }

          subtotal +=
            Number(
              item
                .unitPriceSnapshot,
            ) *
            item.quantity;
        }

        /**
         * Calculate final order amount.
         */
        const total =
          subtotal -
          input.discountTotal +
          input.deliveryFee +
          input.taxTotal;

        if (total < 0) {
          throw badRequest(
            "INVALID_ORDER_TOTAL",
            "Order total cannot be negative.",
          );
        }

        /**
         * Generate customer-facing
         * unique order number.
         */
        const orderNumber =
          `HE-${Date.now()}-${generateUUID()
            .slice(0, 8)
            .toUpperCase()}`;

        /**
         * Create order and immutable
         * order-item snapshots.
         */
        const order =
          await tx.order.create({
            data: {
              orderNumber,

              userId:
                params.userId,

              cartId:
                cart.id,

              status:
                OrderStatus.PENDING_PAYMENT,

              subtotal,

              discountTotal:
                input.discountTotal,

              deliveryFee:
                input.deliveryFee,

              taxTotal:
                input.taxTotal,

              total,

              deliveryAddress:
                input.deliveryAddress as Prisma.InputJsonValue,

              billingAddress:
                input.billingAddress
                  ? (input.billingAddress as Prisma.InputJsonValue)
                  : undefined,

              notes:
                input.notes,

              items: {
                create:
                  cart.items.map(
                    (item) => {
                      const unitPrice =
                        Number(
                          item
                            .unitPriceSnapshot,
                        );

                      return {
                        productId:
                          item
                            .variant
                            .productId,

                        variantId:
                          item
                            .variantId,

                        productNameSnapshot:
                          item
                            .variant
                            .product
                            .name,

                        skuSnapshot:
                          item
                            .variant
                            .sku,

                        attributesSnapshot:
                          item
                            .variant
                            .attributes as Prisma.InputJsonValue,

                        unitPrice:
                          item
                            .unitPriceSnapshot,

                        quantity:
                          item
                            .quantity,

                        lineTotal:
                          unitPrice *
                          item.quantity,
                      };
                    },
                  ),
              },

              statusHistory: {
                create: {
                  status:
                    OrderStatus.PENDING_PAYMENT,

                  changedByUserId:
                    params.userId,

                  note:
                    "Order created from cart",
                },
              },
            },

            include: {
              items: true,
              statusHistory: true,
            },
          });

        /**
         * Reserve stock for every order item.
         */
        for (
          const item of
          cart.items
        ) {
          const inventory =
            item.variant
              .inventory!;

          /**
           * Increment reservation.
           */
          await tx.inventory.update({
            where: {
              variantId:
                item.variantId,
            },

            data: {
              reservedQuantity: {
                increment:
                  item.quantity,
              },
            },
          });

          /**
           * Create reservation record.
           *
           * Current reservation window:
           * 30 minutes.
           */
          await tx
            .inventoryReservation
            .create({
              data: {
                variantId:
                  item.variantId,

                orderId:
                  order.id,

                quantity:
                  item.quantity,

                status:
                  "ACTIVE",

                expiresAt:
                  new Date(
                    Date.now() +
                      30 *
                        60 *
                        1000,
                  ),
              },
            });

          /**
           * Record stock movement.
           *
           * Physical stock does not change
           * during reservation.
           */
          await tx
            .stockMovement
            .create({
              data: {
                variantId:
                  item.variantId,

                type:
                  StockMovementType.RESERVED,

                quantity:
                  item.quantity,

                previousPhysicalQuantity:
                  inventory
                    .physicalQuantity,

                resultingPhysicalQuantity:
                  inventory
                    .physicalQuantity,

                previousReservedQuantity:
                  inventory
                    .reservedQuantity,

                resultingReservedQuantity:
                  inventory
                    .reservedQuantity +
                  item.quantity,

                referenceType:
                  "ORDER",

                referenceId:
                  order.id,

                createdByUserId:
                  params.userId,
              },
            });
        }

        /**
         * Mark source cart as converted.
         */
        await tx.cart.update({
          where: {
            id: cart.id,
          },

          data: {
            status:
              "CONVERTED",
          },
        });

        return order;
      },
    );
  };

/**
 * Update order status.
 *
 * This method is intentionally generic.
 * Business-specific state transition rules
 * can be added here later.
 */
export const updateOrderStatus =
  async (params: {
    orderId: string;
    status: OrderStatus;
    note?: string;
    actorUserId: string;
  }) => {
    const existingOrder =
      await getOrder(
        params.orderId,
        {
          allowAll: true,
        },
      );

    if (
      existingOrder.status ===
      params.status
    ) {
      return existingOrder;
    }

    return prisma.$transaction(
      async (tx) => {
        const updatedOrder =
          await tx.order.update({
            where: {
              id:
                params.orderId,
            },

            data: {
              status:
                params.status,

              ...(params.status ===
                OrderStatus.CANCELLED && {
                cancelledAt:
                  new Date(),
              }),

              ...(params.status ===
                OrderStatus.PAID && {
                paidAt:
                  new Date(),
              }),
            },
          });

        await tx
          .orderStatusHistory
          .create({
            data: {
              orderId:
                params.orderId,

              status:
                params.status,

              note:
                params.note,

              changedByUserId:
                params.actorUserId,
            },
          });

        return updatedOrder;
      },
    );
  };

/**
 * Cancel an order.
 *
 * Current allowed statuses:
 *
 * PENDING_PAYMENT
 * PAID
 * PROCESSING
 *
 * Cancellation also releases active
 * inventory reservations.
 */
export const cancelOrder =
  async (params: {
    orderId: string;
    actorUserId: string;
  }) => {
    const order =
      await getOrder(
        params.orderId,
        {
          allowAll: true,
        },
      );

    if (
      !CANCELLABLE_ORDER_STATUSES.has(
        order.status,
      )
    ) {
      throw badRequest(
        "ORDER_NOT_CANCELLABLE",
        "Order can no longer be cancelled.",
      );
    }

    return prisma.$transaction(
      async (tx) => {
        /**
         * Reload active reservations inside
         * the transaction.
         */
        const reservations =
          await tx
            .inventoryReservation
            .findMany({
              where: {
                orderId:
                  params.orderId,

                status:
                  "ACTIVE",
              },

              include: {
                variant: {
                  include: {
                    inventory:
                      true,
                  },
                },
              },
            });

        /**
         * Release each stock reservation.
         */
        for (
          const reservation of
          reservations
        ) {
          const inventory =
            reservation.variant
              .inventory;

          if (!inventory) {
            continue;
          }

          const nextReservedQuantity =
            Math.max(
              0,
              inventory
                .reservedQuantity -
                reservation
                  .quantity,
            );

          await tx
            .inventory
            .update({
              where: {
                variantId:
                  reservation
                    .variantId,
              },

              data: {
                reservedQuantity:
                  nextReservedQuantity,
              },
            });

          await tx
            .inventoryReservation
            .update({
              where: {
                id:
                  reservation.id,
              },

              data: {
                status:
                  "RELEASED",
              },
            });

          await tx
            .stockMovement
            .create({
              data: {
                variantId:
                  reservation
                    .variantId,

                type:
                  StockMovementType.RESERVATION_RELEASED,

                quantity:
                  reservation
                    .quantity,

                previousPhysicalQuantity:
                  inventory
                    .physicalQuantity,

                resultingPhysicalQuantity:
                  inventory
                    .physicalQuantity,

                previousReservedQuantity:
                  inventory
                    .reservedQuantity,

                resultingReservedQuantity:
                  nextReservedQuantity,

                referenceType:
                  "ORDER",

                referenceId:
                  order.id,

                notes:
                  "Reservation released because order was cancelled.",

                createdByUserId:
                  params
                    .actorUserId,
              },
            });
        }

        /**
         * Update order state.
         */
        const cancelledOrder =
          await tx.order.update({
            where: {
              id:
                params.orderId,
            },

            data: {
              status:
                OrderStatus.CANCELLED,

              cancelledAt:
                new Date(),
            },
          });

        /**
         * Add order status history.
         */
        await tx
          .orderStatusHistory
          .create({
            data: {
              orderId:
                params.orderId,

              status:
                OrderStatus.CANCELLED,

              note:
                "Order cancelled",

              changedByUserId:
                params
                  .actorUserId,
            },
          });

        return cancelledOrder;
      },
    );
  };
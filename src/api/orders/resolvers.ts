import { GraphQLError } from "graphql/error";
import { OrderStatus } from "@prisma/client";

import * as service from "./service/index.js";

import { assertPermission } from "../../permissions/guard.js";

import type { Context } from "../../types/context.js";

type FindOrdersInput = {
  status?: OrderStatus;
  userId?: string;
  page?: number;
  limit?: number;
};

type FindMyOrdersInput = {
  status?: OrderStatus;
  page?: number;
  limit?: number;
};

type UpdateOrderStatusInput = {
  status: OrderStatus;
  note?: string | null;
};

function requireAuthenticatedUser(context: Context) {
  if (!context.user) {
    throw new GraphQLError(
      "Authentication required",
      {
        extensions: {
          code: "UNAUTHENTICATED",
          http: {
            status: 401,
          },
        },
      },
    );
  }

  return context.user;
}

function normalizePagination(
  page?: number,
  limit?: number,
) {
  const normalizedPage =
    Number.isInteger(page) && Number(page) > 0
      ? Number(page)
      : 1;

  const normalizedLimit =
    Number.isInteger(limit) && Number(limit) > 0
      ? Math.min(Number(limit), 100)
      : 20;

  return {
    page: normalizedPage,
    limit: normalizedLimit,
    skip:
      (normalizedPage - 1) *
      normalizedLimit,
    take: normalizedLimit,
  };
}

const OrderResolvers = {
  Query: {
    /**
     * Administrative order listing.
     *
     * Required permission:
     * orders.view
     *
     * RBAC action:
     * view:orders
     */
    orders: async (
      _: unknown,
      {
        input,
      }: {
        input?: FindOrdersInput;
      },
      context: Context,
    ) => {
      const user =
        requireAuthenticatedUser(
          context,
        );

      await assertPermission({
        userId: user.id,
        action: "view:orders",
      });

      const paging =
        normalizePagination(
          input?.page,
          input?.limit,
        );

      const [items, total] =
        await service.listOrders({
          userId:
            input?.userId,

          status:
            input?.status,

          skip:
            paging.skip,

          take:
            paging.take,
        });

      return {
        orders: items,

        total,

        page:
          paging.page,

        limit:
          paging.limit,

        totalPages:
          total === 0
            ? 0
            : Math.ceil(
                total /
                  paging.limit,
              ),
      };
    },

    /**
     * Returns orders belonging to the
     * currently authenticated user.
     */
    myOrders: async (
      _: unknown,
      {
        input,
      }: {
        input?: FindMyOrdersInput;
      },
      context: Context,
    ) => {
      const user =
        requireAuthenticatedUser(
          context,
        );

      const paging =
        normalizePagination(
          input?.page,
          input?.limit,
        );

      const [items, total] =
        await service.listOrders({
          userId:
            user.id,

          status:
            input?.status,

          skip:
            paging.skip,

          take:
            paging.take,
        });

      return {
        orders: items,

        total,

        page:
          paging.page,

        limit:
          paging.limit,

        totalPages:
          total === 0
            ? 0
            : Math.ceil(
                total /
                  paging.limit,
              ),
      };
    },

    /**
     * Returns a single order.
     *
     * A normal user can only access
     * their own order.
     *
     * A user with orders.view can
     * access any order.
     */
    order: async (
      _: unknown,
      {
        id,
      }: {
        id: string;
      },
      context: Context,
    ) => {
      const user =
        requireAuthenticatedUser(
          context,
        );

      const allowAll =
        user.isSuperAdmin ||
        user.permissions.includes(
          "orders.view",
        );

      const order =
        await service.getOrder(
          id,
          {
            userId: user.id,
            allowAll,
          },
        );

      if (!order) {
        throw new GraphQLError(
          "Order not found",
          {
            extensions: {
              code: "NOT_FOUND",
              http: {
                status: 404,
              },
            },
          },
        );
      }

      return order;
    },
  },

  Mutation: {
    /**
     * Creates an order from the
     * authenticated user's cart.
     *
     * No admin permission required.
     */
    checkout: async (
      _: unknown,
      {
        input,
      }: {
        input: unknown;
      },
      context: Context,
    ) => {
      const user =
        requireAuthenticatedUser(
          context,
        );

      return service.createOrderFromCart({
        userId:
          user.id,

        raw:
          input,
      });
    },

    /**
     * Updates order status.
     *
     * Required permission:
     * orders.update
     *
     * RBAC action:
     * update:orders
     */
    updateOrderStatus: async (
      _: unknown,
      {
        id,
        input,
      }: {
        id: string;
        input: UpdateOrderStatusInput;
      },
      context: Context,
    ) => {
      const user =
        requireAuthenticatedUser(
          context,
        );

      await assertPermission({
        userId:
          user.id,

        action:
          "update:orders",
      });

      return service.updateOrderStatus({
        orderId:
          id,

        status:
          input.status,

        note:
          input.note ?? undefined,

        actorUserId:
          user.id,
      });
    },

    /**
     * Cancels an order.
     *
     * Customers may attempt to cancel
     * their own order.
     *
     * Cancelling another user's order
     * requires orders.cancel.
     */
    cancelOrder: async (
      _: unknown,
      {
        id,
      }: {
        id: string;
      },
      context: Context,
    ) => {
      const user =
        requireAuthenticatedUser(
          context,
        );

      const order =
        await service.getOrder(
          id,
          {
            userId:
              user.id,

            allowAll:
              user.isSuperAdmin ||
              user.permissions.includes(
                "orders.view",
              ),
          },
        );

      if (!order) {
        throw new GraphQLError(
          "Order not found",
          {
            extensions: {
              code: "NOT_FOUND",
              http: {
                status: 404,
              },
            },
          },
        );
      }

      const ownsOrder =
        order.userId ===
        user.id;

      if (!ownsOrder) {
        await assertPermission({
          userId:
            user.id,

          action:
            "cancel:orders",
        });
      }

      return service.cancelOrder({
        orderId:
          id,

        actorUserId:
          user.id,
      });
    },
  },
};

export default OrderResolvers;
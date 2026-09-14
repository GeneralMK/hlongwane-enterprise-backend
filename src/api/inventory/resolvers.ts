import { GraphQLError } from "graphql/error";

import * as service from "./service/index.js";

import { assertPermission } from "../../permissions/guard.js";

import type { Context } from "../../types/context.js";

type AdjustInventoryInput = {
  quantityDelta: number;
  notes?: string | null;
  referenceType?: string | null;
  referenceId?: string | null;
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

const InventoryResolvers = {
  Query: {
    /**
     * Returns all inventory records.
     *
     * Required permission:
     * inventory.view
     *
     * RBAC action:
     * view:inventory
     */
    inventory: async (
      _: unknown,
      __: unknown,
      context: Context,
    ) => {
      const authenticatedUser =
        requireAuthenticatedUser(
          context,
        );

      await assertPermission({
        userId:
          authenticatedUser.id,

        action:
          "view:inventory",
      });

      return service.listInventory();
    },

    /**
     * Returns inventory for a single
     * product variant.
     *
     * Required permission:
     * inventory.view
     *
     * RBAC action:
     * view:inventory
     */
    inventoryByVariant: async (
      _: unknown,
      {
        variantId,
      }: {
        variantId: string;
      },
      context: Context,
    ) => {
      const authenticatedUser =
        requireAuthenticatedUser(
          context,
        );

      await assertPermission({
        userId:
          authenticatedUser.id,

        action:
          "view:inventory",
      });

      const inventory =
        await service.getInventory(
          variantId,
        );

      if (!inventory) {
        throw new GraphQLError(
          "Inventory record not found",
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

      return inventory;
    },
  },

  Mutation: {
    /**
     * Adjust inventory quantity.
     *
     * Required permission:
     * inventory.adjust
     *
     * RBAC action:
     * adjust:inventory
     */
    adjustInventory: async (
      _: unknown,
      {
        variantId,
        input,
      }: {
        variantId: string;
        input: AdjustInventoryInput;
      },
      context: Context,
    ) => {
      const authenticatedUser =
        requireAuthenticatedUser(
          context,
        );

      await assertPermission({
        userId:
          authenticatedUser.id,

        action:
          "adjust:inventory",
      });

      return service.adjustInventory({
        variantId,

        raw: input,

        actorUserId:
          authenticatedUser.id,
      });
    },
  },
};

export default InventoryResolvers;
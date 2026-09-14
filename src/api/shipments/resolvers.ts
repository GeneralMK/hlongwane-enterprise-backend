import { GraphQLError } from "graphql/error";

import * as service from "./service/index.js";

import { assertPermission } from "../../permissions/guard.js";

import type { Context } from "../../types/context.js";

type CreateShipmentInput = {
  orderId: string;
  provider: string;
  serviceLevel?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
};

type UpdateShipmentInput = {
  status: string;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  description?: string | null;
  location?: string | null;
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

const ShipmentResolvers = {
  Query: {
    shipment: async (
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

      const shipment =
        await service.getShipment(
          id,
        );

      if (!shipment) {
        throw new GraphQLError(
          "Shipment not found",
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
        shipment.order?.userId ===
        user.id;

      if (!ownsOrder) {
        await assertPermission({
          userId:
            user.id,

          action:
            "view:shipments",
        });
      }

      return shipment;
    },
  },

  Mutation: {
    createShipment: async (
      _: unknown,
      {
        input,
      }: {
        input: CreateShipmentInput;
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
          "update:shipments",
      });

      return service.createShipment(
        input,
      );
    },

    updateShipment: async (
      _: unknown,
      {
        id,
        input,
      }: {
        id: string;
        input: UpdateShipmentInput;
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
          "update:shipments",
      });

      return service.updateShipment(
        id,
        input,
      );
    },
  },
};

export default ShipmentResolvers;
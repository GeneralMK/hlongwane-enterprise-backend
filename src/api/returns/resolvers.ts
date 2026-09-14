import { GraphQLError } from "graphql/error";

import * as service from "./service/index.js";

import { assertPermission } from "../../permissions/guard.js";

import type { Context } from "../../types/context.js";

type CreateReturnInput = {
  orderId: string;
  reason: string;
  notes?: string | null;

  items: Array<{
    orderItemId: string;
    quantity: number;
  }>;
};

function requireAuthenticatedUser(context: Context) {
  if (!context.user) {
    throw new GraphQLError("Authentication required", {
      extensions: {
        code: "UNAUTHENTICATED",
        http: {
          status: 401,
        },
      },
    });
  }

  if (!context.user.isActive) {
    throw new GraphQLError("User account is inactive", {
      extensions: {
        code: "FORBIDDEN",
        http: {
          status: 403,
        },
      },
    });
  }

  return context.user;
}

const ReturnResolvers = {
  Query: {
    /**
     * Get a return request.
     *
     * Customer:
     * may view a return they requested.
     *
     * Staff:
     * requires returns.view.
     */
    returnRequest: async (
      _: unknown,
      {
        id,
      }: {
        id: string;
      },
      context: Context,
    ) => {
      const user = requireAuthenticatedUser(context);

      const returnRequest = await service.getReturn(id);

      if (!returnRequest) {
        throw new GraphQLError("Return request not found", {
          extensions: {
            code: "NOT_FOUND",
            http: {
              status: 404,
            },
          },
        });
      }

      const ownsReturn = returnRequest.requestedByUserId === user.id;

      if (!ownsReturn) {
        await assertPermission({
          userId: user.id,
          action: "view:returns",
        });
      }

      return returnRequest;
    },
  },

  Mutation: {
    /**
     * Create return request.
     *
     * The service must verify that
     * the order belongs to this user.
     */
    createReturn: async (
      _: unknown,
      {
        input,
      }: {
        input: CreateReturnInput;
      },
      context: Context,
    ) => {
      const user = requireAuthenticatedUser(context);

      return service.createReturn({
        userId: user.id,
        raw: input,
      });
    },

    /**
     * Approve return.
     *
     * RBAC:
     * approve:returns
     * -> returns.approve
     */
    approveReturn: async (
      _: unknown,
      {
        id,
      }: {
        id: string;
      },
      context: Context,
    ) => {
      const user = requireAuthenticatedUser(context);

      await assertPermission({
        userId: user.id,
        action: "approve:returns",
      });

      return service.approveReturn(id);
    },

    /**
     * Reject return.
     *
     * RBAC:
     * reject:returns
     * -> returns.reject
     */
    rejectReturn: async (
      _: unknown,
      {
        id,
      }: {
        id: string;
      },
      context: Context,
    ) => {
      const user = requireAuthenticatedUser(context);

      await assertPermission({
        userId: user.id,
        action: "reject:returns",
      });

      return service.rejectReturn(id);
    },
  },
};

export default ReturnResolvers;

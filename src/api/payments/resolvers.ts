import { GraphQLError } from "graphql/error";

import * as service from "./service/index.js";

import { assertPermission } from "../../permissions/guard.js";

import type { Context } from "../../types/context.js";

type InitializePaymentInput = {
  orderId: string;
  provider: string;
  callbackUrl?: string | null;
};

type RefundPaymentInput = {
  amount: string;
  reason?: string | null;
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

const PaymentResolvers = {
  Query: {
    /**
     * Returns a payment by ID.
     *
     * Required permission:
     * payments.view
     *
     * RBAC action:
     * view:payments
     */
    payment: async (
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

      await assertPermission({
        userId: user.id,
        action: "view:payments",
      });

      const payment =
        await service.getPayment(id);

      if (!payment) {
        throw new GraphQLError(
          "Payment not found",
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

      return payment;
    },

    /**
     * Returns a payment by internal
     * payment reference.
     *
     * Required permission:
     * payments.view
     *
     * RBAC action:
     * view:payments
     */
    paymentByReference: async (
      _: unknown,
      {
        reference,
      }: {
        reference: string;
      },
      context: Context,
    ) => {
      const user =
        requireAuthenticatedUser(
          context,
        );

      await assertPermission({
        userId: user.id,
        action: "view:payments",
      });

      const payment =
        await service
          .getPaymentByReference(
            reference,
          );

      if (!payment) {
        throw new GraphQLError(
          "Payment not found",
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

      return payment;
    },
  },

  Mutation: {
    /**
     * Initializes payment checkout
     * for the authenticated user.
     *
     * This is a customer operation,
     * so no admin payment permission
     * is required.
     *
     * Ownership validation should be
     * enforced by initializeCheckout().
     */
    initializePayment: async (
      _: unknown,
      {
        input,
      }: {
        input: InitializePaymentInput;
      },
      context: Context,
    ) => {
      const user =
        requireAuthenticatedUser(
          context,
        );

      return service
        .initializeCheckout({
          userId:
            user.id,

          email:
            user.email,

          raw:
            input,
        });
    },

    /**
     * Requests a refund.
     *
     * Required permission:
     * payments.refund
     *
     * RBAC action:
     * refund:payments
     */
    refundPayment: async (
      _: unknown,
      {
        paymentId,
        input,
      }: {
        paymentId: string;
        input: RefundPaymentInput;
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
          "refund:payments",
      });

      return service.requestRefund({
        paymentId,

        actorUserId:
          user.id,

        raw:
          input,
      });
    },
  },
};

export default PaymentResolvers;
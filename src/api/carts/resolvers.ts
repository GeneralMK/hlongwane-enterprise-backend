import { GraphQLError } from "graphql/error";

import * as service from "./service/index.js";

import type { Context } from "../../types/context.js";

type AddCartItemInput = {
  variantId: string;
  quantity: number;
};

type UpdateCartItemInput = {
  quantity: number;
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

const CartResolvers = {
  Query: {
    /**
     * Returns the authenticated user's active cart.
     */
    myCart: async (
      _: unknown,
      __: unknown,
      context: Context,
    ) => {
      const user =
        requireAuthenticatedUser(
          context,
        );

      return service.getMyCart(
        user.id,
      );
    },
  },

  Mutation: {
    /**
     * Adds an item to the authenticated
     * user's active cart.
     */
    addCartItem: async (
      _: unknown,
      {
        input,
      }: {
        input: AddCartItemInput;
      },
      context: Context,
    ) => {
      const user =
        requireAuthenticatedUser(
          context,
        );

      return service.addItem(
        user.id,
        input,
      );
    },

    /**
     * Updates the quantity of an item
     * in the authenticated user's cart.
     */
    updateCartItem: async (
      _: unknown,
      {
        id,
        input,
      }: {
        id: string;
        input: UpdateCartItemInput;
      },
      context: Context,
    ) => {
      const user =
        requireAuthenticatedUser(
          context,
        );

      return service.updateQuantity(
        user.id,
        id,
        input.quantity,
      );
    },

    /**
     * Removes an item from the
     * authenticated user's cart.
     */
    removeCartItem: async (
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

      await service.removeItem(
        user.id,
        id,
      );

      return true;
    },
  },
};

export default CartResolvers;
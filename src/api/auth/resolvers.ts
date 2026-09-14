import { GraphQLError } from "graphql/error";

import * as service from "./service/index.js";

import type { Context } from "../../types/context.js";

type RegisterCustomerInput = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
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

  if (!context.user.isActive) {
    throw new GraphQLError(
      "User account is inactive",
      {
        extensions: {
          code: "FORBIDDEN",
          http: {
            status: 403,
          },
        },
      },
    );
  }

  return context.user;
}

const AuthResolvers = {
  Query: {
    /**
     * Returns the currently authenticated user.
     */
    me: async (
      _: unknown,
      __: unknown,
      context: Context,
    ) => {
      return requireAuthenticatedUser(
        context,
      );
    },
  },

  Mutation: {
    /**
     * Customer registration.
     *
     * This mutation is public.
     */
    registerCustomer: async (
      _: unknown,
      {
        input,
      }: {
        input: RegisterCustomerInput;
      },
    ) => {
      return service.registerCustomer(
        input,
      );
    },
  },
};

export default AuthResolvers;
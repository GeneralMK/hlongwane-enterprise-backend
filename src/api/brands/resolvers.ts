import { GraphQLError } from "graphql/error";

import * as service from "./service/index.js";

import { assertPermission } from "../../permissions/guard.js";

import type { Context } from "../../types/context.js";

type CreateBrandInput = {
  name: string;
  slug?: string;
  description?: string | null;
  logoFileId?: string | null;
};

type UpdateBrandInput = {
  name?: string;
  slug?: string;
  description?: string | null;
  logoFileId?: string | null;
  isActive?: boolean;
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

const BrandResolvers = {
  Query: {
    /**
     * Public brand listing.
     *
     * No permission required.
     */
    brands: async (
      _: unknown,
      __: unknown,
      _context: Context,
    ) => {
      return service.listBrands();
    },

    /**
     * Public single-brand lookup.
     *
     * No permission required.
     */
    brand: async (
      _: unknown,
      {
        id,
      }: {
        id: string;
      },
      _context: Context,
    ) => {
      const brand =
        await service.getBrand(id);

      if (!brand) {
        throw new GraphQLError(
          "Brand not found",
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

      return brand;
    },
  },

  Mutation: {
    /**
     * Create a brand.
     *
     * Required permission:
     * brands.create
     *
     * RBAC Action:
     * create:brands
     */
    createBrand: async (
      _: unknown,
      {
        input,
      }: {
        input: CreateBrandInput;
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
          "create:brands",
      });

      return service.createBrand(
        input,
      );
    },

    /**
     * Update a brand.
     *
     * Required permission:
     * brands.update
     *
     * RBAC Action:
     * update:brands
     */
    updateBrand: async (
      _: unknown,
      {
        id,
        input,
      }: {
        id: string;
        input: UpdateBrandInput;
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
          "update:brands",
      });

      return service.updateBrand(
        id,
        input,
      );
    },
  },
};

export default BrandResolvers;
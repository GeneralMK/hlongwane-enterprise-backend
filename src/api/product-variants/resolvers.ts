import { GraphQLError } from "graphql/error";

import * as service from "./service/index.js";

import { assertPermission } from "../../permissions/guard.js";

import type { Context } from "../../types/context.js";

type CreateProductVariantInput = {
  productId: string;
  sku: string;
  barcode?: string | null;
  price: string;
  salePrice?: string | null;
  costPrice?: string | null;
  attributes: Record<string, unknown>;
  weightGrams?: number | null;
};

type UpdateProductVariantInput = {
  sku?: string;
  barcode?: string | null;
  price?: string;
  salePrice?: string | null;
  costPrice?: string | null;
  attributes?: Record<string, unknown>;
  weightGrams?: number | null;
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

const ProductVariantResolvers = {
  Query: {
    /**
     * Public single product variant lookup.
     */
    productVariant: async (
      _: unknown,
      {
        id,
      }: {
        id: string;
      },
    ) => {
      const variant =
        await service.getVariant(id);

      if (!variant) {
        throw new GraphQLError(
          "Product variant not found",
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

      return variant;
    },

    /**
     * Public product variant listing
     * for a specific product.
     */
    productVariants: async (
      _: unknown,
      {
        productId,
      }: {
        productId: string;
      },
    ) => {
      return service.listProductVariants(
        productId,
      );
    },
  },

  Mutation: {
    /**
     * Create product variant.
     *
     * Required permission:
     * products.create
     *
     * RBAC action:
     * create:products
     */
    createProductVariant: async (
      _: unknown,
      {
        input,
      }: {
        input: CreateProductVariantInput;
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
          "create:products",
      });

      return service.createVariant(
        input,
      );
    },

    /**
     * Update product variant.
     *
     * Required permission:
     * products.update
     *
     * RBAC action:
     * update:products
     */
    updateProductVariant: async (
      _: unknown,
      {
        id,
        input,
      }: {
        id: string;
        input: UpdateProductVariantInput;
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
          "update:products",
      });

      return service.updateVariant(
        id,
        input,
      );
    },
  },
};

export default ProductVariantResolvers;
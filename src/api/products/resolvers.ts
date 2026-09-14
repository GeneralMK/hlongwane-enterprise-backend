import { GraphQLError } from "graphql/error";
import { ProductStatus } from "@prisma/client";

import * as service from "./service/index.js";

import { assertPermission } from "../../permissions/guard.js";

import type { Context } from "../../types/context.js";

type FindProductsInput = {
  search?: string;
  status?: ProductStatus;
  brandId?: string;
  categoryId?: string;
  isFeatured?: boolean;
  page?: number;
  limit?: number;
};

type CreateProductInput = {
  name: string;
  slug?: string;
  shortDescription?: string | null;
  description?: string | null;
  brandId: string;
  categoryId: string;
  specifications?: Record<string, unknown> | null;
  warrantyMonths?: number | null;
  isFeatured?: boolean;
};

type UpdateProductInput = {
  name?: string;
  slug?: string;
  shortDescription?: string | null;
  description?: string | null;
  status?: ProductStatus;
  brandId?: string;
  categoryId?: string;
  specifications?: Record<string, unknown> | null;
  warrantyMonths?: number | null;
  isFeatured?: boolean;
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
    Number.isInteger(page) &&
    Number(page) > 0
      ? Number(page)
      : 1;

  const normalizedLimit =
    Number.isInteger(limit) &&
    Number(limit) > 0
      ? Math.min(
          Number(limit),
          100,
        )
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

const ProductResolvers = {
  Query: {
    /**
     * Public product catalogue.
     */
    products: async (
      _: unknown,
      {
        input,
      }: {
        input?: FindProductsInput;
      },
    ) => {
      const paging =
        normalizePagination(
          input?.page,
          input?.limit,
        );

      const result =
        await service.listProducts({
          search:
            input?.search?.trim() ||
            undefined,

          status:
            input?.status,

          brandId:
            input?.brandId,

          categoryId:
            input?.categoryId,

          isFeatured:
            input?.isFeatured,

          skip:
            paging.skip,

          take:
            paging.take,
        });

      return {
        products:
          result.items,

        total:
          result.total,

        page:
          paging.page,

        limit:
          paging.limit,

        totalPages:
          result.total === 0
            ? 0
            : Math.ceil(
                result.total /
                  paging.limit,
              ),
      };
    },

    /**
     * Public single product lookup.
     */
    product: async (
      _: unknown,
      {
        id,
      }: {
        id: string;
      },
    ) => {
      const product =
        await service.getProduct(id);

      if (!product) {
        throw new GraphQLError(
          "Product not found",
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

      return product;
    },
  },

  Mutation: {
    /**
     * Create product.
     *
     * Required permission:
     * create:products
     *
     * RBAC action:
     * ccreate:products
     */
    createProduct: async (
      _: unknown,
      {
        input,
      }: {
        input: CreateProductInput;
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
          "ccreate:products",
      });

      return service.createProduct(
        input,
      );
    },

    /**
     * Update product.
     *
     * Required permission:
     * update:products
     *
     * RBAC action:
     * update:products
     */
    updateProduct: async (
      _: unknown,
      {
        id,
        input,
      }: {
        id: string;
        input: UpdateProductInput;
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

      return service.updateProduct(
        id,
        input,
      );
    },

    /**
     * Archive product.
     *
     * Required permission:
     * delete:products
     *
     * RBAC action:
     * delete:products
     */
    archiveProduct: async (
      _: unknown,
      {
        id,
      }: {
        id: string;
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
          "delete:products",
      });

      return service.archiveProduct(
        id,
      );
    },
  },
};

export default ProductResolvers;
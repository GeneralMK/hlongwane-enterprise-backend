import { GraphQLError } from "graphql/error";

import * as service from "./service/index.js";

import { assertPermission } from "../../permissions/guard.js";

import type { Context } from "../../types/context.js";

type CreateCategoryInput = {
  name: string;
  slug?: string;
  description?: string | null;
  imageFileId?: string | null;
  parentId?: string | null;
};

type UpdateCategoryInput = {
  name?: string;
  slug?: string;
  description?: string | null;
  imageFileId?: string | null;
  parentId?: string | null;
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

const CategoryResolvers = {
  Query: {
    /**
     * Public category listing.
     *
     * No permission required.
     */
    categories: async (
      _: unknown,
      __: unknown,
      _context: Context,
    ) => {
      return service.listCategories();
    },

    /**
     * Public single-category lookup.
     *
     * No permission required.
     */
    category: async (
      _: unknown,
      {
        id,
      }: {
        id: string;
      },
      _context: Context,
    ) => {
      const category =
        await service.getCategory(id);

      if (!category) {
        throw new GraphQLError(
          "Category not found",
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

      return category;
    },
  },

  Mutation: {
    /**
     * Create category.
     *
     * Required permission:
     * categories.create
     *
     * RBAC action:
     * create:categories
     */
    createCategory: async (
      _: unknown,
      {
        input,
      }: {
        input: CreateCategoryInput;
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
          "create:categories",
      });

      return service.createCategory(
        input,
      );
    },

    /**
     * Update category.
     *
     * Required permission:
     * categories.update
     *
     * RBAC action:
     * update:categories
     */
    updateCategory: async (
      _: unknown,
      {
        id,
        input,
      }: {
        id: string;
        input: UpdateCategoryInput;
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
          "update:categories",
      });

      return service.updateCategory(
        id,
        input,
      );
    },
  },
};

export default CategoryResolvers;
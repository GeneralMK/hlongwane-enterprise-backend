import { makeExecutableSchema } from "@graphql-tools/schema";

import AuditResolvers from "../src/api/audit/resolvers";
import AuditSchema from "../src/api/audit/schema.graphql";

import AuthResolvers from "../src/api/auth/resolvers";
import AuthSchema from "../src/api/auth/schema.graphql";

import BrandResolvers from "../src/api/brands/resolvers";
import BrandSchema from "../src/api/brands/schema.graphql";

import CartResolvers from "../src/api/carts/resolvers";
import CartSchema from "../src/api/carts/schema.graphql";

import CategoryResolvers from "../src/api/categories/resolvers";
import CategorySchema from "../src/api/categories/schema.graphql";

import FileUploadResolvers from "../src/api/file-upload/resolvers";
import FileUploadSchema from "../src/api/file-upload/schema.graphql";

import InventoryResolvers from "../src/api/inventory/resolvers";
import InventorySchema from "../src/api/inventory/schema.graphql";

import NotificationResolvers from "../src/api/notifications/resolvers";
import NotificationSchema from "../src/api/notifications/schema.graphql";

import OrderResolvers from "../src/api/orders/resolvers";
import OrderSchema from "../src/api/orders/schema.graphql";

import PaymentResolvers from "../src/api/payments/resolvers";
import PaymentSchema from "../src/api/payments/schema.graphql";

import ProductResolvers from "../src/api/products/resolvers";
import ProductSchema from "../src/api/products/schema.graphql";

import ProductVariantResolvers from "../src/api/product-variants/resolvers";
import ProductVariantSchema from "../src/api/product-variants/schema.graphql";

import ReturnResolvers from "../src/api/returns/resolvers";
import ReturnSchema from "../src/api/returns/schema.graphql";

import RoleResolvers from "../src/api/roles/resolvers";
import RoleSchema from "../src/api/roles/schema.graphql";

import ShipmentResolvers from "../src/api/shipments/resolvers";
import ShipmentSchema from "../src/api/shipments/schema.graphql";

import UserResolvers from "../src/api/users/resolvers";
import UserSchema from "../src/api/users/schema.graphql";

const CommonTypeDefs = `#graphql

scalar JSON

scalar DateTime

scalar BigInt

type Query {
  _empty: String
}

type Mutation {
  _empty: String
}

`;

const typeDefs = [
  CommonTypeDefs,

  AuditSchema,
  AuthSchema,
  BrandSchema,
  CartSchema,
  CategorySchema,
  FileUploadSchema,
  InventorySchema,
  NotificationSchema,
  OrderSchema,
  PaymentSchema,
  ProductSchema,
  ProductVariantSchema,
  ReturnSchema,
  RoleSchema,
  ShipmentSchema,
  UserSchema,
];

const resolvers = [
  AuditResolvers,
  AuthResolvers,
  BrandResolvers,
  CartResolvers,
  CategoryResolvers,
  FileUploadResolvers,
  InventoryResolvers,
  NotificationResolvers,
  OrderResolvers,
  PaymentResolvers,
  ProductResolvers,
  ProductVariantResolvers,
  ReturnResolvers,
  RoleResolvers,
  ShipmentResolvers,
  UserResolvers,
];

const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});

export default schema;
const ProductVariantSchema = `#graphql

type ProductVariant {
  id: ID!
  productId: ID!
  sku: String!
  barcode: String
  price: String!
  salePrice: String
  costPrice: String
  attributes: JSON!
  isActive: Boolean!
  weightGrams: Int
  inventory: Inventory
  serializedDevices: [SerializedDevice!]!
  createdAt: DateTime!
  updatedAt: DateTime!
}

input CreateProductVariantInput {
  productId: ID!
  sku: String!
  barcode: String
  price: String!
  salePrice: String
  costPrice: String
  attributes: JSON!
  weightGrams: Int
}

input UpdateProductVariantInput {
  sku: String
  barcode: String
  price: String
  salePrice: String
  costPrice: String
  attributes: JSON
  weightGrams: Int
  isActive: Boolean
}

extend type Query {
  productVariant(id: ID!): ProductVariant
  productVariants(productId: ID!): [ProductVariant!]!
}

extend type Mutation {
  createProductVariant(input: CreateProductVariantInput!): ProductVariant!
  updateProductVariant(
    id: ID!
    input: UpdateProductVariantInput!
  ): ProductVariant!
}

`;

export default ProductVariantSchema;

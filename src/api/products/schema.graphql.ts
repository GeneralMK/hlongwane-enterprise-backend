const ProductSchema = `#graphql

enum ProductStatus {
  DRAFT
  ACTIVE
  INACTIVE
  ARCHIVED
}

type ProductImage {
  id: ID!
  productId: ID!
  fileUploadId: ID!
  altText: String
  position: Int!
  isPrimary: Boolean!
  fileUpload: FileUpload
  createdAt: DateTime!
  updatedAt: DateTime!
}

type Product {
  id: ID!
  name: String!
  slug: String!
  shortDescription: String
  description: String
  status: ProductStatus!
  brandId: ID!
  categoryId: ID!
  specifications: JSON
  warrantyMonths: Int
  isFeatured: Boolean!
  publishedAt: DateTime
  brand: Brand!
  category: Category!
  images: [ProductImage!]!
  variants: [ProductVariant!]!
  createdAt: DateTime!
  updatedAt: DateTime!
}

type ProductPagination {
  products: [Product!]!
  total: Int!
  page: Int!
  limit: Int!
  totalPages: Int!
}

input FindProductsInput {
  search: String
  status: ProductStatus
  brandId: ID
  categoryId: ID
  isFeatured: Boolean
  page: Int = 1
  limit: Int = 20
}

input CreateProductInput {
  name: String!
  slug: String
  shortDescription: String
  description: String
  brandId: ID!
  categoryId: ID!
  specifications: JSON
  warrantyMonths: Int
  isFeatured: Boolean
}

input UpdateProductInput {
  name: String
  slug: String
  shortDescription: String
  description: String
  status: ProductStatus
  brandId: ID
  categoryId: ID
  specifications: JSON
  warrantyMonths: Int
  isFeatured: Boolean
}

extend type Query {
  products(input: FindProductsInput): ProductPagination!
  product(id: ID!): Product
}

extend type Mutation {
  createProduct(input: CreateProductInput!): Product!
  updateProduct(id: ID!, input: UpdateProductInput!): Product!
  archiveProduct(id: ID!): Product!
}

`;

export default ProductSchema;

export const productTypeDefs = `#graphql
  enum ProductStatus { DRAFT ACTIVE INACTIVE ARCHIVED }

  type Brand { id: ID! name: String! slug: String! }
  type Category { id: ID! name: String! slug: String! }
  type Inventory { physicalQuantity: Int! reservedQuantity: Int! soldQuantity: Int! reorderLevel: Int! }
  type ProductVariant { id: ID! sku: String! barcode: String price: String! salePrice: String isActive: Boolean! attributes: JSON! inventory: Inventory }
  type ProductImage { id: ID! altText: String position: Int! isPrimary: Boolean! url: String }
  type Product { id: ID! name: String! slug: String! shortDescription: String description: String status: ProductStatus! isFeatured: Boolean! warrantyMonths: Int brand: Brand! category: Category! images: [ProductImage!]! variants: [ProductVariant!]! createdAt: String! updatedAt: String! }

  input ProductFilterInput { search: String status: ProductStatus brandId: ID categoryId: ID take: Int skip: Int }
  input ProductInput { name: String! slug: String! shortDescription: String description: String brandId: ID! categoryId: ID! warrantyMonths: Int isFeatured: Boolean }
  input ProductUpdateInput { name: String slug: String shortDescription: String description: String brandId: ID categoryId: ID warrantyMonths: Int isFeatured: Boolean }

  extend type Query { products(filter: ProductFilterInput): [Product!]! product(id: ID, slug: String): Product }
  extend type Mutation { createProduct(input: ProductInput!): Product! updateProduct(id: ID!, input: ProductUpdateInput!): Product! }
`

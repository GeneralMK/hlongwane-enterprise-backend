const BrandSchema = `#graphql

type Brand {
  id: ID!
  name: String!
  slug: String!
  description: String
  logoFileId: ID
  logoFile: FileUpload
  isActive: Boolean!
  createdAt: DateTime!
  updatedAt: DateTime!
}

input CreateBrandInput {
  name: String!
  slug: String
  description: String
  logoFileId: ID
}

input UpdateBrandInput {
  name: String
  slug: String
  description: String
  logoFileId: ID
  isActive: Boolean
}

extend type Query {
  brands: [Brand!]!
  brand(id: ID!): Brand
}

extend type Mutation {
  createBrand(input: CreateBrandInput!): Brand!
  updateBrand(id: ID!, input: UpdateBrandInput!): Brand!
}

`;

export default BrandSchema;

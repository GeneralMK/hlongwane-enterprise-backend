const CategorySchema = `#graphql

type Category {
  id: ID!
  name: String!
  slug: String!
  description: String
  imageFileId: ID
  imageFile: FileUpload
  parentId: ID
  parent: Category
  children: [Category!]!
  isActive: Boolean!
  createdAt: DateTime!
  updatedAt: DateTime!
}

input CreateCategoryInput {
  name: String!
  slug: String
  description: String
  imageFileId: ID
  parentId: ID
}

input UpdateCategoryInput {
  name: String
  slug: String
  description: String
  imageFileId: ID
  parentId: ID
  isActive: Boolean
}

extend type Query {
  categories: [Category!]!
  category(id: ID!): Category
}

extend type Mutation {
  createCategory(input: CreateCategoryInput!): Category!
  updateCategory(id: ID!, input: UpdateCategoryInput!): Category!
}

`;

export default CategorySchema;

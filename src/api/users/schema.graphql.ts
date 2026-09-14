const UserSchema = `#graphql

type UserRoleAssignedBy {
  id: ID!
  email: String!
  firstName: String!
  lastName: String!
}

type AdminProfile {
  id: ID!
  userId: ID!
  employeeCode: String
  jobTitle: String
  department: String
  isActive: Boolean!
  lastLoginAt: DateTime
  createdAt: DateTime!
  updatedAt: DateTime!
}

type User {
  id: ID!
  authUserId: ID!
  email: String!
  firstName: String!
  lastName: String!
  phone: String
  isActive: Boolean!
  emailVerifiedAt: DateTime
  lastLoginAt: DateTime
  userRoles: [UserRole!]!
  adminProfile: AdminProfile
  createdAt: DateTime!
  updatedAt: DateTime!
}

type UserPagination {
  users: [User!]!
  total: Int!
  page: Int!
  limit: Int!
  totalPages: Int!
}

input FindUsersInput {
  search: String
  isActive: Boolean
  roleCode: String
  page: Int = 1
  limit: Int = 20
}

input UpdateUserInput {
  firstName: String
  lastName: String
  phone: String
  isActive: Boolean
}

extend type Query {
  users(input: FindUsersInput): UserPagination!
  user(id: ID!): User
}

extend type Mutation {
  updateUser(id: ID!, input: UpdateUserInput!): User!
}

`;

export default UserSchema;

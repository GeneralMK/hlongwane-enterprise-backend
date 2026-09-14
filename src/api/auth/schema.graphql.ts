const AuthSchema = `#graphql

input RegisterCustomerInput {
  email: String!
  password: String!
  firstName: String!
  lastName: String!
  phone: String
}

type AuthRole {
  id: ID!
  code: String!
  name: String!
}

type AuthUser {
  id: ID!
  authUserId: ID!
  email: String!
  firstName: String!
  lastName: String!
  phone: String
  isActive: Boolean!
  roles: [AuthRole!]!
  permissions: [String!]!
  isAdmin: Boolean!
  isSuperAdmin: Boolean!
}

extend type Query {
  me: AuthUser
}

extend type Mutation {
  registerCustomer(input: RegisterCustomerInput!): User!
}

`;

export default AuthSchema;

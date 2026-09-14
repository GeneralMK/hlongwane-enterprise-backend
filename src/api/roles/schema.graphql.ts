const RoleSchema = `#graphql

type Permission {
  id: ID!
  code: String!
  name: String!
  description: String
  module: String
  isActive: Boolean!
  createdAt: DateTime!
  updatedAt: DateTime!
}

type RolePermission {
  permission: Permission!
}

type Role {
  id: ID!
  code: String!
  name: String!
  description: String
  isSystem: Boolean!
  isActive: Boolean!
  permissions: [RolePermission!]!
  createdAt: DateTime!
  updatedAt: DateTime!
}

type UserRole {
  id: ID!
  userId: ID!
  roleId: ID!
  assignedByUserId: ID
  isActive: Boolean!
  assignedAt: DateTime!
  revokedAt: DateTime
  role: Role!
  assignedBy: UserRoleAssignedBy
  createdAt: DateTime!
  updatedAt: DateTime!
}

input AssignUserRoleInput {
  userId: ID!
  roleId: ID!
}

input RevokeUserRoleInput {
  userId: ID!
  roleId: ID!
}

extend type Query {
  roles: [Role!]!
  role(id: ID!): Role
  userRoles(userId: ID!): [UserRole!]!
}

extend type Mutation {
  assignUserRole(input: AssignUserRoleInput!): UserRole!
  revokeUserRole(input: RevokeUserRoleInput!): UserRole!
}

`;

export default RoleSchema;

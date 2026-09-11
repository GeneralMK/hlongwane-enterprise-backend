export const adminTypeDefs = `#graphql
  enum UserRole { CUSTOMER ADMIN SUPER_ADMIN }
  type UserRoleAssignment { id: ID! role: UserRole! isActive: Boolean! assignedAt: String! revokedAt: String }
  type AdminProfile { id: ID! employeeCode: String jobTitle: String department: String isActive: Boolean! }
  type User { id: ID! authUserId: ID! email: String! firstName: String! lastName: String! phone: String isActive: Boolean! role: UserRole! userRoles: [UserRoleAssignment!]! adminProfile: AdminProfile createdAt: String! updatedAt: String! }
  extend type Query { users: [User!]! user(id: ID!): User }
  extend type Mutation { assignUserRole(userId: ID!, role: UserRole!): UserRoleAssignment! revokeUserRole(userId: ID!, role: UserRole!): UserRoleAssignment! }
`

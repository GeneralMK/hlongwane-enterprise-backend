export const authTypeDefs = `#graphql
  type AuthRole { id: ID! code: String! name: String! }
  type AuthUser { id: ID! authUserId: ID! email: String! firstName: String! lastName: String! roles: [AuthRole!]! permissions: [String!]! isAdmin: Boolean! isSuperAdmin: Boolean! }
  type AuthSession { access_token: String! refresh_token: String! expires_in: Int! token_type: String! }
  type AuthPayload { user: AuthUser session: AuthSession }
  input RegisterInput { email: String! password: String! firstName: String! lastName: String! phone: String }
  input LoginInput { email: String! password: String! }
  extend type Query { me: AuthUser }
  extend type Mutation { register(input: RegisterInput!): AuthPayload! login(input: LoginInput!): AuthPayload! }
`

const AuditSchema = `#graphql

type AuditActor {
  id: ID!
  email: String!
  firstName: String!
  lastName: String!
}

type AuditLog {
  id: ID!
  actorUserId: ID
  action: String!
  entityType: String!
  entityId: String
  before: JSON
  after: JSON
  metadata: JSON
  ipAddress: String
  userAgent: String
  actor: AuditActor
  createdAt: DateTime!
}

type AuditLogPagination {
  auditLogs: [AuditLog!]!
  total: Int!
  page: Int!
  limit: Int!
  totalPages: Int!
}

input FindAuditLogsInput {
  actorUserId: ID
  entityType: String
  action: String
  page: Int = 1
  limit: Int = 20
}

extend type Query {
  auditLogs(input: FindAuditLogsInput): AuditLogPagination!
}

`;

export default AuditSchema;

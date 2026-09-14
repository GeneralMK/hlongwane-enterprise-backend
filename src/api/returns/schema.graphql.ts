const ReturnSchema = `#graphql

enum ReturnStatus {
  REQUESTED
  APPROVED
  REJECTED
  RECEIVED
  INSPECTING
  COMPLETED
  CANCELLED
}

enum ReturnItemCondition {
  UNOPENED
  OPENED
  USED
  DAMAGED
  FAULTY
}

type ReturnItem {
  id: ID!
  returnRequestId: ID!
  orderItemId: ID!
  quantity: Int!
  condition: ReturnItemCondition
  resolution: String
  createdAt: DateTime!
  updatedAt: DateTime!
}

type ReturnEvidence {
  id: ID!
  returnRequestId: ID!
  fileUploadId: ID!
  fileUpload: FileUpload!
  createdAt: DateTime!
}

type ReturnRequest {
  id: ID!
  orderId: ID!
  requestedByUserId: ID
  status: ReturnStatus!
  reason: String!
  notes: String
  items: [ReturnItem!]!
  evidence: [ReturnEvidence!]!
  createdAt: DateTime!
  updatedAt: DateTime!
}

input ReturnItemInput {
  orderItemId: ID!
  quantity: Int!
}

input CreateReturnInput {
  orderId: ID!
  reason: String!
  notes: String
  items: [ReturnItemInput!]!
}

extend type Query {
  returnRequest(id: ID!): ReturnRequest
}

extend type Mutation {
  createReturn(input: CreateReturnInput!): ReturnRequest!
  approveReturn(id: ID!): ReturnRequest!
  rejectReturn(id: ID!): ReturnRequest!
}

`;

export default ReturnSchema;

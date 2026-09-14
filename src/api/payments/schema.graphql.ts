const PaymentSchema = `#graphql

enum PaymentStatus {
  INITIALIZED
  PENDING
  PROCESSING
  SUCCEEDED
  FAILED
  CANCELLED
  EXPIRED
  REFUNDED
  PARTIALLY_REFUNDED
}

enum PaymentProvider {
  PAYSTACK
  PAYFAST
  OZOW
  PEACH_PAYMENTS
  PAYFLEX
  MOBICRED
}

enum RefundStatus {
  REQUESTED
  PROCESSING
  SUCCEEDED
  FAILED
  CANCELLED
}

type PaymentEvent {
  id: ID!
  paymentId: ID!
  providerEventId: String
  idempotencyKey: String!
  eventType: String!
  signatureValid: Boolean!
  payload: JSON!
  processedAt: DateTime
  createdAt: DateTime!
}

type Refund {
  id: ID!
  orderId: ID!
  paymentId: ID!
  status: RefundStatus!
  amount: String!
  reason: String
  providerReference: String
  processedAt: DateTime
  createdAt: DateTime!
  updatedAt: DateTime!
}

type Payment {
  id: ID!
  orderId: ID!
  provider: PaymentProvider!
  status: PaymentStatus!
  reference: String!
  providerReference: String
  amount: String!
  currency: String!
  checkoutUrl: String
  failureCode: String
  failureMessage: String
  verifiedAt: DateTime
  paidAt: DateTime
  metadata: JSON
  events: [PaymentEvent!]!
  refunds: [Refund!]!
  createdAt: DateTime!
  updatedAt: DateTime!
}

input InitializePaymentInput {
  orderId: ID!
  provider: PaymentProvider!
  callbackUrl: String
}

input RefundPaymentInput {
  amount: String!
  reason: String
}

extend type Query {
  payment(id: ID!): Payment
  paymentByReference(reference: String!): Payment
}

extend type Mutation {
  initializePayment(input: InitializePaymentInput!): Payment!
  refundPayment(
    paymentId: ID!
    input: RefundPaymentInput!
  ): Refund!
}

`;

export default PaymentSchema;

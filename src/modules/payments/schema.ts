export const paymentTypeDefs = `#graphql
  enum PaymentProvider { PAYSTACK PAYFAST OZOW PEACH_PAYMENTS PAYFLEX MOBICRED }
  enum PaymentStatus { INITIALIZED PENDING PROCESSING SUCCEEDED FAILED CANCELLED EXPIRED REFUNDED PARTIALLY_REFUNDED }
  type Payment { id: ID! orderId: ID! provider: PaymentProvider! status: PaymentStatus! reference: String! providerReference: String amount: String! currency: String! checkoutUrl: String failureCode: String failureMessage: String paidAt: String verifiedAt: String createdAt: String! }
  extend type Query { payments: [Payment!]! payment(id: ID!): Payment }
  extend type Mutation { initializePayment(orderId: ID!, provider: PaymentProvider!): Payment! }
`

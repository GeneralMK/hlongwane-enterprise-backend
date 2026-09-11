export const orderTypeDefs = `#graphql
  enum OrderStatus { PENDING_PAYMENT PAYMENT_FAILED PAID PROCESSING PACKED SHIPPED OUT_FOR_DELIVERY DELIVERED CANCELLED RETURN_REQUESTED RETURNED REFUNDED PARTIALLY_REFUNDED }
  type Order { id: ID! orderNumber: String! status: OrderStatus! currency: String! subtotal: String! discountTotal: String! deliveryFee: String! taxTotal: String! total: String! guestEmail: String placedAt: String! paidAt: String cancelledAt: String }
  input OrderFilterInput { userId: ID status: OrderStatus take: Int skip: Int }
  extend type Query { orders(filter: OrderFilterInput): [Order!]! order(id: ID!): Order }
  extend type Mutation { transitionOrder(id: ID!, status: OrderStatus!, note: String): Order! }
`

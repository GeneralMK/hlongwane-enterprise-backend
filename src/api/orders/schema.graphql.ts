const OrderSchema = `#graphql

enum OrderStatus {
  PENDING_PAYMENT
  PAYMENT_FAILED
  PAID
  PROCESSING
  PACKED
  SHIPPED
  OUT_FOR_DELIVERY
  DELIVERED
  CANCELLED
  RETURN_REQUESTED
  RETURNED
  REFUNDED
  PARTIALLY_REFUNDED
}

type OrderItem {
  id: ID!
  orderId: ID!
  productId: ID
  variantId: ID
  productNameSnapshot: String!
  skuSnapshot: String!
  attributesSnapshot: JSON!
  unitPrice: String!
  discountAmount: String!
  quantity: Int!
  lineTotal: String!
  createdAt: DateTime!
}

type OrderStatusHistory {
  id: ID!
  orderId: ID!
  status: OrderStatus!
  note: String
  changedByUserId: ID
  createdAt: DateTime!
}

type Order {
  id: ID!
  orderNumber: String!
  userId: ID
  guestEmail: String
  cartId: ID
  status: OrderStatus!
  currency: String!
  subtotal: String!
  discountTotal: String!
  deliveryFee: String!
  taxTotal: String!
  total: String!
  deliveryAddress: JSON!
  billingAddress: JSON
  notes: String
  placedAt: DateTime!
  paidAt: DateTime
  cancelledAt: DateTime
  items: [OrderItem!]!
  statusHistory: [OrderStatusHistory!]!
  payments: [Payment!]!
  shipments: [Shipment!]!
  createdAt: DateTime!
  updatedAt: DateTime!
}

type OrderPagination {
  orders: [Order!]!
  total: Int!
  page: Int!
  limit: Int!
  totalPages: Int!
}

input CheckoutInput {
  cartId: ID!
  deliveryAddress: JSON!
  billingAddress: JSON
  deliveryFee: String
  taxTotal: String
  discountTotal: String
  notes: String
}

input FindOrdersInput {
  status: OrderStatus
  userId: ID
  page: Int = 1
  limit: Int = 20
}

input UpdateOrderStatusInput {
  status: OrderStatus!
  note: String
}

extend type Query {
  orders(input: FindOrdersInput): OrderPagination!
  myOrders(input: FindOrdersInput): OrderPagination!
  order(id: ID!): Order
}

extend type Mutation {
  checkout(input: CheckoutInput!): Order!
  updateOrderStatus(
    id: ID!
    input: UpdateOrderStatusInput!
  ): Order!
  cancelOrder(id: ID!, note: String): Order!
}

`;

export default OrderSchema;

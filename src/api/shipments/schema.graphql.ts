const ShipmentSchema = `#graphql

enum ShipmentStatus {
  PENDING
  READY_FOR_DISPATCH
  DISPATCHED
  IN_TRANSIT
  OUT_FOR_DELIVERY
  DELIVERED
  FAILED_DELIVERY
  RETURNED_TO_SENDER
  CANCELLED
}

type ShipmentEvent {
  id: ID!
  shipmentId: ID!
  status: ShipmentStatus!
  description: String
  location: String
  occurredAt: DateTime!
  createdAt: DateTime!
}

type Shipment {
  id: ID!
  orderId: ID!
  provider: String!
  serviceLevel: String
  trackingNumber: String
  trackingUrl: String
  status: ShipmentStatus!
  shippedAt: DateTime
  deliveredAt: DateTime
  metadata: JSON
  events: [ShipmentEvent!]!
  createdAt: DateTime!
  updatedAt: DateTime!
}

input CreateShipmentInput {
  orderId: ID!
  provider: String!
  serviceLevel: String
  trackingNumber: String
  trackingUrl: String
}

input UpdateShipmentInput {
  status: ShipmentStatus!
  trackingNumber: String
  trackingUrl: String
  description: String
  location: String
}

extend type Query {
  shipment(id: ID!): Shipment
}

extend type Mutation {
  createShipment(input: CreateShipmentInput!): Shipment!
  updateShipment(id: ID!, input: UpdateShipmentInput!): Shipment!
}

`;

export default ShipmentSchema;

const InventorySchema = `#graphql

enum StockMovementType {
  STOCK_RECEIVED
  RESERVED
  RESERVATION_RELEASED
  SOLD
  RETURNED
  DAMAGED
  MANUAL_ADJUSTMENT
}

enum SerializedDeviceStatus {
  AVAILABLE
  RESERVED
  SOLD
  RETURNED
  DAMAGED
  REPAIR
}

type Inventory {
  id: ID!
  variantId: ID!
  physicalQuantity: Int!
  reservedQuantity: Int!
  soldQuantity: Int!
  availableQuantity: Int!
  reorderLevel: Int!
  variant: ProductVariant!
  createdAt: DateTime!
  updatedAt: DateTime!
}

type StockMovement {
  id: ID!
  variantId: ID!
  type: StockMovementType!
  quantity: Int!
  previousPhysicalQuantity: Int!
  resultingPhysicalQuantity: Int!
  previousReservedQuantity: Int!
  resultingReservedQuantity: Int!
  referenceType: String
  referenceId: String
  notes: String
  createdByUserId: ID
  createdAt: DateTime!
}

type SerializedDevice {
  id: ID!
  variantId: ID!
  serialNumber: String
  imei1: String
  imei2: String
  status: SerializedDeviceStatus!
  orderItemId: ID
  createdAt: DateTime!
  updatedAt: DateTime!
}

input AdjustInventoryInput {
  quantityDelta: Int!
  notes: String
  referenceType: String
  referenceId: String
}

extend type Query {
  inventory: [Inventory!]!
  inventoryByVariant(variantId: ID!): Inventory
}

extend type Mutation {
  adjustInventory(
    variantId: ID!
    input: AdjustInventoryInput!
  ): Inventory!
}

`;

export default InventorySchema;

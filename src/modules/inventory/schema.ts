export const inventoryTypeDefs = `#graphql
  type InventoryRecord { id: ID! variantId: ID! physicalQuantity: Int! reservedQuantity: Int! soldQuantity: Int! reorderLevel: Int! availableQuantity: Int! }
  input InventoryAdjustmentInput { variantId: ID! quantityDelta: Int! notes: String }
  extend type Query { inventory: [InventoryRecord!]! inventoryByVariant(variantId: ID!): InventoryRecord }
  extend type Mutation { adjustInventory(input: InventoryAdjustmentInput!): InventoryRecord! }
`

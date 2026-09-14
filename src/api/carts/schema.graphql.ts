const CartSchema = `#graphql

enum CartStatus {
  ACTIVE
  CONVERTED
  ABANDONED
  EXPIRED
}

type CartItem {
  id: ID!
  cartId: ID!
  variantId: ID!
  quantity: Int!
  unitPriceSnapshot: String!
  variant: ProductVariant!
  createdAt: DateTime!
  updatedAt: DateTime!
}

type Cart {
  id: ID!
  userId: ID
  sessionKey: String
  status: CartStatus!
  currency: String!
  expiresAt: DateTime
  items: [CartItem!]!
  createdAt: DateTime!
  updatedAt: DateTime!
}

input AddCartItemInput {
  variantId: ID!
  quantity: Int!
}

input UpdateCartItemInput {
  quantity: Int!
}

extend type Query {
  myCart: Cart!
}

extend type Mutation {
  addCartItem(input: AddCartItemInput!): CartItem!
  updateCartItem(id: ID!, input: UpdateCartItemInput!): CartItem!
  removeCartItem(id: ID!): Boolean!
}

`;

export default CartSchema;

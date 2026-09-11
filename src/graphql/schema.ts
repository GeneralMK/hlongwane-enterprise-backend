import { GraphQLScalarType, Kind } from 'graphql'
import { authTypeDefs } from '../auth/schema.js'
import { authResolvers } from '../auth/resolver.js'
import { adminTypeDefs } from '../modules/admin/schema.js'
import { adminResolvers } from '../modules/admin/resolver.js'
import { productTypeDefs } from '../modules/products/schema.js'
import { productResolvers } from '../modules/products/resolver.js'
import { inventoryTypeDefs } from '../modules/inventory/schema.js'
import { inventoryResolvers } from '../modules/inventory/resolver.js'
import { orderTypeDefs } from '../modules/orders/schema.js'
import { orderResolvers } from '../modules/orders/resolver.js'
import { paymentTypeDefs } from '../modules/payments/schema.js'
import { paymentResolvers } from '../modules/payments/resolver.js'

const baseTypeDefs = `#graphql
  scalar JSON
  type Health { status: String! service: String! }
  type Query { health: Health! }
  type Mutation { _noop: Boolean }
`

const jsonScalar = new GraphQLScalarType({
  name: 'JSON',
  serialize: (value) => value,
  parseValue: (value) => value,
  parseLiteral(ast) {
    const parse = (node: any): any => {
      switch (node.kind) {
        case Kind.STRING:
        case Kind.BOOLEAN: return node.value
        case Kind.INT: return Number.parseInt(node.value, 10)
        case Kind.FLOAT: return Number.parseFloat(node.value)
        case Kind.NULL: return null
        case Kind.LIST: return node.values.map(parse)
        case Kind.OBJECT: return Object.fromEntries(node.fields.map((field: any) => [field.name.value, parse(field.value)]))
        default: return null
      }
    }
    return parse(ast)
  }
})

export const typeDefs = [baseTypeDefs, authTypeDefs, adminTypeDefs, productTypeDefs, inventoryTypeDefs, orderTypeDefs, paymentTypeDefs]

export const resolvers = [
  {
    JSON: jsonScalar,
    Query: {
      health: () => ({ status: 'ok', service: 'hlongwane-enterprise-backend' })
    }
  },
  authResolvers,
  adminResolvers,
  productResolvers,
  inventoryResolvers,
  orderResolvers,
  paymentResolvers
]

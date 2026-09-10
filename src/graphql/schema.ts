export const typeDefs = `#graphql
  type Health {
    status: String!
    service: String!
  }

  type Query {
    health: Health!
  }
`

export const resolvers = {
  Query: {
    health: () => ({
      status: 'ok',
      service: 'hlongwane-enterprise-backend'
    })
  }
}

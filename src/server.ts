import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { ApolloServer } from '@apollo/server'
import { koaMiddleware } from '@as-integrations/koa'
import cors from '@koa/cors'
import Koa from 'koa'
import { koaBody } from 'koa-body'

import { env } from './config/env.js'
import { typeDefs, resolvers } from './graphql/schema.js'
import { prisma } from './lib/prisma.js'
import { authenticateAccessToken } from './auth/service.js'
import { authRouter } from './auth/routes.js'
import type { AppContext } from './types/context.js'
import { productRouter } from './modules/products/routes.js'
import { inventoryRouter } from './modules/inventory/routes.js'
import { orderRouter } from './modules/orders/routes.js'
import { fileRouter } from './modules/files/routes.js'
import { paymentRouter } from './modules/payments/routes.js'
import { paymentWebhookRouter } from './modules/payments/webhook.js'

function getBearerToken(header?: string) {
  if (!header) return null
  const match = header.match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() ?? null
}

async function startServer() {
  const app = new Koa()
  const httpServer = http.createServer(app.callback())
  const uploadDirectory = path.resolve(process.cwd(), 'uploads')
  fs.mkdirSync(uploadDirectory, { recursive: true })

  const apollo = new ApolloServer<AppContext>({
    typeDefs,
    resolvers,
    introspection: env.NODE_ENV !== 'production'
  })

  await apollo.start()

  app.use(cors({ origin: env.FRONTEND_URL, credentials: true }))

  app.use(
    koaBody({
      multipart: true,
      json: true,
      urlencoded: true,
      includeUnparsed: true,
      formidable: {
        uploadDir: uploadDirectory,
        keepExtensions: true,
        multiples: true,
        maxFileSize: 20 * 1024 * 1024
      }
    })
  )

  app.use(async (ctx, next) => {
    const token = getBearerToken(ctx.headers.authorization)
    ctx.state.user = token ? await authenticateAccessToken(token) : null
    await next()
  })

  app.use(async (ctx, next) => {
    if (ctx.path === '/health') {
      ctx.status = 200
      ctx.body = { status: 'ok', service: 'hlongwane-enterprise-backend' }
      return
    }
    await next()
  })

  // Public provider callbacks must remain ahead of protected application routes.
  app.use(paymentWebhookRouter.routes())
  app.use(paymentWebhookRouter.allowedMethods())

  app.use(authRouter.routes())
  app.use(authRouter.allowedMethods())
  app.use(productRouter.routes())
  app.use(productRouter.allowedMethods())
  app.use(inventoryRouter.routes())
  app.use(inventoryRouter.allowedMethods())
  app.use(orderRouter.routes())
  app.use(orderRouter.allowedMethods())
  app.use(paymentRouter.routes())
  app.use(paymentRouter.allowedMethods())
  app.use(fileRouter.routes())
  app.use(fileRouter.allowedMethods())

  app.use(async (ctx, next) => {
    if (ctx.path !== '/graphql') {
      await next()
      return
    }

    await koaMiddleware(apollo, {
      context: async (): Promise<AppContext> => ({
        prisma,
        user: ctx.state.user ?? null
      })
    })(ctx, next)
  })

  httpServer.listen(env.PORT, () => {
    console.log(`Hlongwane Enterprise API running on http://localhost:${env.PORT}`)
    console.log(`GraphQL endpoint: http://localhost:${env.PORT}/graphql`)
    console.log(`Auth REST endpoint: http://localhost:${env.PORT}/auth`)
    console.log(`Products REST endpoint: http://localhost:${env.PORT}/products`)
    console.log(`Inventory REST endpoint: http://localhost:${env.PORT}/admin/inventory`)
    console.log(`Orders REST endpoint: http://localhost:${env.PORT}/orders`)
    console.log(`Paystack webhook: http://localhost:${env.PORT}/webhooks/paystack`)
  })

  const shutdown = async () => {
    await apollo.stop()
    await prisma.$disconnect()
    httpServer.close(() => process.exit(0))
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

startServer().catch(async (error) => {
  console.error('Failed to start server', error)
  await prisma.$disconnect()
  process.exit(1)
})

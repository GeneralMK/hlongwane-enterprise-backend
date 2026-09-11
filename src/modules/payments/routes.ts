import Router from '@koa/router'
import { initializePaymentController } from './controller.js'

export const paymentRouter = new Router({ prefix: '/payments' })
paymentRouter.post('/initialize', initializePaymentController)

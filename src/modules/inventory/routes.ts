import Router from '@koa/router'
import { adjustInventoryController, listInventoryController } from './controller.js'

export const inventoryRouter = new Router({ prefix: '/admin/inventory' })
inventoryRouter.get('/', listInventoryController)
inventoryRouter.post('/adjust', adjustInventoryController)

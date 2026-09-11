import Router from '@koa/router'
import { uploadFileController } from './controller.js'

export const fileRouter = new Router({ prefix: '/files' })
fileRouter.post('/upload', uploadFileController)

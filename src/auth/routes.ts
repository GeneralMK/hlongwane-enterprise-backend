import Router from '@koa/router'
import { loginController, logoutController, meController, registerController } from './controller.js'

export const authRouter = new Router({ prefix: '/auth' })
authRouter.post('/register', registerController)
authRouter.post('/login', loginController)
authRouter.get('/me', meController)
authRouter.post('/logout', logoutController)

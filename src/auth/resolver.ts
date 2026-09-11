import type { AppContext } from '../types/context.js'
import { loginUser, registerCustomer } from './service.js'

function toSession(session: any) {
  if (!session) return null
  return {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_in: session.expires_in,
    token_type: session.token_type
  }
}

export const authResolvers = {
  Query: {
    me: (_: unknown, __: unknown, ctx: AppContext) => ctx.user
  },
  Mutation: {
    register: async (_: unknown, args: { input: unknown }) => {
      const result = await registerCustomer(args.input)
      return { user: result.user, session: toSession(result.session) }
    },
    login: async (_: unknown, args: { input: unknown }) => {
      const result = await loginUser(args.input)
      return { user: result.user, session: toSession(result.session) }
    }
  }
}

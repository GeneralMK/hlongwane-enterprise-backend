import { Paystack } from 'paystack-sdk'
import { logger } from '.'

type Stage = 'LOCAL' | 'DEV' | 'UAT' | 'PROD'
const STAGE = (process.env.STAGE ?? 'LOCAL').toUpperCase() as Stage


const SECRET =
  STAGE === 'PROD'
    ? (process.env.PAYSTACK_SECRET_PROD ?? process.env.PAYSTACK_SECRET)
    : STAGE === 'UAT'
    ? (process.env.PAYSTACK_SECRET_UAT ?? process.env.PAYSTACK_SECRET)
    : (process.env.PAYSTACK_SECRET_DEV ?? process.env.PAYSTACK_SECRET)

if (!SECRET) {
  throw new Error(`[Paystack] Missing secret key for stage ${STAGE}. Set PAYSTACK_SECRET_*`)
}
if (!/^sk_/.test(SECRET)) {
  throw new Error(`[Paystack] Invalid key for ${STAGE}. Server must use a secret key starting with "sk_".`)
}

// Single Paystack instance 
export const paystack = new Paystack(SECRET)

// Safe log (do NOT log the key)
logger('PAYSTACK_INIT', { stage: STAGE, hasSecret: true })

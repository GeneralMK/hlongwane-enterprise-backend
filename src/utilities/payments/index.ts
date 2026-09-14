import type {PaymentProvider} from "@prisma/client"; import type {CheckoutRequest,CheckoutResult,PaymentProviderAdapter} from "./types.js";
class NotConfiguredAdapter implements PaymentProviderAdapter { constructor(private provider:PaymentProvider){} async initializeCheckout(_input:CheckoutRequest):Promise<CheckoutResult>{throw new Error(`${this.provider} checkout adapter has not been configured yet.`);} }
export const getPaymentProviderAdapter=(provider:PaymentProvider):PaymentProviderAdapter=>new NotConfiguredAdapter(provider);

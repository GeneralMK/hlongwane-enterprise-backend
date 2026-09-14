import type { PaymentProvider } from "@prisma/client";
export interface CheckoutRequest { paymentId:string; reference:string; amount:number; currency:string; email:string; callbackUrl?:string; }
export interface CheckoutResult { provider:PaymentProvider; providerReference?:string; checkoutUrl:string; }
export interface PaymentProviderAdapter { initializeCheckout(input:CheckoutRequest):Promise<CheckoutResult>; }

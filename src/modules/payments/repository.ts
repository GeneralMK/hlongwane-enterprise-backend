import { prisma } from '../../lib/prisma.js'

export function findPaymentByReference(reference: string) {
  return prisma.payment.findUnique({ where: { reference }, include: { order: true, events: true, refunds: true } })
}

export function findPayment(id: string) {
  return prisma.payment.findUnique({ where: { id }, include: { order: true, events: true, refunds: true } })
}

export function listPayments() {
  return prisma.payment.findMany({ include: { order: true }, orderBy: { createdAt: 'desc' } })
}

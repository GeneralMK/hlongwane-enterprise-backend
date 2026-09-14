import { randomInt } from "crypto";
import prisma from "../../prisma/index.js";

function sanitizePrefix(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 4);
}

export async function generateSku(
  brandName: string,
  productName: string,
): Promise<string> {
  const brandPrefix =
    sanitizePrefix(brandName) || "BRD";

  const productPrefix =
    sanitizePrefix(productName) || "PRD";

  const year =
    new Date().getFullYear();

  while (true) {
    const sku =
      `${brandPrefix}-${productPrefix}-${year}-${randomInt(10000, 99999)}`;

    const exists =
      await prisma.productVariant.findUnique({
        where: {
          sku,
        },
      });

    if (!exists) {
      return sku;
    }
  }
}
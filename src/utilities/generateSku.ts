import { randomInt } from "crypto";
import prisma from "prisma";
import { EnumItemCategory } from "@prisma/client";

const PREFIX: Record<EnumItemCategory, string> = {
  TRACTOR: "TRC",
  HARVESTER: "HAR",
  IRRIGATION: "IRR",
  PLOUGH: "PLG",
  SEEDER: "SED",
  SPRAYER: "SPR",
  TRAILER: "TRL",
  FERTILIZER: "FER",
  SEED: "SEE",
  LIVESTOCK_EQUIPMENT: "LIV",
  OTHER: "OTH",
};

export async function generateSku(category: EnumItemCategory): Promise<string> {
  const prefix = PREFIX[category];

  while (true) {
    const sku = `${prefix}-${new Date().getFullYear()}-${randomInt(
      10000,
      99999,
    )}`;

    const exists = await prisma.agricultureItem.findUnique({
      where: {
        sku,
      },
    });

    if (!exists) {
      return sku;
    }
  }
}

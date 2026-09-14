import crypto from "crypto";

export function hashIdentifier(value: string) {
  const normalized = value.trim().toLowerCase();
  const pepper = process.env.ID_HASH_PEPPER || "";

  return crypto
    .createHash("sha256")
    .update(`${pepper}${normalized}`)
    .digest("hex");
}
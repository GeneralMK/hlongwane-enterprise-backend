import crypto from "crypto";
export function hashIdentifier(value: string) {
  const normalized = value.trim().toLowerCase();

  // optional: set in env so hashes can't be rainbow-tabled easily
  const pepper = process.env.ID_HASH_PEPPER || "";

  return crypto
    .createHash("sha256")
    .update(`${pepper}${normalized}`)
    .digest("hex");
}
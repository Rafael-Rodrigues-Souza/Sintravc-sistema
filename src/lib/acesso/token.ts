import { createHash, randomBytes } from "node:crypto";

/** Token de link (convite, nova senha): 32 bytes aleatórios, em base64url. */
export function novoToken() {
  return randomBytes(32).toString("base64url");
}

/** O token puro só aparece no link; no banco fica o hash (E35). */
export function hashDoToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

import { base32 } from "@better-auth/utils/base32";
import { createOTP } from "@better-auth/utils/otp";

/** O código de 6 números do momento, como o aplicativo autenticador mostraria (testes). */
export async function codigoTotp(segredoBase32: string): Promise<string> {
  return createOTP(base32.decode(segredoBase32), { digits: 6, period: 30 }).totp();
}

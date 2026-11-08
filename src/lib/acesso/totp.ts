import { base32 } from "@better-auth/utils/base32";
import { createOTP } from "@better-auth/utils/otp";

import { OPCOES_TOTP } from "./opcoes-totp";

/** O código do momento, como o aplicativo autenticador mostraria (testes). */
export async function codigoTotp(segredoBase32: string): Promise<string> {
  return createOTP(base32.decode(segredoBase32), OPCOES_TOTP).totp();
}

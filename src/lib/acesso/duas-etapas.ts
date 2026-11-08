import { createOTP } from "@better-auth/utils/otp";
import { symmetricDecrypt } from "better-auth/crypto";

import { auth } from "./auth";

/**
 * Duas etapas no aceite do convite (E37). O segredo é gerado e guardado pelo plugin twoFactor
 * (enableTwoFactor), criptografado com BETTER_AUTH_SECRET. Aqui só o lemos, com a mesma
 * biblioteca e as mesmas opções do plugin (6 números, 30 s), para mostrar o QR code e conferir
 * o primeiro código sem trocar o cookie da sessão no meio do fluxo.
 */
const OPCOES = { digits: 6, period: 30 } as const;
const EMISSOR = "SINTRAVC";

type RegistroDuasEtapas = { id: string; secret: string; verified?: boolean | null };

async function registroDe(pessoaId: string) {
  const contexto = await auth().$context;
  const registro = await contexto.adapter.findOne<RegistroDuasEtapas>({
    model: "twoFactor",
    where: [{ field: "userId", value: pessoaId }],
  });
  return { contexto, registro };
}

async function segredoDe(pessoaId: string): Promise<string | undefined> {
  const { contexto, registro } = await registroDe(pessoaId);
  if (!registro) return undefined;
  return symmetricDecrypt({ key: contexto.secretConfig, data: registro.secret });
}

/** O conteúdo do QR code (otpauth://) e a chave para digitar no aplicativo. */
export async function dadosDoQr(
  pessoaId: string,
  email: string,
): Promise<{ uri: string; chave: string } | undefined> {
  const segredo = await segredoDe(pessoaId);
  if (!segredo) return undefined;
  const uri = createOTP(segredo, OPCOES).url(EMISSOR, email);
  return { uri, chave: new URL(uri).searchParams.get("secret") ?? "" };
}

/** O código de 6 números do aplicativo confere com o segredo da pessoa? */
export async function conferirCodigoDoApp(pessoaId: string, codigo: string): Promise<boolean> {
  const segredo = await segredoDe(pessoaId);
  if (!segredo) return false;
  return createOTP(segredo, OPCOES).verify(codigo.replace(/\D/g, ""));
}

/** Marca as duas etapas como ativas, pelo próprio Better Auth (pessoa e registro do plugin). */
export async function ativarDuasEtapas(pessoaId: string): Promise<void> {
  const { contexto, registro } = await registroDe(pessoaId);
  if (!registro) throw new Error("A pessoa ainda não tem o segredo das duas etapas.");
  await contexto.adapter.update({
    model: "twoFactor",
    where: [{ field: "id", value: registro.id }],
    update: { verified: true },
  });
  await contexto.internalAdapter.updateUser(pessoaId, { twoFactorEnabled: true });
}

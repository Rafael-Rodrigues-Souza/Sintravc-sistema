import { randomUUID } from "node:crypto";

import { confirmarCodigo, entrar } from "@/lib/acesso/entrar";
import { codigoTotp, cookiesDe, criarPessoaDeTeste } from "@/lib/acesso/pessoas-de-teste";
import type { Perfil } from "@/lib/permissoes";

/** Entra de verdade (senha + código) e devolve o cabeçalho Cookie da sessão (para testar rotas). */
export async function sessaoDe(perfil: Perfil): Promise<string> {
  const sufixo = randomUUID().slice(0, 8);
  const p = await criarPessoaDeTeste({
    nome: `Rota ${sufixo}`,
    email: `rota-${sufixo}@sintravc.local`,
    perfil,
    senha: "senha-certa-123",
  });
  const primeira = await entrar({ email: p.email, senha: p.senha });
  if (primeira.tipo !== "precisa_codigo") throw new Error(`login: ${primeira.tipo}`);
  const final = await confirmarCodigo(
    { codigo: await codigoTotp(p.segredoTotp) },
    { cabecalhos: new Headers({ cookie: cookiesDe(primeira.cabecalhos) }) },
  );
  if (final.tipo !== "entrou") throw new Error(`código: ${final.tipo}`);
  return cookiesDe(final.cabecalhos);
}

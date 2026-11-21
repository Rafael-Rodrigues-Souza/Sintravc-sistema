import { eq, sql } from "drizzle-orm";

import { registrarAtividade } from "@/lib/atividade";
import { esquemaConfigSite, limparCacheConfigSite, type ProgramaAoVivo } from "@/lib/config-site";
import { esquemaProgramaAoVivo } from "@/lib/config-site/esquema";
import { banco } from "@/lib/db";
import { configSite } from "@/lib/db/schema";
import { exigir, type QuemDaEquipe } from "@/lib/permissoes";

import { ErroDoRadio } from "./regras";

/** Erro do formulário do programa ao vivo, com o campo onde mostrar. */
export class ErroPrograma extends ErroDoRadio<"canal" | "dias" | "inicio" | "fim"> {}

/** “youtube.com/@sintravc”, sem o https://, também vale: o canal é guardado com o endereço completo. */
export function completarCanal(digitado: string | null): string | null {
  const texto = digitado?.trim() ?? "";
  if (!texto) return null;
  return /^https?:\/\//i.test(texto) ? texto : `https://${texto}`;
}

/** Lê o programa ao vivo para o painel (sem o cache do site: quem edita vê o que está gravado). */
export async function lerProgramaAoVivo(deps: { quem: QuemDaEquipe }): Promise<ProgramaAoVivo> {
  exigir(deps.quem, "ver", { tipo: "radio" });
  const [linha] = await banco().select({ dados: configSite.dados }).from(configSite).where(eq(configSite.id, "site"));
  const config = esquemaConfigSite.parse(linha?.dados);
  return config.programa;
}

/**
 * Grava o programa ao vivo (E61, P10): ADM e COM, na área Rádio Chofer. Só a parte `programa` da
 * ConfigSite muda, com a Atividade (antes e depois) na mesma transação.
 */
export async function gravarProgramaAoVivo(novo: ProgramaAoVivo, deps: { quem: QuemDaEquipe }): Promise<void> {
  exigir(deps.quem, "gerenciar", { tipo: "radio" });
  const conferido = esquemaProgramaAoVivo.safeParse({ ...novo, canal: completarCanal(novo.canal) });
  if (!conferido.success) {
    const problema = conferido.error.issues[0];
    const campo = problema?.path[0];
    throw new ErroPrograma(
      problema?.message ?? "Confira os dados do programa.",
      campo === "canal" || campo === "dias" || campo === "inicio" || campo === "fim" ? campo : undefined,
    );
  }
  const programa = { ...conferido.data, dias: [...conferido.data.dias].sort((a, b) => a - b) };

  await banco().transaction(async (tx) => {
    const [linha] = await tx.select({ dados: configSite.dados }).from(configSite).where(eq(configSite.id, "site")).for("update");
    if (!linha) throw new ErroPrograma("Os dados do site não foram encontrados. Atualize a página.");
    const antes = (linha.dados as { programa?: ProgramaAoVivo }).programa ?? null;
    if (JSON.stringify(antes) === JSON.stringify(programa)) return;

    await tx
      .update(configSite)
      .set({ dados: sql`jsonb_set(${configSite.dados}, '{programa}', ${JSON.stringify(programa)}::jsonb)` })
      .where(eq(configSite.id, "site"));
    await registrarAtividade(tx, {
      ator: { tipo: "pessoa", id: deps.quem.id },
      acao: "radio.programa_editar",
      area: "radio",
      alvo: { tipo: "programa", id: "programa", rotulo: "Programa ao vivo" },
      detalhe: { de: antes, para: programa },
    });
  });
  limparCacheConfigSite();
}

import { eq } from "drizzle-orm";

import { banco } from "@/lib/db";
import { configSite } from "@/lib/db/schema";
import { lerParametro } from "@/lib/parametros";

import { esquemaConfigSite, type ConfigSite } from "./esquema";

export { ehMarcador, esquemaConfigSite, esquemaProgramaAoVivo, type ConfigSite, type ProgramaAoVivo } from "./esquema";

/**
 * Cache em memória (RN43): uma mudança na ConfigSite aparece no site depois de, no máximo,
 * `site.atualizacao_config_segundos`. Se o banco falhar com um valor já lido, o site continua
 * com o último valor bom, em vez de cair.
 */
let cache: { valor: ConfigSite; lidoEm: number } | undefined;

async function lerDoBanco(): Promise<ConfigSite> {
  const [linha] = await banco().select({ dados: configSite.dados }).from(configSite).where(eq(configSite.id, "site"));
  if (!linha) {
    throw new Error('ConfigSite não encontrada (registro "site"). Rode as migrações (pnpm db:migrar).');
  }
  const resultado = esquemaConfigSite.safeParse(linha.dados);
  if (!resultado.success) {
    const problema = resultado.error.issues[0];
    throw new Error(
      `ConfigSite inválida no banco, em "${problema?.path.join(".") ?? "?"}": ${problema?.message ?? "formato errado"}.`,
    );
  }
  return resultado.data;
}

/** Lê os dados do site, com cache pelo parâmetro `site.atualizacao_config_segundos` (RN43). */
export async function lerConfigSite(): Promise<ConfigSite> {
  const agora = Date.now();
  if (cache) {
    const validadeMs = (await lerParametro("site.atualizacao_config_segundos")) * 1000;
    if (agora - cache.lidoEm < validadeMs) return cache.valor;
  }
  try {
    cache = { valor: await lerDoBanco(), lidoEm: agora };
  } catch (erro) {
    if (!cache) throw erro;
    console.error("ConfigSite: falha ao reler, mantendo o último valor bom.", erro);
  }
  return cache.valor;
}

/** Esquece o cache (testes). */
export function limparCacheConfigSite() {
  cache = undefined;
}

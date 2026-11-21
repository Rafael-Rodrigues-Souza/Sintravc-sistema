import { readFile } from "node:fs/promises";
import path from "node:path";

import { urlPublica } from "@/lib/armazenamento";
import { lerEnvArmazenamento } from "@/lib/env";

import { enderecoDaCapaDoYoutube } from "./endereco-da-capa";

/**
 * A capa do episódio (E61): a imagem da Mídia, se a Comunicação trocou, ou a do YouTube pela nossa
 * rota (no site, `/radio-chofer/capa/[id]`; no painel, `/painel/radio/capa/[id]`). O navegador nunca
 * pede a capa ao i.ytimg.com.
 */
export function enderecoDaCapa(episodio: { youtubeId: string; capaChave: string | null }, onde: "site" | "painel"): string {
  if (episodio.capaChave) return urlPublica(episodio.capaChave, lerEnvArmazenamento());
  return enderecoDaCapaDoYoutube(episodio.youtubeId, onde);
}

const CAPA_PADRAO = path.join(process.cwd(), "public", "site", "radio", "capa-padrao.jpg");

/** A capa padrão do Rádio Chofer, para quando o YouTube falha. */
export async function lerCapaPadrao(): Promise<Uint8Array> {
  return new Uint8Array(await readFile(CAPA_PADRAO));
}

/** Os cabeçalhos de toda resposta das rotas do Rádio Chofer: o navegador não adivinha o tipo. */
export const CABECALHOS_SEGUROS = { "x-content-type-options": "nosniff" } as const;

export const TEXTO_PURO = { ...CABECALHOS_SEGUROS, "content-type": "text/plain; charset=utf-8" } as const;

/** Resposta de imagem com o cache pedido. */
export function respostaDeImagem(bytes: Uint8Array, tipo: string, cache: string, extra: Record<string, string> = {}): Response {
  return new Response(bytes as BodyInit, { headers: { ...CABECALHOS_SEGUROS, "content-type": tipo, "cache-control": cache, ...extra } });
}

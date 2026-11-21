import { readFile } from "node:fs/promises";
import path from "node:path";

import { segundosDoIso } from "./duracao";
import { enderecoDoVideo } from "./link";

/**
 * Conversa com o YouTube (RN17, E61). Duas versões, como a ApiSindicato (spec §11 T5):
 * - real: oEmbed (título, canal) e, com a chave da Data API (D4), a duração; a capa vem do i.ytimg.com;
 * - simulada: dados previsíveis, sem rede (e2e e testes). Os ids especiais simulam os erros.
 * Nenhum vídeo é baixado: só os dados e a imagem da capa.
 */
export type VideoDoYoutube = {
  id: string;
  titulo: string;
  canal: string | null;
  /** Só com a chave da Data API (D4); sem ela, null, e a pessoa digita. */
  duracaoSeg: number | null;
};

export type BuscaDoVideo =
  | { tipo: "ok"; video: VideoDoYoutube }
  /** Privado, apagado ou com a incorporação desativada (oEmbed 401, 403 ou 404). */
  | { tipo: "nao_encontrado" }
  /** Sem resposta a tempo, ou resposta estranha: a pessoa preenche à mão. */
  | { tipo: "fora_do_ar" };

export type CapaDoYoutube = { bytes: Uint8Array; tipo: "image/jpeg" | "image/webp" };

export interface Youtube {
  buscarVideo(id: string): Promise<BuscaDoVideo>;
  /** A capa do vídeo, ou null se o YouTube falhar (a rota serve a capa padrão). */
  baixarCapa(id: string): Promise<CapaDoYoutube | null>;
}

export const TEMPO_MAXIMO_MS = 5000;
export const CAPA_BYTES_MAX = 2 * 1024 * 1024;
const CAPA_CACHE_SEGUNDOS = 86400;
const TIPOS_DE_CAPA = new Set(["image/jpeg", "image/webp"]);

/** Endereço da capa no YouTube, montado só a partir de um id já conferido. */
export function enderecoDaCapa(id: string, tamanho: "maxresdefault" | "hqdefault"): string {
  return `https://i.ytimg.com/vi/${id}/${tamanho}.jpg`;
}

type Buscar = typeof fetch;

export function youtubeReal({ chaveDataApi, buscar = fetch }: { chaveDataApi?: string; buscar?: Buscar } = {}): Youtube {
  async function duracao(id: string): Promise<number | null> {
    if (!chaveDataApi) return null;
    try {
      const url = new URL("https://www.googleapis.com/youtube/v3/videos");
      url.searchParams.set("part", "contentDetails");
      url.searchParams.set("id", id);
      url.searchParams.set("key", chaveDataApi);
      const resposta = await buscar(url, { signal: AbortSignal.timeout(TEMPO_MAXIMO_MS), cache: "no-store" });
      if (!resposta.ok) return null;
      const dados = (await resposta.json()) as { items?: { contentDetails?: { duration?: string } }[] };
      const iso = dados.items?.[0]?.contentDetails?.duration;
      return iso ? segundosDoIso(iso) : null;
    } catch {
      return null;
    }
  }

  return {
    async buscarVideo(id) {
      const url = new URL("https://www.youtube.com/oembed");
      url.searchParams.set("url", enderecoDoVideo(id));
      url.searchParams.set("format", "json");
      let resposta: Response;
      try {
        resposta = await buscar(url, { signal: AbortSignal.timeout(TEMPO_MAXIMO_MS), cache: "no-store" });
      } catch {
        return { tipo: "fora_do_ar" };
      }
      if ([400, 401, 403, 404].includes(resposta.status)) return { tipo: "nao_encontrado" };
      if (!resposta.ok) return { tipo: "fora_do_ar" };
      let dados: { title?: unknown; author_name?: unknown };
      try {
        dados = (await resposta.json()) as typeof dados;
      } catch {
        return { tipo: "fora_do_ar" };
      }
      if (typeof dados.title !== "string") return { tipo: "fora_do_ar" };
      return {
        tipo: "ok",
        video: {
          id,
          titulo: dados.title.trim(),
          canal: typeof dados.author_name === "string" ? dados.author_name.trim() : null,
          duracaoSeg: await duracao(id),
        },
      };
    },

    async baixarCapa(id) {
      for (const tamanho of ["maxresdefault", "hqdefault"] as const) {
        try {
          // Cache no servidor (E61): um visitante novo não leva a outra ida ao YouTube.
          const resposta = await buscar(enderecoDaCapa(id, tamanho), {
            signal: AbortSignal.timeout(TEMPO_MAXIMO_MS),
            next: { revalidate: CAPA_CACHE_SEGUNDOS },
          } as RequestInit);
          if (!resposta.ok) continue;
          const tipo = (resposta.headers.get("content-type") ?? "").split(";")[0]!.trim().toLowerCase();
          if (!TIPOS_DE_CAPA.has(tipo)) continue;
          const declarado = Number(resposta.headers.get("content-length") ?? 0);
          if (declarado > CAPA_BYTES_MAX) continue;
          const bytes = new Uint8Array(await resposta.arrayBuffer());
          if (bytes.byteLength === 0 || bytes.byteLength > CAPA_BYTES_MAX) continue;
          return { bytes, tipo: tipo as CapaDoYoutube["tipo"] };
        } catch {
          // tenta o próximo tamanho; no fim, a rota serve a capa padrão
        }
      }
      return null;
    },
  };
}

/** Ids especiais da versão simulada (11 caracteres, como um id de verdade). */
export const IDS_SIMULADOS = {
  naoEncontrado: "privado0000",
  foraDoAr: "foradoar000",
  /** Vídeo encontrado, mas sem duração (como sem a chave da Data API). */
  semDuracao: "semduracao0",
} as const;

export function youtubeSimulado(): Youtube {
  return {
    async buscarVideo(id) {
      if (id === IDS_SIMULADOS.naoEncontrado) return { tipo: "nao_encontrado" };
      if (id === IDS_SIMULADOS.foraDoAr) return { tipo: "fora_do_ar" };
      return {
        tipo: "ok",
        video: {
          id,
          titulo: `Rádio Chofer — vídeo ${id}`,
          canal: "SINTRAVC",
          duracaoSeg: id === IDS_SIMULADOS.semDuracao ? null : 1690,
        },
      };
    },
    async baixarCapa(id) {
      if (id === IDS_SIMULADOS.foraDoAr) return null;
      const bytes = await readFile(path.join(process.cwd(), "src", "testes", "arquivos", "capa-simulada.jpg"));
      return { bytes: new Uint8Array(bytes), tipo: "image/jpeg" };
    },
  };
}

/** A versão do sistema: simulada no e2e (YOUTUBE_SIMULADO=1), real nos outros ambientes. */
export function youtubeDoSistema(): Youtube {
  if (process.env.YOUTUBE_SIMULADO === "1") return youtubeSimulado();
  return youtubeReal({ chaveDataApi: process.env.YOUTUBE_API_KEY?.trim() || undefined });
}

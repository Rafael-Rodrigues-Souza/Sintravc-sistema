import { z } from "zod";

/**
 * Formato do JSON da ConfigSite (spec §2; RN43). Textos entre colchetes, como
 * "[CEP a definir pelo sindicato]", são conteúdo pendente (D5): o site mostra como marcador.
 */
const texto = z.string().trim().min(1);
const linkDaRede = z.url({ protocol: /^https$/ }).nullable();

const hora = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora: no formato 13:00");

/** "13:30" → 810: os horários do programa são comparados em minutos do dia, não como texto. */
export function minutosDoDia(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** Canal do programa: só endereço https do YouTube. */
export const linkDeCanalDoYoutube = z
  .url({ protocol: /^https$/, error: "Use o endereço do canal, começando por https://" })
  .refine((u) => /^(www\.|m\.)?youtube\.com$/i.test(new URL(u).hostname), "Use um endereço do YouTube (youtube.com/…)");

export const esquemaProgramaAoVivo = z
  .object({
    ativo: z.boolean(),
    canal: linkDeCanalDoYoutube.nullable(),
    /** Dias da semana, de 0 (domingo) a 6 (sábado). */
    dias: z
      .array(z.number().int().min(0).max(6))
      .min(1, "Marque pelo menos um dia")
      .refine((d) => new Set(d).size === d.length, "Dia repetido"),
    /** Início e fim no horário da Bahia (RNF06). */
    inicio: hora,
    fim: hora,
  })
  .refine((p) => minutosDoDia(p.fim) > minutosDoDia(p.inicio), { message: "O fim tem de ser depois do início", path: ["fim"] });

export type ProgramaAoVivo = z.infer<typeof esquemaProgramaAoVivo>;

export const esquemaConfigSite = z.object({
  contato: z.object({
    endereco: texto,
    cidade: texto,
    /** 00000-000, ou um marcador entre colchetes enquanto não houver. */
    cep: z.string().trim().regex(/^(\d{5}-\d{3}|\[.+\])$/, "CEP: no formato 00000-000"),
    /** Só dígitos, com DDD: 7734234959. */
    telefone: z.string().regex(/^\d{10,11}$/, "Telefone: só dígitos, com DDD"),
    /** Só dígitos, com o 55 do Brasil e o DDD: 557734234959. É o número do wa.me. */
    whatsappRecepcao: z.string().regex(/^55\d{10,11}$/, "WhatsApp: só dígitos, começando por 55 e o DDD"),
    email: z.email(),
    horario: texto,
  }),
  /** Mensagem pronta do “Filiar-se pelo WhatsApp” (RN03). */
  mensagemFiliacao: texto,
  redes: z.object({
    instagram: linkDaRede,
    youtube: linkDaRede,
    facebook: linkDaRede,
    canalWhatsapp: linkDaRede,
  }),
  /**
   * Contadores manuais das redes (P6, E62), como “1.200 rodoviários no canal”. Sem integração com
   * as redes: o número vem daqui. Vazio, a linha some (nada de número inventado).
   */
  contadores: z.object({
    instagram: z.number().int().nonnegative().nullable(),
    youtube: z.number().int().nonnegative().nullable(),
    canalWhatsapp: z.number().int().nonnegative().nullable(),
  }),
  missao: texto,
  /** Programa ao vivo do Rádio Chofer (E61, P10): editável por ADM e COM, na área Rádio Chofer. */
  programa: esquemaProgramaAoVivo,
  historia: z.object({
    /** Cada marco é um destaque da linha do tempo e um subtítulo do texto, com a âncora `id`. */
    marcos: z
      .array(
        z.object({
          id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Âncora: letras minúsculas, números e hífens"),
          ano: texto,
          titulo: texto,
          resumo: texto,
          texto: texto,
        }),
      )
      .min(1),
  }),
});

export type ConfigSite = z.infer<typeof esquemaConfigSite>;

/** Texto pendente (D5): começa com “[” e termina com “]”. */
export function ehMarcador(valor: string): boolean {
  return /^\[.*\]$/s.test(valor.trim());
}

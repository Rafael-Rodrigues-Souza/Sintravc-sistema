import { z } from "zod";

/**
 * Formato do JSON da ConfigSite (spec §2; RN43). Textos entre colchetes, como
 * "[CEP a definir pelo sindicato]", são conteúdo pendente (D5): o site mostra como marcador.
 */
const texto = z.string().trim().min(1);
const linkDaRede = z.url({ protocol: /^https$/ }).nullable();

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
  missao: texto,
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

import type { ConfigSite } from "@/lib/config-site";
import { linkWhatsApp } from "@/lib/config-site/links";

/**
 * As redes do sindicato (RN43), na ordem do Figma. O link vem da ConfigSite; rede sem link fica
 * escondida em todo o site (E57). Exceção do WhatsApp na barra superior e no rodapé: sem canal,
 * o ícone abre a conversa com a recepção.
 */
const REDES = [
  { chave: "instagram", nome: "Instagram", icone: "/site/icone-instagram.svg" },
  { chave: "facebook", nome: "Facebook", icone: "/site/icone-facebook.svg" },
  { chave: "youtube", nome: "YouTube", icone: "/site/icone-youtube.svg" },
  { chave: "canalWhatsapp", nome: "Canal no WhatsApp", icone: "/site/icone-whatsapp.svg" },
] as const satisfies readonly { chave: keyof ConfigSite["redes"]; nome: string; icone: string }[];

export type RedeDoSite = { chave: keyof ConfigSite["redes"]; nome: string; icone: string; href: string };

/** As redes que têm link (Contato). O WhatsApp da recepção tem cartão próprio no Contato. */
export function redesComLink(redes: ConfigSite["redes"]): RedeDoSite[] {
  return REDES.flatMap((r) => {
    const href = redes[r.chave];
    return href ? [{ ...r, href }] : [];
  });
}

/**
 * As redes da barra superior e do rodapé: as que têm link e o WhatsApp sempre, com o canal ou,
 * sem ele, a conversa com a recepção, sem mensagem pronta (E57).
 */
export function redesDaBarraEDoRodape(config: {
  redes: ConfigSite["redes"];
  contato: Pick<ConfigSite["contato"], "whatsappRecepcao">;
}): RedeDoSite[] {
  const redes = redesComLink(config.redes);
  if (redes.some((r) => r.chave === "canalWhatsapp")) return redes;
  const canal = REDES.find((r) => r.chave === "canalWhatsapp")!;
  return [...redes, { ...canal, nome: "WhatsApp da recepção", href: linkWhatsApp(config.contato.whatsappRecepcao) }];
}

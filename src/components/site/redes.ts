import type { ConfigSite } from "@/lib/config-site";
import { linkWhatsApp } from "@/lib/config-site/links";

/**
 * As redes do sindicato, numa lista só, usada pela barra superior, pelo rodapé e pelo Contato
 * (RN43). O link vem da ConfigSite; sem link, a barra e o rodapé escondem a rede e o Contato
 * mostra o marcador (D5). Exceção do WhatsApp (E57): sem canal, a barra e o rodapé abrem a
 * conversa com a recepção.
 */
const REDES = [
  { chave: "instagram", nome: "Instagram", icone: "/site/icone-instagram.svg" },
  { chave: "facebook", nome: "Facebook", icone: "/site/icone-facebook.svg" },
  { chave: "youtube", nome: "YouTube", icone: "/site/icone-youtube.svg" },
  { chave: "canalWhatsapp", nome: "Canal no WhatsApp", icone: "/site/icone-whatsapp.svg" },
] as const satisfies readonly { chave: keyof ConfigSite["redes"]; nome: string; icone: string }[];

export type RedeDoSite = { nome: string; icone: string; href: string | null };

/** Todas as redes, com ou sem link, na ordem do Contato. */
export function redesDoSite(redes: ConfigSite["redes"]): RedeDoSite[] {
  return REDES.map((r) => ({ nome: r.nome, icone: r.icone, href: redes[r.chave] }));
}

/**
 * As redes da barra superior e do rodapé: só as que têm link, e o WhatsApp sempre, com o canal
 * ou, sem ele, a conversa com a recepção, sem mensagem pronta (E57).
 */
export function redesComLink(config: {
  redes: ConfigSite["redes"];
  contato: Pick<ConfigSite["contato"], "whatsappRecepcao">;
}): (RedeDoSite & { href: string })[] {
  return redesDoSite(config.redes).flatMap((r) => {
    if (r.href !== null) return [{ ...r, href: r.href }];
    if (r.nome === "Canal no WhatsApp") {
      return [{ ...r, nome: "WhatsApp da recepção", href: linkWhatsApp(config.contato.whatsappRecepcao) }];
    }
    return [];
  });
}

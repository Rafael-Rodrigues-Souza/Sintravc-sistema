import type { ConfigSite } from "@/lib/config-site";

/**
 * As redes do sindicato, numa lista só, usada pela barra superior, pelo rodapé e pelo Contato
 * (RN43). O link vem da ConfigSite; sem link, a barra e o rodapé escondem a rede e o Contato
 * mostra o marcador (D5).
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

/** Só as redes com link. */
export function redesComLink(redes: ConfigSite["redes"]) {
  return redesDoSite(redes).filter((r): r is RedeDoSite & { href: string } => r.href !== null);
}

import type { ConfigSite } from "@/lib/config-site";

/** Redes do sindicato com link preenchido, na ordem do Figma. As vazias não aparecem. */
export function redesComLink(redes: ConfigSite["redes"]) {
  const todas = [
    { nome: "Instagram", href: redes.instagram, icone: "/site/icone-instagram.svg" },
    { nome: "YouTube", href: redes.youtube, icone: "/site/icone-youtube.svg" },
    { nome: "Canal no WhatsApp", href: redes.canalWhatsapp, icone: "/site/icone-whatsapp.svg" },
  ];
  return todas.filter((r): r is typeof r & { href: string } => Boolean(r.href));
}

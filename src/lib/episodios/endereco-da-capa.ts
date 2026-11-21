/**
 * O endereço da capa do YouTube pela nossa rota (E61): no site, `/radio-chofer/capa/[id]`; no painel,
 * `/painel/radio/capa/[id]`. Função pura, usada no servidor e na prévia do modal.
 */
export function enderecoDaCapaDoYoutube(youtubeId: string, onde: "site" | "painel"): string {
  return onde === "site" ? `/radio-chofer/capa/${youtubeId}` : `/painel/radio/capa/${youtubeId}`;
}

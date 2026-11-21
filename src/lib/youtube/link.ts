/**
 * Leitura do link do YouTube (RN17, E61). Aceita os formatos que a pessoa costuma copiar:
 * youtube.com/watch?v=, youtu.be/, /shorts/, /live/ e /embed/, com ou sem www. ou m.
 * Devolve o id do vídeo (11 caracteres) ou null quando o link não é de um vídeo do YouTube.
 */
const ID = /^[A-Za-z0-9_-]{11}$/;
const HOSTS_YOUTUBE = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com"]);
const HOSTS_NOCOOKIE = new Set(["youtube-nocookie.com", "www.youtube-nocookie.com"]);

export function idDoYoutube(texto: string): string | null {
  const limpo = texto.trim();
  if (!limpo) return null;
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(limpo) ? limpo : `https://${limpo}`);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const host = url.hostname.toLowerCase();
  const partes = url.pathname.split("/").filter(Boolean);

  let id: string | undefined;
  if (host === "youtu.be") {
    id = partes[0];
  } else if (HOSTS_YOUTUBE.has(host)) {
    if (partes[0] === "watch") id = url.searchParams.get("v") ?? undefined;
    else if (["shorts", "live", "embed", "v"].includes(partes[0] ?? "")) id = partes[1];
  } else if (HOSTS_NOCOOKIE.has(host)) {
    if (partes[0] === "embed") id = partes[1];
  }
  return id && ID.test(id) ? id : null;
}

/** Endereço canônico do vídeo, usado no oEmbed e no link “ver no YouTube”. */
export function enderecoDoVideo(id: string): string {
  return `https://www.youtube.com/watch?v=${id}`;
}

/** Confere se o texto é um id de vídeo (rota da capa). */
export function ehIdDoYoutube(texto: string): boolean {
  return ID.test(texto);
}

import { responderCapa } from "@/lib/episodios/site";
import { youtubeDoSistema } from "@/lib/youtube/youtube";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** A capa do episódio no site, pelo nosso servidor (E61): o visitante não fala com o Google antes de tocar. */
export async function GET(_request: Request, { params }: { params: Promise<{ youtubeId: string }> }) {
  const { youtubeId } = await params;
  return responderCapa({ youtubeId }, { youtube: youtubeDoSistema() });
}

import { responderCapaDoPainel } from "@/lib/episodios/site";
import { youtubeDoSistema } from "@/lib/youtube/youtube";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** A capa do vídeo na prévia do modal “Adicionar episódio” (E61). */
export async function GET(request: Request, { params }: { params: Promise<{ youtubeId: string }> }) {
  const { youtubeId } = await params;
  return responderCapaDoPainel({ youtubeId, headers: request.headers }, { youtube: youtubeDoSistema() });
}

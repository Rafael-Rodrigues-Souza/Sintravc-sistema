import { responderTranscricao } from "@/lib/episodios/site";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** A transcrição do episódio (E55), pedida só quando a janela “Ler transcrição” abre. */
export async function GET(_request: Request, { params }: { params: Promise<{ youtubeId: string }> }) {
  const { youtubeId } = await params;
  return responderTranscricao({ youtubeId });
}

import { tratarPdfDaMidia } from "@/lib/midia/rota-pdf";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** "Abrir PDF" da Mídia (?modo=abrir): o PDF no leitor do navegador (E53). */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return tratarPdfDaMidia(request, { id, modo: new URL(request.url).searchParams.get("modo") });
}

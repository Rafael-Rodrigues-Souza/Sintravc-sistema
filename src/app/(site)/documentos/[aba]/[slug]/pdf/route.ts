import { tratarPdfPublico } from "@/lib/documentos-do-site/rota-pdf";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Abre (?modo=abrir) ou baixa (?modo=baixar) o PDF de um documento no ar (CA-US03.2, E60). */
export async function GET(request: Request, { params }: { params: Promise<{ aba: string; slug: string }> }) {
  const { aba, slug } = await params;
  const modo = new URL(request.url).searchParams.get("modo") === "baixar" ? "baixar" : "abrir";
  return tratarPdfPublico({ aba, slug, modo });
}

import { tratarPdfDoDocumento } from "@/lib/documentos/rota-pdf";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Abre (?modo=abrir) ou baixa (?modo=baixar) o PDF oficial no painel; ?versao=N para uma versão (E46). */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(request.url);
  const versao = Number(url.searchParams.get("versao"));
  return tratarPdfDoDocumento(request, {
    id,
    modo: url.searchParams.get("modo") === "baixar" ? "baixar" : "abrir",
    versao: Number.isInteger(versao) && versao > 0 ? versao : undefined,
  });
}

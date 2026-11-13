import { tratarEnvioDoPdf } from "@/lib/documentos/rota-envio-pdf";
import { lerEnvSite } from "@/lib/env";

export const dynamic = "force-dynamic";
// A leitura do texto do PDF (pdf.js) precisa do Node.
export const runtime = "nodejs";

/** Envio do PDF oficial pelo editor de documento (RF41, P3). Toda a regra fica em tratarEnvioDoPdf. */
export async function POST(request: Request) {
  return tratarEnvioDoPdf(request, { urlSite: lerEnvSite().URL_SITE });
}

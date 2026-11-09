import { lerEnvSite } from "@/lib/env";
import { tratarEnvioMidia } from "@/lib/midia/rota-envio";

export const dynamic = "force-dynamic";
// sharp e o decodificador de HEIC precisam do Node (não rodam no Edge).
export const runtime = "nodejs";

/** Envio de arquivos da tela Mídia (E39). Toda a regra fica em tratarEnvioMidia. */
export async function POST(request: Request) {
  return tratarEnvioMidia(request, { urlSite: lerEnvSite().URL_SITE });
}

import { z } from "zod";

import { registrarVisualizacao } from "@/lib/noticias-do-site/consultas";
import { exigir } from "@/lib/permissoes";

export const dynamic = "force-dynamic";

const esquema = z.object({ id: z.uuid() });

/**
 * T17 · contador das “Mais lidas” (E30, E59). O navegador avisa depois que a notícia aparece; o
 * servidor soma +1 no dia, só se ela está no ar. Pública, mas passa por `pode()` como toda rota
 * (spec §11 T2). Não lê nem grava cookie, não guarda IP nem pessoa: a resposta é vazia (204).
 */
export async function POST(request: Request) {
  exigir({ tipo: "visitante" }, "ver", { tipo: "site_publico" });
  const corpo = await request.json().catch(() => null);
  const validado = esquema.safeParse(corpo);
  if (!validado.success) return new Response(null, { status: 400 });
  await registrarVisualizacao(validado.data.id);
  return new Response(null, { status: 204 });
}

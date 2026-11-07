import { sql } from "drizzle-orm";

import { banco } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Verificação de saúde: a aplicação responde e o banco aceita consultas. */
export async function GET() {
  try {
    await banco().execute(sql`select 1`);
    return Response.json({ status: "ok", banco: "ok" });
  } catch {
    return Response.json({ status: "erro", banco: "indisponível" }, { status: 503 });
  }
}

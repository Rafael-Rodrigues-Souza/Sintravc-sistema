import { deveIniciarTrabalhador } from "@/lib/tarefas/ligar";

/**
 * Roda uma vez quando o servidor Next sobe. Liga a fila de tarefas (pg-boss) no mesmo processo
 * (E44), menos no `next build` e no runtime edge. A comparação com "nodejs" fica escrita aqui para
 * o Next tirar o código do Node do pacote edge.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && deveIniciarTrabalhador(process.env)) {
    await import("./instrumentation-node");
  }
}

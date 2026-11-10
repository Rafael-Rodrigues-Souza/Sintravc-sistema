import { deveIniciarTrabalhador } from "@/lib/tarefas/ligar";

/**
 * Roda uma vez quando o servidor Next sobe. Liga a fila de tarefas (pg-boss) no mesmo processo
 * (E44), menos no `next build` e no runtime edge. No SIGTERM/SIGINT, a fila para com calma antes
 * de o Next encerrar.
 */
export async function register() {
  if (!deveIniciarTrabalhador(process.env)) return;
  const { trabalhadorDoSistema, pararTrabalhador } = await import("@/lib/tarefas");
  const { pararAntesDeDesligar } = await import("@/lib/tarefas/desligar");
  await trabalhadorDoSistema();
  pararAntesDeDesligar(process, pararTrabalhador);
}

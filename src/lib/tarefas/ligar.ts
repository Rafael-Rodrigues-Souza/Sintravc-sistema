/**
 * O trabalhador da fila roda dentro do servidor Next (E44): liga no `next dev` e no `next start`,
 * nunca durante o `next build` (que também carrega o instrumentation.ts) nem no runtime edge.
 */
export function deveIniciarTrabalhador(env: Record<string, string | undefined>): boolean {
  return env.NEXT_RUNTIME === "nodejs" && env.NEXT_PHASE !== "phase-production-build";
}

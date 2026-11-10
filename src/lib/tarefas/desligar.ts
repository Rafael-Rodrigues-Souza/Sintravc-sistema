type Sinal = "SIGTERM" | "SIGINT";
type Ouvinte = (sinal: Sinal) => void;
type Processo = {
  listeners(evento: Sinal): Function[];
  removeAllListeners(evento: Sinal): unknown;
  on(evento: Sinal, ouvinte: Ouvinte): unknown;
};

const CODIGO_DE_SAIDA: Record<Sinal, number> = { SIGINT: 130, SIGTERM: 143 };

/**
 * Desligamento com calma (E44). O Next também escuta SIGTERM e SIGINT e, ao terminar a limpeza
 * dele, chama process.exit: se os dois rodassem juntos, a publicação em andamento podia ser cortada.
 * Aqui os ouvintes que já existiam (os do Next) só recebem o sinal depois que a fila parou.
 * Precisa ser chamado depois que o Next registrou os dele (o instrumentation.ts roda depois).
 */
export function pararAntesDeDesligar(
  processo: Processo,
  parar: () => Promise<void>,
  sair: (sinal: Sinal) => void = (sinal) => process.exit(CODIGO_DE_SAIDA[sinal]),
) {
  let parando = false;
  for (const sinal of ["SIGTERM", "SIGINT"] as const) {
    const anteriores = processo.listeners(sinal) as Ouvinte[];
    processo.removeAllListeners(sinal);
    processo.on(sinal, (recebido) => {
      if (parando) return;
      parando = true;
      void parar()
        .catch((erro) => console.error("Não consegui parar a fila de tarefas com calma:", erro))
        .finally(() => {
          if (anteriores.length === 0) sair(recebido);
          for (const ouvinte of anteriores) ouvinte(recebido);
        });
    });
  }
}

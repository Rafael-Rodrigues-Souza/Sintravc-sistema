import { ligarEmSegundoPlano, pararTrabalhador } from "@/lib/tarefas";
import { pararAntesDeDesligar } from "@/lib/tarefas/desligar";

// Só no servidor Node (E44): liga a fila sem esperar e, no SIGTERM/SIGINT, para com calma antes
// de o Next encerrar. O site sobe mesmo com o banco ainda fora do ar; a fila liga quando ele voltar.
ligarEmSegundoPlano();
pararAntesDeDesligar(process, pararTrabalhador);

/**
 * Fila do rascunho no navegador (RF38, RF34, E02, N4). Módulo puro, sem React e sem DOM: recebe
 * como dependências o envio ao servidor, o teste de conexão e o armazém (localStorage na tela).
 *
 * - Cada alteração vai para uma cópia no navegador e é enviada depois de `intervaloMs` sem digitar.
 * - Sem internet, a cópia fica guardada; quando a conexão volta, é enviada sozinha.
 * - Se o servidor tem uma versão mais nova, a fila para em "conflito" até a pessoa escolher.
 * - Computador compartilhado: a chave inclui a pessoa e a notícia. Uma pessoa nunca lê nem envia a
 *   cópia de outra. Quando a cópia chega ao servidor, ela é apagada do navegador.
 */
import type { DadosNoticia } from "./dados";

export type VersaoServidor = { revisao: number; dados: DadosNoticia; salvoPorNome: string; salvoEm: string };

export type PedidoEnvio = { id?: string; revisaoBase?: number; dados: DadosNoticia };

export type RespostaEnvio =
  | { tipo: "salvo"; id: string; revisao: number; salvoEm: string }
  | { tipo: "conflito"; servidor: VersaoServidor }
  | { tipo: "sem_conexao" }
  | { tipo: "erro"; mensagem: string; campo?: string };

export type Situacao = "sincronizado" | "pendente" | "salvando" | "sem_internet" | "conflito" | "erro";

export type EstadoDaFila = {
  situacao: Situacao;
  id: string | null;
  revisao: number;
  salvoEm: string | null;
  erro?: { mensagem: string; campo?: string };
  conflito?: { minha: DadosNoticia; servidor: VersaoServidor };
};

/** O que fica no navegador para cada (pessoa, notícia). */
type Registro = { dados: DadosNoticia; revisaoBase: number; guardadoEm: string; pendente: boolean };

export type Armazem = {
  ler(chave: string): string | null;
  gravar(chave: string, valor: string): void;
  apagar(chave: string): void;
  chaves(): string[];
};

const PREFIXO = "sintravc:rascunho:";
const chaveDo = (pessoaId: string, id: string | null) => `${PREFIXO}${pessoaId}:noticia:${id ?? "nova"}`;

export type Retomada =
  | { tipo: "nada" }
  | { tipo: "retomada"; dados: DadosNoticia; guardadoEm: string }
  | { tipo: "conflito"; minha: DadosNoticia; guardadoEm: string };

export function criarFilaDoRascunho(opcoes: {
  pessoaId: string;
  id: string | null;
  revisao: number;
  /** Quando a versão aberta foi salva no servidor (para o "Salvo às" logo ao abrir). */
  salvoEm?: string | null;
  intervaloMs: number;
  enviar: (pedido: PedidoEnvio) => Promise<RespostaEnvio>;
  online: () => boolean;
  armazem: Armazem;
  /** A versão que a tela carregou do servidor (para mostrar no conflito ao retomar). */
  versaoServidor?: VersaoServidor;
}) {
  const { pessoaId, armazem } = opcoes;
  let estado: EstadoDaFila = { situacao: "sincronizado", id: opcoes.id, revisao: opcoes.revisao, salvoEm: opcoes.salvoEm ?? null };
  let dados: DadosNoticia | null = null;
  let mudanca = 0;
  let mudancaNoServidor = 0;
  let relogio: ReturnType<typeof setTimeout> | null = null;
  let enviando: Promise<void> | null = null;
  const ouvintes = new Set<() => void>();

  const mudar = (novo: Partial<EstadoDaFila>) => {
    estado = { ...estado, ...novo };
    for (const ouvinte of ouvintes) ouvinte();
  };
  const pendente = () => mudanca !== mudancaNoServidor;
  const chave = () => chaveDo(pessoaId, estado.id);

  const guardar = () => {
    if (!dados) return;
    const registro: Registro = { dados, revisaoBase: estado.revisao, guardadoEm: new Date().toISOString(), pendente: true };
    try {
      armazem.gravar(chave(), JSON.stringify(registro));
    } catch {
      // Navegador sem espaço ou com armazenamento bloqueado: o envio ao servidor continua valendo.
    }
  };
  const apagarCopia = (chaveDaCopia = chave()) => {
    try {
      armazem.apagar(chaveDaCopia);
    } catch {
      // idem
    }
  };
  const pararRelogio = () => {
    if (relogio) clearTimeout(relogio);
    relogio = null;
  };
  const agendar = () => {
    pararRelogio();
    relogio = setTimeout(() => void enviarPendente(), opcoes.intervaloMs);
  };

  async function enviarPendente(): Promise<void> {
    pararRelogio();
    if (estado.situacao === "conflito" || !pendente() || !dados) return;
    if (enviando) {
      await enviando;
      return enviarPendente();
    }
    if (!opcoes.online()) {
      mudar({ situacao: "sem_internet" });
      return;
    }
    const enviada = mudanca;
    const chaveAntes = chave();
    const pedido: PedidoEnvio = estado.id ? { id: estado.id, revisaoBase: estado.revisao, dados } : { dados };
    mudar({ situacao: "salvando" });
    enviando = (async () => {
      let resposta: RespostaEnvio;
      try {
        resposta = await opcoes.enviar(pedido);
      } catch {
        resposta = opcoes.online()
          ? { tipo: "erro", mensagem: "Não foi possível salvar agora. Suas alterações estão guardadas neste computador." }
          : { tipo: "sem_conexao" };
      }
      if (resposta.tipo === "salvo") {
        mudancaNoServidor = enviada;
        if (chaveAntes !== chaveDo(pessoaId, resposta.id)) apagarCopia(chaveAntes);
        mudar({ id: resposta.id, revisao: resposta.revisao, salvoEm: resposta.salvoEm, erro: undefined });
        if (pendente()) {
          guardar();
          mudar({ situacao: "pendente" });
          agendar();
        } else {
          apagarCopia();
          mudar({ situacao: "sincronizado" });
        }
      } else if (resposta.tipo === "conflito") {
        mudar({ situacao: "conflito", conflito: { minha: dados!, servidor: resposta.servidor } });
      } else if (resposta.tipo === "sem_conexao") {
        mudar({ situacao: "sem_internet" });
      } else {
        mudar({ situacao: "erro", erro: { mensagem: resposta.mensagem, campo: resposta.campo } });
      }
    })();
    try {
      await enviando;
    } finally {
      enviando = null;
    }
  }

  return {
    estado: () => estado,
    assinar(ouvinte: () => void) {
      ouvintes.add(ouvinte);
      return () => ouvintes.delete(ouvinte);
    },
    temPendencia: () => pendente(),

    /** A pessoa mudou algum campo. */
    alterar(novos: DadosNoticia) {
      dados = novos;
      mudanca += 1;
      guardar();
      if (estado.situacao === "conflito") {
        mudar({ conflito: { ...estado.conflito!, minha: novos } });
        return;
      }
      if (estado.situacao !== "salvando") mudar({ situacao: opcoes.online() ? "pendente" : "sem_internet" });
      agendar();
    },

    /** "Salvar rascunho", Ctrl+S e "Salvar e sair". */
    salvarAgora: () => enviarPendente(),

    conexaoVoltou: () => enviarPendente(),

    /** Ao abrir o editor: há uma cópia desta pessoa guardada neste navegador? */
    retomar(): Retomada {
      let registro: Registro | null = null;
      try {
        const texto = armazem.ler(chave());
        registro = texto ? (JSON.parse(texto) as Registro) : null;
      } catch {
        registro = null;
      }
      if (!registro?.pendente) return { tipo: "nada" };
      dados = registro.dados;
      mudanca += 1;
      if (registro.revisaoBase === estado.revisao) {
        mudar({ situacao: opcoes.online() ? "pendente" : "sem_internet" });
        agendar();
        return { tipo: "retomada", dados: registro.dados, guardadoEm: registro.guardadoEm };
      }
      if (opcoes.versaoServidor) {
        mudar({ situacao: "conflito", conflito: { minha: registro.dados, servidor: opcoes.versaoServidor } });
      }
      return { tipo: "conflito", minha: registro.dados, guardadoEm: registro.guardadoEm };
    },

    /** O modal de conflito gravou a escolha no servidor: segue da revisão devolvida. */
    conflitoResolvido(resposta: Extract<RespostaEnvio, { tipo: "salvo" }>) {
      mudancaNoServidor = mudanca;
      apagarCopia();
      mudar({
        situacao: "sincronizado",
        conflito: undefined,
        id: resposta.id,
        revisao: resposta.revisao,
        salvoEm: resposta.salvoEm,
      });
    },

    /** Alguém salvou de novo enquanto a pessoa escolhia: o modal passa a comparar com a versão mais nova. */
    conflitoAtualizado(servidor: VersaoServidor) {
      if (!dados) return;
      mudar({ situacao: "conflito", conflito: { minha: estado.conflito?.minha ?? dados, servidor } });
    },

    /** "Descartar alterações": apaga a cópia e esquece o que não foi salvo. */
    descartar() {
      pararRelogio();
      mudancaNoServidor = mudanca;
      apagarCopia();
      mudar({ situacao: "sincronizado", erro: undefined });
    },

    destruir() {
      pararRelogio();
      ouvintes.clear();
    },
  };
}

export type FilaDoRascunho = ReturnType<typeof criarFilaDoRascunho>;

/**
 * No "Sair" do painel: apaga as cópias desta pessoa que já chegaram ao servidor. As pendentes ficam,
 * e só ela as vê quando entrar de novo. Cópias de outras pessoas não são tocadas.
 */
export function limparAoSair(armazem: Armazem, pessoaId: string) {
  for (const chave of armazem.chaves()) {
    if (!chave.startsWith(`${PREFIXO}${pessoaId}:`)) continue;
    try {
      const registro = JSON.parse(armazem.ler(chave) ?? "null") as Registro | null;
      if (!registro?.pendente) armazem.apagar(chave);
    } catch {
      armazem.apagar(chave);
    }
  }
}

export function armazemEmMemoria(): Armazem {
  const mapa = new Map<string, string>();
  return {
    ler: (c) => mapa.get(c) ?? null,
    gravar: (c, v) => void mapa.set(c, v),
    apagar: (c) => void mapa.delete(c),
    chaves: () => [...mapa.keys()],
  };
}

/** O localStorage como armazém. Pode faltar ou estar bloqueado: aí funciona sem cópia local. */
export function armazemDoNavegador(): Armazem {
  const local = () => {
    try {
      return window.localStorage;
    } catch {
      return null;
    }
  };
  return {
    ler: (c) => local()?.getItem(c) ?? null,
    gravar: (c, v) => local()?.setItem(c, v),
    apagar: (c) => local()?.removeItem(c),
    chaves: () => {
      const armazenamento = local();
      if (!armazenamento) return [];
      return Array.from({ length: armazenamento.length }, (_, i) => armazenamento.key(i)).filter((c): c is string => !!c);
    },
  };
}

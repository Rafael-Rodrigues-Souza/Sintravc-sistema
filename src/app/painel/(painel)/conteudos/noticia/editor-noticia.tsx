"use client";

import { useEditorState, type Editor } from "@tiptap/react";
import {
  CalendarDays,
  ChevronLeft,
  Eye,
  History,
  ImageIcon,
  MoreHorizontal,
  Lock,
  MapPin,
  Redo2,
  Star,
  Undo2,
  Upload,
  User,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { ListaAntesDePublicar } from "@/components/painel/antes-de-publicar";
import { useConectado } from "@/components/painel/use-conexao";
import { Alerta } from "@/components/ui/alerta";
import { Button } from "@/components/ui/button";
import { Campo } from "@/components/ui/campo";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { acoesDisponiveis, type AcaoDoMenu } from "@/lib/conteudos/acoes-disponiveis";
import { LIMITE_LINHA_FINA, LIMITE_MANCHETE, type ArquivoConhecido, type DadosNoticia } from "@/lib/conteudos/dados";
import { paraJsonSimples } from "@/lib/conteudos/json";
import { armazemDoNavegador, criarFilaDoRascunho, type VersaoServidor } from "@/lib/conteudos/fila-rascunho";
import type { EstadoConteudo } from "@/lib/conteudos/listar";
import { ehCampoObrigatorio, faltasParaPublicar, type CampoObrigatorio } from "@/lib/conteudos/obrigatorios";
import { jaFoiAoAr, temAlteracoesNaoPublicadas } from "@/lib/conteudos/publicacao";
import { bahiaEmCampos, camposEmTexto, dataHoraNaBahia } from "@/lib/datas";
import type { QuemDaEquipe } from "@/lib/permissoes";
import { cn } from "@/lib/utils";

import {
  acaoAgendar,
  acaoCancelarAgendamento,
  acaoDescartarAlteracoes,
  acaoPublicarNoticia,
  acaoReagendar,
  acaoResolverConflito,
  acaoSalvarRascunho,
} from "../acoes";
import { acaoRestaurarVersao } from "../acoes-ciclo-de-vida";
import { ConfirmarAcao, MenuDeAcoes, type PedidoDeAcao } from "../ciclo-de-vida";
import {
  BarraDoEditor,
  BotaoTravado,
  CampoComContador,
  Cartao,
  CamposDeData,
  mesmaData,
  resumoDasFaltas,
  SecaoQueAbre,
  StatusCurto,
  StatusDoSalvamento,
  useSecoesAbertas,
  type CamposDaData,
} from "../pecas-do-editor";
import { SeloEstado } from "../selos";
import { CorpoRico, MENSAGEM_SEM_INTERNET_MIDIA } from "./corpo-rico";
import { Etiquetas } from "./etiquetas";
import { FontesEAnexos } from "./fontes-anexos";
import { HistoricoDeVersoes } from "./historico";
import { irParaImagemSemAlt } from "./imagem-no-corpo";
import { ModalCancelarAgendamento, ModalConflito, ModalDescartarAlteracoes, ModalPublicar, ModalSair } from "./modais";
import { SeletorDeMidia } from "./seletor-midia";

export type InicioDoEditor = {
  id: string | null;
  revisao: number;
  estado: EstadoConteudo;
  /** A revisão que está no ar (E42); nula se nunca foi publicada. */
  revisaoPublicada: number | null;
  publicadoEm: string | null;
  /** Notícia agendada: quando entra no ar sozinha (E44). */
  agendadoPara: string | null;
  /** Já foi ao ar alguma vez: não pode ser excluída (RN54). */
  jaPublicado: boolean;
  autorId: string | null;
  /** Oculta: por que saiu do site (RN11). */
  motivoOculto: string | null;
  dados: DadosNoticia;
  salvoEm: string | null;
  servidor: VersaoServidor | null;
};

type Saida = { tipo: "link"; href: string } | { tipo: "formulario"; formulario: HTMLFormElement };
type Publicacao = {
  estado: EstadoConteudo;
  revisaoPublicada: number | null;
  publicadoEm: string | null;
  agendadoPara: string | null;
  motivoOculto: string | null;
};

/** Sugestão ao escolher "Agendar": amanhã às 08h00, no horário da Bahia. */
function amanhaAsOito(): CamposDaData {
  return { data: bahiaEmCampos(new Date(Date.now() + 24 * 60 * 60 * 1000)).data, hora: "08:00" };
}
const DICA_SEM_INTERNET = "Sem internet: publicar e agendar voltam quando a conexão voltar";
const SEM_CONEXAO = "Sem conexão com o servidor. Confira a internet e tente de novo.";
const SEM_INTERNET_PARA_PUBLICAR = "Sem internet. Publique quando a conexão voltar: o texto continua guardado.";
/** Resposta quando a chamada ao servidor nem chega (sem internet, servidor fora). */
const semConexao = () => ({ tipo: "erro" as const, mensagem: SEM_CONEXAO, campo: undefined });

/** Onde levar o foco quando falta um item obrigatório (CA-US21.3). */
const ELEMENTO_DO_CAMPO: Record<CampoObrigatorio, string> = {
  titulo: "#manchete",
  lide: "#lide",
  corpo: '[aria-label="Corpo da notícia"]',
  imagensDoCorpo: '[aria-label="Corpo da notícia"]',
  capaAlt: "#capa-alt",
  assinatura: "#assinatura",
  categoriaId: "#categoria",
};
/** No celular, a seção que precisa abrir antes de levar o foco ao campo (E49). */
type SecaoDoEditor = "capa" | "publicacao" | "fontes";
const SECAO_DO_CAMPO: Partial<Record<CampoObrigatorio, SecaoDoEditor>> = {
  capaAlt: "capa",
  assinatura: "publicacao",
  categoriaId: "publicacao",
};

const MENSAGEM_DO_CAMPO: Partial<Record<CampoObrigatorio, string>> = {
  titulo: "Escreva a manchete para publicar.",
  lide: "Escreva o lide para publicar.",
  capaAlt: "Descreva a imagem para publicar: quem não enxerga ouve este texto.",
  assinatura: "Escreva a assinatura para publicar.",
  categoriaId: "Escolha a categoria para publicar.",
};

/**
 * Editor de notícia (RF37, RF38; Figma 112:1091 e 120:3836). O rascunho é salvo sozinho pela
 * fila (fila-rascunho.ts): sem internet, fica guardado neste computador, só para esta pessoa (E02, E40).
 */
export function EditorNoticia({
  pessoaId,
  quem,
  inicio,
  categorias,
  arquivosIniciais,
  intervaloMs,
  limites,
}: {
  pessoaId: string;
  /** Quem está editando: monta o menu de ações (o servidor confere de novo, RNF01). */
  quem: QuemDaEquipe;
  inicio: InicioDoEditor;
  categorias: { id: string; nome: string }[];
  arquivosIniciais: Record<string, ArquivoConhecido>;
  intervaloMs: number;
  limites: { tamanhoMaximoBytes: number; mensagemDeTamanho: string };
}) {
  const router = useRouter();
  const conectado = useConectado();
  const [dados, setDados] = React.useState(inicio.dados);
  const [base, setBase] = React.useState(inicio.dados);
  const [arquivos, setArquivos] = React.useState(arquivosIniciais);
  const [corpoEditor, setCorpoEditor] = React.useState<Editor | null>(null);
  const [seletorCapa, setSeletorCapa] = React.useState(false);
  const [decidirDepois, setDecidirDepois] = React.useState(false);
  const [resolvendo, setResolvendo] = React.useState(false);
  const [erroConflito, setErroConflito] = React.useState<string | null>(null);
  const [guardadaEm, setGuardadaEm] = React.useState<Date | null>(null);
  const [saida, setSaida] = React.useState<Saida | null>(null);
  const [salvandoParaSair, setSalvandoParaSair] = React.useState(false);
  const liberarSaida = React.useRef(false);

  // --- Situação da publicação (E42, E47) ---
  const [publicacao, setPublicacao] = React.useState<Publicacao>({
    estado: inicio.estado,
    revisaoPublicada: inicio.revisaoPublicada,
    publicadoEm: inicio.publicadoEm,
    agendadoPara: inicio.agendadoPara,
    motivoOculto: inicio.motivoOculto,
  });
  // O salvamento diz se a cópia de trabalho ficou igual à versão no ar: mudar e desfazer tira o aviso (E47).
  const seguirPublicacao = <R extends { tipo: string; revisaoPublicada?: number | null }>(resposta: R): R => {
    const { revisaoPublicada } = resposta;
    if (resposta.tipo === "salvo" && revisaoPublicada != null) setPublicacao((atual) => ({ ...atual, revisaoPublicada }));
    return resposta;
  };

  // Uma sessão de edição por vez que o editor abre: a Atividade registra a edição uma vez por sessão (E40).
  const [sessaoEdicao] = React.useState(() => crypto.randomUUID());
  const [fila] = React.useState(() =>
    criarFilaDoRascunho({
      pessoaId,
      id: inicio.id,
      revisao: inicio.revisao,
      salvoEm: inicio.salvoEm,
      intervaloMs,
      enviar: async (pedido) => seguirPublicacao(await acaoSalvarRascunho(paraJsonSimples(pedido), sessaoEdicao)),
      online: () => navigator.onLine,
      armazem: armazemDoNavegador(),
      versaoServidor: inicio.servidor ?? undefined,
    }),
  );
  const estado = React.useSyncExternalStore(fila.assinar, fila.estado, fila.estado);
  // Saiu do editor sem passar pelo modal (ex.: botão Voltar do navegador): salva o que estiver pendente.
  // A cópia no navegador continua como garantia se o envio não chegar.
  React.useEffect(
    () => () => {
      if (fila.temPendencia()) void fila.salvarAgora();
      fila.destruir();
    },
    [fila],
  );

  // Ao abrir: há uma cópia desta pessoa guardada neste navegador? (E02, computador compartilhado)
  // O navegador só pode ser lido depois da hidratação (no servidor não há localStorage): por isso o efeito.
  React.useEffect(() => {
    const retomada = fila.retomar();
    if (retomada.tipo === "nada") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGuardadaEm(new Date(retomada.guardadoEm));
    if (retomada.tipo === "retomada") {
      setDados(retomada.dados);
      toast.info("Recuperamos as alterações guardadas neste computador.");
    }
  }, [fila]);

  // A conexão voltou: envia o que ficou guardado.
  React.useEffect(() => {
    if (conectado) void fila.conexaoVoltou();
  }, [conectado, fila]);

  // Notícia nova: depois do primeiro salvamento, o endereço passa a ser o da notícia (sem recarregar o editor).
  React.useEffect(() => {
    if (estado.id && !window.location.pathname.endsWith(estado.id)) {
      window.history.replaceState(null, "", `/painel/conteudos/noticia/${estado.id}`);
    }
  }, [estado.id]);

  // O valor mais recente, para juntar mudanças seguidas sem depender do ciclo de renderização.
  const dadosAtuais = React.useRef(dados);
  React.useEffect(() => {
    dadosAtuais.current = dados;
  }, [dados]);
  const mudar = React.useCallback(
    (mudanca: Partial<DadosNoticia>) => {
      const novos = { ...dadosAtuais.current, ...mudanca };
      dadosAtuais.current = novos;
      setDados(novos);
      fila.alterar(novos);
    },
    [fila],
  );

  // Ctrl+S / ⌘S salva na hora.
  React.useEffect(() => {
    const aoTeclar = (evento: KeyboardEvent) => {
      if ((evento.ctrlKey || evento.metaKey) && evento.key.toLowerCase() === "s") {
        evento.preventDefault();
        void fila.salvarAgora();
      }
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [fila]);

  // Sair com alteração pendente (CA-US21.4): links e formulários do painel abrem o modal; fechar a aba, o aviso do navegador.
  React.useEffect(() => {
    const aoClicar = (evento: MouseEvent) => {
      if (liberarSaida.current || !fila.temPendencia() || evento.defaultPrevented) return;
      if (evento.button !== 0 || evento.ctrlKey || evento.metaKey || evento.shiftKey || evento.altKey) return;
      const link = (evento.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
      const destino = new URL(link.href, window.location.href);
      if (destino.origin !== window.location.origin || destino.pathname === window.location.pathname) return;
      evento.preventDefault();
      evento.stopPropagation();
      setSaida({ tipo: "link", href: destino.pathname + destino.search });
    };
    const aoEnviar = (evento: SubmitEvent) => {
      if (liberarSaida.current || !fila.temPendencia()) return;
      const formulario = evento.target as HTMLFormElement;
      if (formulario.closest("[data-editor-noticia]") || formulario.closest("[role=dialog]")) return;
      evento.preventDefault();
      evento.stopPropagation();
      setSaida({ tipo: "formulario", formulario });
    };
    const antesDeFechar = (evento: BeforeUnloadEvent) => {
      if (liberarSaida.current || !fila.temPendencia()) return;
      evento.preventDefault();
      evento.returnValue = "";
    };
    document.addEventListener("click", aoClicar, true);
    document.addEventListener("submit", aoEnviar, true);
    window.addEventListener("beforeunload", antesDeFechar);
    return () => {
      document.removeEventListener("click", aoClicar, true);
      document.removeEventListener("submit", aoEnviar, true);
      window.removeEventListener("beforeunload", antesDeFechar);
    };
  }, [fila]);

  const seguirSaida = (destino: Saida) => {
    liberarSaida.current = true;
    setSaida(null);
    if (destino.tipo === "link") router.push(destino.href);
    else destino.formulario.requestSubmit();
  };

  const salvarESair = async () => {
    if (!saida) return;
    setSalvandoParaSair(true);
    await fila.salvarAgora();
    setSalvandoParaSair(false);
    const depois = fila.estado();
    if (depois.situacao === "sincronizado") return seguirSaida(saida);
    if (depois.situacao === "sem_internet") {
      toast.info("Guardado neste computador. Será salvo quando a conexão voltar.");
      return seguirSaida(saida);
    }
    setSaida(null);
    // Erro fica até a pessoa fechar (RN42).
    toast.error(depois.erro?.mensagem ?? "Não foi possível salvar. Confira o aviso no topo do editor.", {
      duration: Infinity,
      closeButton: true,
    });
  };

  const resolver = async (escolha: "minha" | "servidor") => {
    const conflito = estado.conflito;
    if (!conflito || !estado.id) return;
    setResolvendo(true);
    setErroConflito(null);
    const resposta = await acaoResolverConflito(
      paraJsonSimples({
        id: estado.id,
        escolha,
        revisaoServidor: conflito.servidor.revisao,
        dados: escolha === "minha" ? conflito.minha : conflito.servidor.dados,
      }),
      sessaoEdicao,
    ).catch(semConexao);
    setResolvendo(false);
    if (resposta.tipo === "salvo") {
      const escolhidos = escolha === "minha" ? conflito.minha : conflito.servidor.dados;
      setDados(escolhidos);
      setBase(escolhidos);
      fila.conflitoResolvido(seguirPublicacao(resposta));
      setDecidirDepois(false);
      toast.success(escolha === "minha" ? "Sua versão foi mantida." : "A versão do servidor foi mantida.");
    } else if (resposta.tipo === "conflito") {
      fila.conflitoAtualizado(resposta.servidor);
      setErroConflito("Alguém salvou de novo enquanto você escolhia. Confira as versões e escolha outra vez.");
    } else {
      setErroConflito(resposta.tipo === "erro" ? resposta.mensagem : SEM_CONEXAO);
    }
  };

  // --- Publicar (RF39, E42) ---------------------------------------------------
  const [quando, setQuando] = React.useState<"agora" | "agendar">(inicio.agendadoPara ? "agendar" : "agora");
  const [campos, setCampos] = React.useState<CamposDaData>(() =>
    inicio.agendadoPara ? bahiaEmCampos(new Date(inicio.agendadoPara)) : amanhaAsOito(),
  );
  const [erroDaData, setErroDaData] = React.useState<string | null>(null);
  const [mudandoData, setMudandoData] = React.useState(false);
  const [confirmarCancelamento, setConfirmarCancelamento] = React.useState(false);
  const [cancelando, setCancelando] = React.useState(false);
  const [preparando, setPreparando] = React.useState<"previa" | "publicar" | null>(null);
  const [confirmar, setConfirmar] = React.useState(false);
  const [publicando, setPublicando] = React.useState(false);
  const [mostrarFaltas, setMostrarFaltas] = React.useState(false);
  const [confirmarDescarte, setConfirmarDescarte] = React.useState(false);
  const [descartando, setDescartando] = React.useState(false);
  const botaoPublicar = React.useRef<HTMLButtonElement>(null);
  const botaoPublicarDaBarra = React.useRef<HTMLButtonElement>(null);
  const secoes = useSecoesAbertas<SecaoDoEditor>();

  const noAr = publicacao.estado === "publicado";
  const agendada = publicacao.estado === "agendado";
  const oculta = publicacao.estado === "oculto";
  // Rascunho com "Agendar" escolhido: o botão do topo agenda em vez de publicar (CA-US21.2).
  const vaiAgendar = !noAr && !agendada && quando === "agendar";
  // Alterações que ainda não estão no site: salvas depois da publicação ou ainda na fila (E42).
  // Vale também para a oculta: "Mostrar no site" volta a versão publicada, sem elas (E45).
  const comAlteracoes =
    temAlteracoesNaoPublicadas({ ...publicacao, revisao: estado.revisao }) || (jaFoiAoAr(publicacao.estado) && estado.situacao !== "sincronizado");
  const faltas = faltasParaPublicar(dados);
  const faltando = mostrarFaltas ? new Set(faltas.map((f) => f.campo)) : new Set<CampoObrigatorio>();

  const focarCampo = (campo: CampoObrigatorio) => {
    // Imagem do corpo: vai até a primeira sem texto alternativo, com o foco no botão de editar.
    if (campo === "imagensDoCorpo" && corpoEditor && irParaImagemSemAlt(corpoEditor)) return;
    const secao = SECAO_DO_CAMPO[campo];
    if (secao) secoes.abrir(secao);
    requestAnimationFrame(() => {
      const alvo = document.querySelector<HTMLElement>(ELEMENTO_DO_CAMPO[campo]);
      alvo?.scrollIntoView({ block: "center", behavior: "smooth" });
      alvo?.focus({ preventScroll: true });
    });
  };

  /** A data do agendamento fica na Publicação, que no celular pode estar fechada. */
  const focarData = () => {
    secoes.abrir("publicacao");
    requestAnimationFrame(() => document.getElementById("data-agendada")?.focus());
  };

  /**
   * O servidor recusou porque alguém salvou no meio: reenvia o que está na tela, e o salvamento
   * mostra o modal "Há duas versões" (N4).
   */
  const mostrarConflito = async () => {
    fila.alterar(dadosAtuais.current);
    await fila.salvarAgora();
  };

  /** Salva o que estiver pendente: a prévia e a publicação usam o que está na tela. */
  const salvarAntes = async (motivo: "previa" | "publicar") => {
    setPreparando(motivo);
    await fila.salvarAgora();
    setPreparando(null);
    const depois = fila.estado();
    if (depois.situacao === "sincronizado") return depois;
    if (depois.situacao === "erro") {
      toast.error(depois.erro?.mensagem ?? "Não foi possível salvar.", { duration: Infinity, closeButton: true });
    }
    // Conflito: o modal "Há duas versões" já abriu. Sem internet: a faixa e o botão travado avisam.
    return null;
  };

  const abrirPrevia = async () => {
    const pronto = await salvarAntes("previa");
    if (!pronto?.id) return;
    router.push(`/painel/conteudos/noticia/${pronto.id}/previa`);
  };

  const pedirPublicacao = async () => {
    if (!conectado || preparando || publicando) return;
    if (vaiAgendar && (!campos.data || !campos.hora)) {
      setErroDaData("Escolha a data e a hora.");
      focarData();
      return;
    }
    const pronto = await salvarAntes("publicar");
    if (!pronto) return;
    const agora = faltasParaPublicar(dadosAtuais.current);
    if (agora.length > 0 || !pronto.id) {
      setMostrarFaltas(true);
      if (agora[0]) focarCampo(agora[0].campo);
      return;
    }
    setConfirmar(true);
  };

  const agendar = async () => {
    const { id, revisao } = fila.estado();
    if (!id) return;
    setPublicando(true);
    const resposta = await acaoAgendar({ id, revisaoBase: revisao, quando: campos }, sessaoEdicao).catch(semConexao);
    setPublicando(false);
    setConfirmar(false);
    if (resposta.tipo === "agendada") {
      setPublicacao((atual) => ({ ...atual, estado: "agendado", agendadoPara: resposta.para }));
      setMostrarFaltas(false);
      setErroDaData(null);
      toast.success(`Notícia agendada para ${dataHoraNaBahia(new Date(resposta.para))}.`);
    } else if (resposta.tipo === "conflito") {
      await mostrarConflito();
    } else if (resposta.tipo === "faltam") {
      setMostrarFaltas(true);
      const primeiro = resposta.campos[0];
      if (primeiro) focarCampo(primeiro);
    } else if (resposta.campo === "agendadoPara") {
      setErroDaData(resposta.mensagem);
      focarData();
    } else {
      toast.error("Não foi possível agendar", { description: resposta.mensagem, duration: Infinity, closeButton: true });
    }
  };

  /** Notícia já agendada: muda só a data (o texto continua sendo salvo sozinho). */
  const mudarData = async () => {
    if (!estado.id || mudandoData) return;
    setMudandoData(true);
    const resposta = await acaoReagendar({ id: estado.id, quando: campos }).catch(semConexao);
    setMudandoData(false);
    if (resposta.tipo === "agendada") {
      setPublicacao((atual) => ({ ...atual, agendadoPara: resposta.para }));
      setErroDaData(null);
      toast.success(`Nova data: ${dataHoraNaBahia(new Date(resposta.para))}.`);
    } else if (resposta.tipo === "erro" && resposta.campo === "agendadoPara") {
      setErroDaData(resposta.mensagem);
    } else {
      toast.error("Não foi possível mudar a data", {
        description: resposta.tipo === "erro" ? resposta.mensagem : undefined,
        duration: Infinity,
        closeButton: true,
      });
    }
  };

  const cancelarAgendamento = async () => {
    if (!estado.id) return;
    setCancelando(true);
    const resposta = await acaoCancelarAgendamento({ id: estado.id }, sessaoEdicao).catch(semConexao);
    setCancelando(false);
    setConfirmarCancelamento(false);
    if (resposta.tipo === "cancelado") {
      setPublicacao((atual) => ({ ...atual, estado: "rascunho", agendadoPara: null }));
      setQuando("agora");
      toast.success("Agendamento cancelado. A notícia voltou a ser rascunho.");
    } else {
      toast.error(resposta.mensagem, { duration: Infinity, closeButton: true });
    }
  };

  const publicar = async () => {
    if (vaiAgendar) return agendar();
    const { id, revisao } = fila.estado();
    if (!id) return;
    setPublicando(true);
    const primeira = !noAr;
    const resposta = await acaoPublicarNoticia({ id, revisaoBase: revisao }, sessaoEdicao).catch(semConexao);
    setPublicando(false);
    setConfirmar(false);
    if (resposta.tipo === "publicada") {
      setPublicacao({
        estado: "publicado",
        revisaoPublicada: resposta.revisaoPublicada,
        publicadoEm: resposta.publicadoEm,
        agendadoPara: null,
        motivoOculto: null,
      });
      setMostrarFaltas(false);
      toast.success(primeira ? "Notícia publicada." : "Alterações publicadas.");
    } else if (resposta.tipo === "conflito") {
      await mostrarConflito();
    } else if (resposta.tipo === "faltam") {
      setMostrarFaltas(true);
      const primeiro = resposta.campos[0];
      if (primeiro) focarCampo(primeiro);
    } else {
      // Erro fica até a pessoa fechar (RN42); "Tentar de novo" refaz a conferência (analise-figma §4).
      toast.error("Não foi possível publicar", {
        description: resposta.mensagem,
        duration: Infinity,
        closeButton: true,
        action: { label: "Tentar de novo", onClick: () => tentarDeNovo() },
      });
    }
  };

  // O aviso de erro pode ficar aberto por muito tempo: "Tentar de novo" usa a versão mais recente da
  // conferência e olha a conexão na hora do clique, não na hora em que o aviso apareceu.
  const pedirPublicacaoAtual = React.useRef(pedirPublicacao);
  React.useEffect(() => {
    pedirPublicacaoAtual.current = pedirPublicacao;
  });
  const tentarDeNovo = () => {
    if (!navigator.onLine) {
      toast.error(SEM_INTERNET_PARA_PUBLICAR, { duration: Infinity, closeButton: true });
      return;
    }
    void pedirPublicacaoAtual.current();
  };

  // Veio da prévia por "Publicar…": abre a mesma conferência do editor.
  const veioDaPrevia = React.useRef(false);
  React.useEffect(() => {
    if (veioDaPrevia.current) return;
    veioDaPrevia.current = true;
    const parametros = new URLSearchParams(window.location.search);
    if (parametros.get("publicar") !== "1") return;
    window.history.replaceState(null, "", window.location.pathname);
    // O endereço só pode ser lido depois da hidratação; roda uma vez, ao abrir.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void pedirPublicacao();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const descartarAlteracoes = async () => {
    setDescartando(true);
    // O que ainda está na fila vai junto para o servidor e é descartado com o resto.
    await fila.salvarAgora();
    const { id, revisao, situacao } = fila.estado();
    if (!id || situacao !== "sincronizado") {
      setDescartando(false);
      setConfirmarDescarte(false);
      return;
    }
    const resposta = await acaoDescartarAlteracoes({ id, revisaoBase: revisao }, sessaoEdicao).catch(semConexao);
    setDescartando(false);
    setConfirmarDescarte(false);
    if (resposta.tipo === "descartada") {
      dadosAtuais.current = resposta.dados;
      setDados(resposta.dados);
      setBase(resposta.dados);
      fila.conflitoResolvido({ tipo: "salvo", id, revisao: resposta.revisao, salvoEm: resposta.salvoEm });
      setPublicacao((atual) => ({ ...atual, revisaoPublicada: resposta.revisao }));
      toast.success("Alterações descartadas. O editor voltou a ficar igual ao site.");
    } else if (resposta.tipo === "conflito") {
      await mostrarConflito();
    } else {
      toast.error(resposta.mensagem, { duration: Infinity, closeButton: true });
    }
  };

  // --- Ciclo de vida (RF40, US22) e Histórico de versões (N14, E31) -----------------------
  const [pedido, setPedido] = React.useState<PedidoDeAcao | null>(null);
  const [historicoAberto, setHistoricoAberto] = React.useState(false);
  const [restaurandoVersao, setRestaurandoVersao] = React.useState(false);
  const jaPublicado = inicio.jaPublicado || publicacao.revisaoPublicada !== null;
  const acoesDoMenu: AcaoDoMenu[] =
    estado.id && inicio.autorId ? acoesDisponiveis({ estado: publicacao.estado, jaPublicado, autorId: inicio.autorId }, quem) : [];

  /** Salva o pendente antes da ação: oculta, arquiva ou exclui o que a pessoa está vendo. */
  const pedirAcao = async (acao: AcaoDoMenu) => {
    await fila.salvarAgora();
    const depois = fila.estado();
    if (!depois.id) return;
    if (depois.situacao !== "sincronizado" && acao !== "excluir") {
      toast.error("Salve o texto antes: há alterações que ainda não chegaram ao servidor.", { duration: Infinity, closeButton: true });
      return;
    }
    setPedido({ acao, alvos: [{ id: depois.id, titulo: dadosAtuais.current.titulo || "Notícia sem manchete", acoes: acoesDoMenu }] });
  };

  const sairParaLista = () => {
    liberarSaida.current = true;
    router.push("/painel/conteudos");
  };

  const aoConcluirAcao = (acao: AcaoDoMenu, feitos: string[], extra?: { motivo?: string }) => {
    if (feitos.length === 0) return;
    if (acao === "ocultar") setPublicacao((atual) => ({ ...atual, estado: "oculto", motivoOculto: extra?.motivo ?? null }));
    else if (acao === "mostrar") setPublicacao((atual) => ({ ...atual, estado: "publicado", motivoOculto: null }));
    else if (acao === "arquivar") sairParaLista();
    else if (acao === "excluir") {
      // Apaga a cópia guardada neste computador e para o salvamento automático (a notícia não existe mais).
      fila.descartar();
      sairParaLista();
    }
  };

  /** "Restaurar como rascunho" no Histórico (CA-US21.9): a versão vira a cópia de trabalho. */
  const restaurarVersao = async (versao: number): Promise<boolean> => {
    setRestaurandoVersao(true);
    await fila.salvarAgora();
    const { id, revisao, situacao } = fila.estado();
    if (!id || situacao !== "sincronizado") {
      setRestaurandoVersao(false);
      toast.error("Salve o texto antes de restaurar uma versão.", { duration: Infinity, closeButton: true });
      return false;
    }
    const resposta = await acaoRestaurarVersao({ id, versao, revisaoBase: revisao }, sessaoEdicao).catch(semConexao);
    setRestaurandoVersao(false);
    if (resposta.tipo === "restaurada") {
      dadosAtuais.current = resposta.dados;
      setDados(resposta.dados);
      setBase(resposta.dados);
      fila.conflitoResolvido({ tipo: "salvo", id, revisao: resposta.revisao, salvoEm: resposta.salvoEm });
      toast.success(`Versão ${versao} restaurada como rascunho. O site continua igual até você publicar.`);
      return true;
    }
    if (resposta.tipo === "conflito") {
      setHistoricoAberto(false);
      await mostrarConflito();
      return false;
    }
    toast.error(resposta.mensagem, { duration: Infinity, closeButton: true });
    return false;
  };

  const erroDoCampo = (campo: keyof DadosNoticia) => {
    if (estado.erro?.campo === campo) return estado.erro.mensagem;
    return ehCampoObrigatorio(campo) && faltando.has(campo) ? MENSAGEM_DO_CAMPO[campo] : undefined;
  };
  const capa = dados.capaMidiaId ? arquivos[dados.capaMidiaId] : undefined;
  const emConflito = estado.situacao === "conflito" && estado.conflito;
  const nomeDaCategoria = categorias.find((c) => c.id === dados.categoriaId)?.nome;
  const rotuloPublicar = noAr ? "Publicar alterações…" : vaiAgendar ? "Agendar…" : agendada ? "Publicar agora…" : "Publicar…";
  // Resumos das seções fechadas no celular (Figma M 120:3836).
  const faltasDa = (secao: SecaoDoEditor) => faltas.filter((f) => SECAO_DO_CAMPO[f.campo] === secao);
  const situacaoDa = (secao: SecaoDoEditor) => (faltasDa(secao).length > 0 ? "falta" : "ok");
  const resumoDaPublicacao =
    faltasDa("publicacao").length > 0
      ? resumoDasFaltas(faltasDa("publicacao").map((f) => f.rotulo))
      : [
          nomeDaCategoria,
          noAr && publicacao.publicadoEm
            ? `No site desde ${dataHoraNaBahia(new Date(publicacao.publicadoEm))}`
            : agendada && publicacao.agendadoPara
              ? `Agendada para ${dataHoraNaBahia(new Date(publicacao.agendadoPara))}`
              : vaiAgendar
                ? "Agendar"
                : "Rascunho",
        ]
          .filter(Boolean)
          .join(" · ");
  const fontes = dados.links.filter((l) => l.tipo === "fonte").length;
  const anexos = dados.links.length - fontes;
  const resumoDasFontes =
    dados.links.length === 0
      ? "Opcional"
      : [fontes ? `${fontes} ${fontes === 1 ? "link" : "links"}` : null, anexos ? `${anexos} ${anexos === 1 ? "anexo" : "anexos"}` : null].filter(Boolean).join(" · ");
  const focarPublicar = () => {
    // O botão visível: o do topo (desktop) ou o da barra de baixo (celular).
    botaoPublicarDaBarra.current?.focus();
    botaoPublicar.current?.focus();
  };
  const dicaPublicar = !conectado
    ? DICA_SEM_INTERNET
    : oculta
      ? "Notícia oculta: mostre no site antes de publicar alterações"
      : noAr && !comAlteracoes
        ? "Nada novo para publicar: o site já mostra esta versão"
        : null;

  return (
    <div data-editor-noticia className="flex flex-1 flex-col">
      {/* Os botões descem inteiros para a linha de baixo quando o título e o status não cabem ao lado (E48).
          Abaixo do lg o topo é compacto (Figma M 120:3836, E49): voltar, título, desfazer, prévia e ⋯;
          Salvar e Publicar vão para a barra de baixo. */}
      <header className="sticky top-0 z-30 flex items-center gap-x-3 gap-y-3 border-b border-borda-padrao bg-fundo-cabecalho px-4 py-3 lg:flex-wrap lg:gap-x-4 lg:px-10">
        <div className="flex min-w-0 flex-1 items-center gap-3 lg:flex-[1_1_max-content]">
          <Link
            href="/painel/conteudos"
            aria-label="Voltar para Conteúdos"
            className="alvo-toque flex size-9 shrink-0 items-center justify-center rounded-full bg-fundo-superficie-alt text-texto-primario outline-none hover:brightness-95 focus-visible:ring-[3px] focus-visible:ring-ring"
          >
            <ChevronLeft aria-hidden className="size-5" />
          </Link>
          <div className="flex min-w-0 flex-col">
            {/* O selo desce para baixo do título quando não cabe ao lado, como no editor de documento (E48). */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h1 className="texto-titulo-card text-texto-primario lg:truncate">{estado.id ? "Editar notícia" : "Nova notícia"}</h1>
              <SeloEstado estado={publicacao.estado} className="max-lg:hidden" />
            </div>
            <StatusDoSalvamento estado={estado} temId={!!estado.id} />
          </div>
        </div>
        {/* No toque, vão para a área de toque de um ícone não cobrir a do vizinho (E48). */}
        <div className="flex shrink-0 items-center gap-1 max-lg:pointer-coarse:vao-toque-10 lg:flex-wrap lg:gap-2">
          <DesfazerRefazer editor={corpoEditor} />
          {estado.id || estado.situacao !== "sincronizado" ? (
            <Button
              type="button"
              variant="secundario"
              size="pequeno"
              disabled={!!preparando}
              onClick={() => void abrirPrevia()}
              className="max-lg:size-10 max-lg:px-0 max-lg:has-[>svg]:pl-0"
            >
              <Eye aria-hidden />
              <span className="max-lg:sr-only">{preparando === "previa" ? "Salvando…" : "Pré-visualizar"}</span>
            </Button>
          ) : (
            <BotaoTravado rotulo="Pré-visualizar" dica="Escreva a notícia para pré-visualizar" icone={<Eye aria-hidden />} compacto />
          )}
          <Button type="button" variant="secundario" size="pequeno" className="max-lg:hidden" onClick={() => void fila.salvarAgora()}>
            {jaFoiAoAr(publicacao.estado) ? "Salvar" : "Salvar rascunho"}
          </Button>
          {dicaPublicar ? (
            <BotaoTravado rotulo={rotuloPublicar} dica={dicaPublicar} icone={<Upload aria-hidden />} className="max-lg:hidden" />
          ) : (
            <Button
              ref={botaoPublicar}
              type="button"
              size="pequeno"
              className="max-lg:hidden"
              disabled={!!preparando || publicando}
              onClick={() => void pedirPublicacao()}
            >
              {vaiAgendar ? <CalendarDays aria-hidden /> : <Upload aria-hidden />}
              {preparando === "publicar" ? "Conferindo…" : rotuloPublicar}
            </Button>
          )}
          {estado.id ? (
            <MenuDeAcoes
              acoes={acoesDoMenu}
              aoPedir={(acao) => void pedirAcao(acao)}
              extras={[{ rotulo: "Histórico de versões", icone: History, aoSelecionar: () => setHistoricoAberto(true) }]}
            >
              <Button type="button" variant="secundario" size="pequeno" aria-label="Mais ações" className="px-3 has-[>svg]:pl-3 max-lg:size-10 max-lg:px-0 max-lg:has-[>svg]:pl-0">
                <MoreHorizontal aria-hidden />
              </Button>
            </MenuDeAcoes>
          ) : null}
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 px-4 pt-5 pb-12 lg:gap-6 lg:px-10 lg:pt-6 xl:flex-row xl:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-4 lg:gap-6">
          {mostrarFaltas && faltas.length > 0 ? (
            <Alerta
              tipo="erro"
              titulo={
                faltas.length === 1 ? "Falta 1 item obrigatório para publicar" : `Faltam ${faltas.length} itens obrigatórios para publicar`
              }
            >
              <ul className="flex flex-col gap-1">
                {faltas.map((falta) => (
                  <li key={falta.campo}>
                    <button
                      type="button"
                      onClick={() => focarCampo(falta.campo)}
                      className="rounded-sm text-left underline underline-offset-2 outline-none hover:text-destaque-azul focus-visible:ring-[3px] focus-visible:ring-ring"
                    >
                      {falta.rotulo}
                    </button>
                  </li>
                ))}
              </ul>
            </Alerta>
          ) : null}
          {oculta ? (
            <Alerta tipo="aviso" titulo="Esta notícia está fora do site">
              <div className="flex flex-col items-start gap-2">
                {publicacao.motivoOculto ? `Motivo: ${publicacao.motivoOculto}` : "Ela foi ocultada."} Você pode continuar editando: as
                mudanças ficam guardadas aqui.
                {acoesDoMenu.includes("mostrar") ? (
                  <Button type="button" variant="secundario" size="pequeno" disabled={!conectado} onClick={() => void pedirAcao("mostrar")}>
                    <Eye aria-hidden />
                    Mostrar no site
                  </Button>
                ) : null}
              </div>
            </Alerta>
          ) : null}
          {agendada && publicacao.agendadoPara ? (
            <Alerta tipo="informacao" titulo={`Agendada para ${dataHoraNaBahia(new Date(publicacao.agendadoPara))}`}>
              <div className="flex flex-col items-start gap-2">
                Entra no ar sozinha nessa hora. Pode continuar editando: vai ao ar o que estiver salvo.
                <Button
                  type="button"
                  variant="secundario"
                  size="pequeno"
                  disabled={!conectado || cancelando}
                  onClick={() => setConfirmarCancelamento(true)}
                >
                  Cancelar agendamento
                </Button>
              </div>
            </Alerta>
          ) : null}
          {comAlteracoes ? (
            <Alerta tipo="informacao" titulo="Há alterações que ainda não estão no site">
              <div className="flex flex-col items-start gap-2">
                {oculta
                  ? "Ao mostrar no site, volta a versão publicada. Depois, publique as alterações."
                  : "O site continua mostrando a versão publicada até você publicar as alterações."}
                <Button
                  type="button"
                  variant="secundario"
                  size="pequeno"
                  disabled={!conectado || descartando}
                  onClick={() => setConfirmarDescarte(true)}
                >
                  Descartar alterações
                </Button>
              </div>
            </Alerta>
          ) : null}
          {estado.situacao === "erro" && estado.erro ? (
            <Alerta tipo="erro" titulo="Não foi possível salvar">
              {estado.erro.mensagem} Suas alterações continuam guardadas neste computador.
            </Alerta>
          ) : null}
          {emConflito && decidirDepois ? (
            <Alerta tipo="aviso" titulo="Há duas versões deste rascunho">
              <div className="flex flex-col items-start gap-2">
                O salvamento automático está parado até você escolher qual versão manter.
                <Button type="button" variant="secundario" size="pequeno" onClick={() => setDecidirDepois(false)}>
                  Resolver conflito
                </Button>
              </div>
            </Alerta>
          ) : null}

          <Cartao titulo="Texto da notícia" descricao="Manchete, linha fina e lide aparecem no topo da matéria, nesta ordem.">
            <CampoComContador
              id="manchete"
              rotulo="Manchete"
              ajuda="Seja direto: diga o fato principal em uma frase."
              limite={LIMITE_MANCHETE}
              valor={dados.titulo}
              erro={erroDoCampo("titulo")}
              aoMudar={(titulo) => mudar({ titulo })}
            />
            <CampoComContador
              id="linha-fina"
              rotulo="Linha fina"
              limite={LIMITE_LINHA_FINA}
              valor={dados.linhaFina}
              erro={erroDoCampo("linhaFina")}
              aoMudar={(linhaFina) => mudar({ linhaFina })}
              multilinha
            />
            <div className="flex flex-col gap-2">
              <Label htmlFor="lide">Lide</Label>
              <Textarea
                id="lide"
                value={dados.lide}
                maxLength={2000}
                aria-describedby="lide-ajuda"
                aria-invalid={erroDoCampo("lide") ? true : undefined}
                onChange={(evento) => mudar({ lide: evento.target.value })}
              />
              <p id="lide-ajuda" className={cn("texto-pequeno", erroDoCampo("lide") ? "text-status-perigo-texto" : "text-texto-terciario")}>
                {erroDoCampo("lide") ?? "Primeiro parágrafo: responda o quê, quem, quando, onde e por quê."}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <span className="texto-rotulo text-texto-primario" id="rotulo-corpo">
                Corpo da notícia
              </span>
              <CorpoRico
                valor={dados.corpo}
                aoMudar={(corpo) => mudar({ corpo })}
                aoCriar={setCorpoEditor}
                conectado={conectado}
                limites={limites}
                rodape={<StatusCurto estado={estado} />}
                marcarImagensSemAlt={mostrarFaltas}
              />
            </div>
          </Cartao>

          <SecaoQueAbre
            titulo="Imagem de capa"
            descricao="Aparece no topo da notícia e nos cards do site. Tamanho recomendado: 1200 × 675 px."
            situacao={capa ? situacaoDa("capa") : "opcional"}
            resumo={faltasDa("capa").length > 0 ? "Falta o texto alternativo" : capa ? "Imagem escolhida" : "Opcional"}
            {...secoes.secao("capa")}
          >
            <div className="flex flex-col gap-5 md:flex-row">
              <div className="flex flex-col gap-3 md:w-[280px]">
                <div className="flex aspect-video w-full items-center justify-center overflow-hidden rounded-[14px] bg-fundo-superficie-alt">
                  {capa ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={capa.url} alt="" className="size-full object-cover" />
                  ) : (
                    <ImageIcon aria-hidden className="size-10 text-texto-terciario" />
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="secundario"
                    size="pequeno"
                    aria-disabled={!conectado || undefined}
                    aria-describedby={conectado ? undefined : "dica-capa-sem-internet"}
                    onClick={() => conectado && setSeletorCapa(true)}
                  >
                    {capa ? "Trocar" : "Escolher imagem"}
                  </Button>
                  {capa ? (
                    <Button type="button" variant="secundario" size="pequeno" onClick={() => mudar({ capaMidiaId: null })}>
                      Tirar
                    </Button>
                  ) : null}
                </div>
                {conectado ? null : (
                  <p id="dica-capa-sem-internet" className="texto-pequeno text-texto-terciario">
                    {MENSAGEM_SEM_INTERNET_MIDIA}
                  </p>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-4">
                <Campo
                  id="capa-alt"
                  rotulo="Texto alternativo"
                  ajuda="Obrigatório para publicar. Ex.: “Trabalhadores reunidos em assembleia na sede do sindicato.”"
                  placeholder="Descreva o que aparece na imagem"
                  value={dados.capaAlt}
                  maxLength={250}
                  erro={erroDoCampo("capaAlt")}
                  onChange={(evento) => mudar({ capaAlt: evento.target.value })}
                />
                <Campo
                  id="capa-legenda"
                  rotulo="Legenda e crédito"
                  value={dados.capaLegenda}
                  maxLength={300}
                  erro={erroDoCampo("capaLegenda")}
                  onChange={(evento) => mudar({ capaLegenda: evento.target.value })}
                />
              </div>
            </div>
          </SecaoQueAbre>

          <SecaoQueAbre
            titulo="Fontes, links e anexos"
            descricao="Opcional. Ajuda o leitor a conferir a informação."
            situacao={dados.links.length > 0 ? "ok" : "opcional"}
            resumo={resumoDasFontes}
            {...secoes.secao("fontes")}
          >
            <FontesEAnexos
              links={dados.links}
              aoMudar={(links) => mudar({ links })}
              arquivos={arquivos}
              aoConhecerArquivo={(id, arquivo) => setArquivos((atuais) => ({ ...atuais, [id]: arquivo }))}
              conectado={conectado}
              limites={limites}
            />
            <div className="flex flex-col gap-2">
              <Label htmlFor="palavras-chave">
                Palavras-chave <span className="texto-pequeno font-normal text-texto-terciario">Ajudam na busca do site</span>
              </Label>
              <Etiquetas id="palavras-chave" valor={dados.palavrasChave} aoMudar={(palavrasChave) => mudar({ palavrasChave })} />
            </div>
          </SecaoQueAbre>
        </div>

        <aside className="flex flex-col gap-4 lg:gap-6 xl:sticky xl:top-[88px] xl:w-[320px]">
          <SecaoQueAbre
            titulo="Publicação"
            acao={<SeloEstado estado={publicacao.estado} />}
            situacao={situacaoDa("publicacao")}
            resumo={resumoDaPublicacao}
            {...secoes.secao("publicacao")}
          >
            <Campo
              id="assinatura"
              rotulo="Assinatura"
              icone="/painel/menu-pessoas.svg"
              placeholder="Ex.: Redação SINTRAVC"
              value={dados.assinatura}
              maxLength={120}
              erro={erroDoCampo("assinatura")}
              onChange={(evento) => mudar({ assinatura: evento.target.value })}
            />
            <div className="flex flex-col gap-2">
              <Label htmlFor="local">Local</Label>
              <div className="relative">
                <MapPin aria-hidden className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-texto-terciario" />
                <Input
                  id="local"
                  className="pl-[46px]"
                  placeholder="Ex.: Vitória da Conquista (BA)"
                  value={dados.local}
                  maxLength={120}
                  onChange={(evento) => mudar({ local: evento.target.value })}
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="categoria">Categoria</Label>
              <select
                id="categoria"
                value={dados.categoriaId ?? ""}
                aria-invalid={erroDoCampo("categoriaId") ? true : undefined}
                onChange={(evento) => mudar({ categoriaId: evento.target.value || null })}
                className="h-[52px] w-full rounded-[14px] border border-borda-forte bg-fundo-superficie px-4 texto-corpo text-texto-primario outline-none focus-visible:border-destaque-azul focus-visible:ring-[4px] focus-visible:ring-destaque-azul/15 aria-invalid:border-destaque-vermelho"
              >
                <option value="">Escolha a categoria</option>
                {categorias.map((categoria) => (
                  <option key={categoria.id} value={categoria.id}>
                    {categoria.nome}
                  </option>
                ))}
              </select>
              {erroDoCampo("categoriaId") ? (
                <p className="texto-pequeno text-status-perigo-texto">{erroDoCampo("categoriaId")}</p>
              ) : null}
            </div>
            {noAr ? null : (
              <fieldset className="flex flex-col gap-3">
                <legend className="mb-3 texto-rotulo text-texto-primario">Quando publicar</legend>
                {agendada ? null : (
                  <RadioGroup
                    value={quando}
                    onValueChange={(valor) => {
                      setQuando(valor as "agora" | "agendar");
                      setErroDaData(null);
                    }}
                    aria-label="Quando publicar"
                  >
                    <label htmlFor="quando-agora" className="flex cursor-pointer items-start gap-3">
                      <RadioGroupItem id="quando-agora" value="agora" className="mt-0.5" />
                      <span className="flex flex-col gap-0.5">
                        <span className="texto-corpo text-texto-primario">Assim que eu publicar</span>
                        <span className="texto-pequeno text-texto-secundario">Data e hora registradas no momento da confirmação.</span>
                      </span>
                    </label>
                    <label htmlFor="quando-agendar" className="flex cursor-pointer items-start gap-3">
                      <RadioGroupItem id="quando-agendar" value="agendar" className="mt-0.5" />
                      <span className="flex flex-col gap-0.5">
                        <span className="texto-corpo text-texto-primario">Agendar</span>
                        <span className="texto-pequeno text-texto-secundario">Publica sozinho na data escolhida.</span>
                      </span>
                    </label>
                  </RadioGroup>
                )}
                {quando === "agendar" || agendada ? (
                  <CamposDeData
                    campos={campos}
                    erro={erroDaData}
                    aoMudar={(novos) => {
                      setCampos(novos);
                      setErroDaData(null);
                    }}
                  />
                ) : null}
                {agendada ? (
                  <Button
                    type="button"
                    variant="secundario"
                    size="pequeno"
                    className="self-start"
                    disabled={!conectado || mudandoData || !publicacao.agendadoPara || mesmaData(campos, publicacao.agendadoPara)}
                    onClick={() => void mudarData()}
                  >
                    {mudandoData ? "Salvando…" : "Mudar data"}
                  </Button>
                ) : null}
              </fieldset>
            )}
            <p className="flex items-start gap-2 rounded-[12px] bg-fundo-superficie-alt p-3 texto-pequeno text-texto-secundario">
              <User aria-hidden className="mt-0.5 size-4 shrink-0" />
              {noAr && publicacao.publicadoEm
                ? `No site desde ${dataHoraNaBahia(new Date(publicacao.publicadoEm))}. O que você muda aqui só vai ao site quando publicar as alterações.`
                : agendada && publicacao.agendadoPara
                  ? `Entra no ar sozinha em ${dataHoraNaBahia(new Date(publicacao.agendadoPara))}, com o que estiver salvo nessa hora.`
                  : "Fica como rascunho, fora do site, até alguém publicar."}
            </p>
            {noAr && estado.id ? (
              <div className="flex flex-col gap-1">
                <Link
                  href={`/painel/pagina-inicial?sugerir=${estado.id}`}
                  className="inline-flex items-center gap-2 self-start rounded-sm texto-botao text-destaque-azul outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring"
                >
                  <Star aria-hidden className="size-4" />
                  Destacar na Home
                </Link>
                <p className="texto-pequeno text-texto-secundario">Abre a Página inicial com esta notícia já sugerida para um destaque.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {/* aria-disabled (e não disabled) para continuar focável e a dica ser lida (E43: só o que está no ar vai para a Home). */}
                <button
                  type="button"
                  aria-disabled="true"
                  aria-describedby="dica-destacar"
                  onClick={(evento) => evento.preventDefault()}
                  className="inline-flex cursor-not-allowed items-center gap-2 self-start rounded-sm texto-botao text-texto-terciario outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
                >
                  <Star aria-hidden className="size-4" />
                  Destacar na Home
                  <Lock aria-hidden className="size-3.5" />
                </button>
                <p id="dica-destacar" className="texto-pequeno text-texto-terciario">
                  Publique a notícia para destacar na Home.
                </p>
              </div>
            )}
          </SecaoQueAbre>
          <Cartao titulo="Antes de publicar" descricao="Conferido automaticamente enquanto você escreve.">
            <ListaAntesDePublicar dados={dados} />
          </Cartao>
        </aside>
      </div>

      <BarraDoEditor>
        <Button type="button" variant="secundario" onClick={() => void fila.salvarAgora()}>
          Salvar
        </Button>
        {dicaPublicar ? (
          <BotaoTravado rotulo={rotuloPublicar} dica={dicaPublicar} icone={<Upload aria-hidden />} avisarAoTocar />
        ) : (
          <Button ref={botaoPublicarDaBarra} type="button" disabled={!!preparando || publicando} onClick={() => void pedirPublicacao()}>
            {vaiAgendar ? <CalendarDays aria-hidden /> : <Upload aria-hidden />}
            {preparando === "publicar" ? "Conferindo…" : rotuloPublicar}
          </Button>
        )}
      </BarraDoEditor>

      <SeletorDeMidia
        aberto={seletorCapa}
        aoMudarAberto={setSeletorCapa}
        so="imagens"
        titulo="Imagem de capa"
        descricao="Escolha uma imagem da Mídia ou envie uma nova."
        limites={limites}
        aoEscolher={(arquivo) => {
          setArquivos((atuais) => ({ ...atuais, [arquivo.id]: { nomeArquivo: arquivo.nomeArquivo, url: arquivo.url } }));
          mudar({
            capaMidiaId: arquivo.id,
            capaAlt: dados.capaAlt || arquivo.alt,
            capaLegenda: dados.capaLegenda || arquivo.legenda,
          });
        }}
      />

      <ModalSair
        aberto={!!saida}
        titulo={dados.titulo}
        salvando={salvandoParaSair}
        aoVoltar={() => setSaida(null)}
        aoDescartar={() => {
          fila.descartar();
          if (saida) seguirSaida(saida);
        }}
        aoSalvarESair={() => void salvarESair()}
      />
      <ModalPublicar
        aberto={confirmar}
        alteracoes={noAr}
        agendarPara={vaiAgendar ? camposEmTexto(campos) : null}
        titulo={dados.titulo}
        detalhe={["Notícia", nomeDaCategoria, dados.assinatura.trim()].filter(Boolean).join(" · ")}
        capaUrl={capa?.url ?? null}
        publicando={publicando}
        aoFechar={() => {
          setConfirmar(false);
          focarPublicar();
        }}
        aoConfirmar={() => void publicar()}
      />
      <ModalCancelarAgendamento
        aberto={confirmarCancelamento}
        cancelando={cancelando}
        aoVoltar={() => setConfirmarCancelamento(false)}
        aoConfirmar={() => void cancelarAgendamento()}
      />
      <ModalDescartarAlteracoes
        aberto={confirmarDescarte}
        descartando={descartando}
        aoVoltar={() => setConfirmarDescarte(false)}
        aoConfirmar={() => void descartarAlteracoes()}
      />
      <ConfirmarAcao pedido={pedido} aoFechar={() => setPedido(null)} aoConcluir={aoConcluirAcao} />
      {estado.id ? (
        <HistoricoDeVersoes
          id={estado.id}
          aberto={historicoAberto}
          comAlteracoes={comAlteracoes}
          restaurando={restaurandoVersao}
          aoFechar={() => setHistoricoAberto(false)}
          aoRestaurar={restaurarVersao}
        />
      ) : null}
      {emConflito ? (
        <ModalConflito
          aberto={!decidirDepois}
          minha={emConflito.minha}
          servidor={emConflito.servidor}
          base={base}
          guardadaEm={guardadaEm}
          resolvendo={resolvendo}
          erro={erroConflito}
          aoEscolher={(escolha) => void resolver(escolha)}
          aoDecidirDepois={() => setDecidirDepois(true)}
        />
      ) : null}
    </div>
  );
}

/** Desfazer e refazer do topo (Figma 112:1091): agem no texto rico, como os da barra (E40). */
function DesfazerRefazer({ editor }: { editor: Editor | null }) {
  const pode = useEditorState({
    editor,
    selector: ({ editor: e }) => (e ? { desfazer: e.can().undo(), refazer: e.can().redo() } : null),
  });
  const classe =
    "alvo-toque flex size-10 items-center justify-center rounded-full text-texto-secundario outline-none hover:bg-fundo-superficie-alt focus-visible:ring-[3px] focus-visible:ring-ring disabled:opacity-40 [&_svg]:size-5";
  return (
    <div className="flex items-center gap-1 max-lg:contents">
      <button
        type="button"
        aria-label="Desfazer no corpo (Ctrl+Z)"
        title="Desfazer no corpo (Ctrl+Z)"
        disabled={!pode?.desfazer}
        onClick={() => editor?.chain().focus().undo().run()}
        className={classe}
      >
        <Undo2 aria-hidden />
      </button>
      <button
        type="button"
        aria-label="Refazer no corpo (Ctrl+Shift+Z)"
        title="Refazer no corpo (Ctrl+Shift+Z)"
        disabled={!pode?.refazer}
        onClick={() => editor?.chain().focus().redo().run()}
        // No celular só o Desfazer (Figma M 120:3836); o Refazer continua na barra do corpo.
        className={cn(classe, "max-lg:hidden")}
      >
        <Redo2 aria-hidden />
      </button>
    </div>
  );
}

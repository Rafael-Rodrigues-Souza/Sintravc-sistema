"use client";

import {
  CalendarDays,
  ChevronLeft,
  CircleAlert,
  CircleCheck,
  Clock,
  Download,
  Eye,
  FileText,
  FolderOpen,
  History,
  MoreHorizontal,
  Newspaper,
  Scale,
  ShieldCheck,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { useConectado } from "@/components/painel/use-conexao";
import { AlertDialog, AlertDialogContent, AlertDialogFooter } from "@/components/ui/alert-dialog";
import { Alerta } from "@/components/ui/alerta";
import { Button } from "@/components/ui/button";
import { Campo } from "@/components/ui/campo";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { acoesDisponiveis, type AcaoDoMenu } from "@/lib/conteudos/acoes-disponiveis";
import { armazemDoNavegador, criarFilaDoRascunho, type VersaoServidor } from "@/lib/conteudos/fila-rascunho";
import { paraJsonSimples } from "@/lib/conteudos/json";
import type { EstadoConteudo } from "@/lib/conteudos/listar";
import { jaFoiAoAr, temAlteracoesNaoPublicadas } from "@/lib/conteudos/publicacao";
import { bahiaEmCampos, camposEmTexto, dataHoraNaBahia } from "@/lib/datas";
import {
  LIMITE_ABRANGENCIA,
  LIMITE_NUMERO,
  LIMITE_PARTES,
  LIMITE_RESUMO,
  LIMITE_TITULO_DOCUMENTO,
  NOME_DO_TIPO,
  ROTULO_DO_SUBTIPO,
  SUBTIPOS,
  usaVigencia,
  type DadosDocumento,
  type SubtipoDocumento,
  type TipoDocumento,
} from "@/lib/documentos/dados";
import { tamanhoDoArquivo } from "@/lib/documentos/cartao";
import { faltasParaPublicarDocumento, type CampoObrigatorioDocumento } from "@/lib/documentos/obrigatorios";
import { seloDosCampos } from "@/lib/documentos/selo";
import type { QuemDaEquipe } from "@/lib/permissoes";
import { cn } from "@/lib/utils";

import { acaoCancelarAgendamento, acaoReagendar } from "../acoes";
import { ConfirmarAcao, MenuDeAcoes, type PedidoDeAcao } from "../ciclo-de-vida";
import { HistoricoDeVersoes } from "../noticia/historico";
import { ModalCancelarAgendamento, ModalDescartarAlteracoes, ModalSair } from "../noticia/modais";
import { BotaoTravado, CampoComContador, Cartao, CamposDeData, mesmaData, StatusDoSalvamento, type CamposDaData } from "../pecas-do-editor";
import { SeloEstado, SeloVigencia } from "../selos";
import {
  acaoAgendarDocumento,
  acaoDescartarAlteracoesDocumento,
  acaoListarVersoesDocumento,
  acaoPublicarDocumento,
  acaoResolverConflitoDocumento,
  acaoRestaurarVersaoDocumento,
  acaoSalvarDocumento,
  type RespostaPublicarDocumento,
} from "./acoes";
import { ModalConflitoDocumento } from "./modal-conflito";

/** O PDF oficial que a tela mostra (nome, tamanho, páginas). */
export type PdfNaTela = { id: string; nomeArquivo: string; bytes: number; paginas: number | null };

export type InicioDoDocumento = {
  id: string | null;
  tipo: TipoDocumento;
  revisao: number;
  estado: EstadoConteudo;
  revisaoPublicada: number | null;
  publicadoEm: string | null;
  agendadoPara: string | null;
  jaPublicado: boolean;
  autorId: string | null;
  motivoOculto: string | null;
  dados: DadosDocumento;
  salvoEm: string | null;
  servidor: VersaoServidor<DadosDocumento> | null;
  pdf: PdfNaTela | null;
  /** O PDF da versão no ar (confirmado como oficial); null se nunca foi publicado. */
  pdfNoArId: string | null;
};

type Saida = { tipo: "link"; href: string } | { tipo: "formulario"; formulario: HTMLFormElement };
type Publicacao = { estado: EstadoConteudo; revisaoPublicada: number | null; publicadoEm: string | null; agendadoPara: string | null; motivoOculto: string | null };

const SEM_CONEXAO = "Sem conexão com o servidor. Confira a internet e tente de novo.";
const DICA_SEM_INTERNET = "Sem internet: publicar e agendar voltam quando a conexão voltar";
const semConexao = () => ({ tipo: "erro" as const, mensagem: SEM_CONEXAO, campo: undefined });
const amanhaAsOito = (): CamposDaData => ({ data: bahiaEmCampos(new Date(Date.now() + 86_400_000)).data, hora: "08:00" });

/** Onde levar o foco quando falta um item obrigatório. */
const ELEMENTO_DO_CAMPO: Record<CampoObrigatorioDocumento, string> = {
  titulo: "#titulo",
  numero: "#numero",
  subtipo: "#subtipo",
  dataDocumento: "#data-documento",
  vigenciaInicio: "#vigencia-inicio",
  vigenciaFim: "#vigencia-fim",
  abrangencia: "#abrangencia",
  partesSignatarias: "#partes-signatarias",
  resumo: "#resumo",
  pdfMidiaId: "#enviar-pdf",
  categoriaId: "#categoria",
};

const MENSAGEM_DO_CAMPO: Partial<Record<CampoObrigatorioDocumento, string>> = {
  titulo: "Escreva o título oficial para publicar.",
  numero: "Informe o número ou identificação para publicar.",
  subtipo: "Escolha o tipo para publicar.",
  dataDocumento: "Informe a data do documento para publicar.",
  vigenciaInicio: "Informe o início da vigência para publicar.",
  vigenciaFim: "Informe o fim da vigência para publicar.",
  abrangencia: "Informe a abrangência para publicar.",
  partesSignatarias: "Informe as partes signatárias para publicar.",
  resumo: "Escreva o resumo para publicar.",
  pdfMidiaId: "Envie o PDF oficial para publicar.",
  categoriaId: "Escolha a categoria para publicar.",
};

const tamanhoEmMb = tamanhoDoArquivo;

/**
 * Editor de documento oficial, edital ou acordo (RF41, RN12; Figma 114:1972 e, para o acordo, o
 * mesmo layout com Abrangência e Partes signatárias). Só o ADM edita (RN08). O rascunho é salvo
 * sozinho, como o da notícia (E40); publicar e agendar pedem a confirmação de versão oficial (E46).
 */
export function EditorDocumento({
  pessoaId,
  quem,
  inicio,
  categorias,
  intervaloMs,
  limiteBytes,
}: {
  pessoaId: string;
  quem: QuemDaEquipe;
  inicio: InicioDoDocumento;
  categorias: { id: string; nome: string }[];
  intervaloMs: number;
  limiteBytes: number;
}) {
  const router = useRouter();
  const conectado = useConectado();
  const { tipo } = inicio;
  const [dados, setDados] = React.useState(inicio.dados);
  const [base, setBase] = React.useState(inicio.dados);
  const [pdf, setPdf] = React.useState<PdfNaTela | null>(inicio.pdf);
  const [pdfNoArId, setPdfNoArId] = React.useState<string | null>(inicio.pdfNoArId);
  const [semTexto, setSemTexto] = React.useState(false);
  const [decidirDepois, setDecidirDepois] = React.useState(false);
  const [resolvendo, setResolvendo] = React.useState(false);
  const [erroConflito, setErroConflito] = React.useState<string | null>(null);
  const [guardadaEm, setGuardadaEm] = React.useState<Date | null>(null);
  const [saida, setSaida] = React.useState<Saida | null>(null);
  const [salvandoParaSair, setSalvandoParaSair] = React.useState(false);
  const liberarSaida = React.useRef(false);

  const [sessaoEdicao] = React.useState(() => crypto.randomUUID());
  const [fila] = React.useState(() =>
    criarFilaDoRascunho<DadosDocumento>({
      pessoaId,
      id: inicio.id,
      revisao: inicio.revisao,
      salvoEm: inicio.salvoEm,
      intervaloMs,
      enviar: (pedido) => acaoSalvarDocumento(paraJsonSimples({ ...pedido, tipo }), sessaoEdicao),
      online: () => navigator.onLine,
      armazem: armazemDoNavegador(),
      versaoServidor: inicio.servidor ?? undefined,
      tipo: "documento",
      nova: `${tipo}-nova`,
    }),
  );
  const estado = React.useSyncExternalStore(fila.assinar, fila.estado, fila.estado);
  React.useEffect(
    () => () => {
      if (fila.temPendencia()) void fila.salvarAgora();
      fila.destruir();
    },
    [fila],
  );

  // Ao abrir: há uma cópia desta pessoa guardada neste navegador? (E02)
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

  React.useEffect(() => {
    if (conectado) void fila.conexaoVoltou();
  }, [conectado, fila]);

  // Documento novo: depois do primeiro salvamento, o endereço passa a ser o do documento.
  React.useEffect(() => {
    if (estado.id && !window.location.pathname.endsWith(estado.id)) {
      window.history.replaceState(null, "", `/painel/conteudos/documento/${estado.id}`);
    }
  }, [estado.id]);

  const dadosAtuais = React.useRef(dados);
  React.useEffect(() => {
    dadosAtuais.current = dados;
  }, [dados]);
  const mudar = React.useCallback(
    (mudanca: Partial<DadosDocumento>) => {
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

  // Sair com alteração pendente: links e formulários do painel abrem o modal; fechar a aba, o aviso do navegador.
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
      if (formulario.closest("[data-editor-documento]") || formulario.closest("[role=dialog]")) return;
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
    toast.error(depois.erro?.mensagem ?? "Não foi possível salvar. Confira o aviso no topo do editor.", { duration: Infinity, closeButton: true });
  };

  const resolver = async (escolha: "minha" | "servidor") => {
    const conflito = estado.conflito;
    if (!conflito || !estado.id) return;
    setResolvendo(true);
    setErroConflito(null);
    const escolhidos = escolha === "minha" ? conflito.minha : conflito.servidor.dados;
    const resposta = await acaoResolverConflitoDocumento(
      paraJsonSimples({ id: estado.id, tipo, escolha, revisaoServidor: conflito.servidor.revisao, dados: escolhidos }),
      sessaoEdicao,
    ).catch(semConexao);
    setResolvendo(false);
    if (resposta.tipo === "salvo") {
      setDados(escolhidos);
      setBase(escolhidos);
      fila.conflitoResolvido(resposta);
      setDecidirDepois(false);
      toast.success(escolha === "minha" ? "Sua versão foi mantida." : "A versão do servidor foi mantida.");
    } else if (resposta.tipo === "conflito") {
      fila.conflitoAtualizado(resposta.servidor);
      setErroConflito("Alguém salvou de novo enquanto você escolhia. Confira as versões e escolha outra vez.");
    } else {
      setErroConflito(resposta.tipo === "erro" ? resposta.mensagem : SEM_CONEXAO);
    }
  };

  // --- Publicar e agendar (RF41, RN12, E44, E46) ------------------------------------------
  const [publicacao, setPublicacao] = React.useState<Publicacao>({
    estado: inicio.estado,
    revisaoPublicada: inicio.revisaoPublicada,
    publicadoEm: inicio.publicadoEm,
    agendadoPara: inicio.agendadoPara,
    motivoOculto: inicio.motivoOculto,
  });
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

  const noAr = publicacao.estado === "publicado";
  const agendado = publicacao.estado === "agendado";
  const oculto = publicacao.estado === "oculto";
  const vaiAgendar = !noAr && !agendado && quando === "agendar";
  const comAlteracoes =
    temAlteracoesNaoPublicadas({ ...publicacao, revisao: estado.revisao }) || (jaFoiAoAr(publicacao.estado) && estado.situacao !== "sincronizado");
  const faltas = faltasParaPublicarDocumento(tipo, dados);
  const faltando = mostrarFaltas ? new Set(faltas.map((f) => f.campo)) : new Set<CampoObrigatorioDocumento>();

  const focarCampo = (campo: string) => {
    const seletor = ELEMENTO_DO_CAMPO[campo as CampoObrigatorioDocumento];
    if (!seletor) return;
    requestAnimationFrame(() => {
      const alvo = document.querySelector<HTMLElement>(seletor);
      alvo?.scrollIntoView({ block: "center", behavior: "smooth" });
      alvo?.focus({ preventScroll: true });
    });
  };

  const mostrarConflito = async () => {
    fila.alterar(dadosAtuais.current);
    await fila.salvarAgora();
  };

  const salvarAntes = async (motivo: "previa" | "publicar") => {
    setPreparando(motivo);
    await fila.salvarAgora();
    setPreparando(null);
    const depois = fila.estado();
    if (depois.situacao === "sincronizado") return depois;
    if (depois.situacao === "erro") toast.error(depois.erro?.mensagem ?? "Não foi possível salvar.", { duration: Infinity, closeButton: true });
    return null;
  };

  const abrirPrevia = async () => {
    const pronto = await salvarAntes("previa");
    if (pronto?.id) router.push(`/painel/conteudos/documento/${pronto.id}/previa`);
  };

  const pedirPublicacao = async () => {
    if (!conectado || preparando || publicando) return;
    if (vaiAgendar && (!campos.data || !campos.hora)) {
      setErroDaData("Escolha a data e a hora.");
      document.getElementById("data-agendada")?.focus();
      return;
    }
    const pronto = await salvarAntes("publicar");
    if (!pronto) return;
    const agora = faltasParaPublicarDocumento(tipo, dadosAtuais.current);
    if (agora.length > 0 || !pronto.id) {
      setMostrarFaltas(true);
      if (agora[0]) focarCampo(agora[0].campo);
      return;
    }
    setConfirmar(true);
  };

  const tratarResposta = async (resposta: RespostaPublicarDocumento | ReturnType<typeof semConexao>, primeira: boolean) => {
    if (resposta.tipo === "publicado") {
      setPdfNoArId(dadosAtuais.current.pdfMidiaId);
      setPublicacao({ estado: "publicado", revisaoPublicada: resposta.revisaoPublicada, publicadoEm: resposta.publicadoEm, agendadoPara: null, motivoOculto: null });
      setMostrarFaltas(false);
      toast.success(primeira ? "Documento publicado." : "Alterações publicadas.");
    } else if (resposta.tipo === "agendado") {
      setPublicacao((atual) => ({ ...atual, estado: "agendado", agendadoPara: resposta.para }));
      setMostrarFaltas(false);
      setErroDaData(null);
      toast.success(`Documento agendado para ${dataHoraNaBahia(new Date(resposta.para))}.`);
    } else if (resposta.tipo === "conflito") {
      await mostrarConflito();
    } else if (resposta.tipo === "faltam") {
      setMostrarFaltas(true);
      if (resposta.campos[0]) focarCampo(resposta.campos[0]);
    } else if (resposta.campo === "agendadoPara") {
      setErroDaData(resposta.mensagem);
      document.getElementById("data-agendada")?.focus();
    } else {
      toast.error(vaiAgendar ? "Não foi possível agendar" : "Não foi possível publicar", {
        description: resposta.mensagem,
        duration: Infinity,
        closeButton: true,
      });
    }
  };

  const publicar = async (confirmoOficial: boolean) => {
    const { id, revisao } = fila.estado();
    if (!id) return;
    setPublicando(true);
    const primeira = !noAr;
    const resposta = vaiAgendar
      ? await acaoAgendarDocumento({ id, revisaoBase: revisao, confirmoOficial, quando: campos }, sessaoEdicao).catch(semConexao)
      : await acaoPublicarDocumento({ id, revisaoBase: revisao, confirmoOficial }, sessaoEdicao).catch(semConexao);
    setPublicando(false);
    setConfirmar(false);
    await tratarResposta(resposta, primeira);
  };

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
      toast.error("Não foi possível mudar a data", { description: resposta.tipo === "erro" ? resposta.mensagem : undefined, duration: Infinity, closeButton: true });
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
      toast.success("Agendamento cancelado. O documento voltou a ser rascunho.");
    } else {
      toast.error(resposta.mensagem, { duration: Infinity, closeButton: true });
    }
  };

  const voltarPara = (resposta: { dados: DadosDocumento; revisao: number; salvoEm: string }, id: string) => {
    dadosAtuais.current = resposta.dados;
    setDados(resposta.dados);
    setBase(resposta.dados);
    fila.conflitoResolvido({ tipo: "salvo", id, revisao: resposta.revisao, salvoEm: resposta.salvoEm });
  };

  const descartarAlteracoes = async () => {
    setDescartando(true);
    await fila.salvarAgora();
    const { id, revisao, situacao } = fila.estado();
    if (!id || situacao !== "sincronizado") {
      setDescartando(false);
      setConfirmarDescarte(false);
      return;
    }
    const resposta = await acaoDescartarAlteracoesDocumento({ id, revisaoBase: revisao }, sessaoEdicao).catch(semConexao);
    setDescartando(false);
    setConfirmarDescarte(false);
    if (resposta.tipo === "pronto") {
      voltarPara(resposta, id);
      setPublicacao((atual) => ({ ...atual, revisaoPublicada: resposta.revisao }));
      router.refresh();
      toast.success("Alterações descartadas. O editor voltou a ficar igual ao site.");
    } else if (resposta.tipo === "conflito") {
      await mostrarConflito();
    } else {
      toast.error(resposta.mensagem, { duration: Infinity, closeButton: true });
    }
  };

  // --- Ciclo de vida e Histórico de versões (RN10, E45, N14) -------------------------------
  const [pedido, setPedido] = React.useState<PedidoDeAcao | null>(null);
  const [historicoAberto, setHistoricoAberto] = React.useState(false);
  const [restaurandoVersao, setRestaurandoVersao] = React.useState(false);
  const jaPublicado = inicio.jaPublicado || publicacao.revisaoPublicada !== null;
  const acoesDoMenu: AcaoDoMenu[] =
    estado.id && inicio.autorId ? acoesDisponiveis({ tipo, estado: publicacao.estado, jaPublicado, autorId: inicio.autorId }, quem) : [];
  const rotulo = dados.titulo.trim() || (tipo === "edital" ? "Edital sem título" : "Acordo sem título");

  const pedirAcao = async (acao: AcaoDoMenu) => {
    await fila.salvarAgora();
    const depois = fila.estado();
    if (!depois.id) return;
    if (depois.situacao !== "sincronizado" && acao !== "excluir") {
      toast.error("Salve antes: há alterações que ainda não chegaram ao servidor.", { duration: Infinity, closeButton: true });
      return;
    }
    setPedido({ acao, alvos: [{ id: depois.id, titulo: rotulo, acoes: acoesDoMenu }] });
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
      fila.descartar();
      sairParaLista();
    }
  };

  const restaurarVersao = async (versao: number): Promise<boolean> => {
    setRestaurandoVersao(true);
    await fila.salvarAgora();
    const { id, revisao, situacao } = fila.estado();
    if (!id || situacao !== "sincronizado") {
      setRestaurandoVersao(false);
      toast.error("Salve antes de restaurar uma versão.", { duration: Infinity, closeButton: true });
      return false;
    }
    const resposta = await acaoRestaurarVersaoDocumento({ id, versao, revisaoBase: revisao }, sessaoEdicao).catch(semConexao);
    setRestaurandoVersao(false);
    if (resposta.tipo === "pronto") {
      voltarPara(resposta, id);
      router.refresh();
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

  // --- PDF oficial (RN12) e texto pesquisável (P3) ---------------------------------------------
  const [trocarTexto, setTrocarTexto] = React.useState<string | null>(null);
  const textoAutomatico = React.useRef(inicio.dados.textoPesquisavel);
  const aoEnviarPdf = (enviado: PdfNaTela & { texto: string; temTexto: boolean }) => {
    setPdf({ id: enviado.id, nomeArquivo: enviado.nomeArquivo, bytes: enviado.bytes, paginas: enviado.paginas });
    setSemTexto(!enviado.temTexto);
    const atual = dadosAtuais.current.textoPesquisavel;
    // Texto corrigido à mão: pergunta antes de trocar (P3).
    if (enviado.temTexto && atual.trim() && atual !== textoAutomatico.current) {
      mudar({ pdfMidiaId: enviado.id });
      setTrocarTexto(enviado.texto);
    } else {
      mudar({ pdfMidiaId: enviado.id, textoPesquisavel: enviado.temTexto ? enviado.texto : atual });
      if (enviado.temTexto) textoAutomatico.current = enviado.texto;
    }
    // O PDF já está na Mídia: salva logo, para "Visualizar" abrir o arquivo novo.
    void fila.salvarAgora();
    toast.success(enviado.temTexto ? "PDF enviado. O texto pesquisável foi lido do arquivo." : "PDF enviado.");
  };

  const erroDoCampo = (campo: keyof DadosDocumento) => {
    if (estado.erro?.campo === campo) return estado.erro.mensagem;
    return faltando.has(campo as CampoObrigatorioDocumento) ? MENSAGEM_DO_CAMPO[campo as CampoObrigatorioDocumento] : undefined;
  };
  const emConflito = estado.situacao === "conflito" && estado.conflito;
  const vigencia = usaVigencia(tipo, dados);
  const selo = seloDosCampos(publicacao.estado, dados, new Date());
  const nomeDoTipo = NOME_DO_TIPO[tipo];
  const rotuloPublicar = noAr ? "Publicar alterações…" : vaiAgendar ? "Agendar…" : agendado ? "Publicar agora…" : "Publicar…";
  const dicaPublicar = !conectado
    ? DICA_SEM_INTERNET
    : oculto
      ? "Documento oculto: mostre no site antes de publicar alterações"
      : noAr && !comAlteracoes
        ? "Nada novo para publicar: o site já mostra esta versão"
        : null;
  const pdfSincronizado = !!estado.id && estado.situacao === "sincronizado" && !!pdf;

  return (
    <div data-editor-documento className="flex flex-1 flex-col">
      <header className="sticky top-0 z-30 flex flex-col gap-3 border-b border-borda-padrao bg-fundo-cabecalho px-5 py-3 sm:flex-row sm:items-center lg:px-10">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Link
            href="/painel/conteudos"
            aria-label="Voltar para Conteúdos"
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-fundo-superficie-alt text-texto-primario outline-none hover:brightness-95 focus-visible:ring-[3px] focus-visible:ring-ring"
          >
            <ChevronLeft aria-hidden className="size-5" />
          </Link>
          <div className="flex min-w-0 flex-col">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate texto-titulo-card text-texto-primario">
                {estado.id ? `Editar ${tipo === "edital" ? "edital" : "acordo ou convenção"}` : tipo === "edital" ? "Novo edital" : "Novo acordo ou convenção"}
              </h1>
              <SeloEstado estado={publicacao.estado} />
              <SeloVigencia selo={selo} />
            </div>
            <StatusDoSalvamento estado={estado} temId={!!estado.id} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {estado.id ? (
            <Button type="button" variant="secundario" size="pequeno" disabled={!!preparando} onClick={() => void abrirPrevia()}>
              <Eye aria-hidden />
              {preparando === "previa" ? "Salvando…" : "Pré-visualizar"}
            </Button>
          ) : (
            <BotaoTravado rotulo="Pré-visualizar" dica="Preencha o documento para pré-visualizar" icone={<Eye aria-hidden />} />
          )}
          <Button type="button" variant="secundario" size="pequeno" onClick={() => void fila.salvarAgora()}>
            {jaFoiAoAr(publicacao.estado) ? "Salvar" : "Salvar rascunho"}
          </Button>
          {dicaPublicar ? (
            <BotaoTravado rotulo={rotuloPublicar} dica={dicaPublicar} icone={<Upload aria-hidden />} />
          ) : (
            <Button ref={botaoPublicar} type="button" size="pequeno" disabled={!!preparando || publicando} onClick={() => void pedirPublicacao()}>
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
              <Button type="button" variant="secundario" size="pequeno" aria-label="Mais ações" className="px-3 has-[>svg]:pl-3">
                <MoreHorizontal aria-hidden />
              </Button>
            </MenuDeAcoes>
          ) : null}
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-6 px-5 pt-6 pb-12 lg:px-10 xl:flex-row xl:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <SeletorDeTipo tipo={tipo} novo={!estado.id} />

          {mostrarFaltas && faltas.length > 0 ? (
            <Alerta tipo="erro" titulo={faltas.length === 1 ? "Falta 1 item obrigatório para publicar" : `Faltam ${faltas.length} itens obrigatórios para publicar`}>
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
          {oculto ? (
            <Alerta tipo="aviso" titulo="Este documento está fora do site">
              <div className="flex flex-col items-start gap-2">
                {publicacao.motivoOculto ? `Motivo: ${publicacao.motivoOculto}` : "Ele foi ocultado."} Você pode continuar editando: as mudanças ficam guardadas aqui.
                {acoesDoMenu.includes("mostrar") ? (
                  <Button type="button" variant="secundario" size="pequeno" disabled={!conectado} onClick={() => void pedirAcao("mostrar")}>
                    <Eye aria-hidden />
                    Mostrar no site
                  </Button>
                ) : null}
              </div>
            </Alerta>
          ) : null}
          {agendado && publicacao.agendadoPara ? (
            <Alerta tipo="informacao" titulo={`Agendado para ${dataHoraNaBahia(new Date(publicacao.agendadoPara))}`}>
              <div className="flex flex-col items-start gap-2">
                Entra no ar sozinho nessa hora, com o PDF que você confirmou. Para trocar o PDF, cancele o agendamento antes.
                <Button type="button" variant="secundario" size="pequeno" disabled={!conectado || cancelando} onClick={() => setConfirmarCancelamento(true)}>
                  Cancelar agendamento
                </Button>
              </div>
            </Alerta>
          ) : null}
          {comAlteracoes ? (
            <Alerta tipo="informacao" titulo="Há alterações que ainda não estão no site">
              <div className="flex flex-col items-start gap-2">
                {oculto
                  ? "Ao mostrar no site, volta a versão publicada. Depois, publique as alterações."
                  : "O site continua mostrando a versão publicada até você publicar as alterações."}
                <Button type="button" variant="secundario" size="pequeno" disabled={!conectado || descartando} onClick={() => setConfirmarDescarte(true)}>
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

          <Cartao titulo="Identificação do documento" descricao={`Como o documento aparece na página Documentos › ${tipo === "edital" ? "Editais" : "Acordos coletivos"}.`}>
            <CampoComContador id="titulo" rotulo="Título oficial" limite={LIMITE_TITULO_DOCUMENTO} valor={dados.titulo} erro={erroDoCampo("titulo")} aoMudar={(titulo) => mudar({ titulo })} />
            <div className="grid gap-4 md:grid-cols-2">
              <Campo
                id="numero"
                rotulo="Número ou identificação"
                placeholder={tipo === "edital" ? "Ex.: Edital nº 012/2026" : "Ex.: CCT 2026/2027"}
                value={dados.numero}
                maxLength={LIMITE_NUMERO}
                erro={erroDoCampo("numero")}
                ajuda="Não pode repetir o de outro documento do mesmo tipo."
                onChange={(evento) => mudar({ numero: evento.target.value })}
              />
              <Seletor
                id="subtipo"
                rotulo={tipo === "edital" ? "Tipo de edital" : "Tipo de acordo"}
                valor={dados.subtipo ?? ""}
                opcoes={SUBTIPOS[tipo].map((s) => ({ valor: s, rotulo: ROTULO_DO_SUBTIPO[s] }))}
                vazio="Escolha o tipo"
                erro={erroDoCampo("subtipo")}
                aoMudar={(valor) => mudar({ subtipo: (valor || null) as SubtipoDocumento | null })}
              />
            </div>
          </Cartao>

          <Cartao
            titulo="Datas e vigência"
            descricao="O site mostra os selos “Prazo”, “Vigente” e “Encerrado”, calculados pelas datas. O documento continua publicado."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <CampoDeData id="data-documento" rotulo="Data do documento" valor={dados.dataDocumento} erro={erroDoCampo("dataDocumento")} aoMudar={(dataDocumento) => mudar({ dataDocumento })} />
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-2 texto-rotulo text-texto-primario">Data do evento ou prazo</legend>
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <Input
                    id="evento-data"
                    type="date"
                    aria-label="Data do evento ou prazo"
                    value={dados.eventoData}
                    aria-invalid={erroDoCampo("eventoData") ? true : undefined}
                    onChange={(evento) => mudar({ eventoData: evento.target.value })}
                  />
                  <Input
                    id="evento-hora"
                    type="time"
                    aria-label="Hora do evento ou prazo"
                    className="w-[120px]"
                    value={dados.eventoHora}
                    aria-invalid={erroDoCampo("eventoHora") ? true : undefined}
                    onChange={(evento) => mudar({ eventoHora: evento.target.value })}
                  />
                </div>
                <p className={cn("texto-pequeno", erroDoCampo("eventoData") || erroDoCampo("eventoHora") ? "text-status-perigo-texto" : "text-texto-terciario")}>
                  {erroDoCampo("eventoData") ?? erroDoCampo("eventoHora") ?? "Opcional. Ex.: dia da assembleia ou último dia para inscrição."}
                </p>
              </fieldset>
            </div>
            {tipo === "edital" ? (
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <span id="rotulo-vigencia" className="texto-rotulo text-texto-primario">
                    Este documento tem vigência
                  </span>
                  <span className="texto-pequeno text-texto-secundario">
                    Ao fim da vigência, o selo passa para “Encerrado” sozinho, mas o documento continua publicado.
                  </span>
                </div>
                <Interruptor ligado={dados.temVigencia} rotuloId="rotulo-vigencia" aoMudar={(temVigencia) => mudar({ temVigencia })} />
              </div>
            ) : null}
            {vigencia ? (
              <div className="grid gap-4 md:grid-cols-2">
                <CampoDeData id="vigencia-inicio" rotulo="Início da vigência" valor={dados.vigenciaInicio} erro={erroDoCampo("vigenciaInicio")} aoMudar={(vigenciaInicio) => mudar({ vigenciaInicio })} />
                <CampoDeData id="vigencia-fim" rotulo="Fim da vigência" valor={dados.vigenciaFim} erro={erroDoCampo("vigenciaFim")} aoMudar={(vigenciaFim) => mudar({ vigenciaFim })} />
              </div>
            ) : null}
          </Cartao>

          {tipo === "acordo" ? (
            <Cartao titulo="Abrangência e partes" descricao="Quem o acordo ou convenção alcança e quem assinou.">
              <CampoComContador
                id="abrangencia"
                rotulo="Abrangência"
                ajuda="Ex.: empresa, cidade ou categoria alcançada."
                limite={LIMITE_ABRANGENCIA}
                valor={dados.abrangencia}
                erro={erroDoCampo("abrangencia")}
                aoMudar={(abrangencia) => mudar({ abrangencia })}
              />
              <CampoComContador
                id="partes-signatarias"
                rotulo="Partes signatárias"
                ajuda="Ex.: SINTRAVC e o sindicato das empresas."
                limite={LIMITE_PARTES}
                valor={dados.partesSignatarias}
                erro={erroDoCampo("partesSignatarias")}
                aoMudar={(partesSignatarias) => mudar({ partesSignatarias })}
                multilinha
              />
            </Cartao>
          ) : null}

          <Cartao titulo="Descrição pública" descricao="Explique em poucas linhas do que se trata e a quem se aplica.">
            <CampoComContador id="resumo" rotulo="Resumo" limite={LIMITE_RESUMO} valor={dados.resumo} erro={erroDoCampo("resumo")} aoMudar={(resumo) => mudar({ resumo })} multilinha />
          </Cartao>

          <Cartao titulo="Arquivo oficial (PDF)" descricao="É o documento que o visitante baixa. Use sempre a versão assinada.">
            <EnvioDoPdf
              pdf={pdf}
              idDoDocumento={pdfSincronizado ? estado.id : null}
              conectado={conectado}
              limiteBytes={limiteBytes}
              travadoPorAgendamento={agendado}
              erro={erroDoCampo("pdfMidiaId")}
              aoEnviar={aoEnviarPdf}
            />
            {pdf && pdf.id !== pdfNoArId ? (
              <Alerta tipo="aviso" titulo="Este PDF ainda não foi publicado como oficial">
                {pdfNoArId
                  ? "O site e a Comunicação continuam com o PDF publicado até você publicar as alterações e confirmar que este é a versão oficial e assinada."
                  : "Ele vai para o site quando você publicar e confirmar que é a versão oficial e assinada. Até lá, só o Administrador geral vê."}
              </Alerta>
            ) : null}
            {semTexto ? (
              <Alerta tipo="aviso" titulo="Não encontramos texto neste PDF">
                Ele pode ser uma imagem escaneada. Digite abaixo as palavras principais, para a busca do site achar o documento.
              </Alerta>
            ) : null}
            <div className="flex flex-col gap-2">
              <Label htmlFor="texto-pesquisavel">Texto pesquisável</Label>
              <Textarea
                id="texto-pesquisavel"
                className="min-h-[120px]"
                value={dados.textoPesquisavel}
                aria-describedby="texto-pesquisavel-ajuda"
                onChange={(evento) => mudar({ textoPesquisavel: evento.target.value })}
              />
              <p id="texto-pesquisavel-ajuda" className="texto-pequeno text-texto-terciario">
                Lido do PDF quando você envia. Corrija se algo saiu errado: é o que a busca do site usa.
              </p>
            </div>
          </Cartao>
        </div>

        <aside className="flex flex-col gap-6 xl:sticky xl:top-[88px] xl:w-[320px]">
          <Cartao titulo="Publicação" acao={<SeloEstado estado={publicacao.estado} />}>
            <p className="flex items-start gap-3 rounded-[12px] bg-fundo-superficie-alt p-3">
              <FolderOpen aria-hidden className="mt-0.5 size-5 shrink-0 text-destaque-azul" />
              <span className="flex flex-col">
                <span className="texto-pequeno text-texto-secundario">Aparece em</span>
                <span className="texto-rotulo text-texto-primario">Documentos › {tipo === "edital" ? "Editais" : "Acordos coletivos"}</span>
              </span>
            </p>
            <Seletor
              id="categoria"
              rotulo="Categoria"
              valor={dados.categoriaId ?? ""}
              opcoes={categorias.map((c) => ({ valor: c.id, rotulo: c.nome }))}
              vazio="Escolha a categoria"
              erro={erroDoCampo("categoriaId")}
              aoMudar={(valor) => mudar({ categoriaId: valor || null })}
            />
            {noAr ? null : (
              <fieldset className="flex flex-col gap-3">
                <legend className="mb-3 texto-rotulo text-texto-primario">Quando publicar</legend>
                {agendado ? null : (
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
                      <span className="texto-corpo text-texto-primario">Assim que eu publicar</span>
                    </label>
                    <label htmlFor="quando-agendar" className="flex cursor-pointer items-start gap-3">
                      <RadioGroupItem id="quando-agendar" value="agendar" className="mt-0.5" />
                      <span className="texto-corpo text-texto-primario">Agendar</span>
                    </label>
                  </RadioGroup>
                )}
                {quando === "agendar" || agendado ? (
                  <CamposDeData
                    campos={campos}
                    erro={erroDaData}
                    aoMudar={(novos) => {
                      setCampos(novos);
                      setErroDaData(null);
                    }}
                  />
                ) : null}
                {agendado ? (
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
            {noAr && publicacao.publicadoEm ? (
              <p className="rounded-[12px] bg-fundo-superficie-alt p-3 texto-pequeno text-texto-secundario">
                No site desde {dataHoraNaBahia(new Date(publicacao.publicadoEm))}. O que você muda aqui só vai ao site quando publicar as alterações.
              </p>
            ) : null}
          </Cartao>
          <Cartao titulo="Antes de publicar" descricao="Conferido automaticamente enquanto você preenche.">
            <AntesDePublicarDocumento tipo={tipo} dados={dados} />
          </Cartao>
          <section className="flex gap-3 rounded-[20px] bg-status-aviso-fundo p-5 text-status-aviso-texto">
            <ShieldCheck aria-hidden className="mt-0.5 size-5 shrink-0" />
            <div className="flex flex-col gap-1">
              <h2 className="texto-titulo-card-pequeno">Documento oficial</h2>
              <p className="texto-pequeno">
                Só o Administrador geral publica, substitui ou remove documentos oficiais. Ao publicar, você confirma que o PDF é a versão oficial e
                assinada.
              </p>
            </div>
          </section>
        </aside>
      </div>

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
      <ModalPublicarDocumento
        aberto={confirmar}
        nomeDoTipo={nomeDoTipo}
        titulo={rotulo}
        pdf={pdf}
        alteracoes={noAr}
        agendarPara={vaiAgendar ? camposEmTexto(campos) : null}
        publicando={publicando}
        aoFechar={() => {
          setConfirmar(false);
          botaoPublicar.current?.focus();
        }}
        aoConfirmar={(confirmo) => void publicar(confirmo)}
      />
      <ModalCancelarAgendamento aberto={confirmarCancelamento} cancelando={cancelando} aoVoltar={() => setConfirmarCancelamento(false)} aoConfirmar={() => void cancelarAgendamento()} />
      <ModalDescartarAlteracoes aberto={confirmarDescarte} descartando={descartando} aoVoltar={() => setConfirmarDescarte(false)} aoConfirmar={() => void descartarAlteracoes()} />
      <AlertDialog open={trocarTexto !== null} onOpenChange={(aberto) => (aberto ? null : setTrocarTexto(null))}>
        <AlertDialogContent
          icone="/painel/icone-alerta.svg"
          tom="aviso"
          titulo="Trocar o texto pesquisável?"
          descricao="Você corrigiu o texto pesquisável. O PDF novo trouxe outro texto: quer usar o do PDF novo ou manter o seu?"
        >
          <AlertDialogFooter>
            <Button type="button" variant="secundario" onClick={() => setTrocarTexto(null)}>
              Manter o meu
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (trocarTexto !== null) {
                  mudar({ textoPesquisavel: trocarTexto });
                  textoAutomatico.current = trocarTexto;
                }
                setTrocarTexto(null);
              }}
            >
              Usar o do PDF novo
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <ConfirmarAcao pedido={pedido} aoFechar={() => setPedido(null)} aoConcluir={aoConcluirAcao} />
      {estado.id ? (
        <HistoricoDeVersoes
          id={estado.id}
          familia="documento"
          listar={acaoListarVersoesDocumento}
          aberto={historicoAberto}
          comAlteracoes={comAlteracoes}
          restaurando={restaurandoVersao}
          aoFechar={() => setHistoricoAberto(false)}
          aoRestaurar={restaurarVersao}
        />
      ) : null}
      {emConflito ? (
        <ModalConflitoDocumento
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

/** "Tipo: Notícia · Edital · Acordo ou convenção" (Figma 114:1972). Depois de salvo, o tipo fica fixo. */
function SeletorDeTipo({ tipo, novo }: { tipo: TipoDocumento; novo: boolean }) {
  const opcoes = [
    { valor: "noticia", rotulo: "Notícia", href: "/painel/conteudos/noticia/nova", Icone: Newspaper },
    { valor: "edital", rotulo: "Edital", href: "/painel/conteudos/documento/nova?tipo=edital", Icone: FileText },
    { valor: "acordo", rotulo: "Acordo ou convenção", href: "/painel/conteudos/documento/nova?tipo=acordo", Icone: Scale },
  ] as const;
  return (
    <nav aria-label="Tipo de conteúdo" className="flex flex-wrap items-center gap-2">
      <span className="texto-pequeno text-texto-secundario">Tipo:</span>
      <div className="flex flex-wrap gap-1 rounded-full bg-fundo-superficie-alt p-1">
        {opcoes.map(({ valor, rotulo, href, Icone }) => {
          const atual = valor === tipo;
          const classe = cn(
            "inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 texto-botao outline-none focus-visible:ring-[3px] focus-visible:ring-ring [&_svg]:size-4",
            atual ? "bg-fundo-superficie text-texto-primario shadow-sm" : "text-texto-secundario",
          );
          if (atual || !novo) {
            return (
              <span key={valor} aria-current={atual ? "page" : undefined} aria-disabled={!atual || undefined} className={cn(classe, !atual && "opacity-50")}>
                <Icone aria-hidden />
                {rotulo}
              </span>
            );
          }
          return (
            <Link key={valor} href={href} className={cn(classe, "hover:text-texto-primario")}>
              <Icone aria-hidden />
              {rotulo}
            </Link>
          );
        })}
      </div>
      {novo ? null : <span className="texto-pequeno text-texto-terciario">O tipo não muda depois de salvo.</span>}
    </nav>
  );
}

function Seletor({
  id,
  rotulo,
  valor,
  opcoes,
  vazio,
  erro,
  aoMudar,
}: {
  id: string;
  rotulo: string;
  valor: string;
  opcoes: { valor: string; rotulo: string }[];
  vazio: string;
  erro?: string;
  aoMudar: (valor: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{rotulo}</Label>
      <select
        id={id}
        value={valor}
        aria-invalid={erro ? true : undefined}
        aria-describedby={erro ? `${id}-erro` : undefined}
        onChange={(evento) => aoMudar(evento.target.value)}
        className="h-[52px] w-full rounded-[14px] border border-borda-forte bg-fundo-superficie px-4 texto-corpo text-texto-primario outline-none focus-visible:border-destaque-azul focus-visible:ring-[4px] focus-visible:ring-destaque-azul/15 aria-invalid:border-destaque-vermelho"
      >
        <option value="">{vazio}</option>
        {opcoes.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.rotulo}
          </option>
        ))}
      </select>
      {erro ? (
        <p id={`${id}-erro`} className="texto-pequeno text-status-perigo-texto">
          {erro}
        </p>
      ) : null}
    </div>
  );
}

function CampoDeData({ id, rotulo, valor, erro, aoMudar }: { id: string; rotulo: string; valor: string; erro?: string; aoMudar: (valor: string) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{rotulo}</Label>
      <div>
        <Input
          id={id}
          type="date"
          value={valor}
          aria-invalid={erro ? true : undefined}
          aria-describedby={erro ? `${id}-erro` : undefined}
          onChange={(evento) => aoMudar(evento.target.value)}
        />
      </div>
      {erro ? (
        <p id={`${id}-erro`} className="texto-pequeno text-status-perigo-texto">
          {erro}
        </p>
      ) : null}
    </div>
  );
}

/** Interruptor (Figma 114:1972, "Este documento tem vigência"): botão com role="switch". */
function Interruptor({ ligado, rotuloId, aoMudar }: { ligado: boolean; rotuloId: string; aoMudar: (ligado: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ligado}
      aria-labelledby={rotuloId}
      onClick={() => aoMudar(!ligado)}
      className={cn(
        "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring motion-reduce:transition-none",
        ligado ? "bg-destaque-marinho" : "bg-borda-forte",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "inline-block size-5 rounded-full bg-fundo-superficie shadow transition-transform motion-reduce:transition-none",
          ligado ? "translate-x-6" : "translate-x-1",
        )}
      />
    </button>
  );
}

/** "Antes de publicar" do documento (Figma 114:1972). A regra é a mesma do servidor. */
function AntesDePublicarDocumento({ tipo, dados }: { tipo: TipoDocumento; dados: DadosDocumento }) {
  const faltando = new Set<string>(faltasParaPublicarDocumento(tipo, dados).map((f) => f.campo));
  const itens: { rotulo: string; campos: CampoObrigatorioDocumento[] }[] = [
    { rotulo: "Título, número e tipo", campos: ["titulo", "numero", "subtipo"] },
    { rotulo: "Data do documento e vigência", campos: ["dataDocumento", "vigenciaInicio", "vigenciaFim"] },
    ...(tipo === "acordo" ? [{ rotulo: "Abrangência e partes signatárias", campos: ["abrangencia", "partesSignatarias"] as CampoObrigatorioDocumento[] }] : []),
    { rotulo: "PDF oficial anexado", campos: ["pdfMidiaId"] },
    { rotulo: "Descrição pública", campos: ["resumo"] },
    { rotulo: "Categoria", campos: ["categoriaId"] },
  ];
  return (
    <ul className="flex flex-col gap-2.5">
      {itens.map((item) => {
        const ok = item.campos.every((c) => !faltando.has(c));
        const Icone = ok ? CircleCheck : CircleAlert;
        return (
          <li key={item.rotulo} className="flex items-center gap-2.5 texto-pequeno text-texto-secundario">
            <Icone aria-hidden className={cn("size-[18px] shrink-0", ok ? "text-status-sucesso-texto" : "text-status-aviso-texto")} />
            <span>
              {item.rotulo}
              <span className="sr-only">{ok ? ": conferido" : ": falta preencher"}</span>
            </span>
          </li>
        );
      })}
      <li className="flex items-center gap-2.5 texto-pequeno text-texto-terciario">
        <Clock aria-hidden className="size-[18px] shrink-0" />
        Confirmação de documento oficial (feita ao publicar)
      </li>
    </ul>
  );
}

type RespostaDoEnvio = PdfNaTela & { texto: string; temTexto: boolean };

/**
 * Envio do PDF oficial (RN12, P3): clique ou arraste, com progresso. Vai para /api/documentos/pdf,
 * que confere a permissão, aceita só PDF (pelos bytes) e lê o texto pesquisável.
 */
function EnvioDoPdf({
  pdf,
  idDoDocumento,
  conectado,
  limiteBytes,
  travadoPorAgendamento,
  erro,
  aoEnviar,
}: {
  pdf: PdfNaTela | null;
  /** Só com o documento salvo: "Visualizar" abre o PDF que está no servidor. */
  idDoDocumento: string | null;
  conectado: boolean;
  limiteBytes: number;
  travadoPorAgendamento: boolean;
  erro?: string;
  aoEnviar: (resposta: RespostaDoEnvio) => void;
}) {
  const entrada = React.useRef<HTMLInputElement>(null);
  const [progresso, setProgresso] = React.useState<number | null>(null);
  const [falha, setFalha] = React.useState<string | null>(null);
  const [arrastando, setArrastando] = React.useState(false);

  const enviar = (arquivo: File) => {
    setFalha(null);
    if (arquivo.size > limiteBytes) {
      setFalha(`O arquivo tem ${tamanhoEmMb(arquivo.size)}. O limite é ${tamanhoEmMb(limiteBytes)}.`);
      return;
    }
    const corpo = new FormData();
    corpo.set("arquivo", arquivo);
    const pedido = new XMLHttpRequest();
    pedido.open("POST", "/api/documentos/pdf");
    pedido.responseType = "json";
    pedido.upload.onprogress = (evento) => {
      if (evento.lengthComputable) setProgresso(Math.round((evento.loaded / evento.total) * 100));
    };
    pedido.onerror = () => {
      setProgresso(null);
      setFalha(SEM_CONEXAO);
    };
    pedido.onload = () => {
      setProgresso(null);
      const resposta = pedido.response as (RespostaDoEnvio & { erro?: string }) | null;
      if (pedido.status === 201 && resposta) aoEnviar(resposta);
      else setFalha(resposta?.erro ?? "Não foi possível enviar agora. Tente de novo em alguns minutos.");
    };
    setProgresso(0);
    pedido.send(corpo);
  };

  const podeEnviar = conectado && progresso === null && !travadoPorAgendamento;
  const dica = travadoPorAgendamento
    ? "Para trocar o PDF, cancele o agendamento antes."
    : conectado
      ? `Só PDF, até ${tamanhoEmMb(limiteBytes)}.`
      : "Sem internet: envie o PDF quando a conexão voltar.";

  return (
    <div className="flex flex-col gap-3">
      <div
        onDragOver={(evento) => {
          if (!podeEnviar) return;
          evento.preventDefault();
          setArrastando(true);
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={(evento) => {
          evento.preventDefault();
          setArrastando(false);
          const arquivo = evento.dataTransfer.files[0];
          if (arquivo && podeEnviar) enviar(arquivo);
        }}
        className={cn(
          "flex flex-col gap-4 rounded-[16px] bg-fundo-superficie-alt p-4 sm:flex-row sm:items-center",
          arrastando && "ring-2 ring-destaque-azul",
          erro && "ring-2 ring-destaque-vermelho",
        )}
      >
        <span aria-hidden className="flex size-12 shrink-0 items-center justify-center rounded-[12px] bg-status-perigo-fundo texto-etiqueta text-status-perigo-texto">
          PDF
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          {pdf ? (
            <>
              <span className="truncate texto-rotulo text-texto-primario">{pdf.nomeArquivo}</span>
              <span className="texto-pequeno text-texto-secundario">
                {tamanhoEmMb(pdf.bytes)}
                {pdf.paginas ? ` · ${pdf.paginas} ${pdf.paginas === 1 ? "página" : "páginas"}` : ""}
              </span>
            </>
          ) : (
            <>
              <span className="texto-rotulo text-texto-primario">Nenhum PDF enviado</span>
              <span className="texto-pequeno text-texto-secundario">Arraste o arquivo para cá ou escolha no computador.</span>
            </>
          )}
          {progresso !== null ? (
            <span role="status" className="texto-pequeno text-texto-secundario">
              Enviando… {progresso}%
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {pdf && idDoDocumento ? (
            <Button asChild variant="secundario" size="pequeno">
              <a href={`/painel/documentos/${idDoDocumento}/pdf?modo=abrir`} target="_blank" rel="noopener">
                <Eye aria-hidden />
                Visualizar
              </a>
            </Button>
          ) : null}
          <Button
            id="enviar-pdf"
            type="button"
            variant="secundario"
            size="pequeno"
            aria-disabled={!podeEnviar || undefined}
            aria-describedby="dica-pdf"
            onClick={() => podeEnviar && entrada.current?.click()}
          >
            <Upload aria-hidden />
            {pdf ? "Substituir" : "Enviar PDF"}
          </Button>
          <input
            ref={entrada}
            type="file"
            accept="application/pdf,.pdf"
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={(evento) => {
              const arquivo = evento.target.files?.[0];
              evento.target.value = "";
              if (arquivo) enviar(arquivo);
            }}
          />
        </div>
      </div>
      <p id="dica-pdf" className={cn("texto-pequeno", erro || falha ? "text-status-perigo-texto" : "text-texto-terciario")}>
        {falha ?? erro ?? dica}
      </p>
      {pdf && idDoDocumento ? (
        <a
          href={`/painel/documentos/${idDoDocumento}/pdf?modo=baixar`}
          className="inline-flex items-center gap-2 self-start rounded-sm texto-botao text-destaque-azul outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring"
        >
          <Download aria-hidden className="size-4" />
          Baixar PDF
        </a>
      ) : null}
    </div>
  );
}

/**
 * "Publicar documento oficial?" (Figma 118:3524; CA-US23.1): o botão só funciona com a caixa
 * "Confirmo que o PDF é a versão oficial e assinada" marcada. O servidor confere de novo (RN12).
 */
function ModalPublicarDocumento({
  aberto,
  nomeDoTipo,
  titulo,
  pdf,
  alteracoes,
  agendarPara,
  publicando,
  aoFechar,
  aoConfirmar,
}: {
  aberto: boolean;
  nomeDoTipo: string;
  titulo: string;
  pdf: PdfNaTela | null;
  alteracoes: boolean;
  agendarPara: string | null;
  publicando: boolean;
  aoFechar: () => void;
  aoConfirmar: (confirmo: boolean) => void;
}) {
  const [confirmo, setConfirmo] = React.useState(false);
  React.useEffect(() => {
    // Cada abertura pede a confirmação de novo (E46).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (aberto) setConfirmo(false);
  }, [aberto]);
  const tituloDoModal = agendarPara ? "Agendar documento oficial?" : alteracoes ? "Publicar alterações do documento?" : "Publicar documento oficial?";
  const descricao = agendarPara
    ? `“${titulo}” entra no ar sozinho em ${agendarPara}, com este PDF.`
    : `“${titulo}” vai para o site, em Documentos, e o PDF fica disponível para baixar.`;
  return (
    <AlertDialog open={aberto} onOpenChange={(a) => (a || publicando ? null : aoFechar())}>
      <AlertDialogContent icone="/painel/menu-documento.svg" tom="neutro" titulo={tituloDoModal} descricao={descricao}>
        <div className="flex flex-col gap-3 px-6">
          {pdf ? (
            <p className="texto-pequeno text-texto-secundario">
              {nomeDoTipo} · {pdf.nomeArquivo}
            </p>
          ) : null}
          <label htmlFor="confirmo-oficial" className="flex cursor-pointer items-start gap-3 rounded-[14px] border border-borda-padrao bg-fundo-superficie-alt p-3.5">
            <Checkbox id="confirmo-oficial" checked={confirmo} onCheckedChange={(v) => setConfirmo(v === true)} className="mt-0.5" />
            <span className="texto-corpo text-texto-primario">Confirmo que o PDF é a versão oficial e assinada</span>
          </label>
        </div>
        <AlertDialogFooter>
          <Button type="button" variant="secundario" disabled={publicando} onClick={aoFechar}>
            Cancelar
          </Button>
          <Button type="button" disabled={!confirmo || publicando} onClick={() => aoConfirmar(confirmo)}>
            {agendarPara ? <CalendarDays aria-hidden /> : <Upload aria-hidden />}
            {publicando ? (agendarPara ? "Agendando…" : "Publicando…") : agendarPara ? "Agendar documento" : "Publicar documento"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

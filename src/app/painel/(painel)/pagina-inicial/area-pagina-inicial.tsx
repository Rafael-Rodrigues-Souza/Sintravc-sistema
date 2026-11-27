"use client";

import { ArrowDown, ArrowUp, Eye, GripVertical, ImageOff, MoreHorizontal, Pencil, Plus, Radio, RotateCcw, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DropdownMenu } from "radix-ui";
import * as React from "react";
import { toast } from "sonner";

import { IconeFigma } from "@/components/icone-figma";
import { SEM_CONEXAO } from "@/components/painel/sem-conexao";
import { Alerta } from "@/components/ui/alerta";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogFooter } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { armazemDoNavegador, criarFilaDoRascunho } from "@/lib/conteudos/fila-rascunho";
import { dataNaBahia, horaNaBahia } from "@/lib/datas";
import type { DetalheDoItem, OpcaoDeDestaque } from "@/lib/pagina-inicial/itens";
import type { PainelDaHome } from "@/lib/pagina-inicial/rascunho";
import {
  alteracoesNaoPublicadas,
  chaveDoItem,
  estadoDoItem,
  esquemaDadosDaHome,
  paraONavegador,
  type DadosDaHomeNoNavegador,
} from "@/lib/pagina-inicial/regras";
import { cn } from "@/lib/utils";

import { StatusDoSalvamento } from "../conteudos/pecas-do-editor";
import { acaoDescartarHome, acaoPublicarHome, acaoSalvarRascunhoDaHome, acaoTirarDoArAgora } from "./acoes";
import { JanelaDestaque, type PedidoDaJanela, type ResultadoDaJanela } from "./janela-destaque";

type ItemNoNavegador = DadosDaHomeNoNavegador["carrossel"][number];

const CAMINHO_DA_PREVIA = "/painel/pagina-inicial/previa";

/** "30/10 às 23h59", no horário da Bahia (RNF06). */
function diaEHora(iso: string) {
  const d = new Date(iso);
  return `${dataNaBahia(d).slice(0, 5)} às ${horaNaBahia(d)}`;
}

const lerDatas = (i: ItemNoNavegador) => ({ entraEm: i.entraEm ? new Date(i.entraEm) : null, saiEm: i.saiEm ? new Date(i.saiEm) : null });

/** A linha de estado do item do carrossel (E62): pelas datas, sem interruptor. */
function textoDoEstado(item: ItemNoNavegador, detalhe: DetalheDoItem | undefined, agora: Date): { texto: string; apagado: boolean; perigo?: boolean } {
  if (detalhe && !detalhe.noSite) return { texto: "Fora do ar: não aparece no site", apagado: true, perigo: true };
  if (detalhe && !detalhe.temCapa) return { texto: "Sem capa: não aparece no carrossel", apagado: true, perigo: true };
  const estado = estadoDoItem(lerDatas(item), agora);
  const tipo = item.tipo === "programa" ? "Programa" : item.tipo === "episodio" ? "Episódio" : item.tipo === "chamada" ? "Chamada" : "Notícia";
  if (estado.tipo === "saiu") return { texto: `Saiu em ${diaEHora(item.saiEm!)}`, apagado: true };
  if (estado.tipo === "agendado") return { texto: `Agendado: entra em ${diaEHora(item.entraEm!)}`, apagado: false };
  return { texto: item.saiEm ? `Sai do destaque em ${diaEHora(item.saiEm)}` : `${tipo} · sem data de saída`, apagado: false };
}


export function AreaPaginaInicial({
  pessoaId,
  inicial,
  agoraDoServidor,
  intervaloMs,
  ultimoPrograma,
  sugerida,
  limitesDaMidia,
}: {
  pessoaId: string;
  inicial: PainelDaHome;
  /** O relógio do servidor, em ISO: a primeira pintura usa ele, para não mudar na hidratação. */
  agoraDoServidor: string;
  intervaloMs: number;
  ultimoPrograma: { numero: number; titulo: string } | null;
  sugerida: { opcao: OpcaoDeDestaque | null } | null;
  /** Para enviar a foto da Chamada sem sair da janela. */
  limitesDaMidia: { tamanhoMaximoBytes: number; mensagemDeTamanho: string };
}) {
  const router = useRouter();
  const [painel, setPainel] = React.useState(inicial);
  const [dados, setDados] = React.useState<DadosDaHomeNoNavegador>(() => paraONavegador(inicial.rascunho));
  const [itens, setItens] = React.useState<Record<string, DetalheDoItem>>(inicial.itens);
  // “Destacar na Home” do editor (E43): a janela abre com a notícia já escolhida.
  const [janela, setJanela] = React.useState<PedidoDaJanela | null>(() => (sugerida?.opcao ? { modo: "adicionar", sugerida: sugerida.opcao } : null));
  const [confirmacao, setConfirmacao] = React.useState<{ tipo: "publicar" } | { tipo: "descartar" } | { tipo: "tirar"; chave: string; titulo: string } | null>(null);
  const [ocupado, setOcupado] = React.useState(false);
  const [arrastando, setArrastando] = React.useState<number | null>(null);
  const [aviso, setAviso] = React.useState("");
  // O relógio da tela: o do servidor na primeira pintura (sem diferença na hidratação), e o do navegador depois.
  const [agora, setAgora] = React.useState(() => new Date(agoraDoServidor));
  React.useEffect(() => {
    const relogio = setInterval(() => setAgora(new Date()), 60_000);
    return () => clearInterval(relogio);
  }, []);

  const [fila] = React.useState(() =>
    criarFilaDoRascunho<DadosDaHomeNoNavegador>({
      pessoaId,
      id: "home",
      revisao: inicial.revisao,
      salvoEm: inicial.salvoEm,
      intervaloMs,
      tipo: "pagina-inicial",
      enviar: async (pedido) => {
        const r = await acaoSalvarRascunhoDaHome({ revisaoBase: pedido.revisaoBase, dados: pedido.dados });
        if (r.tipo === "conflito") return { tipo: "conflito", servidor: { revisao: -1, dados: pedido.dados, salvoPorNome: "", salvoEm: "" } };
        return r;
      },
      online: () => navigator.onLine,
      armazem: armazemDoNavegador(),
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

  // A notícia sugerida fora do ar só ganha um aviso; o endereço volta a ser o da área.
  const sugeridaTratada = React.useRef(false);
  React.useEffect(() => {
    if (!sugerida || sugeridaTratada.current) return;
    sugeridaTratada.current = true;
    if (!sugerida.opcao) {
      toast.error("Esta notícia não está no site. Publique a notícia para destacar na Home.", { duration: Infinity, closeButton: true });
    }
    router.replace("/painel/pagina-inicial", { scroll: false });
  }, [sugerida, router]);

  const mudar = (novos: DadosDaHomeNoNavegador, anuncio?: string) => {
    setDados(novos);
    fila.alterar(novos);
    if (anuncio) setAviso(anuncio);
  };

  const rascunho = React.useMemo(() => esquemaDadosDaHome.parse(dados), [dados]);
  const alteracoes = alteracoesNaoPublicadas(rascunho, painel.publicado);
  const { carrosselMaximo } = painel.limites;
  const carrosselCheio = dados.carrossel.length >= carrosselMaximo;
  const temPrograma = dados.carrossel.some((i) => i.tipo === "programa");
  const conflito = estado.situacao === "conflito";

  // --- Carrossel ---
  const mover = (de: number, para: number) => {
    if (para < 0 || para >= dados.carrossel.length || de === para) return;
    const carrossel = [...dados.carrossel];
    const [item] = carrossel.splice(de, 1);
    carrossel.splice(para, 0, item!);
    mudar({ ...dados, carrossel }, `Agora na posição ${para + 1} de ${carrossel.length} no carrossel.`);
  };
  const remover = (indice: number) => {
    const item = dados.carrossel[indice]!;
    mudar({ ...dados, carrossel: dados.carrossel.filter((_, i) => i !== indice) }, `${itens[chaveDoItem(item)]?.titulo ?? "Destaque"} removido do carrossel.`);
  };

  /** A Chamada não está no banco das opções: o painel monta o detalhe dela (a frase e a foto). */
  const detalheDaChamada = (item: ItemNoNavegador, fotoUrl: string | null): DetalheDoItem => ({
    chave: chaveDoItem(item),
    tipo: "chamada",
    itemId: item.itemId,
    titulo: item.fraseChamada ?? "Chamada",
    rotulo: `Chamada · ${item.chamada?.destino === "beneficios" ? "Benefícios" : "Filie-se"}`,
    capaUrl: fotoUrl,
    noSite: true,
    temCapa: true,
  });

  const aoEscolher = (resultado: ResultadoDaJanela) => {
    if (!janela) return;
    const opcao = resultado.opcao;
    if (opcao) setItens((atual) => ({ ...atual, [opcao.chave]: opcao }));
    const campos = { entraEm: resultado.entraEm, saiEm: resultado.saiEm, fraseChamada: resultado.fraseChamada, chamada: resultado.chamada };
    if (janela.modo === "adicionar") {
      const item: ItemNoNavegador = opcao
        ? { tipo: opcao.tipo, itemId: opcao.itemId, ...campos, chamada: null }
        : resultado.tipo === "chamada"
          ? // O id da Chamada nasce aqui e a acompanha no rascunho e no publicado (E63).
            { tipo: "chamada", itemId: crypto.randomUUID(), ...campos }
          : { tipo: "programa", itemId: null, ...campos, chamada: null };
      if (item.tipo === "chamada") setItens((atual) => ({ ...atual, [chaveDoItem(item)]: detalheDaChamada(item, resultado.fotoUrl) }));
      mudar({ ...dados, carrossel: [...dados.carrossel, item] }, "Destaque posto no fim do carrossel.");
    } else {
      const carrossel = dados.carrossel.map((i, k) => (k === janela.indice ? { ...i, ...campos, chamada: i.tipo === "chamada" ? campos.chamada : null } : i));
      const editado = carrossel[janela.indice]!;
      if (editado.tipo === "chamada") setItens((atual) => ({ ...atual, [chaveDoItem(editado)]: detalheDaChamada(editado, resultado.fotoUrl) }));
      mudar({ ...dados, carrossel }, "Destaque alterado.");
    }
    setJanela(null);
  };

  const soltarSobre = (alvo: number) => {
    if (arrastando === null || arrastando === alvo) return;
    mover(arrastando, alvo);
    setArrastando(null);
  };

  // --- Publicar, descartar, tirar do ar ---
  const recomecar = (novo: PainelDaHome) => {
    // O relógio da tela anda junto com o do servidor (o “Tirar do ar agora” grava a hora dele).
    setAgora(new Date(Math.max(Date.now(), novo.salvoEm ? Date.parse(novo.salvoEm) : 0)));
    setPainel(novo);
    setItens(novo.itens);
    setDados(paraONavegador(novo.rascunho));
    fila.conflitoResolvido({ tipo: "salvo", id: "home", revisao: novo.revisao, salvoEm: novo.salvoEm ?? new Date().toISOString() });
  };

  const confirmar = async () => {
    const pedida = confirmacao;
    if (!pedida) return;
    setOcupado(true);
    try {
      // Antes de qualquer ação, o que estiver pendente vai ao servidor: nada do rascunho se perde (revisão do código).
      {
        await fila.salvarAgora();
        if (fila.estado().situacao !== "sincronizado") {
          toast.error("O rascunho ainda não foi salvo. Confira a internet e tente de novo.", { duration: Infinity, closeButton: true });
          return;
        }
      }
      const revisaoBase = fila.estado().revisao;
      const r = await (pedida.tipo === "publicar"
        ? acaoPublicarHome({ revisaoBase })
        : pedida.tipo === "descartar"
          ? acaoDescartarHome({ revisaoBase })
          : acaoTirarDoArAgora({ chave: pedida.chave, revisaoBase })
      ).catch(() => SEM_CONEXAO);
      if (r.tipo === "erro") {
        toast.error(r.mensagem, { duration: Infinity, closeButton: true });
        return;
      }
      recomecar(r.painel);
      toast.success(
        pedida.tipo === "publicar"
          ? "Alterações publicadas. A página inicial do site já mostra a nova versão."
          : pedida.tipo === "descartar"
            ? "Alterações descartadas. O rascunho voltou a ser igual ao site."
            : "Destaque tirado do ar. Ele já não aparece no site.",
      );
      setConfirmacao(null);
      router.refresh();
    } finally {
      setOcupado(false);
    }
  };

  const noArNoSite = (chave: string) => {
    const publicado = painel.publicado.carrossel.find((i) => chaveDoItem(i) === chave);
    return publicado ? estadoDoItem(publicado, agora).tipo === "no_ar" && (itens[chave]?.noSite ?? false) : false;
  };

  const botaoPrevia = (
    <Button asChild variant="secundario" className="shrink-0">
      <a href={CAMINHO_DA_PREVIA} target="_blank" rel="noopener" onClick={() => void fila.salvarAgora()}>
        <Eye aria-hidden />
        Pré-visualizar
        <span className="sr-only"> (abre em outra aba)</span>
      </a>
    </Button>
  );
  const botaoPublicar = (
    <Button className="shrink-0" disabled={alteracoes === 0 || conflito} onClick={() => setConfirmacao({ tipo: "publicar" })}>
      Publicar alterações
    </Button>
  );

  return (
    <div className="flex flex-1 flex-col gap-5 px-4 pt-5 pb-12 lg:gap-6 lg:px-10 lg:pt-8">
      <header className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1.5">
          <h1 className="texto-titulo-card-grande text-texto-primario">Página inicial</h1>
          <p className="hidden max-w-[720px] texto-corpo text-texto-secundario lg:block">
            Escolha o que aparece em destaque na página inicial do site. As mudanças só entram no ar quando você publicar.
          </p>
        </div>
        <div className="hidden items-center gap-3 lg:flex">
          {botaoPrevia}
          {botaoPublicar}
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 texto-pequeno text-texto-secundario">
        <StatusDoSalvamento estado={estado} temId />
        <span data-testid="alteracoes-nao-publicadas">
          <span aria-hidden>· </span>
          {alteracoes === 0 ? "Igual ao site" : alteracoes === 1 ? "1 alteração ainda não publicada" : `${alteracoes} alterações ainda não publicadas`}
        </span>
        {alteracoes > 0 && !conflito ? (
          <button
            type="button"
            onClick={() => setConfirmacao({ tipo: "descartar" })}
            className="alvo-toque ml-1 inline-flex items-center gap-1 rounded-[8px] px-1.5 texto-pequeno text-destaque-azul underline-offset-2 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring"
          >
            <RotateCcw aria-hidden className="size-3.5" />
            Descartar alterações
          </button>
        ) : null}
      </div>
      <p role="status" className="sr-only">
        {aviso}
      </p>

      {conflito ? (
        <Alerta tipo="aviso" titulo="Outra pessoa mudou a página inicial">
          <p>Enquanto você mexia, outra pessoa salvou outra versão. Recarregue para ver a versão nova; o que você mudou aqui não foi salvo.</p>
          <Button variant="secundario" size="pequeno" className="mt-3" onClick={() => window.location.reload()}>
            Recarregar
          </Button>
        </Alerta>
      ) : estado.situacao === "erro" && estado.erro ? (
        <Alerta tipo="erro" titulo="Não foi possível salvar">
          {estado.erro.mensagem}
        </Alerta>
      ) : null}

      {/* Carrossel do topo */}
      <section aria-labelledby="titulo-carrossel" className="flex flex-col gap-4 rounded-[20px] border border-borda-padrao bg-fundo-superficie p-4 lg:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <h2 id="titulo-carrossel" className="texto-titulo-card text-texto-primario">
              Carrossel do topo
            </h2>
            <p className="texto-pequeno text-texto-secundario">
              Até {carrosselMaximo} destaques: notícias, episódios, o programa e Chamadas. Use imagem horizontal (16:9) com texto alternativo.
            </p>
          </div>
          <Button
            variant="secundario"
            disabled={carrosselCheio || conflito}
            onClick={() => setJanela({ modo: "adicionar" })}
            aria-describedby={carrosselCheio ? "carrossel-cheio" : undefined}
            className="w-full sm:w-auto"
          >
            <Plus aria-hidden />
            Adicionar destaque
          </Button>
        </div>
        {carrosselCheio ? (
          <p id="carrossel-cheio" className="texto-pequeno text-texto-secundario">
            O carrossel está cheio. Remova um destaque para pôr outro.
          </p>
        ) : null}

        {dados.carrossel.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-[14px] border border-dashed border-borda-padrao px-4 py-8 text-center">
            <Radio aria-hidden className="size-6 text-texto-terciario" />
            <p className="texto-corpo text-texto-primario">Nenhum destaque no carrossel.</p>
            <p className="texto-pequeno text-texto-secundario">Sem destaques, o site mostra o programa Rádio Chofer.</p>
          </div>
        ) : (
          <ol aria-label="Destaques do carrossel, na ordem do site" className="flex flex-col">
            {dados.carrossel.map((item, i) => {
              const chave = chaveDoItem(item);
              const detalhe = itens[chave];
              const situacao = textoDoEstado(item, detalhe, agora);
              const ehChamada = item.tipo === "chamada";
              const titulo = (ehChamada ? item.fraseChamada : detalhe?.titulo) ?? "Destaque";
              return (
                <li
                  key={chave}
                  data-testid="item-carrossel"
                  draggable={!conflito}
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData("text/plain", chave);
                    setArrastando(i);
                  }}
                  onDragOver={(e) => {
                    if (arrastando !== null) e.preventDefault();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    soltarSobre(i);
                  }}
                  onDragEnd={() => setArrastando(null)}
                  className={cn("flex items-center gap-2 border-t border-borda-padrao py-3 first:border-t-0 sm:gap-3", arrastando === i && "opacity-50")}
                >
                  <button
                    type="button"
                    disabled={conflito}
                    aria-label={`Posição ${i + 1} de ${dados.carrossel.length} no carrossel: ${titulo}. Use as setas para cima e para baixo para mudar.`}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowUp") {
                        e.preventDefault();
                        mover(i, i - 1);
                      } else if (e.key === "ArrowDown") {
                        e.preventDefault();
                        mover(i, i + 1);
                      }
                    }}
                    className="hidden size-9 shrink-0 cursor-grab items-center justify-center rounded-[10px] text-texto-terciario outline-none hover:bg-fundo-superficie-alt focus-visible:ring-[3px] focus-visible:ring-ring active:cursor-grabbing sm:inline-flex pointer-coarse:size-11"
                  >
                    <GripVertical aria-hidden className="size-4" />
                  </button>
                  <span aria-hidden className="w-5 shrink-0 text-center texto-titulo-card-pequeno text-texto-secundario">
                    {i + 1}
                  </span>
                  <Miniatura url={detalhe?.capaUrl ?? null} />
                  <div className={cn("flex min-w-0 flex-1 flex-col gap-0.5", situacao.apagado && "opacity-60")}>
                    <p className="texto-etiqueta text-destaque-azul uppercase">{detalhe?.rotulo ?? ""}</p>
                    <p className="line-clamp-2 texto-titulo-card-pequeno break-words text-texto-primario">{titulo}</p>
                    {item.fraseChamada && !ehChamada ? (
                      <p className="line-clamp-2 texto-pequeno break-words text-texto-primario" data-testid="frase-do-item">
                        <span className="sr-only">Frase de chamada: </span>“{item.fraseChamada}”
                      </p>
                    ) : null}
                    <p className={cn("texto-pequeno", situacao.perigo ? "text-status-perigo-texto" : "text-texto-secundario")} data-testid="estado-do-item">
                      {situacao.texto}
                    </p>
                  </div>
                  <MenuDoItem
                    titulo={titulo}
                    posicao={{ atual: i, total: dados.carrossel.length }}
                    travado={conflito}
                    podeTirarDoAr={noArNoSite(chave)}
                    aoMover={(passo) => mover(i, i + passo)}
                    aoEditar={() =>
                      setJanela({
                        modo: "editar",
                        indice: i,
                        tipo: item.tipo,
                        titulo,
                        entraEm: item.entraEm,
                        saiEm: item.saiEm,
                        fraseChamada: item.fraseChamada ?? null,
                        chamada: rascunho.carrossel[i]?.chamada ?? null,
                        fotoUrl: detalhe?.capaUrl ?? null,
                      })
                    }
                    aoTirarDoAr={() => setConfirmacao({ tipo: "tirar", chave, titulo })}
                    aoRemover={() => remover(i)}
                  />
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {/* Último programa: automático (R12) */}
      <section aria-labelledby="titulo-ultimo" className="flex flex-col gap-4 rounded-[20px] border border-borda-padrao bg-fundo-superficie p-4 lg:p-6">
        <div className="flex flex-col gap-1">
          <h2 id="titulo-ultimo" className="texto-titulo-card text-texto-primario">
            Seção “Último programa” (Rádio Chofer)
          </h2>
          <p className="texto-pequeno text-texto-secundario">Mostra sozinho o episódio marcado como último programa na área Rádio Chofer.</p>
        </div>
        <Alerta tipo="informacao" titulo="Automático">
          {ultimoPrograma ? (
            <p>
              Hoje: Ep. {ultimoPrograma.numero} — {ultimoPrograma.titulo}. Para trocar, vá em{" "}
              <Link href="/painel/radio" className="font-semibold text-destaque-azul underline underline-offset-2">
                Rádio Chofer
              </Link>
              .
            </p>
          ) : (
            <p>
              Nenhum episódio no ar ainda. A seção aparece quando houver um, em{" "}
              <Link href="/painel/radio" className="font-semibold text-destaque-azul underline underline-offset-2">
                Rádio Chofer
              </Link>
              .
            </p>
          )}
        </Alerta>
      </section>

      {/* Celular e tablet em pé (E50): ações numa barra fixa, acima da barra de navegação. */}
      <div aria-hidden className="h-[72px] shrink-0 lg:hidden" />
      <div
        data-barra-de-baixo
        className="fixed inset-x-0 bottom-[calc(var(--altura-barra-de-baixo)+env(safe-area-inset-bottom))] z-30 grid grid-cols-2 items-center gap-3 border-t border-borda-padrao bg-fundo-cabecalho px-4 py-3 lg:hidden [&>*]:w-full">
        {botaoPrevia}
        {botaoPublicar}
      </div>

      <JanelaDestaque
        pedido={janela}
        aoFechar={() => setJanela(null)}
        aoEscolher={aoEscolher}
        temPrograma={temPrograma}
        noCarrossel={new Set(dados.carrossel.map(chaveDoItem))}
        limites={painel.limites}
        limitesDaMidia={limitesDaMidia}
      />

      <AlertDialog open={!!confirmacao} onOpenChange={(aberta) => !aberta && !ocupado && setConfirmacao(null)}>
        {confirmacao ? (
          <AlertDialogContent
            icone={confirmacao.tipo === "publicar" ? "/painel/alerta-info.svg" : "/painel/icone-alerta.svg"}
            tom={confirmacao.tipo === "publicar" ? "neutro" : "perigo"}
            titulo={
              confirmacao.tipo === "publicar"
                ? "Publicar alterações na página inicial?"
                : confirmacao.tipo === "descartar"
                  ? "Descartar alterações?"
                  : "Tirar o destaque do ar agora?"
            }
            descricao={
              confirmacao.tipo === "publicar"
                ? `${alteracoes === 1 ? "1 alteração vai" : `${alteracoes} alterações vão`} para o site agora. Quem abrir a página inicial já vê a nova versão.`
                : confirmacao.tipo === "descartar"
                  ? "O rascunho volta a ser igual ao que está no site. O que você mudou e não publicou será perdido."
                  : `“${confirmacao.tipo === "tirar" ? confirmacao.titulo : ""}” sai do carrossel do site agora. O registro fica em Atividade.`
            }
          >
            <AlertDialogFooter>
              <AlertDialogCancel asChild>
                <Button variant="secundario" size="pequeno" disabled={ocupado}>
                  {confirmacao.tipo === "tirar" ? "Manter no ar" : "Cancelar"}
                </Button>
              </AlertDialogCancel>
              <Button variant={confirmacao.tipo === "publicar" ? "primario" : "perigo"} size="pequeno" disabled={ocupado} onClick={confirmar}>
                {ocupado
                  ? "Aguarde…"
                  : confirmacao.tipo === "publicar"
                    ? "Publicar agora"
                    : confirmacao.tipo === "descartar"
                      ? "Descartar alterações"
                      : "Tirar do ar agora"}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        ) : null}
      </AlertDialog>
    </div>
  );
}

function Miniatura({ url }: { url: string | null }) {
  return (
    <div className="flex aspect-video w-20 shrink-0 items-center justify-center overflow-hidden rounded-[8px] bg-fundo-superficie-alt text-texto-terciario sm:w-[104px]">
      {url ? (
        // Miniatura do painel: a capa da Mídia ou a rota do painel (o navegador da equipe pode pedir ao YouTube).
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="size-full object-cover" loading="lazy" />
      ) : (
        <ImageOff aria-hidden className="size-5" />
      )}
    </div>
  );
}

function MenuDoItem({
  titulo,
  posicao,
  travado,
  podeTirarDoAr,
  aoMover,
  aoEditar,
  aoTirarDoAr,
  aoRemover,
}: {
  titulo: string;
  posicao: { atual: number; total: number };
  travado: boolean;
  podeTirarDoAr: boolean;
  aoMover: (passo: -1 | 1) => void;
  aoEditar: () => void;
  aoTirarDoAr: () => void;
  aoRemover: () => void;
}) {
  const classeDoItem =
    "flex min-h-11 cursor-pointer items-center gap-2.5 rounded-[10px] px-3 py-2.5 texto-pequeno text-texto-primario outline-none data-[highlighted]:bg-fundo-superficie-alt";
  const curto = titulo.length > 40 ? `${titulo.slice(0, 39).trimEnd()}…` : titulo;
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild disabled={travado}>
        <button
          type="button"
          aria-label={`Ações do destaque “${curto}”`}
          className="alvo-toque inline-flex size-9 shrink-0 items-center justify-center rounded-[10px] border border-borda-padrao text-texto-secundario outline-none hover:bg-fundo-superficie-alt focus-visible:ring-[3px] focus-visible:ring-ring"
        >
          <MoreHorizontal aria-hidden className="size-4" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="z-50 flex min-w-[220px] flex-col gap-0.5 rounded-[14px] border border-borda-padrao bg-fundo-superficie p-1.5 shadow-[0_12px_32px_rgb(11_20_36/0.16)]"
        >
          {posicao.atual > 0 ? (
            <DropdownMenu.Item onSelect={() => aoMover(-1)} className={classeDoItem}>
              <ArrowUp aria-hidden className="size-4" />
              Mover para cima
            </DropdownMenu.Item>
          ) : null}
          {posicao.atual < posicao.total - 1 ? (
            <DropdownMenu.Item onSelect={() => aoMover(1)} className={classeDoItem}>
              <ArrowDown aria-hidden className="size-4" />
              Mover para baixo
            </DropdownMenu.Item>
          ) : null}
          <DropdownMenu.Item onSelect={aoEditar} className={classeDoItem}>
            <Pencil aria-hidden className="size-4" />
            Editar
          </DropdownMenu.Item>
          <DropdownMenu.Separator className="mx-2 my-1 h-px bg-borda-padrao" />
          {podeTirarDoAr ? (
            <DropdownMenu.Item onSelect={aoTirarDoAr} className={cn(classeDoItem, "text-destaque-vermelho")}>
              <IconeFigma src="/painel/icone-alerta.svg" tamanho={16} />
              Tirar do ar agora
            </DropdownMenu.Item>
          ) : null}
          <DropdownMenu.Item onSelect={aoRemover} className={cn(classeDoItem, "text-destaque-vermelho")}>
            <Trash2 aria-hidden className="size-4" />
            Remover do carrossel
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

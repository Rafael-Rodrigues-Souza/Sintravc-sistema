"use client";

import { CalendarDays, ChevronLeft, ChevronRight, GripVertical, Megaphone } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { AlertDialog, AlertDialogContent, AlertDialogFooter } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { rotuloDaNoticia } from "@/lib/conteudos/dados";
import { gradeDoMes, type DiaDaGrade } from "@/lib/conteudos/grade-do-mes";
import { bahiaEmCampos, camposEmTexto, horaNaBahia } from "@/lib/datas";
import { cn } from "@/lib/utils";

import { acaoAgendar, acaoReagendar, type RespostaAgendar } from "./acoes";

export type ItemDoCalendarioNaTela = {
  id: string;
  titulo: string;
  estado: "publicado" | "agendado";
  /** ISO (UTC). */
  quando: string;
  revisao: number;
};
export type RascunhoNaTela = { id: string; titulo: string; revisao: number };
/** Comunicado no calendário (E17): só para consulta, do primeiro ao último dia no ar. */
export type ComunicadoNaTela = {
  id: string;
  mensagem: string;
  situacao: "agendado" | "no_ar" | "encerrado";
  primeiroDia: string;
  ultimoDia: string;
};

/**
 * Onde o clique na barra leva: o comunicado aberto na área Comunicados (E17); o encerrado, que não se
 * edita, na aba Encerrados, rolado até a vista e destacado (E58).
 */
const hrefDoComunicado = (c: ComunicadoNaTela) =>
  c.situacao === "encerrado" ? `/painel/comunicados?aba=encerrados&ver=${c.id}` : `/painel/comunicados?abrir=${c.id}`;
const COR_DA_BARRA = "bg-destaque-marinho-fixo text-texto-invertido dark:ring-1 dark:ring-inset dark:ring-sobre-escuro-borda";

type Arrastado = { tipo: "agendado"; item: ItemDoCalendarioNaTela } | { tipo: "rascunho"; item: RascunhoNaTela };
type Pendente = { arrastado: Arrastado; data: string; hora: string };

const SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const NOMES_DOS_MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];
/** Quantos itens cabem no quadradinho do dia antes do "+N mais". */
const ITENS_POR_DIA = 2;
const TIPO_ARRASTADO = "application/x-sintravc-conteudo";

const COR_DO_ITEM = {
  publicado: "bg-status-sucesso-fundo text-status-sucesso-texto",
  agendado: "bg-destaque-azul-suave text-destaque-azul",
} as const;

/** "Sexta, 30 de outubro" para um dia "AAAA-MM-DD" (sem fuso: é um dia do calendário). */
function nomeDoDia(data: string): string {
  const [ano, mes, dia] = data.split("-").map(Number) as [number, number, number];
  const texto = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(
    new Date(Date.UTC(ano, mes - 1, dia)),
  );
  const semFeira = texto.replace("-feira", "");
  return semFeira.charAt(0).toUpperCase() + semFeira.slice(1);
}

/**
 * Calendário de publicações (RF36; Figma 115:2992). Mostra o que entra no ar em cada dia, no
 * horário da Bahia. Arrastar uma notícia agendada muda o dia (mantém a hora); arrastar um
 * rascunho sem data agenda. Os dois pedem confirmação. Não dá para soltar num dia que passou nem
 * arrastar o que já está no ar. Sem mouse, a data muda pela Edição rápida (clique no item).
 * Comunicados aparecem só para consulta (E17, C3): barras marinho do período, sem arrastar, com o
 * botão da legenda para esconder; o clique abre o comunicado na área Comunicados.
 */
export function Calendario({
  ano,
  mes,
  hoje,
  dias,
  rascunhos,
  totalDeRascunhos,
  podeAgendar,
  hrefMesAnterior,
  hrefProximoMes,
  hrefHoje,
  comunicados = [],
}: {
  ano: number;
  mes: number;
  hoje: string;
  dias: Record<string, ItemDoCalendarioNaTela[]>;
  rascunhos: RascunhoNaTela[];
  totalDeRascunhos: number;
  podeAgendar: boolean;
  hrefMesAnterior: string;
  hrefProximoMes: string;
  hrefHoje: string;
  comunicados?: ComunicadoNaTela[];
}) {
  const router = useRouter();
  const [mostrarComunicados, setMostrarComunicados] = React.useState(true);
  const comunicadosDoDia = (data: string) =>
    mostrarComunicados ? comunicados.filter((c) => c.primeiroDia <= data && data <= c.ultimoDia) : [];
  const parametros = useSearchParams();
  const grade = React.useMemo(() => gradeDoMes(ano, mes), [ano, mes]);
  const linhasDasBarras = React.useMemo(
    () => (mostrarComunicados ? linhasPorSemana(grade, comunicados) : new Map<string, (ComunicadoNaTela | null)[]>()),
    [grade, comunicados, mostrarComunicados],
  );
  const mesDeHoje = hoje.slice(0, 7) === `${ano}-${String(mes).padStart(2, "0")}`;
  const [diaEscolhido, setDiaEscolhido] = React.useState(() => (mesDeHoje ? hoje : grade.find((d) => d.doMes)!.data));
  const [arrastando, setArrastando] = React.useState<Arrastado | null>(null);
  const [sobre, setSobre] = React.useState<string | null>(null);
  const [pendente, setPendente] = React.useState<Pendente | null>(null);
  const [gravando, setGravando] = React.useState(false);

  const hrefEditar = (id: string) => {
    const novos = new URLSearchParams(parametros.toString());
    novos.set("editar", id);
    return `/painel/conteudos?${novos}`;
  };
  const podeSoltar = (data: string) => !!arrastando && data >= hoje;

  const comecarArraste = (evento: React.DragEvent, arrastado: Arrastado) => {
    evento.dataTransfer.setData(TIPO_ARRASTADO, arrastado.item.id);
    evento.dataTransfer.effectAllowed = "move";
    setArrastando(arrastado);
  };
  const soltar = (evento: React.DragEvent, data: string) => {
    evento.preventDefault();
    setSobre(null);
    if (!arrastando || !podeSoltar(data)) return;
    const hora = arrastando.tipo === "agendado" ? bahiaEmCampos(new Date(arrastando.item.quando)).hora : "08:00";
    if (arrastando.tipo === "agendado" && bahiaEmCampos(new Date(arrastando.item.quando)).data === data) {
      setArrastando(null);
      return;
    }
    setPendente({ arrastado: arrastando, data, hora });
    setArrastando(null);
  };

  const confirmar = async () => {
    if (!pendente) return;
    setGravando(true);
    const { arrastado, data, hora } = pendente;
    const resposta: RespostaAgendar = await (arrastado.tipo === "agendado"
      ? acaoReagendar({ id: arrastado.item.id, quando: { data, hora } })
      : acaoAgendar({ id: arrastado.item.id, revisaoBase: arrastado.item.revisao, quando: { data, hora } })
    ).catch(() => ({ tipo: "erro" as const, mensagem: "Sem conexão com o servidor. Confira a internet e tente de novo." }));
    setGravando(false);
    if (resposta.tipo === "agendada") {
      setPendente(null);
      setDiaEscolhido(data);
      toast.success(`${arrastado.tipo === "agendado" ? "Reagendada" : "Agendada"} para ${camposEmTexto({ data, hora })}.`);
      router.refresh();
    } else if (resposta.tipo === "faltam") {
      setPendente(null);
      toast.error("Ainda não dá para agendar esta notícia", {
        description: "Faltam itens obrigatórios. Abra o editor para completar.",
        duration: Infinity,
        closeButton: true,
        action: { label: "Abrir editor", onClick: () => router.push(`/painel/conteudos/noticia/${arrastado.item.id}`) },
      });
    } else if (resposta.tipo === "conflito") {
      setPendente(null);
      toast.error("Alguém salvou esta notícia agora. Atualizamos o calendário: tente de novo.", { duration: Infinity, closeButton: true });
      router.refresh();
    } else if (resposta.campo !== "agendadoPara") {
      setPendente(null);
      toast.error(resposta.mensagem, { duration: Infinity, closeButton: true });
    } else {
      toast.error(resposta.mensagem);
    }
  };

  const itensDoDia = dias[diaEscolhido] ?? [];
  const temItensNoMes = grade.some((d) => d.doMes && (dias[d.data]?.length ?? 0) > 0);

  return (
    <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
      <section aria-label="Calendário de publicações" className="flex min-w-0 flex-1 flex-col gap-4 rounded-[16px] border border-borda-padrao bg-fundo-superficie p-5">
        <header className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Link
              href={hrefMesAnterior}
              scroll={false}
              aria-label="Mês anterior"
              className="alvo-toque flex size-10 items-center justify-center rounded-full bg-fundo-superficie-alt text-texto-primario outline-none hover:brightness-95 focus-visible:ring-[3px] focus-visible:ring-ring"
            >
              <ChevronLeft aria-hidden className="size-5" />
            </Link>
            <Link
              href={hrefProximoMes}
              scroll={false}
              aria-label="Próximo mês"
              className="alvo-toque flex size-10 items-center justify-center rounded-full bg-fundo-superficie-alt text-texto-primario outline-none hover:brightness-95 focus-visible:ring-[3px] focus-visible:ring-ring"
            >
              <ChevronRight aria-hidden className="size-5" />
            </Link>
          </div>
          <h2 className="texto-titulo-card text-texto-primario" aria-live="polite">
            {NOMES_DOS_MESES[mes - 1]} de {ano}
          </h2>
          <ul aria-label="Legenda" className="flex flex-wrap items-center gap-x-4 gap-y-1 texto-pequeno text-texto-secundario">
            <li className="flex items-center gap-1.5">
              <span aria-hidden className="size-2 rounded-full bg-status-sucesso-texto" />
              Publicado
            </li>
            <li className="flex items-center gap-1.5">
              <span aria-hidden className="size-2 rounded-full bg-destaque-azul" />
              Agendado
            </li>
            {comunicados.length > 0 ? (
              <li>
                <button
                  type="button"
                  aria-pressed={mostrarComunicados}
                  onClick={() => setMostrarComunicados((m) => !m)}
                  className={cn(
                    "alvo-toque flex items-center gap-1.5 rounded-full border px-2.5 py-1 outline-none focus-visible:ring-[3px] focus-visible:ring-ring",
                    mostrarComunicados ? "border-destaque-marinho-fixo text-texto-primario" : "border-borda-padrao text-texto-terciario line-through",
                  )}
                >
                  <span aria-hidden className="h-2 w-3.5 rounded-full bg-destaque-marinho-fixo dark:ring-1 dark:ring-sobre-escuro-borda" />
                  Comunicados <span className="texto-etiqueta">{comunicados.length}</span>
                </button>
              </li>
            ) : null}
          </ul>
          <Button asChild variant="secundario" size="pequeno" className="ml-auto">
            <Link href={hrefHoje} scroll={false}>
              Hoje
            </Link>
          </Button>
        </header>

        {/* Computador: a grade, com arrastar. */}
        <div className="hidden md:block">
          <div aria-hidden className="grid grid-cols-7 gap-2 pb-2">
            {SEMANA.map((dia) => (
              <span key={dia} className="texto-etiqueta text-texto-secundario uppercase">
                {dia}
              </span>
            ))}
          </div>
          <ol className="grid grid-cols-7 gap-2">
            {grade.map((dia) => (
              <Dia
                key={dia.data}
                dia={dia}
                hoje={hoje}
                escolhido={dia.data === diaEscolhido}
                itens={dias[dia.data] ?? []}
                comunicados={linhasDasBarras.get(dia.data) ?? []}
                soltavel={podeSoltar(dia.data)}
                sobre={sobre === dia.data}
                podeArrastar={podeAgendar}
                hrefEditar={hrefEditar}
                aoEscolher={() => setDiaEscolhido(dia.data)}
                aoArrastar={comecarArraste}
                aoTerminarArraste={() => {
                  setArrastando(null);
                  setSobre(null);
                }}
                aoEntrar={() => setSobre(dia.data)}
                aoSair={() => setSobre((atual) => (atual === dia.data ? null : atual))}
                aoSoltar={soltar}
              />
            ))}
          </ol>
          {temItensNoMes ? null : (
            <p className="pt-3 texto-pequeno text-texto-secundario">
              Nada entra no ar neste mês.{podeAgendar ? " Arraste um rascunho para um dia para agendar." : ""}
            </p>
          )}
        </div>

        {/* Celular: lista por dia, sem arrastar (a data muda pela Edição rápida). */}
        <ListaDoMes grade={grade} dias={dias} hoje={hoje} hrefEditar={hrefEditar} />
        {mostrarComunicados ? <ComunicadosDoMes comunicados={comunicados} /> : null}
      </section>

      <aside className="flex flex-col gap-6 xl:w-[320px]">
        <section aria-labelledby="titulo-do-dia" className="flex flex-col gap-3 rounded-[16px] border border-borda-padrao bg-fundo-superficie p-5">
          <h2 id="titulo-do-dia" className="texto-titulo-card text-texto-primario">
            {nomeDoDia(diaEscolhido)}
          </h2>
          {comunicadosDoDia(diaEscolhido).length > 0 ? (
            <ul aria-label="Comunicados no ar neste dia" className="flex flex-col gap-2">
              {comunicadosDoDia(diaEscolhido).map((c) => (
                <li key={c.id}>
                  <Link
                    href={hrefDoComunicado(c)}
                    className={cn("flex items-start gap-2 rounded-[12px] p-3 texto-pequeno outline-none hover:brightness-125 focus-visible:ring-[3px] focus-visible:ring-ring", COR_DA_BARRA)}
                  >
                    <Megaphone aria-hidden className="mt-0.5 size-4 shrink-0" />
                    <span className="min-w-0">
                      <span className="sr-only">Comunicado: </span>
                      {c.mensagem}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
          {itensDoDia.length === 0 ? (
            <p className="flex items-center gap-2 texto-pequeno text-texto-secundario">
              <CalendarDays aria-hidden className="size-4" />
              Nada entra no ar neste dia.
            </p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {itensDoDia.map((item) => (
                <li key={item.id}>
                  <Link
                    href={hrefEditar(item.id)}
                    scroll={false}
                    className="flex flex-col gap-1.5 rounded-[12px] bg-fundo-superficie-alt p-3 outline-none hover:brightness-95 focus-visible:ring-[3px] focus-visible:ring-ring"
                  >
                    <span className="flex items-center justify-between gap-2 texto-pequeno text-texto-secundario">
                      {horaNaBahia(new Date(item.quando))}
                      <span className={cn("rounded-full px-2 py-0.5 texto-etiqueta uppercase", COR_DO_ITEM[item.estado])}>
                        {item.estado === "publicado" ? "Publicado" : "Agendado"}
                      </span>
                    </span>
                    <span className="texto-titulo-card-pequeno text-texto-primario">{rotuloDaNoticia(item.titulo)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="titulo-rascunhos" className="flex flex-col gap-3 rounded-[16px] border border-borda-padrao bg-fundo-superficie p-5">
          <div className="flex items-baseline justify-between gap-2">
            <h2 id="titulo-rascunhos" className="texto-titulo-card text-texto-primario">
              Rascunhos sem data
            </h2>
            <span className="texto-titulo-card text-texto-secundario">{totalDeRascunhos}</span>
          </div>
          {rascunhos.length === 0 ? (
            <p className="texto-pequeno text-texto-secundario">Nenhum rascunho esperando data.</p>
          ) : (
            <>
              {podeAgendar ? (
                <p className="hidden texto-pequeno text-texto-secundario md:block">Arraste um rascunho para um dia do calendário para agendá-lo.</p>
              ) : null}
              <ul className="flex flex-col gap-2">
                {rascunhos.map((r) => (
                  <li key={r.id}>
                    <Link
                      href={`/painel/conteudos/noticia/${r.id}`}
                      draggable={podeAgendar}
                      onDragStart={(e) => comecarArraste(e, { tipo: "rascunho", item: r })}
                      onDragEnd={() => {
                        setArrastando(null);
                        setSobre(null);
                      }}
                      aria-label={`${rotuloDaNoticia(r.titulo)}: abrir no editor`}
                      className={cn(
                        "alvo-toque flex items-center gap-2 rounded-[12px] border border-borda-padrao px-3 py-2.5 texto-pequeno text-texto-primario outline-none hover:bg-fundo-superficie-alt focus-visible:ring-[3px] focus-visible:ring-ring",
                        podeAgendar && "md:cursor-grab",
                      )}
                    >
                      {podeAgendar ? <GripVertical aria-hidden className="hidden size-4 shrink-0 text-texto-terciario md:block" /> : null}
                      <span className="truncate">{rotuloDaNoticia(r.titulo)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
              {totalDeRascunhos > rascunhos.length ? (
                <Link href="/painel/conteudos?estado=rascunho" className="alvo-toque self-start texto-pequeno pointer-coarse:mt-1 font-semibold text-destaque-azul underline underline-offset-2">
                  Ver todos os rascunhos
                </Link>
              ) : null}
            </>
          )}
        </section>
      </aside>

      <AlertDialog open={!!pendente} onOpenChange={(aberto) => (aberto || gravando ? null : setPendente(null))}>
        {pendente ? (
          <AlertDialogContent
            icone="/painel/menu-calendario.svg"
            titulo={pendente.arrastado.tipo === "agendado" ? "Reagendar notícia?" : "Agendar notícia?"}
            descricao={
              <>
                “{rotuloDaNoticia(pendente.arrastado.item.titulo)}” vai entrar no ar sozinha em{" "}
                <strong>{camposEmTexto({ data: pendente.data, hora: pendente.hora })}</strong>. A mudança fica registrada em Atividade.
              </>
            }
          >
            {pendente.arrastado.tipo === "rascunho" ? (
              <div className="flex flex-col gap-2 px-6 pb-2">
                <Label htmlFor="hora-ao-soltar">Hora</Label>
                <Input
                  id="hora-ao-soltar"
                  type="time"
                  value={pendente.hora}
                  onChange={(e) => setPendente({ ...pendente, hora: e.target.value })}
                />
              </div>
            ) : null}
            <AlertDialogFooter>
              <Button type="button" variant="secundario" disabled={gravando} onClick={() => setPendente(null)}>
                Voltar
              </Button>
              <Button type="button" disabled={gravando || !pendente.hora} onClick={() => void confirmar()}>
                {gravando ? "Salvando…" : pendente.arrastado.tipo === "agendado" ? "Reagendar" : "Agendar"}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        ) : null}
      </AlertDialog>
    </div>
  );
}

function Dia({
  dia,
  hoje,
  escolhido,
  itens,
  soltavel,
  sobre,
  podeArrastar,
  hrefEditar,
  aoEscolher,
  aoArrastar,
  aoTerminarArraste,
  aoEntrar,
  aoSair,
  aoSoltar,
  comunicados,
}: {
  dia: DiaDaGrade;
  hoje: string;
  escolhido: boolean;
  itens: ItemDoCalendarioNaTela[];
  soltavel: boolean;
  sobre: boolean;
  podeArrastar: boolean;
  hrefEditar: (id: string) => string;
  aoEscolher: () => void;
  aoArrastar: (e: React.DragEvent, a: Arrastado) => void;
  aoTerminarArraste: () => void;
  aoEntrar: () => void;
  aoSair: () => void;
  aoSoltar: (e: React.DragEvent, data: string) => void;
  /** Uma posição por linha da semana: o comunicado daquele dia, ou vazio para manter as barras alinhadas. */
  comunicados: (ComunicadoNaTela | null)[];
}) {
  const ehHoje = dia.data === hoje;
  const domingo = new Date(`${dia.data}T12:00:00Z`).getUTCDay() === 0;
  const passado = dia.data < hoje;
  const visiveis = itens.slice(0, ITENS_POR_DIA);
  const resto = itens.length - visiveis.length;
  return (
    <li
      data-dia={dia.data}
      onDragOver={(e) => {
        if (!soltavel) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      }}
      onDragEnter={() => soltavel && aoEntrar()}
      onDragLeave={aoSair}
      onDrop={(e) => aoSoltar(e, dia.data)}
      className={cn(
        "flex min-h-[112px] flex-col gap-1.5 rounded-[12px] border p-2 pointer-coarse:relative",
        dia.doMes ? "border-borda-padrao bg-fundo-superficie" : "border-transparent bg-fundo-superficie-alt",
        escolhido && "border-destaque-azul",
        ehHoje && "bg-destaque-azul-suave",
        sobre && "ring-[3px] ring-destaque-azul",
      )}
    >
      <button
        type="button"
        onClick={aoEscolher}
        aria-pressed={escolhido}
        aria-label={`${nomeDoDia(dia.data)}${ehHoje ? " (hoje)" : ""}: ${itens.length === 0 ? "nada no ar" : itens.length === 1 ? "1 publicação" : `${itens.length} publicações`}`}
        className={cn(
          "self-start rounded-sm texto-corpo outline-none focus-visible:ring-[3px] focus-visible:ring-ring",
          // No toque, o dia inteiro escolhe o dia (os itens, pequenos demais para o dedo, ficam na lista
          // do dia, ao lado); o número ocupa a largura e a altura mínima de toque (E48).
          "pointer-coarse:min-h-(--alvo-toque) pointer-coarse:self-stretch pointer-coarse:text-left pointer-coarse:after:absolute pointer-coarse:after:inset-0",
          ehHoje ? "font-semibold text-destaque-azul" : dia.doMes && !passado ? "text-texto-primario" : "text-texto-terciario",
        )}
      >
        {dia.dia}
      </button>
      {comunicados.map((c, linha) => {
        if (!c) return <span key={`vazio-${linha}`} aria-hidden className="h-6" />;
        const comeca = c.primeiroDia === dia.data;
        const termina = c.ultimoDia === dia.data;
        // O texto e o foco ficam no começo da barra e no começo de cada semana; o resto é só a cor.
        const comTexto = comeca || domingo;
        return (
          <Link
            key={c.id}
            href={hrefDoComunicado(c)}
            draggable={false}
            onDragStart={(e) => e.preventDefault()}
            data-testid="barra-comunicado"
            title={c.mensagem}
            aria-hidden={comTexto ? undefined : true}
            tabIndex={comTexto ? undefined : -1}
            className={cn(
              "flex h-6 items-center gap-1 truncate px-2 texto-etiqueta outline-none focus-visible:ring-[3px] focus-visible:ring-ring",
              COR_DA_BARRA,
              comeca ? "rounded-l-[6px]" : "-ml-2 pl-4",
              termina ? "rounded-r-[6px]" : "-mr-2",
            )}
          >
            {comTexto ? (
              <>
                <Megaphone aria-hidden className="size-3 shrink-0" />
                <span className="sr-only">Comunicado: </span>
                <span className="truncate">{c.mensagem}</span>
              </>
            ) : null}
          </Link>
        );
      })}
      {visiveis.map((item) => {
        const arrastavel = podeArrastar && item.estado === "agendado";
        return (
          <Link
            key={item.id}
            href={hrefEditar(item.id)}
            scroll={false}
            draggable={arrastavel}
            onDragStart={arrastavel ? (e) => aoArrastar(e, { tipo: "agendado", item }) : (e) => e.preventDefault()}
            onDragEnd={aoTerminarArraste}
            title={`${horaNaBahia(new Date(item.quando))} · ${rotuloDaNoticia(item.titulo)}`}
            className={cn(
              "truncate rounded-[8px] px-2 py-1 texto-pequeno outline-none focus-visible:ring-[3px] focus-visible:ring-ring",
              COR_DO_ITEM[item.estado],
              arrastavel && "cursor-grab",
            )}
          >
            {horaNaBahia(new Date(item.quando)).replace(/h00$/, "h")} {rotuloDaNoticia(item.titulo)}
          </Link>
        );
      })}
      {resto > 0 ? (
        <button
          type="button"
          onClick={aoEscolher}
          className="self-start rounded-sm texto-pequeno font-semibold text-destaque-azul outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring"
        >
          +{resto} mais
        </button>
      ) : null}
    </li>
  );
}

function ListaDoMes({
  grade,
  dias,
  hoje,
  hrefEditar,
}: {
  grade: DiaDaGrade[];
  dias: Record<string, ItemDoCalendarioNaTela[]>;
  hoje: string;
  hrefEditar: (id: string) => string;
}) {
  const comItens = grade.filter((d) => d.doMes && (dias[d.data]?.length ?? 0) > 0);
  return (
    <div className="md:hidden">
      {comItens.length === 0 ? (
        <p className="flex items-center gap-2 texto-pequeno text-texto-secundario">
          <CalendarDays aria-hidden className="size-4" />
          Nada entra no ar neste mês.
        </p>
      ) : (
        <ol className="flex flex-col gap-4">
          {comItens.map((dia) => (
            <li key={dia.data} className="flex flex-col gap-2">
              <h3 className={cn("texto-titulo-card-pequeno", dia.data === hoje ? "text-destaque-azul" : "text-texto-primario")}>
                {nomeDoDia(dia.data)}
                {dia.data === hoje ? " · hoje" : ""}
              </h3>
              <ul className="flex flex-col gap-2">
                {dias[dia.data]!.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={hrefEditar(item.id)}
                      scroll={false}
                      className={cn("alvo-toque flex gap-2 rounded-[10px] px-3 py-2 pointer-coarse:min-h-(--alvo-toque) pointer-coarse:py-3 texto-pequeno outline-none focus-visible:ring-[3px] focus-visible:ring-ring", COR_DO_ITEM[item.estado])}
                    >
                      <span className="shrink-0 font-semibold">{horaNaBahia(new Date(item.quando))}</span>
                      <span className="min-w-0">{rotuloDaNoticia(item.titulo)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/** Celular: os comunicados do mês numa lista, com o período (E17). */
function ComunicadosDoMes({ comunicados }: { comunicados: ComunicadoNaTela[] }) {
  if (comunicados.length === 0) return null;
  const dia = (data: string) => `${data.slice(8, 10)}/${data.slice(5, 7)}`;
  return (
    <section aria-labelledby="comunicados-do-mes" className="flex flex-col gap-2 md:hidden">
      <h3 id="comunicados-do-mes" className="texto-titulo-card-pequeno text-texto-primario">
        Comunicados
      </h3>
      <ul className="flex flex-col gap-2">
        {comunicados.map((c) => (
          <li key={c.id}>
            <Link
              href={hrefDoComunicado(c)}
              className={cn("alvo-toque flex flex-col gap-1 rounded-[10px] px-3 py-2.5 texto-pequeno outline-none focus-visible:ring-[3px] focus-visible:ring-ring", COR_DA_BARRA)}
            >
              <span className="font-semibold">
                {dia(c.primeiroDia)} <span aria-hidden>→</span>
                <span className="sr-only">até</span> {dia(c.ultimoDia)}
              </span>
              <span className="min-w-0">{c.mensagem}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * As barras de comunicado de cada dia, em linhas fixas por semana (E17): o mesmo comunicado fica na
 * mesma altura do domingo ao sábado, e um dia sem ele naquela linha recebe um espaço vazio. A linha é
 * a primeira livre, na ordem de início.
 */
function linhasPorSemana(grade: DiaDaGrade[], comunicados: ComunicadoNaTela[]) {
  const porDia = new Map<string, (ComunicadoNaTela | null)[]>();
  for (let inicio = 0; inicio < grade.length; inicio += 7) {
    const semana = grade.slice(inicio, inicio + 7).map((d) => d.data);
    const primeiro = semana[0]!;
    const ultimo = semana.at(-1)!;
    const daSemana = comunicados.filter((c) => c.primeiroDia <= ultimo && c.ultimoDia >= primeiro);
    const linhas: ComunicadoNaTela[][] = [];
    for (const c of daSemana) {
      const livre = linhas.find((l) => l.every((outro) => outro.ultimoDia < c.primeiroDia || outro.primeiroDia > c.ultimoDia));
      if (livre) livre.push(c);
      else linhas.push([c]);
    }
    for (const data of semana) {
      const doDia = linhas.map((l) => l.find((c) => c.primeiroDia <= data && data <= c.ultimoDia) ?? null);
      // Sem nada nas últimas linhas, não reserva espaço à toa.
      while (doDia.length > 0 && doDia.at(-1) === null) doDia.pop();
      porDia.set(data, doDia);
    }
  }
  return porDia;
}

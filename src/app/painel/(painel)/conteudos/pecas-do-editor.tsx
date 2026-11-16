"use client";

/**
 * Peças dos editores de conteúdo (notícia e documento oficial, Figma 112:1091 e 114:1972): cartão,
 * seção que abre e fecha no celular, barra de baixo do editor, campo com contador, status do
 * salvamento, botão travado com dica e data e hora do agendamento.
 */
import { CalendarDays, Check, ChevronDown, Clock, Cloud, CloudOff, LoaderCircle, Lock } from "lucide-react";
import * as React from "react";
import { flushSync } from "react-dom";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { EstadoDaFila } from "@/lib/conteudos/fila-rascunho";
import { bahiaEmCampos, horaNaBahia } from "@/lib/datas";
import { cn } from "@/lib/utils";

export type CamposDaData = { data: string; hora: string };

export function Cartao({
  titulo,
  descricao,
  acao,
  children,
}: {
  titulo: string;
  descricao?: string;
  acao?: React.ReactNode;
  children: React.ReactNode;
}) {
  const id = React.useId();
  return (
    <section aria-labelledby={id} className="flex flex-col gap-5 rounded-[20px] border border-borda-padrao bg-fundo-superficie p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 id={id} className="texto-titulo-card text-texto-primario">
            {titulo}
          </h2>
          {descricao ? <p className="texto-pequeno text-texto-secundario">{descricao}</p> : null}
        </div>
        {acao}
      </div>
      {children}
    </section>
  );
}

export type SituacaoDaSecao = "ok" | "falta" | "opcional";

const ICONE_DA_SITUACAO: Record<SituacaoDaSecao, { classe: string; conteudo: React.ReactNode }> = {
  ok: { classe: "bg-status-sucesso-fundo text-status-sucesso-texto", conteudo: <Check aria-hidden className="size-4" /> },
  falta: { classe: "bg-status-perigo-fundo text-status-perigo-texto", conteudo: <span className="texto-titulo-card-pequeno">!</span> },
  opcional: { classe: "bg-status-neutro-fundo text-texto-terciario", conteudo: <span className="size-1.5 rounded-full bg-current" /> },
};

/**
 * Cartão que, abaixo do lg (celular e tablet em pé, E49; Figma M 120:3836), vira uma linha com a
 * situação, o título, um resumo e a seta, e abre e fecha ao tocar. A partir do lg é o Cartao de
 * sempre, aberto. O conteúdo fica sempre na página (só some com CSS): o que foi digitado continua lá
 * ao fechar e ao girar o tablet, e o desktop não depende do estado.
 */
export function SecaoQueAbre({
  titulo,
  descricao,
  acao,
  resumo,
  situacao,
  aberta,
  aoMudar,
  children,
}: {
  titulo: string;
  descricao?: string;
  acao?: React.ReactNode;
  resumo: string;
  situacao: SituacaoDaSecao;
  aberta: boolean;
  aoMudar: (aberta: boolean) => void;
  children: React.ReactNode;
}) {
  const id = React.useId();
  const icone = ICONE_DA_SITUACAO[situacao];
  return (
    <section
      aria-labelledby={`${id}-titulo`}
      className={cn("flex flex-col gap-5 rounded-[20px] border border-borda-padrao bg-fundo-superficie p-5 sm:p-6", !aberta && "max-lg:gap-0 max-lg:py-4")}
    >
      <h2 className="lg:hidden">
        <button
          type="button"
          aria-expanded={aberta}
          aria-controls={`${id}-conteudo`}
          onClick={() => aoMudar(!aberta)}
          className="-m-2 flex w-[calc(100%+16px)] items-center gap-3 rounded-[14px] p-2 text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
        >
          <span aria-hidden className={cn("flex size-7 shrink-0 items-center justify-center rounded-full", icone.classe)}>
            {icone.conteudo}
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="texto-titulo-card-pequeno text-texto-primario">{titulo}</span>
            <span className={cn("texto-pequeno", situacao === "falta" ? "text-status-perigo-texto" : "text-texto-secundario")}>{resumo}</span>
          </span>
          <ChevronDown aria-hidden className={cn("size-5 shrink-0 text-texto-secundario transition-transform motion-reduce:transition-none", aberta && "rotate-180")} />
        </button>
      </h2>
      <div className="hidden items-start justify-between gap-3 lg:flex">
        <div className="flex flex-col gap-1">
          <h2 id={`${id}-titulo`} className="texto-titulo-card text-texto-primario">
            {titulo}
          </h2>
          {descricao ? <p className="texto-pequeno text-texto-secundario">{descricao}</p> : null}
        </div>
        {acao}
      </div>
      <div id={`${id}-conteudo`} className={cn("flex flex-col gap-5", !aberta && "max-lg:hidden")}>
        {children}
      </div>
    </section>
  );
}

/** “Falta a assinatura e a categoria”: o resumo de uma seção com pendências, pelos rótulos dos campos. */
export function resumoDasFaltas(rotulos: string[]): string {
  // Minúscula só no começo de palavra comum: “PDF oficial” continua com a sigla.
  const nomes = rotulos.map((r) => (r.charAt(1) === r.charAt(1).toLowerCase() ? r.charAt(0).toLowerCase() + r.slice(1) : r));
  const lista = nomes.length > 1 ? `${nomes.slice(0, -1).join(", ")} e ${nomes.at(-1)}` : (nomes[0] ?? "");
  return `Falta: ${lista}`;
}

/** Quais seções do editor estão abertas no celular (todas começam fechadas). */
export function useSecoesAbertas<Nome extends string>() {
  const [abertas, setAbertas] = React.useState<ReadonlySet<Nome>>(() => new Set());
  const mudar = React.useCallback((nome: Nome, sim: boolean) => {
    setAbertas((atuais) => {
      if (atuais.has(nome) === sim) return atuais;
      const novas = new Set(atuais);
      if (sim) novas.add(nome);
      else novas.delete(nome);
      return novas;
    });
  }, []);
  return {
    /** Props de uma SecaoQueAbre. */
    secao: (nome: Nome) => ({ aberta: abertas.has(nome), aoMudar: (sim: boolean) => mudar(nome, sim) }),
    /**
     * Abre a seção antes de levar o foco a um campo dela. Na hora (flushSync): depois de um await, o
     * React pintaria só depois do requestAnimationFrame do foco, e o campo ainda estaria escondido.
     */
    abrir: (nome: Nome) => flushSync(() => mudar(nome, true)),
  };
}

/**
 * Barra de baixo do editor no celular e no tablet em pé (E49; Figma M 120:3836): Salvar e Publicar
 * sempre ao alcance do polegar. A partir do lg some, e os mesmos botões ficam no topo.
 */
export function BarraDoEditor({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Espaço no fim da página para a barra não cobrir o último campo. */}
      <div aria-hidden className="h-[calc(var(--altura-barra-de-baixo)+env(safe-area-inset-bottom))] shrink-0 lg:hidden" />
      <div
        role="group"
        aria-label="Salvar e publicar"
        data-barra-de-baixo
        // No editor, esta barra fica no lugar da navegação do painel (E49): o caminho de volta é o “voltar” do topo.
        data-substitui="menu-do-painel"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-2 items-center gap-3 border-t border-borda-padrao bg-fundo-cabecalho px-4 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))] lg:hidden [&>*]:w-full"
      >
        {children}
      </div>
    </>
  );
}

export function CampoComContador({
  id,
  rotulo,
  ajuda,
  limite,
  valor,
  erro,
  aoMudar,
  multilinha,
}: {
  id: string;
  rotulo: string;
  ajuda?: string;
  limite: number;
  valor: string;
  erro?: string;
  aoMudar: (valor: string) => void;
  multilinha?: boolean;
}) {
  const mensagem = erro ?? ajuda;
  const props = {
    id,
    value: valor,
    maxLength: limite,
    "aria-invalid": erro ? true : undefined,
    "aria-describedby": `${id}-contador${mensagem ? ` ${id}-mensagem` : ""}`,
  } as const;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline gap-2">
        <Label htmlFor={id}>{rotulo}</Label>
        <span id={`${id}-contador`} className="texto-pequeno text-texto-terciario" aria-live="polite">
          <span className="sr-only">Caracteres usados: </span>
          {valor.length}/{limite}
        </span>
      </div>
      {multilinha ? (
        <Textarea {...props} className="min-h-[72px]" onChange={(evento) => aoMudar(evento.target.value)} />
      ) : (
        <Input {...props} onChange={(evento) => aoMudar(evento.target.value)} />
      )}
      {mensagem ? (
        <p id={`${id}-mensagem`} className={cn("texto-pequeno", erro ? "text-status-perigo-texto" : "text-texto-terciario")}>
          {mensagem}
        </p>
      ) : null}
    </div>
  );
}

function textoDoStatus(estado: EstadoDaFila<unknown>, temId: boolean): string {
  switch (estado.situacao) {
    case "salvando":
      return "Salvando…";
    case "pendente":
      return "Alterações ainda não salvas";
    case "sem_internet":
      return "Sem internet · guardado neste computador";
    case "conflito":
      return "Há duas versões do rascunho";
    case "erro":
      return "Não foi possível salvar";
    default:
      if (estado.salvoEm) return `Salvo automaticamente às ${horaNaBahia(new Date(estado.salvoEm))}`;
      return temId ? "Tudo salvo" : "Comece a escrever: o rascunho é salvo sozinho";
  }
}

/** O mesmo status, curto, para o topo compacto (celular, Figma M 120:3836: “Salvo às 10h42”; e topo-compacto, #48). */
function textoCurtoDoStatus(estado: EstadoDaFila<unknown>, temId: boolean): string {
  switch (estado.situacao) {
    case "salvando":
      return "Salvando…";
    case "pendente":
      return "Não salvo ainda";
    case "sem_internet":
      return "Sem internet";
    case "conflito":
      return "Duas versões";
    case "erro":
      return "Não foi salvo";
    default:
      if (estado.salvoEm) return `Salvo às ${horaNaBahia(new Date(estado.salvoEm))}`;
      return temId ? "Tudo salvo" : "Rascunho novo";
  }
}

export function StatusDoSalvamento({ estado, temId }: { estado: EstadoDaFila<unknown>; temId: boolean }) {
  const Icone = estado.situacao === "salvando" ? LoaderCircle : estado.situacao === "sem_internet" ? CloudOff : Cloud;
  return (
    <p
      role="status"
      aria-live="polite"
      data-testid="status-do-salvamento"
      className={cn(
        "flex items-center gap-1.5 texto-pequeno",
        estado.situacao === "erro" || estado.situacao === "conflito" ? "text-status-perigo-texto" : "text-texto-secundario",
      )}
    >
      <Icone aria-hidden className={cn("size-4 shrink-0", estado.situacao === "salvando" && "animate-spin motion-reduce:animate-none")} />
      {/* No celular e no topo sem espaço (topo-compacto, #48) aparece o texto curto; o leitor de tela lê sempre o completo. */}
      <span className="max-lg:sr-only topo-compacto:sr-only">{textoDoStatus(estado, temId)}</span>
      <span aria-hidden className="hidden whitespace-nowrap max-lg:inline topo-compacto:inline">
        {textoCurtoDoStatus(estado, temId)}
      </span>
    </p>
  );
}

export function StatusCurto({ estado }: { estado: EstadoDaFila<unknown> }) {
  const texto =
    estado.situacao === "sincronizado" && estado.salvoEm
      ? "Alterações salvas"
      : estado.situacao === "sem_internet"
        ? "Guardado neste computador"
        : null;
  if (!texto) return null;
  return (
    <span className="inline-flex items-center gap-1.5">
      {estado.situacao === "sem_internet" ? <CloudOff aria-hidden className="size-4" /> : <Cloud aria-hidden className="size-4" />}
      {texto}
    </span>
  );
}

/**
 * Botão do topo que fica só com o ícone abaixo do lg (E49) e no topo sem espaço para os rótulos
 * (variante topo-compacto, globals.css, #48). `botao` vai no botão, `rotulo` no texto (continua para o
 * leitor de tela) e `someNoCompacto` no que some de vez junto com o texto (o cadeado do BotaoTravado).
 */
export const ICONE_COMPACTO = {
  botao: "max-lg:size-10 max-lg:px-0 max-lg:has-[>svg]:pl-0 topo-compacto:size-10 topo-compacto:px-0 topo-compacto:has-[>svg]:pl-0",
  rotulo: "max-lg:sr-only topo-compacto:sr-only",
  someNoCompacto: "max-lg:hidden topo-compacto:hidden",
} as const;

/**
 * Rótulo do “Salvar” do topo. Antes de ir ao ar, “Salvar rascunho”; no topo sem espaço (#48), só
 * “Salvar” aparece, e o nome acessível continua “Salvar rascunho”.
 */
export function RotuloSalvar({ rascunho }: { rascunho: boolean }) {
  if (!rascunho) return "Salvar";
  return (
    <>
      <span className="topo-compacto:sr-only">Salvar rascunho</span>
      <span aria-hidden className="hidden topo-compacto:inline">
        Salvar
      </span>
    </>
  );
}

/**
 * Rótulo do Publicar do topo. Com `alteracoes` (já está no ar), no topo sem espaço (#48) o rótulo
 * aparece como “Publicar…” (o aviso de alterações e o selo seguem na tela), e o nome acessível
 * continua inteiro.
 */
export function RotuloPublicar({ rotulo, alteracoes }: { rotulo: string; alteracoes: boolean }) {
  if (!alteracoes) return rotulo;
  return (
    <>
      <span className="topo-compacto:sr-only">{rotulo}</span>
      <span aria-hidden className="hidden topo-compacto:inline">
        Publicar…
      </span>
    </>
  );
}

/**
 * Botão que ainda não funciona aqui: fica visível, travado, com a dica lida pelo leitor de tela.
 * No toque não há `title` (E48): `avisarAoTocar` mostra a dica num aviso. `compacto` deixa só o
 * ícone abaixo do lg e no topo sem espaço (topo-compacto, #48); o nome continua para o leitor de tela.
 */
export function BotaoTravado({
  rotulo,
  dica,
  icone,
  compacto = false,
  avisarAoTocar = false,
  className,
}: {
  rotulo: React.ReactNode;
  dica: string;
  icone: React.ReactNode;
  compacto?: boolean;
  avisarAoTocar?: boolean;
  className?: string;
}) {
  const id = React.useId();
  return (
    <span className={cn("inline-flex", className)} title={dica}>
      {/* aria-disabled (e não disabled) para continuar focável e a dica ser lida; o clique não faz nada. */}
      <button
        type="button"
        aria-disabled="true"
        aria-describedby={id}
        onClick={(evento) => {
          evento.preventDefault();
          if (avisarAoTocar) toast.info(dica, { id: dica });
        }}
        className={cn(
          "inline-flex h-10 w-full cursor-not-allowed items-center justify-center gap-2 rounded-full border-[1.5px] border-dashed border-borda-forte bg-fundo-superficie-alt px-4 texto-botao text-texto-terciario outline-none focus-visible:ring-[3px] focus-visible:ring-ring [&_svg]:size-[18px]",
          avisarAoTocar && "h-12",
          compacto && cn("alvo-toque", ICONE_COMPACTO.botao),
        )}
      >
        {icone}
        <span className={cn(compacto && ICONE_COMPACTO.rotulo)}>{rotulo}</span>
        <Lock aria-hidden className={cn("size-3.5", compacto && ICONE_COMPACTO.someNoCompacto)} />
      </button>
      <span id={id} className="sr-only">
        {dica}
      </span>
    </span>
  );
}

export function mesmaData(campos: CamposDaData, agendadoPara: string): boolean {
  const atual = bahiaEmCampos(new Date(agendadoPara));
  return atual.data === campos.data && atual.hora === campos.hora;
}

/** Data e hora do agendamento, sempre no horário da Bahia (E44): o servidor converte para UTC. */
export function CamposDeData({ campos, erro, aoMudar }: { campos: CamposDaData; erro: string | null; aoMudar: (c: CamposDaData) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2.5">
        <div className="flex flex-col gap-2">
          <Label htmlFor="data-agendada">Data</Label>
          <div className="relative">
            <CalendarDays aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-texto-terciario" />
            <Input
              id="data-agendada"
              type="date"
              className="pl-10"
              value={campos.data}
              aria-invalid={erro ? true : undefined}
              aria-describedby={erro ? "erro-data-agendada" : "fuso-agendado"}
              onChange={(evento) => aoMudar({ ...campos, data: evento.target.value })}
            />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="hora-agendada">Hora</Label>
          <div className="relative">
            <Clock aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-texto-terciario" />
            <Input
              id="hora-agendada"
              type="time"
              className="pl-10"
              value={campos.hora}
              aria-invalid={erro ? true : undefined}
              aria-describedby={erro ? "erro-data-agendada" : "fuso-agendado"}
              onChange={(evento) => aoMudar({ ...campos, hora: evento.target.value })}
            />
          </div>
        </div>
      </div>
      {erro ? (
        <p id="erro-data-agendada" className="texto-pequeno text-status-perigo-texto">
          {erro}
        </p>
      ) : (
        <p id="fuso-agendado" className="sr-only">
          Horário de Vitória da Conquista.
        </p>
      )}
    </div>
  );
}

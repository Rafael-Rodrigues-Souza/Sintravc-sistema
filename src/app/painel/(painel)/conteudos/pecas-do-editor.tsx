"use client";

/**
 * Peças dos editores de conteúdo (notícia e documento oficial, Figma 112:1091 e 114:1972): cartão,
 * campo com contador, status do salvamento, botão travado com dica e data e hora do agendamento.
 */
import { CalendarDays, Clock, Cloud, CloudOff, LoaderCircle, Lock } from "lucide-react";
import * as React from "react";

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
      <Icone aria-hidden className={cn("size-4", estado.situacao === "salvando" && "animate-spin motion-reduce:animate-none")} />
      {textoDoStatus(estado, temId)}
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

/** Botão que ainda não funciona aqui: fica visível, travado, com a dica lida pelo leitor de tela. */
export function BotaoTravado({ rotulo, dica, icone }: { rotulo: string; dica: string; icone: React.ReactNode }) {
  const id = React.useId();
  return (
    <span className="inline-flex" title={dica}>
      {/* aria-disabled (e não disabled) para continuar focável e a dica ser lida; o clique não faz nada. */}
      <button
        type="button"
        aria-disabled="true"
        aria-describedby={id}
        onClick={(evento) => evento.preventDefault()}
        className="inline-flex h-10 cursor-not-allowed items-center gap-2 rounded-full border-[1.5px] border-dashed border-borda-forte bg-fundo-superficie-alt px-4 texto-botao text-texto-terciario outline-none focus-visible:ring-[3px] focus-visible:ring-ring [&_svg]:size-[18px]"
      >
        {icone}
        {rotulo}
        <Lock aria-hidden className="size-3.5" />
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

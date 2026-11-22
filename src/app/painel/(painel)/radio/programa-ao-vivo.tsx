"use client";

import { Clock, SquarePlay } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { SEM_CONEXAO } from "@/components/painel/sem-conexao";
import { useTelaGrande } from "@/components/painel/use-tela-grande";
import { Alerta } from "@/components/ui/alerta";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { Drawer, DrawerBody, DrawerContent, DrawerHeader } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { minutosDoDia, type ProgramaAoVivo as Programa } from "@/lib/config-site/esquema";
import { DIAS_DA_SEMANA, NOME_CURTO_DO_DIA, NOME_DO_DIA, textoDoHorario } from "@/lib/episodios/programa";
import { cn } from "@/lib/utils";

import { acaoGravarPrograma } from "./acoes";
import { Interruptor } from "./pecas";

/** "https://www.youtube.com/@sintravc" → "youtube.com/@sintravc", como no Figma. */
function canalCurto(canal: string) {
  return canal.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
}

/**
 * Programa ao vivo (P10, E61; Figma 166:17373): o interruptor grava na hora; os dois campos abrem o
 * diálogo “Programa ao vivo” com o canal, os dias, o início e o fim. O texto mostra só o início.
 */
export function ProgramaAoVivo({ programa, podeGerenciar }: { programa: Programa; podeGerenciar: boolean }) {
  const router = useRouter();
  const [ativo, setAtivo] = React.useState(programa.ativo);
  const [base, setBase] = React.useState(programa);
  // A tela recebeu dados novos do servidor: o interruptor volta a seguir o que está gravado.
  if (base !== programa) {
    setBase(programa);
    setAtivo(programa.ativo);
  }
  const [gravando, setGravando] = React.useState(false);
  const [editando, setEditando] = React.useState(false);

  const alternar = async (ligado: boolean) => {
    setAtivo(ligado);
    setGravando(true);
    const r = await acaoGravarPrograma({ ...programa, ativo: ligado }).catch(() => SEM_CONEXAO);
    setGravando(false);
    if (r.tipo === "erro") {
      setAtivo(!ligado);
      toast.error(r.mensagem, { duration: Infinity, closeButton: true });
      return;
    }
    toast.success(ligado ? "Programa ao vivo ligado: o horário aparece no site" : "Programa ao vivo desligado: o horário saiu do site");
    router.refresh();
  };

  const campo = "flex min-h-12 w-full items-center gap-3 rounded-[14px] border border-borda-forte bg-fundo-superficie px-4 py-2 text-left texto-corpo text-texto-primario outline-none hover:bg-fundo-superficie-alt focus-visible:border-destaque-azul focus-visible:ring-[4px] focus-visible:ring-destaque-azul/15 disabled:cursor-default disabled:hover:bg-fundo-superficie";

  return (
    <section aria-labelledby="programa-titulo" className="flex flex-col gap-5 rounded-[20px] border border-borda-padrao bg-fundo-superficie p-5 lg:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 id="programa-titulo" className="texto-titulo-card text-texto-primario">
            Programa ao vivo
          </h2>
          <p id="programa-descricao" className="texto-pequeno text-texto-secundario">
            Aparece na página Rádio Chofer e no topo da Home durante o horário.
          </p>
        </div>
        <Interruptor ligado={ativo} rotuloId="programa-titulo" descricaoId="programa-descricao" aoMudar={alternar} desativado={!podeGerenciar || gravando} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-2">
          <span id="programa-canal-rotulo" className="texto-rotulo text-texto-primario">
            Canal no YouTube
          </span>
          <button
            type="button"
            className={campo}
            disabled={!podeGerenciar}
            aria-labelledby="programa-canal-rotulo programa-canal-valor"
            aria-haspopup="dialog"
            onClick={() => setEditando(true)}
          >
            <SquarePlay aria-hidden className="size-[18px] shrink-0 text-texto-terciario" />
            {/* Quebra em vez de cortar: no celular estreito, o endereço inteiro continua à vista. */}
            <span id="programa-canal-valor" className="min-w-0 break-all">
              {programa.canal ? canalCurto(programa.canal) : "Sem canal"}
            </span>
          </button>
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <span id="programa-horario-rotulo" className="texto-rotulo text-texto-primario">
            Dias e horário
          </span>
          <button
            type="button"
            className={campo}
            disabled={!podeGerenciar}
            aria-labelledby="programa-horario-rotulo programa-horario-valor"
            aria-haspopup="dialog"
            onClick={() => setEditando(true)}
          >
            <Clock aria-hidden className="size-[18px] shrink-0 text-texto-terciario" />
            <span id="programa-horario-valor" className="min-w-0 truncate">
              {textoDoHorario(programa)}
            </span>
          </button>
        </div>
      </div>
      {podeGerenciar ? (
        <EditarPrograma
          aberto={editando}
          aoMudar={setEditando}
          programa={{ ...programa, ativo }}
          aoSalvar={() => {
            setEditando(false);
            router.refresh();
          }}
        />
      ) : null}
    </section>
  );
}

function EditarPrograma({
  aberto,
  aoMudar,
  programa,
  aoSalvar,
}: {
  aberto: boolean;
  aoMudar: (aberto: boolean) => void;
  programa: Programa;
  aoSalvar: () => void;
}) {
  const grande = useTelaGrande();
  const titulo = "Programa ao vivo";
  const descricao = "Canal, dias e horário do programa, no horário de Vitória da Conquista.";
  const corpo = <CorpoDoPrograma key={aberto ? "aberto" : "fechado"} programa={programa} grande={grande} aoSalvar={aoSalvar} aoCancelar={() => aoMudar(false)} />;
  if (grande) {
    return (
      <Dialog open={aberto} onOpenChange={aoMudar}>
        <DialogContent className="max-w-[520px]">
          <DialogHeader titulo={titulo} descricao={descricao} />
          {corpo}
        </DialogContent>
      </Dialog>
    );
  }
  return (
    <Drawer open={aberto} onOpenChange={aoMudar} repositionInputs={false}>
      <DrawerContent>
        <DrawerHeader titulo={titulo} descricao={descricao} />
        {corpo}
      </DrawerContent>
    </Drawer>
  );
}

type CampoDoPrograma = "canal" | "dias" | "inicio" | "fim";

function CorpoDoPrograma({
  programa,
  grande,
  aoSalvar,
  aoCancelar,
}: {
  programa: Programa;
  grande: boolean;
  aoSalvar: () => void;
  aoCancelar: () => void;
}) {
  const [canal, setCanal] = React.useState(programa.canal ?? "");
  const [dias, setDias] = React.useState<number[]>(programa.dias);
  const [inicio, setInicio] = React.useState(programa.inicio);
  const [fim, setFim] = React.useState(programa.fim);
  const [erro, setErro] = React.useState<{ mensagem: string; campo?: CampoDoPrograma } | null>(null);
  const [gravando, setGravando] = React.useState(false);
  const erroNo = (c: CampoDoPrograma) => (erro?.campo === c ? erro.mensagem : undefined);

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    // As regras simples aqui, para o erro aparecer antes de mandar; o servidor confere de novo.
    const local: { mensagem: string; campo: CampoDoPrograma } | null =
      dias.length === 0
        ? { mensagem: "Marque pelo menos um dia.", campo: "dias" }
        : !inicio
          ? { mensagem: "Escolha a hora de início.", campo: "inicio" }
          : !fim || minutosDoDia(fim) <= minutosDoDia(inicio)
            ? { mensagem: "O fim tem de ser depois do início.", campo: "fim" }
            : null;
    if (local) {
      setErro(local);
      document.getElementById(`programa-${local.campo}`)?.focus();
      return;
    }
    setGravando(true);
    setErro(null);
    const r = await acaoGravarPrograma({ ativo: programa.ativo, canal, dias, inicio, fim }).catch(() => SEM_CONEXAO);
    setGravando(false);
    if (r.tipo === "erro") {
      const campo = (["canal", "dias", "inicio", "fim"] as const).find((c) => "campo" in r && c === r.campo);
      setErro({ mensagem: r.mensagem, campo });
      if (campo) document.getElementById(`programa-${campo}`)?.focus();
      return;
    }
    toast.success("Programa ao vivo salvo");
    aoSalvar();
  };

  const campos = (
    <>
      {erro && !erro.campo ? (
        <Alerta tipo="erro" titulo="Não foi possível salvar">
          {erro.mensagem}
        </Alerta>
      ) : null}
      <div className="flex flex-col gap-2">
        <Label htmlFor="programa-canal">Canal no YouTube</Label>
        <Input
          id="programa-canal"
          value={canal}
          inputMode="url"
          autoComplete="off"
          placeholder="youtube.com/@sintravc"
          aria-invalid={erroNo("canal") ? true : undefined}
          aria-describedby="programa-canal-ajuda"
          onChange={(e) => setCanal(e.target.value)}
        />
        <p id="programa-canal-ajuda" className={cn("texto-pequeno", erroNo("canal") ? "text-status-perigo-texto" : "text-texto-secundario")}>
          {erroNo("canal") ?? "Os botões “Assistir no YouTube” e “Inscrever-se no canal” do site abrem este canal. Vazio, eles somem."}
        </p>
      </div>
      <fieldset className="flex flex-col gap-2" aria-describedby="programa-dias-ajuda">
        <legend className="mb-2 texto-rotulo text-texto-primario">Dias</legend>
        <div id="programa-dias" tabIndex={-1} className="grid grid-cols-4 gap-2 outline-none sm:grid-cols-7">
          {DIAS_DA_SEMANA.map((d) => {
            const marcado = dias.includes(d);
            return (
              <label
                key={d}
                className={cn(
                  "flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-[12px] border px-2 texto-pequeno",
                  marcado ? "border-destaque-amarelo bg-destaque-amarelo/15 text-texto-primario" : "border-borda-forte text-texto-secundario",
                )}
              >
                <Checkbox
                  checked={marcado}
                  aria-label={NOME_DO_DIA[d]}
                  onCheckedChange={(v) => setDias((atuais) => (v === true ? [...atuais, d] : atuais.filter((x) => x !== d)))}
                />
                <span aria-hidden>{NOME_CURTO_DO_DIA[d]}</span>
              </label>
            );
          })}
        </div>
        <p id="programa-dias-ajuda" className={cn("texto-pequeno", erroNo("dias") ? "text-status-perigo-texto" : "text-texto-secundario")}>
          {erroNo("dias") ?? `No site: “${textoDoHorario({ dias: dias.length ? dias : programa.dias, inicio: inicio || programa.inicio })}”.`}
        </p>
      </fieldset>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="programa-inicio">Começa às</Label>
          <Input
            id="programa-inicio"
            type="time"
            value={inicio}
            aria-invalid={erroNo("inicio") ? true : undefined}
            aria-describedby={erroNo("inicio") ? "programa-inicio-erro" : undefined}
            onChange={(e) => setInicio(e.target.value)}
          />
          {erroNo("inicio") ? (
            <p id="programa-inicio-erro" className="texto-pequeno text-status-perigo-texto">
              {erroNo("inicio")}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="programa-fim">Termina às</Label>
          <Input
            id="programa-fim"
            type="time"
            value={fim}
            aria-invalid={erroNo("fim") ? true : undefined}
            aria-describedby="programa-fim-ajuda"
            onChange={(e) => setFim(e.target.value)}
          />
        </div>
      </div>
      <p id="programa-fim-ajuda" className={cn("-mt-2 texto-pequeno", erroNo("fim") ? "text-status-perigo-texto" : "text-texto-secundario")}>
        {erroNo("fim") ?? "O site mostra só o começo. O fim serve para a Home saber quando o programa está no ar."}
      </p>
    </>
  );

  const botoes = (
    <>
      <Button type="button" variant="secundario" disabled={gravando} onClick={aoCancelar} className="flex-1 sm:flex-none">
        Cancelar
      </Button>
      <Button type="submit" disabled={gravando} className="flex-1 sm:flex-none">
        {gravando ? "Salvando…" : "Salvar"}
      </Button>
    </>
  );

  if (grande) {
    return (
      <form onSubmit={salvar} noValidate className="flex min-h-0 flex-col">
        <DialogBody>{campos}</DialogBody>
        <DialogFooter>{botoes}</DialogFooter>
      </form>
    );
  }
  return (
    <form onSubmit={salvar} noValidate className="flex min-h-0 flex-col">
      <DrawerBody className="gap-[18px] px-5 pt-2">{campos}</DrawerBody>
      <div className="flex gap-3 border-t border-borda-padrao px-5 py-3">{botoes}</div>
    </form>
  );
}

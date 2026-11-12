"use client";

import { Archive, ArchiveRestore, Eye, EyeOff, Trash2 } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import * as React from "react";
import { toast } from "sonner";

import { AlertDialog, AlertDialogContent, AlertDialogFooter } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { AcaoDoMenu } from "@/lib/conteudos/acoes-disponiveis";
import { MENSAGEM_SEM_MOTIVO, MOTIVO_OCULTAR_MAXIMO } from "@/lib/conteudos/motivo";

import {
  acaoArquivar,
  acaoDesfazerArquivamento,
  acaoExcluirRascunho,
  acaoMostrarNoSite,
  acaoOcultar,
  acaoRestaurarComoRascunho,
  type RespostaLote,
  type RespostaSimples,
} from "./acoes-ciclo-de-vida";

/**
 * Ciclo de vida na tela (RF40, US22; Figma 118:3448): as confirmações de Ocultar, Mostrar no site,
 * Arquivar, Restaurar e Excluir, e os avisos (Sonner), com o "Desfazer" do arquivamento. Serve à
 * lista (uma ou várias) e ao editor (uma). Toda ação pede confirmação (RN09).
 */

const SEM_CONEXAO = "Sem conexão com o servidor. Nada foi alterado. Tente de novo.";
/**
 * O aviso com "Desfazer" fica 10 s na tela. Os outros avisos somem em 6 s (Figma 118:3448); este fica
 * mais tempo para dar tempo de clicar (E45).
 */
const DURACAO_DO_DESFAZER = 10_000;

export type Alvo = { id: string; titulo: string; acoes: AcaoDoMenu[] };

export type PedidoDeAcao = { acao: AcaoDoMenu; alvos: Alvo[] };

/**
 * Quem executa a ação depois da confirmação. Por padrão, as actions do ciclo de vida; a Edição
 * rápida passa a sua, que grava título, categoria e situação numa transação só.
 */
export type ExecutarAcao = (
  acao: AcaoDoMenu,
  ids: string[],
  motivo: string,
) => Promise<RespostaLote | RespostaSimples | ErroJaNoFormulario>;

/** Quem executou já mostrou o erro no próprio formulário (E23): o modal só fecha, sem outro aviso. */
export type ErroJaNoFormulario = { tipo: "erro_no_formulario" };

const semConexao = (): { tipo: "erro"; mensagem: string } => ({ tipo: "erro", mensagem: SEM_CONEXAO });

const plural = (n: number, um: string, varios: string) => (n === 1 ? um : varios.replace("N", String(n)));

/**
 * Confirmação da ação pedida. Em lote, só os itens que aceitam a ação entram; o modal diz quantos
 * ficam de fora. Depois de concluir, chama `aoConcluir` com o que mudou (a lista limpa a seleção;
 * o editor atualiza o estado).
 */
export function ConfirmarAcao({
  pedido,
  aoFechar,
  aoConcluir,
  executar,
}: {
  pedido: PedidoDeAcao | null;
  aoFechar: () => void;
  aoConcluir: (acao: AcaoDoMenu, feitos: string[], extra?: { motivo?: string }) => void;
  executar?: ExecutarAcao;
}) {
  // Cada pedido monta o modal do zero: o motivo e o erro não passam de um pedido para outro.
  return pedido ? <ModalDaAcao pedido={pedido} aoFechar={aoFechar} aoConcluir={aoConcluir} executar={executar ?? rodar} /> : null;
}

function ModalDaAcao({
  pedido,
  aoFechar,
  aoConcluir,
  executar,
}: {
  pedido: PedidoDeAcao;
  aoFechar: () => void;
  aoConcluir: (acao: AcaoDoMenu, feitos: string[], extra?: { motivo?: string }) => void;
  executar: ExecutarAcao;
}) {
  const [enviando, setEnviando] = React.useState(false);
  const [motivo, setMotivo] = React.useState("");
  const [erroMotivo, setErroMotivo] = React.useState<string | null>(null);
  const campoMotivo = React.useRef<HTMLTextAreaElement>(null);

  const elegiveis = pedido.alvos.filter((a) => a.acoes.includes(pedido.acao));
  const foraDoLote = pedido.alvos.length - elegiveis.length;
  const ids = elegiveis.map((a) => a.id);
  const um = elegiveis.length === 1 ? (elegiveis[0] ?? null) : null;
  const nomeDe = (a: { titulo: string } | null) => (a ? `“${a.titulo}”` : "");
  const avisoForaDoLote =
    foraDoLote > 0 ? ` ${plural(foraDoLote, "1 item selecionado não pode receber esta ação e fica como está.", "N itens selecionados não podem receber esta ação e ficam como estão.")}` : "";

  const fechar = () => {
    if (!enviando) aoFechar();
  };

  const confirmar = async () => {
    if (elegiveis.length === 0) return;
    const motivoLimpo = motivo.trim();
    if (pedido.acao === "ocultar" && !motivoLimpo) {
      setErroMotivo(MENSAGEM_SEM_MOTIVO);
      campoMotivo.current?.focus();
      return;
    }
    setEnviando(true);
    const resposta = await executar(pedido.acao, ids, motivoLimpo);
    setEnviando(false);
    if (resposta.tipo === "erro_no_formulario") {
      aoFechar();
      aoConcluir(pedido.acao, []);
      return;
    }
    if (resposta.tipo === "erro") {
      if ("campo" in resposta && resposta.campo === "motivo") {
        setErroMotivo(resposta.mensagem);
        campoMotivo.current?.focus();
        return;
      }
      toast.error(resposta.mensagem, { duration: Infinity, closeButton: true });
      aoFechar();
      aoConcluir(pedido.acao, []);
      return;
    }
    const feitos = "feitos" in resposta ? resposta.feitos : ids;
    avisar(pedido.acao, feitos, "ignorados" in resposta ? resposta.ignorados.length : 0, () => aoConcluir(pedido.acao, []));
    aoFechar();
    aoConcluir(pedido.acao, feitos, { motivo: motivoLimpo });
  };

  const textos = TEXTOS[pedido.acao];
  const quantos = elegiveis.length;
  return (
    <AlertDialog open onOpenChange={(aberto) => (aberto ? null : fechar())}>
      <AlertDialogContent
        icone={textos.icone}
        tom={textos.tom}
        titulo={textos.titulo(quantos)}
        descricao={
          <>
            {textos.descricao(nomeDe(um), quantos)}
            {avisoForaDoLote}
          </>
        }
        onOpenAutoFocus={(e) => {
          if (pedido.acao === "ocultar") {
            e.preventDefault();
            campoMotivo.current?.focus();
          }
        }}
      >
        {pedido.acao === "ocultar" ? (
          <div className="flex flex-col gap-2 px-6 pb-5">
            <label htmlFor="motivo-ocultar" className="texto-rotulo text-texto-primario">
              Motivo <span className="text-destaque-vermelho">*</span>
            </label>
            <Textarea
              id="motivo-ocultar"
              ref={campoMotivo}
              value={motivo}
              maxLength={MOTIVO_OCULTAR_MAXIMO}
              aria-invalid={erroMotivo ? true : undefined}
              aria-describedby="motivo-ocultar-ajuda"
              placeholder="Ex.: a data da assembleia mudou"
              onChange={(e) => {
                setMotivo(e.target.value);
                if (erroMotivo) setErroMotivo(null);
              }}
            />
            <p id="motivo-ocultar-ajuda" className={erroMotivo ? "texto-pequeno text-destaque-vermelho" : "texto-pequeno text-texto-terciario"}>
              {erroMotivo ?? `Fica registrado em Atividade. ${motivo.length}/${MOTIVO_OCULTAR_MAXIMO}`}
            </p>
          </div>
        ) : null}
        <AlertDialogFooter>
          <Button type="button" variant="secundario" disabled={enviando} onClick={fechar}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant={textos.tom === "perigo" ? "perigo" : undefined}
            disabled={enviando || quantos === 0 || (pedido.acao === "ocultar" && !motivo.trim())}
            onClick={confirmar}
          >
            {enviando ? textos.enviando : textos.botao}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

const TEXTOS: Record<
  AcaoDoMenu,
  {
    icone: string;
    tom: "perigo" | "aviso" | "neutro";
    titulo: (n: number) => string;
    descricao: (nome: string, n: number) => string;
    botao: string;
    enviando: string;
  }
> = {
  ocultar: {
    icone: "/painel/icone-ocultar.svg",
    tom: "aviso",
    titulo: (n) => (n > 1 ? `Ocultar ${n} conteúdos do site?` : "Ocultar do site?"),
    descricao: (nome, n) =>
      n > 1
        ? "Eles deixam de aparecer no site, mas continuam guardados aqui. Você pode mostrá-los de novo depois."
        : `${nome} deixa de aparecer no site, mas continua guardado aqui. Você pode mostrá-lo de novo depois.`,
    botao: "Ocultar do site",
    enviando: "Ocultando…",
  },
  mostrar: {
    icone: "/painel/icone-mostrar.svg",
    tom: "neutro",
    titulo: () => "Mostrar no site de novo?",
    descricao: (nome) =>
      `${nome} volta ao site como estava quando foi ocultado. Alterações feitas depois continuam no editor, esperando “Publicar alterações”.`,
    botao: "Mostrar no site",
    enviando: "Mostrando…",
  },
  arquivar: {
    icone: "/painel/icone-arquivar.svg",
    tom: "neutro",
    titulo: (n) => (n > 1 ? `Arquivar ${n} conteúdos?` : "Arquivar conteúdo?"),
    descricao: (nome, n) =>
      n > 1
        ? "Eles saem do site e das listas principais. Histórico e anexos são mantidos e você pode restaurá-los em Conteúdos › Arquivados."
        : `${nome} sai do site e das listas principais. Histórico e anexos são mantidos e você pode restaurá-lo em Conteúdos › Arquivados.`,
    botao: "Arquivar",
    enviando: "Arquivando…",
  },
  restaurar: {
    icone: "/painel/icone-restaurar.svg",
    tom: "neutro",
    titulo: () => "Restaurar como rascunho?",
    descricao: (nome) => `${nome} volta para a lista como rascunho, fora do site. Você revisa e publica quando quiser.`,
    botao: "Restaurar como rascunho",
    enviando: "Restaurando…",
  },
  excluir: {
    icone: "/painel/icone-lixeira.svg",
    tom: "perigo",
    titulo: () => "Excluir rascunho?",
    descricao: (nome) => `${nome} nunca foi publicado e será apagado de vez. Esta ação não pode ser desfeita.`,
    botao: "Excluir rascunho",
    enviando: "Excluindo…",
  },
};

async function rodar(acao: AcaoDoMenu, ids: string[], motivo: string): Promise<RespostaLote | RespostaSimples> {
  const id = ids[0]!;
  const chamada = {
    ocultar: () => acaoOcultar({ ids, motivo }),
    arquivar: () => acaoArquivar({ ids }),
    mostrar: () => acaoMostrarNoSite({ id }),
    restaurar: () => acaoRestaurarComoRascunho({ id }),
    excluir: () => acaoExcluirRascunho({ id }),
  }[acao];
  return chamada().catch(semConexao);
}

/** Aviso depois da ação (Sonner, 118:3448). O arquivamento ganha "Desfazer". */
function avisar(acao: AcaoDoMenu, feitos: string[], ignorados: number, aoDesfazer: () => void) {
  const n = feitos.length;
  const extra = ignorados > 0 ? ` ${plural(ignorados, "1 ficou de fora.", "N ficaram de fora.")}` : "";
  if (n === 0) {
    toast.error(`Nada mudou: ${plural(ignorados, "o item já tinha mudado", "os itens já tinham mudado")}. Atualize a página.`);
    return;
  }
  if (acao === "arquivar") {
    toast.success("Conteúdo arquivado", {
      description: `${plural(n, "1 item foi para Arquivados.", "N itens foram para Arquivados.")}${extra}`,
      duration: DURACAO_DO_DESFAZER,
      action: {
        label: "Desfazer",
        onClick: async () => {
          const r = await acaoDesfazerArquivamento({ ids: feitos }).catch(semConexao);
          if (r.tipo === "erro") toast.error(r.mensagem, { duration: Infinity, closeButton: true });
          else toast.success(plural(r.feitos.length, "Arquivamento desfeito.", "Arquivamento desfeito: N itens voltaram."));
          aoDesfazer();
        },
      },
    });
    return;
  }
  const mensagem = {
    ocultar: plural(n, "Conteúdo oculto do site.", "N conteúdos ocultos do site."),
    mostrar: "Conteúdo de volta ao site.",
    restaurar: "Restaurado como rascunho.",
    excluir: "Rascunho excluído.",
  }[acao];
  toast.success(`${mensagem}${extra}`);
}

const ITENS_DO_MENU: Record<AcaoDoMenu, { rotulo: string; icone: typeof Eye; perigo?: boolean }> = {
  ocultar: { rotulo: "Ocultar do site", icone: EyeOff },
  mostrar: { rotulo: "Mostrar no site", icone: Eye },
  arquivar: { rotulo: "Arquivar", icone: Archive },
  restaurar: { rotulo: "Restaurar como rascunho", icone: ArchiveRestore },
  excluir: { rotulo: "Excluir rascunho", icone: Trash2, perigo: true },
};

export type ItemExtraDoMenu = { rotulo: string; icone: typeof Eye; aoSelecionar: () => void };

/**
 * Menu ⋯ (Figma 110:845): só o que o estado e o perfil permitem (acoesDisponiveis). O editor
 * acrescenta itens próprios antes, como "Histórico". "Excluir" fica por último, separado e em vermelho.
 */
export function MenuDeAcoes({
  acoes,
  aoPedir,
  extras = [],
  children,
}: {
  acoes: AcaoDoMenu[];
  aoPedir: (acao: AcaoDoMenu) => void;
  extras?: ItemExtraDoMenu[];
  children: React.ReactNode;
}) {
  const classeDoItem =
    "flex cursor-pointer items-center gap-2.5 rounded-[10px] px-3 py-2.5 texto-pequeno outline-none data-[highlighted]:bg-fundo-superficie-alt";
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>{children}</DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="z-50 flex min-w-[220px] flex-col gap-0.5 rounded-[14px] border border-borda-padrao bg-fundo-superficie p-1.5 shadow-[0_12px_32px_rgb(11_20_36/0.16)]"
        >
          {extras.map((extra) => (
            <DropdownMenu.Item key={extra.rotulo} onSelect={extra.aoSelecionar} className={cn(classeDoItem, "text-texto-primario")}>
              <extra.icone aria-hidden className="size-4" />
              {extra.rotulo}
            </DropdownMenu.Item>
          ))}
          {extras.length > 0 && acoes.length > 0 ? <DropdownMenu.Separator className="mx-2 my-1 h-px bg-borda-padrao" /> : null}
          {acoes.map((acao) => {
            const item = ITENS_DO_MENU[acao];
            return (
              <React.Fragment key={acao}>
                {item.perigo && acoes.length > 1 ? <DropdownMenu.Separator className="mx-2 my-1 h-px bg-borda-padrao" /> : null}
                <DropdownMenu.Item
                  onSelect={() => aoPedir(acao)}
                  className={cn(classeDoItem, item.perigo ? "text-destaque-vermelho" : "text-texto-primario")}
                >
                  <item.icone aria-hidden className="size-4" />
                  {item.rotulo}
                </DropdownMenu.Item>
              </React.Fragment>
            );
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

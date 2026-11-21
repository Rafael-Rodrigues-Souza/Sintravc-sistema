"use client";

import { Dialog as DialogPrimitive } from "radix-ui";
import { CalendarDays, CircleCheck, Eye, LayoutGrid, Pin, TriangleAlert, Upload } from "lucide-react";
import * as React from "react";

import { IconeFigma } from "@/components/icone-figma";
import { AlertDialog, AlertDialogContent, AlertDialogFooter } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { rotuloDaNoticia, type DadosNoticia } from "@/lib/conteudos/dados";
import type { VersaoServidor } from "@/lib/conteudos/fila-rascunho";
import { horaNaBahia } from "@/lib/datas";
import { cn } from "@/lib/utils";

/** "Sair sem salvar?" (CA-US21.4; Figma 118:3448). */
export function ModalSair({
  aberto,
  titulo,
  salvando,
  aoDescartar,
  aoVoltar,
  aoSalvarESair,
}: {
  aberto: boolean;
  titulo: string;
  salvando: boolean;
  aoDescartar: () => void;
  aoVoltar: () => void;
  aoSalvarESair: () => void;
}) {
  return (
    <AlertDialog open={aberto} onOpenChange={(a) => (a ? null : aoVoltar())}>
      <AlertDialogContent
        icone="/painel/icone-lapis.svg"
        titulo="Sair sem salvar?"
        descricao={
          <>
            Há alterações em “{rotuloDaNoticia(titulo)}” que ainda não foram salvas.
          </>
        }
      >
        <AlertDialogFooter className="sm:justify-between">
          <button
            type="button"
            onClick={aoDescartar}
            className="self-center whitespace-nowrap rounded-full px-3 py-2 texto-botao text-status-perigo-texto outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring"
          >
            Descartar alterações
          </button>
          <div className="flex flex-col-reverse gap-2.5 sm:flex-row">
            <Button type="button" variant="secundario" onClick={aoVoltar}>
              Voltar
            </Button>
            <Button type="button" onClick={aoSalvarESair} disabled={salvando}>
              {salvando ? "Salvando…" : "Salvar e sair"}
            </Button>
          </div>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** O que mudou entre as duas versões, para a pessoa reconhecer cada uma (Figma 293:43298). */
const CAMPOS: { campo: keyof DadosNoticia; nome: string }[] = [
  { campo: "titulo", nome: "manchete" },
  { campo: "linhaFina", nome: "linha fina" },
  { campo: "lide", nome: "lide" },
  { campo: "corpo", nome: "corpo da notícia" },
  { campo: "capaMidiaId", nome: "imagem de capa" },
  { campo: "capaAlt", nome: "texto alternativo da capa" },
  { campo: "capaLegenda", nome: "legenda da capa" },
  { campo: "assinatura", nome: "assinatura" },
  { campo: "local", nome: "local" },
  { campo: "categoriaId", nome: "categoria" },
  { campo: "palavrasChave", nome: "palavras-chave" },
  { campo: "links", nome: "fontes e anexos" },
];

export function camposDiferentes(a: DadosNoticia, b: DadosNoticia): string {
  const nomes = CAMPOS.filter(({ campo }) => JSON.stringify(a[campo]) !== JSON.stringify(b[campo])).map((c) => c.nome);
  if (nomes.length === 0) return "nada";
  return nomes.length === 1 ? nomes[0]! : `${nomes.slice(0, -1).join(", ")} e ${nomes.at(-1)}`;
}

/** "Há duas versões do rascunho" (N4, E02; Figma 293:43298). */
export function ModalConflito<D = DadosNoticia>({
  aberto,
  minha,
  servidor,
  base,
  guardadaEm,
  resolvendo,
  erro,
  aoEscolher,
  aoDecidirDepois,
  diferencas = camposDiferentes as unknown as (a: D, b: D) => string,
}: {
  aberto: boolean;
  minha: D;
  servidor: VersaoServidor<D>;
  /** O que a pessoa tinha antes de editar sem internet, para dizer o que cada lado mudou. */
  base: D;
  /** O que mudou entre duas versões (a notícia usa camposDiferentes; o documento, as partes dele). */
  diferencas?: (a: D, b: D) => string;
  guardadaEm: Date | null;
  resolvendo: boolean;
  erro: string | null;
  aoEscolher: (escolha: "minha" | "servidor") => void;
  aoDecidirDepois: () => void;
}) {
  const [escolha, setEscolha] = React.useState<"minha" | "servidor">("minha");
  return (
    <Dialog open={aberto} onOpenChange={(a) => (a ? null : aoDecidirDepois())}>
      <DialogContent className="max-w-[480px] rounded-[24px]">
        <div className="flex flex-col gap-4 px-6 pt-6 pb-5">
          <div className="flex items-start gap-3.5">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-destaque-azul-suave text-destaque-azul">
              <IconeFigma src="/painel/icone-nuvem.svg" tamanho={22} />
            </span>
            <div className="flex flex-col gap-1">
              <DialogPrimitive.Title className="texto-titulo-card text-texto-primario">Há duas versões do rascunho</DialogPrimitive.Title>
              <DialogPrimitive.Description className="texto-pequeno text-texto-secundario">
                Você editou sem internet ou em outra aba. Enquanto isso, outra versão foi salva no servidor. Escolha qual manter.
              </DialogPrimitive.Description>
            </div>
          </div>
          <RadioGroup value={escolha} onValueChange={(v) => setEscolha(v as "minha" | "servidor")} aria-label="Versão a manter">
            <Opcao
              valor="minha"
              marcada={escolha === "minha"}
              titulo="Manter a minha versão"
              detalhe={`Salva neste aparelho${guardadaEm ? ` às ${horaNaBahia(guardadaEm)}` : ""}. Mudou: ${diferencas(base, minha)}.`}
            />
            <Opcao
              valor="servidor"
              marcada={escolha === "servidor"}
              titulo="Usar a versão do servidor"
              detalhe={`Salva por ${servidor.salvoPorNome} às ${horaNaBahia(new Date(servidor.salvoEm))}. Mudou: ${diferencas(base, servidor.dados)}.`}
            />
          </RadioGroup>
          <p className="texto-pequeno text-texto-secundario">
            A versão que você não escolher é descartada. A escolha fica registrada em Atividade.
          </p>
          {erro ? (
            <p role="alert" className="texto-pequeno text-status-perigo-texto">
              {erro}
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="secundario" onClick={aoDecidirDepois}>
            Decidir depois
          </Button>
          <Button type="button" disabled={resolvendo} onClick={() => aoEscolher(escolha)}>
            {resolvendo ? "Salvando…" : "Manter a versão escolhida"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Opcao({ valor, marcada, titulo, detalhe }: { valor: string; marcada: boolean; titulo: string; detalhe: string }) {
  const id = `versao-${valor}`;
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-[14px] border p-4",
        marcada ? "border-2 border-destaque-azul bg-destaque-azul-suave" : "border-borda-padrao",
      )}
    >
      <RadioGroupItem id={id} value={valor} className="mt-0.5" />
      <span className="flex flex-col gap-0.5">
        <span className="texto-titulo-card-pequeno text-texto-primario">{titulo}</span>
        <span className="texto-pequeno text-texto-secundario">{detalhe}</span>
      </span>
    </label>
  );
}

/** "Publicar notícia?" e "Agendar publicação?" (Figma 113:1314; sem rótulo de fuso, E18). */
export function ModalPublicar({
  aberto,
  alteracoes,
  agendarPara,
  titulo,
  detalhe,
  capaUrl,
  publicando,
  fixacao = null,
  aoFechar,
  aoConfirmar,
}: {
  aberto: boolean;
  /**
   * Intenção de fixar no topo de Notícias (E59): até quando, se a data já terá passado quando for
   * ao ar (publica sem fixar) e qual notícia deixa de ser fixada.
   */
  fixacao?: { ate: string; vencida: boolean; substitui: string | null } | null;
  /** Notícia já no ar: publica as alterações (E42). */
  alteracoes: boolean;
  /** "03/11/2026 às 08h00": agenda em vez de publicar agora (CA-US21.2). */
  agendarPara: string | null;
  titulo: string;
  /** "Notícia · Jurídico · Redação SINTRAVC" */
  detalhe: string;
  capaUrl: string | null;
  publicando: boolean;
  aoFechar: () => void;
  aoConfirmar: () => void;
}) {
  return (
    <Dialog open={aberto} onOpenChange={(a) => (a || publicando ? null : aoFechar())}>
      <DialogContent className="max-w-[560px] rounded-[24px]">
        <div className="flex flex-col gap-5 px-6 pt-6 pb-5">
          <div className="flex items-start gap-3.5">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-destaque-azul-suave text-destaque-azul">
              {agendarPara ? <CalendarDays aria-hidden className="size-[22px]" /> : <Upload aria-hidden className="size-[22px]" />}
            </span>
            <div className="flex flex-col gap-1">
              <DialogPrimitive.Title className="texto-titulo-card text-texto-primario">
                {alteracoes ? "Publicar alterações?" : agendarPara ? "Agendar publicação?" : "Publicar notícia?"}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="texto-pequeno text-texto-secundario">
                {agendarPara ? "Confira o resumo. Você poderá editar, reagendar ou ocultar depois." : "Confira o resumo. Você poderá editar ou ocultar depois."}
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close
              aria-label="Fechar"
              disabled={publicando}
              className="ml-auto flex size-9 shrink-0 items-center justify-center rounded-[10px] border border-borda-padrao text-texto-primario outline-none hover:bg-fundo-superficie-alt focus-visible:ring-[3px] focus-visible:ring-ring"
            >
              <IconeFigma src="/painel/icone-fechar.svg" tamanho={18} />
            </DialogPrimitive.Close>
          </div>

          <div className="flex items-center gap-3 rounded-[14px] bg-fundo-superficie-alt p-3">
            {capaUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={capaUrl} alt="" className="h-14 w-20 shrink-0 rounded-[10px] object-cover" />
            ) : null}
            <div className="flex min-w-0 flex-col gap-0.5">
              <p className="texto-titulo-card-pequeno text-texto-primario">{rotuloDaNoticia(titulo)}</p>
              <p className="texto-pequeno text-texto-secundario">{detalhe}</p>
            </div>
          </div>

          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 texto-pequeno">
            <dt className="flex items-center gap-2 text-texto-secundario">
              <CalendarDays aria-hidden className="size-4" />
              Entra no ar
            </dt>
            <dd className="font-semibold text-texto-primario">
              {alteracoes ? "As alterações, ao confirmar" : agendarPara ? agendarPara : "Agora, ao confirmar"}
            </dd>
            <dt className="flex items-center gap-2 text-texto-secundario">
              <LayoutGrid aria-hidden className="size-4" />
              Onde aparece
            </dt>
            <dd className="font-semibold text-texto-primario">Página de Notícias, busca do site e lista da Home</dd>
            <dt className="flex items-center gap-2 text-texto-secundario">
              <Eye aria-hidden className="size-4" />
              Visibilidade
            </dt>
            <dd className="font-semibold text-texto-primario">Pública para todos os visitantes</dd>
            {fixacao && !fixacao.vencida ? (
              <>
                <dt className="flex items-center gap-2 text-texto-secundario">
                  <Pin aria-hidden className="size-4" />
                  Destaque
                </dt>
                <dd className="flex flex-col gap-0.5">
                  <span className="font-semibold text-texto-primario">No topo de Notícias até {fixacao.ate}</span>
                  {fixacao.substitui ? <span className="text-texto-secundario">“{fixacao.substitui}” deixa de ser fixada.</span> : null}
                </dd>
              </>
            ) : null}
          </dl>

          {fixacao?.vencida ? (
            <p className="flex items-start gap-2 rounded-[12px] bg-status-aviso-fundo px-3 py-2.5 texto-pequeno text-status-aviso-texto">
              <TriangleAlert aria-hidden className="mt-0.5 size-[18px] shrink-0" />
              {agendarPara
                ? `A fixação vai até ${fixacao.ate} e termina antes da hora agendada: a notícia vai ao ar sem ficar fixada.`
                : `A data de fixação (${fixacao.ate}) já passou: a notícia será publicada sem ficar fixada.`}
            </p>
          ) : null}

          <p className="flex items-center gap-2 rounded-[12px] bg-status-sucesso-fundo px-3 py-2.5 texto-pequeno text-status-sucesso-texto">
            <CircleCheck aria-hidden className="size-[18px] shrink-0" />
            Tudo certo: campos obrigatórios e imagens conferidos.
          </p>
          <p className="texto-pequeno text-texto-secundario">A ação fica registrada em Atividade com seu nome, data e hora.</p>
        </div>
        <DialogFooter>
          <Button type="button" variant="secundario" disabled={publicando} onClick={aoFechar}>
            Voltar ao editor
          </Button>
          <Button type="button" disabled={publicando} onClick={aoConfirmar}>
            {agendarPara ? <CalendarDays aria-hidden /> : null}
            {publicando
              ? agendarPara
                ? "Agendando…"
                : "Publicando…"
              : alteracoes
                ? "Publicar alterações"
                : agendarPara
                  ? "Confirmar agendamento"
                  : "Publicar agora"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** "Descartar alterações?" (E42): a cópia de trabalho volta a ser igual ao que está no site. */
export function ModalDescartarAlteracoes({
  aberto,
  descartando,
  aoVoltar,
  aoConfirmar,
}: {
  aberto: boolean;
  descartando: boolean;
  aoVoltar: () => void;
  aoConfirmar: () => void;
}) {
  return (
    <AlertDialog open={aberto} onOpenChange={(a) => (a || descartando ? null : aoVoltar())}>
      <AlertDialogContent
        icone="/painel/icone-alerta.svg"
        tom="aviso"
        titulo="Descartar alterações?"
        descricao="O texto do editor volta a ser igual ao que está no site. As alterações feitas desde a última publicação são perdidas."
      >
        <AlertDialogFooter>
          <Button type="button" variant="secundario" disabled={descartando} onClick={aoVoltar}>
            Voltar
          </Button>
          <Button type="button" variant="perigo" disabled={descartando} onClick={aoConfirmar}>
            {descartando ? "Descartando…" : "Descartar alterações"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** "Cancelar agendamento?" (E23: AlertDialog nas confirmações; E44: volta a Rascunho). */
export function ModalCancelarAgendamento({
  aberto,
  cancelando,
  aoVoltar,
  aoConfirmar,
}: {
  aberto: boolean;
  cancelando: boolean;
  aoVoltar: () => void;
  aoConfirmar: () => void;
}) {
  return (
    <AlertDialog open={aberto} onOpenChange={(a) => (a || cancelando ? null : aoVoltar())}>
      <AlertDialogContent
        icone="/painel/icone-alerta.svg"
        tom="aviso"
        titulo="Cancelar agendamento?"
        descricao="A notícia não entra mais no ar sozinha e volta a ser rascunho. O texto continua salvo."
      >
        <AlertDialogFooter>
          <Button type="button" variant="secundario" disabled={cancelando} onClick={aoVoltar}>
            Voltar
          </Button>
          <Button type="button" variant="perigo" disabled={cancelando} onClick={aoConfirmar}>
            {cancelando ? "Cancelando…" : "Cancelar agendamento"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

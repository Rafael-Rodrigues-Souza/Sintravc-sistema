"use client";

import { Dialog as DialogPrimitive } from "radix-ui";
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
export function ModalConflito({
  aberto,
  minha,
  servidor,
  base,
  guardadaEm,
  resolvendo,
  erro,
  aoEscolher,
  aoDecidirDepois,
}: {
  aberto: boolean;
  minha: DadosNoticia;
  servidor: VersaoServidor;
  /** O que a pessoa tinha antes de editar sem internet, para dizer o que cada lado mudou. */
  base: DadosNoticia;
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
              detalhe={`Salva neste aparelho${guardadaEm ? ` às ${horaNaBahia(guardadaEm)}` : ""}. Mudou: ${camposDiferentes(base, minha)}.`}
            />
            <Opcao
              valor="servidor"
              marcada={escolha === "servidor"}
              titulo="Usar a versão do servidor"
              detalhe={`Salva por ${servidor.salvoPorNome} às ${horaNaBahia(new Date(servidor.salvoEm))}. Mudou: ${camposDiferentes(base, servidor.dados)}.`}
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

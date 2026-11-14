"use client";

import { FileText, FolderClosed, Lock, Megaphone, Scale, SquarePlay } from "lucide-react";
import Link from "next/link";
import { DropdownMenu } from "radix-ui";

import { Drawer, DrawerBody, DrawerContent, DrawerHeader } from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

type Item = { rotulo: string; descricao: string; icone: typeof FileText; href: string };

const ITENS: Item[] = [
  { rotulo: "Notícia", descricao: "Texto, fotos e vídeos. Pode citar editais e acordos.", icone: FileText, href: "/painel/conteudos/noticia/nova" },
  { rotulo: "Comunicado", descricao: "Faixa de aviso no topo do site", icone: Megaphone, href: "/painel/comunicados" },
  { rotulo: "Episódio da Rádio Chofer", descricao: "Vídeo do YouTube", icone: SquarePlay, href: "/painel/radio" },
];

const DOCUMENTOS: Item[] = [
  { rotulo: "Edital", descricao: "Documento oficial em PDF", icone: FolderClosed, href: "/painel/conteudos/documento/nova?tipo=edital" },
  { rotulo: "Acordo ou convenção", descricao: "Documento oficial em PDF", icone: Scale, href: "/painel/conteudos/documento/nova?tipo=acordo" },
];

/**
 * Menu "Criar conteúdo" (Figma 214:33805). Para a Comunicação, Edital e Acordo aparecem travados,
 * com a orientação de escrever uma notícia com o link (RN07, RN08); o servidor também recusa.
 * Para o ADM, abrem o editor de documento oficial (#12).
 */
export function MenuCriar({
  podeCriarDocumento,
  children,
  alinhar = "end",
}: {
  podeCriarDocumento: boolean;
  children: React.ReactNode;
  alinhar?: "start" | "end";
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>{children}</DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align={alinhar}
          sideOffset={8}
          className="z-50 flex w-[min(328px,calc(100vw-2rem))] flex-col gap-1 rounded-[18px] border border-borda-padrao bg-fundo-superficie p-2 shadow-[0_12px_32px_rgb(11_20_36/0.16)]"
        >
          {ITENS.map((item) => (
            <DropdownMenu.Item key={item.rotulo} asChild>
              <Link
                href={item.href}
                className="flex items-start gap-3 rounded-[12px] p-3 outline-none data-[highlighted]:bg-fundo-superficie-alt"
              >
                <Icone icone={item.icone} />
                <Textos rotulo={item.rotulo} descricao={item.descricao} />
              </Link>
            </DropdownMenu.Item>
          ))}
          <DropdownMenu.Separator className="mx-2 my-1 h-px bg-borda-padrao" />
          {podeCriarDocumento ? null : (
            <DropdownMenu.Label className="px-3 pt-1 pb-0.5 texto-etiqueta text-texto-terciario">
              Só Administrador geral
            </DropdownMenu.Label>
          )}
          {DOCUMENTOS.map((item) =>
            podeCriarDocumento ? (
              <DropdownMenu.Item key={item.rotulo} asChild>
                <Link href={item.href} className="flex items-start gap-3 rounded-[12px] p-3 outline-none data-[highlighted]:bg-fundo-superficie-alt">
                  <Icone icone={item.icone} />
                  <Textos rotulo={item.rotulo} descricao={item.descricao} />
                </Link>
              </DropdownMenu.Item>
            ) : (
              <DropdownMenu.Item key={item.rotulo} disabled className="flex items-start gap-3 rounded-[12px] p-3 opacity-60 outline-none">
                <Icone icone={item.icone} apagado />
                <Textos rotulo={item.rotulo} descricao={item.descricao} />
                <Lock aria-label="Só Administrador geral" className="mt-1 size-4 shrink-0 text-texto-terciario" />
              </DropdownMenu.Item>
            ),
          )}
          {podeCriarDocumento ? null : <Orientacao />}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

/**
 * O mesmo menu Criar no celular (E49): folha inferior aberta pelo “+” da barra de baixo, com os
 * mesmos itens e travas do menu suspenso.
 */
export function FolhaCriar({
  podeCriarDocumento,
  aberta,
  aoMudar,
}: {
  podeCriarDocumento: boolean;
  aberta: boolean;
  aoMudar: (aberta: boolean) => void;
}) {
  const linha = "flex items-start gap-3 rounded-[12px] p-3 outline-none focus-visible:ring-2 focus-visible:ring-ring";
  return (
    <Drawer open={aberta} onOpenChange={aoMudar}>
      <DrawerContent aria-describedby={undefined}>
        <DrawerHeader titulo="Criar conteúdo" />
        <DrawerBody>
          <ul className="flex flex-col gap-1">
            {ITENS.map((item) => (
              <li key={item.rotulo}>
                <Link href={item.href} onClick={() => aoMudar(false)} className={cn(linha, "active:bg-fundo-superficie-alt")}>
                  <Icone icone={item.icone} />
                  <Textos rotulo={item.rotulo} descricao={item.descricao} />
                </Link>
              </li>
            ))}
          </ul>
          <div className="mx-2 my-1 h-px bg-borda-padrao" />
          {podeCriarDocumento ? null : <p className="px-3 pt-1 pb-0.5 texto-etiqueta text-texto-terciario">Só Administrador geral</p>}
          <ul className="flex flex-col gap-1">
            {DOCUMENTOS.map((item) => (
              <li key={item.rotulo}>
                {podeCriarDocumento ? (
                  <Link href={item.href} onClick={() => aoMudar(false)} className={cn(linha, "active:bg-fundo-superficie-alt")}>
                    <Icone icone={item.icone} />
                    <Textos rotulo={item.rotulo} descricao={item.descricao} />
                  </Link>
                ) : (
                  <div aria-disabled="true" className={cn(linha, "opacity-60")}>
                    <Icone icone={item.icone} apagado />
                    <Textos rotulo={item.rotulo} descricao={item.descricao} />
                    <Lock aria-label="Só Administrador geral" className="mt-1 size-4 shrink-0 text-texto-terciario" />
                  </div>
                )}
              </li>
            ))}
          </ul>
          {podeCriarDocumento ? null : <Orientacao />}
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}

function Orientacao() {
  return (
    <p className="m-1 rounded-[10px] bg-fundo-superficie-alt px-3 py-2.5 texto-pequeno text-texto-secundario">
      Para falar de um acordo ou edital, escreva uma notícia e coloque o link do documento oficial.
    </p>
  );
}

function Icone({ icone: Desenho, apagado }: { icone: typeof FileText; apagado?: boolean }) {
  return (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-[10px]",
        apagado ? "bg-fundo-superficie-alt text-texto-terciario" : "bg-destaque-azul-suave text-destaque-azul",
      )}
    >
      <Desenho aria-hidden className="size-[18px]" />
    </span>
  );
}

function Textos({ rotulo, descricao }: { rotulo: string; descricao: string }) {
  return (
    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
      <span className="texto-titulo-card-pequeno text-texto-primario">{rotulo}</span>
      <span className="texto-pequeno text-texto-secundario">{descricao}</span>
    </span>
  );
}

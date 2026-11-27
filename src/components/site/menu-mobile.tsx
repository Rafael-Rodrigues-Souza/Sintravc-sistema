"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dialog } from "radix-ui";
import { useState } from "react";

import { IconeFigma } from "@/components/icone-figma";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/marca/logo";

import { AlternarTemaRedondo } from "./alternar-tema-redondo";
import { ehGrupo, estaAtivo, MENU_PRINCIPAL, type GrupoDeMenu, type ItemDeMenu } from "./navegacao";
import { useSite } from "./provedor-site";
import { TextoDoSite } from "./texto-do-site";

const botaoRedondo =
  "flex size-11 shrink-0 items-center justify-center rounded-full border border-borda-padrao bg-fundo-superficie text-texto-primario outline-none hover:bg-fundo-superficie-alt focus-visible:ring-[3px] focus-visible:ring-ring";

const linha = "flex min-h-14 w-full items-center gap-3 border-b border-borda-padrao text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:ring-inset";

function ItemDoMenu({ item, caminho, aoNavegar }: { item: ItemDeMenu; caminho: string; aoNavegar: () => void }) {
  const ativo = estaAtivo(item, caminho);
  return (
    <li>
      <Link href={item.href} aria-current={ativo ? "page" : undefined} onClick={aoNavegar} className={cn(linha, "text-[18px] font-bold text-texto-primario")}>
        <span aria-hidden className={cn("h-6 w-1 rounded-full", ativo ? "bg-destaque-amarelo" : "hidden")} />
        {item.rotulo}
      </Link>
    </li>
  );
}

function GrupoDoMenu({ grupo, caminho, aoNavegar }: { grupo: GrupoDeMenu; caminho: string; aoNavegar: () => void }) {
  const [aberto, setAberto] = useState(() => estaAtivo(grupo, caminho));
  const id = `submenu-${grupo.id}`;
  return (
    <li>
      <button type="button" aria-expanded={aberto} aria-controls={id} onClick={() => setAberto((a) => !a)} className={cn(linha, "text-[18px] font-bold text-texto-primario")}>
        <span className="flex-1">{grupo.rotulo}</span>
        <IconeFigma src="/site/icone-seta-baixo.svg" tamanho={20} className={cn("text-texto-secundario transition-transform", aberto && "rotate-180")} />
      </button>
      <ul id={id} hidden={!aberto} className="border-b border-borda-padrao py-1">
        {grupo.itens.map((item) => {
          const ativo = estaAtivo(item, caminho);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={ativo ? "page" : undefined}
                onClick={aoNavegar}
                className={cn(
                  "texto-navegacao flex min-h-11 items-center rounded-md pl-4 outline-none focus-visible:ring-[3px] focus-visible:ring-ring",
                  ativo ? "text-destaque-azul" : "text-texto-secundario",
                )}
              >
                {item.rotulo}
              </Link>
            </li>
          );
        })}
      </ul>
    </li>
  );
}

/**
 * Menu mobile do visitante na Fase 1 (Figma 295:58052; N13): seções, “Filiar-se pelo WhatsApp” e o
 * horário, sem “Entrar” (E01). Tela cheia, abaixo de lg.
 */
export function MenuMobile() {
  const [aberto, setAberto] = useState(false);
  const caminho = usePathname();
  const { contato } = useSite();
  const fechar = () => setAberto(false);

  return (
    <div className="flex items-center gap-2 lg:hidden">
      <AlternarTemaRedondo />
      <Dialog.Root open={aberto} onOpenChange={setAberto}>
        <Dialog.Trigger aria-label="Abrir menu" className={botaoRedondo}>
          <IconeFigma src="/site/icone-menu.svg" tamanho={20} />
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Content
            aria-describedby={undefined}
            className="fixed inset-0 z-50 flex flex-col bg-fundo-cabecalho data-[state=open]:animate-in data-[state=open]:fade-in-0 lg:hidden"
          >
            <Dialog.Title className="sr-only">Menu</Dialog.Title>
            <div className="conteudo-site flex items-center justify-between gap-4 border-b border-borda-padrao py-2.5">
              <Logo className="h-[46px]" />
              <div className="flex items-center gap-2">
                <AlternarTemaRedondo />
                <Dialog.Close aria-label="Fechar menu" className={botaoRedondo}>
                  <IconeFigma src="/site/icone-fechar.svg" tamanho={20} />
                </Dialog.Close>
              </div>
            </div>
            <nav aria-label="Menu" className="conteudo-site flex-1 overflow-y-auto pt-2">
              <ul>
                {MENU_PRINCIPAL.map((entrada) =>
                  ehGrupo(entrada) ? (
                    <GrupoDoMenu key={entrada.rotulo} grupo={entrada} caminho={caminho} aoNavegar={fechar} />
                  ) : (
                    <ItemDoMenu key={entrada.href} item={entrada} caminho={caminho} aoNavegar={fechar} />
                  ),
                )}
              </ul>
            </nav>
            <div className="conteudo-site flex flex-col gap-4 pt-4 pb-[max(16px,env(safe-area-inset-bottom))]">
              <Button asChild className="w-full">
                <a href={contato.linkFiliacao} target="_blank" rel="noopener noreferrer">
                  <IconeFigma src="/site/icone-whatsapp.svg" tamanho={18} />
                  Filiar-se pelo WhatsApp
                </a>
              </Button>
              {contato.telefone ? (
                <a
                  href={contato.telefone.href}
                  data-testid="menu-telefone"
                  className="alvo-toque texto-rotulo flex items-center gap-2 self-start rounded-md text-texto-primario outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
                >
                  <IconeFigma src="/site/icone-telefone.svg" tamanho={16} />
                  {contato.telefone.texto}
                </a>
              ) : null}
              <p className="texto-pequeno flex items-center gap-2 text-texto-terciario">
                <IconeFigma src="/site/icone-relogio.svg" tamanho={16} />
                <span>
                  Atendimento: <TextoDoSite texto={contato.horario} />
                </span>
              </p>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

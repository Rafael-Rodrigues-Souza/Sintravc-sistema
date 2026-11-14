"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { IconeFigma } from "@/components/icone-figma";
import { MenuCriar } from "@/components/painel/menu-criar";
import { armazemDoNavegador, limparAoSair } from "@/lib/conteudos/fila-rascunho";
import { cn } from "@/lib/utils";
import { NOME_DO_PERFIL, type Perfil } from "@/lib/permissoes";
import type { GrupoDoMenu } from "@/lib/permissoes/menu";

/** Ícones do Figma (107:715), por nome do item. */
export const ICONES: Record<string, string> = {
  LayoutGrid: "/painel/menu-grade.svg",
  FileText: "/painel/menu-documento.svg",
  Megaphone: "/painel/menu-megafone.svg",
  SquarePlay: "/painel/menu-youtube.svg",
  Star: "/painel/menu-estrela.svg",
  IdCard: "/painel/menu-carteirinha.svg",
  Image: "/painel/menu-imagem.svg",
  History: "/painel/menu-historico.svg",
  Users: "/painel/menu-pessoas.svg",
  SlidersVertical: "/painel/menu-ajustes.svg",
  Calendar: "/painel/menu-calendario.svg",
  Briefcase: "/painel/menu-documento.svg",
  ChartColumn: "/painel/menu-documento.svg",
};

export function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/);
  return ((partes[0]?.[0] ?? "") + (partes.length > 1 ? (partes.at(-1)?.[0] ?? "") : "")).toUpperCase();
}

/**
 * Painel/Navegação lateral (Figma 107:715). Recebe os grupos já filtrados no servidor por
 * itensDoMenu(), que usa pode(): o menu nunca mostra uma área que o servidor negaria (RN06).
 */
export function NavegacaoLateral({
  grupos,
  podeCriarConteudo,
  podeCriarDocumento,
  pessoa,
  sair,
}: {
  grupos: GrupoDoMenu[];
  podeCriarConteudo: boolean;
  podeCriarDocumento: boolean;
  pessoa: { id: string; nome: string; perfil: Perfil };
  sair: () => Promise<void>;
}) {
  const caminho = usePathname();
  // A barra de rolagem fica escondida: quando há itens abaixo, um esmaecido no pé do menu mostra que ele rola (E48).
  const menu = useRef<HTMLElement>(null);
  const [temMaisAbaixo, setTemMaisAbaixo] = useState(false);
  useEffect(() => {
    const nav = menu.current;
    if (!nav) return;
    const medir = () => setTemMaisAbaixo(nav.scrollHeight - nav.scrollTop - nav.clientHeight > 1);
    // O ResizeObserver mede logo ao começar a observar e de novo quando a tela muda de tamanho.
    const observador = new ResizeObserver(medir);
    observador.observe(nav);
    nav.addEventListener("scroll", medir, { passive: true });
    return () => {
      observador.disconnect();
      nav.removeEventListener("scroll", medir);
    };
  }, []);
  const ativo = (href: string) => (href === "/painel" ? caminho === href : caminho === href || caminho.startsWith(`${href}/`));

  return (
    <nav
      ref={menu}
      id="menu-do-painel"
      aria-label="Menu do painel"
      // A partir de lg, o menu lateral fica no lugar da barra de baixo (e abaixo, o contrário; E49).
      data-substitui="barra-de-baixo"
      className={cn(
        // Em tela baixa o menu rola e os itens não encolhem; a barra fica escondida para não ocupar
        // a borda do menu (a roda do mouse, o toque e o teclado continuam rolando) (E48).
        "hidden w-full shrink-0 flex-col gap-6 overflow-y-auto bg-fundo-marinho-profundo px-4 pt-6 pb-5 [scrollbar-width:none] *:shrink-0",
        // Abaixo de lg, a navegação é a barra de baixo (E49).
        "lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-[264px]",
      )}
    >
      <Link href="/painel" className="alvo-toque self-start">
        <Image src="/painel/logo-sempre-branca.png" alt="SINTRAVC · Painel" width={400} height={148} className="h-11 w-auto" />
      </Link>

      {podeCriarConteudo ? (
        <MenuCriar podeCriarDocumento={podeCriarDocumento} alinhar="start">
          <button
            type="button"
            className="flex h-12 items-center justify-center gap-2 rounded-full bg-destaque-amarelo pr-6 pl-5 texto-botao text-destaque-amarelo-texto outline-none hover:brightness-95 focus-visible:ring-2 focus-visible:ring-texto-invertido"
          >
            <IconeFigma src="/painel/icone-mais.svg" tamanho={18} />
            Criar conteúdo
          </button>
        </MenuCriar>
      ) : null}

      <ul className="flex flex-col gap-1">
        {grupos.map((grupo) => (
          <li key={grupo.titulo ?? "inicio"} className="flex flex-col gap-1">
            {grupo.titulo ? (
              <p className="pt-3.5 pb-1.5 pl-3 texto-etiqueta text-texto-invertido-sec opacity-70">{grupo.titulo}</p>
            ) : null}
            <ul className="flex flex-col gap-1">
              {grupo.itens.map((item) => {
                const atual = ativo(item.href);
                return (
                  <li key={item.area}>
                    <Link
                      href={item.href}
                      aria-current={atual ? "page" : undefined}
                      className={cn(
                        "alvo-toque flex items-center gap-3 rounded-[12px] px-3 py-[11px] texto-navegacao outline-none",
                        "focus-visible:ring-2 focus-visible:ring-destaque-amarelo",
                        atual
                          ? "bg-sobre-escuro-chip text-texto-invertido"
                          : "text-texto-invertido-sec hover:bg-sobre-escuro-superficie hover:text-texto-invertido",
                      )}
                    >
                      <IconeFigma src={ICONES[item.icone] ?? "/painel/menu-documento.svg"} />
                      {item.rotulo}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ul>

      <div className="flex-1" />

      <ul className="flex flex-col gap-1">
        <li>
          <Link
            href="/"
            target="_blank"
            className="alvo-toque flex items-center gap-3 rounded-[12px] px-3 py-[9px] texto-pequeno text-texto-invertido-sec hover:text-texto-invertido"
          >
            <IconeFigma src="/painel/icone-seta-diagonal.svg" tamanho={18} />
            Ver site público
          </Link>
        </li>
      </ul>

      <div className="flex items-center gap-3 rounded-[14px] bg-sobre-escuro-superficie p-3">
        <span className="flex size-[38px] shrink-0 items-center justify-center rounded-full bg-destaque-amarelo texto-titulo-card-pequeno text-destaque-marinho-fixo">
          {iniciais(pessoa.nome)}
        </span>
        {/* Nome e perfil quebram a linha em vez de cortar: o menu tem largura fixa (E48). */}
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="wrap-break-word texto-titulo-card-pequeno text-texto-invertido">{pessoa.nome}</p>
          <p className="wrap-break-word texto-pequeno text-texto-invertido-sec">{NOME_DO_PERFIL[pessoa.perfil]}</p>
        </div>
        <BotaoSair
          sair={sair}
          pessoaId={pessoa.id}
          className="text-texto-invertido-sec hover:text-texto-invertido focus-visible:ring-destaque-amarelo"
        />
      </div>

      {temMaisAbaixo ? (
        // Preso ao pé da área visível do menu, sem ocupar espaço (-mt-6 desfaz o vão) e sem pegar o toque.
        <div aria-hidden data-testid="menu-tem-mais-abaixo" className="pointer-events-none sticky -bottom-5 -mx-4 -mt-6 h-0">
          <div className="absolute inset-x-0 bottom-0 h-14 bg-linear-to-t from-fundo-marinho-profundo to-transparent" />
        </div>
      ) : null}
    </nav>
  );
}

/** Sair do painel. Computador compartilhado (E40): apaga os rascunhos já salvos desta pessoa; os pendentes ficam só para ela. */
export function BotaoSair({ sair, pessoaId, className }: { sair: () => Promise<void>; pessoaId: string; className?: string }) {
  return (
    <form action={sair} onSubmit={() => limparAoSair(armazemDoNavegador(), pessoaId)}>
      <button
        type="submit"
        aria-label="Sair do painel"
        title="Sair"
        className={cn("alvo-toque flex size-9 items-center justify-center rounded-full outline-none focus-visible:ring-2", className)}
      >
        <IconeFigma src="/painel/icone-sair.svg" tamanho={18} />
      </button>
    </form>
  );
}

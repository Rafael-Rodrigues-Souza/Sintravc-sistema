"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { IconeFigma } from "@/components/icone-figma";
import { cn } from "@/lib/utils";
import type { GrupoDoMenu } from "@/lib/permissoes/menu";

/** Ícones do Figma (107:715), por nome do item. */
const ICONES: Record<string, string> = {
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

const PERFIS = { ADM: "Administrador geral", COM: "Comunicação", ATD: "Atendimento" } as const;

function iniciais(nome: string) {
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
  pessoa,
  sair,
}: {
  grupos: GrupoDoMenu[];
  podeCriarConteudo: boolean;
  pessoa: { nome: string; perfil: keyof typeof PERFIS };
  sair: () => Promise<void>;
}) {
  const caminho = usePathname();
  // No celular, o menu abre sobre a página atual e fecha sozinho quando a página muda.
  const [abertoEm, setAbertoEm] = useState<string | null>(null);
  const aberta = abertoEm === caminho;
  const setAberta = (abrir: boolean) => setAbertoEm(abrir ? caminho : null);
  const ativo = (href: string) => (href === "/painel" ? caminho === href : caminho === href || caminho.startsWith(`${href}/`));

  return (
    <>
    <header className="flex h-16 items-center justify-between bg-fundo-marinho-profundo px-4 lg:hidden">
      <Link href="/painel">
        <Image src="/painel/logo-sempre-branca.png" alt="SINTRAVC · Painel" width={400} height={148} className="h-9 w-auto" />
      </Link>
      <button
        type="button"
        onClick={() => setAberta(true)}
        aria-expanded={aberta}
        aria-controls="menu-do-painel"
        className="rounded-full border-[1.5px] border-sobre-escuro-borda px-4 py-2 texto-botao text-texto-invertido"
      >
        Menu
      </button>
    </header>
    <nav
      id="menu-do-painel"
      aria-label="Menu do painel"
      className={cn(
        "w-full shrink-0 flex-col gap-6 overflow-y-auto bg-fundo-marinho-profundo px-4 pt-6 pb-5",
        "lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-[264px]",
        aberta ? "fixed inset-0 z-50 flex" : "hidden",
      )}
    >
      <div className="flex items-center justify-between">
        <Link href="/painel" className="self-start">
          <Image src="/painel/logo-sempre-branca.png" alt="SINTRAVC · Painel" width={400} height={148} className="h-11 w-auto" />
        </Link>
        <button
          type="button"
          onClick={() => setAberta(false)}
          className="rounded-full border-[1.5px] border-sobre-escuro-borda px-4 py-2 texto-botao text-texto-invertido lg:hidden"
        >
          Fechar
        </button>
      </div>

      {podeCriarConteudo ? (
        <Link
          href="/painel/conteudos"
          className="flex h-12 items-center justify-center gap-2 rounded-full bg-destaque-amarelo pr-6 pl-5 texto-botao text-destaque-amarelo-texto hover:brightness-95"
        >
          <IconeFigma src="/painel/icone-mais.svg" tamanho={18} />
          Criar conteúdo
        </Link>
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
                        "flex items-center gap-3 rounded-[12px] px-3 py-[11px] texto-navegacao outline-none",
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
            className="flex items-center gap-3 rounded-[12px] px-3 py-[9px] texto-pequeno text-texto-invertido-sec hover:text-texto-invertido"
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
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="truncate texto-titulo-card-pequeno text-texto-invertido">{pessoa.nome}</p>
          <p className="truncate texto-pequeno text-texto-invertido-sec">{PERFIS[pessoa.perfil]}</p>
        </div>
        <form action={sair}>
          <button
            type="submit"
            aria-label="Sair do painel"
            title="Sair"
            className="flex size-9 items-center justify-center rounded-full text-texto-invertido-sec outline-none hover:text-texto-invertido focus-visible:ring-2 focus-visible:ring-destaque-amarelo"
          >
            <IconeFigma src="/painel/icone-sair.svg" tamanho={18} />
          </button>
        </form>
      </div>
    </nav>
    </>
  );
}

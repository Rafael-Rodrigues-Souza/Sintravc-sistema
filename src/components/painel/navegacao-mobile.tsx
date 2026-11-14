"use client";

import { Bell, Ellipsis, Plus, Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { toast } from "sonner";

import { IconeFigma } from "@/components/icone-figma";
import { FolhaCriar } from "@/components/painel/menu-criar";
import { BotaoSair, ICONES, iniciais } from "@/components/painel/navegacao-lateral";
import { Drawer, DrawerBody, DrawerContent, DrawerHeader } from "@/components/ui/drawer";
import { NOME_DO_PERFIL, type Perfil } from "@/lib/permissoes";
import { menuDoCelular, telaComBarraPropria, type GrupoDoMenu, type ItemDoMenu } from "@/lib/permissoes/menu";
import { cn } from "@/lib/utils";

/**
 * O painel abaixo de lg (E49; Figma M 119:3528 e M 120:3650): topo com busca, sino e avatar, e barra
 * de navegação embaixo com Início, Conteúdos, “+”, Comunicados e “Mais”. Os itens vêm de
 * itensDoMenu(), já filtrados por pode() no servidor. Nos editores (barra própria), nada disso aparece.
 */

type Pessoa = { id: string; nome: string; perfil: Perfil };

/** Abaixo de lg o painel usa a barra de baixo: a mesma largura de RESPONSIVO.menuLateralAPartirDe. */
const TELA_LARGA = "(min-width: 64rem)";

/** Fecha a folha quando a tela passa a ter o menu lateral (girar o tablet sem recarregar, E48). */
function useFecharEmTelaLarga(fechar: () => void) {
  useEffect(() => {
    const consulta = window.matchMedia(TELA_LARGA);
    const aoMudar = () => {
      if (consulta.matches) fechar();
    };
    consulta.addEventListener("change", aoMudar);
    return () => consulta.removeEventListener("change", aoMudar);
  }, [fechar]);
}

/** Folha aberta só na página em que foi aberta: ao trocar de página, ela fecha sozinha. */
function useFolha() {
  const caminho = usePathname();
  const [abertaEm, setAbertaEm] = useState<string | null>(null);
  const [fechar] = useState(() => () => setAbertaEm(null));
  useFecharEmTelaLarga(fechar);
  return { aberta: abertaEm === caminho, mudar: (abrir: boolean) => setAbertaEm(abrir ? caminho : null) };
}

function ativo(caminho: string, href: string) {
  return href === "/painel" ? caminho === href : caminho === href || caminho.startsWith(`${href}/`);
}

export function TopoMobile({ grupos, pessoa, sair }: { grupos: GrupoDoMenu[]; pessoa: Pessoa; sair: () => Promise<void> }) {
  const caminho = usePathname();
  const mais = useFolha();
  if (telaComBarraPropria(caminho)) return null;

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between gap-3 bg-fundo-marinho-profundo px-4 lg:hidden">
      <Link href="/painel" className="alvo-toque">
        <Image src="/painel/logo-sempre-branca.png" alt="SINTRAVC · Painel" width={400} height={148} className="h-9 w-auto" />
      </Link>
      <div className="flex items-center gap-2 pointer-coarse:vao-toque-10">
        {/* Busca e sino chegam com a #23 (E49): até lá, travados, como os botões “Disponível em breve” (E40). */}
        <BotaoRedondoTravado rotulo="Buscar" aviso="A busca do painel está disponível em breve.">
          <Search aria-hidden className="size-5" />
        </BotaoRedondoTravado>
        <BotaoRedondoTravado rotulo="Notificações" aviso="As notificações estão disponíveis em breve.">
          <Bell aria-hidden className="size-5" />
        </BotaoRedondoTravado>
        <button
          type="button"
          aria-label="Abrir o menu Mais (sua conta)"
          aria-haspopup="dialog"
          onClick={() => mais.mudar(true)}
          className="alvo-toque flex size-10 items-center justify-center rounded-full bg-destaque-amarelo texto-titulo-card-pequeno text-destaque-marinho-fixo outline-none focus-visible:ring-2 focus-visible:ring-texto-invertido"
        >
          {iniciais(pessoa.nome)}
        </button>
      </div>
      <FolhaMais grupos={menuDoCelular(grupos).mais} pessoa={pessoa} sair={sair} aberta={mais.aberta} aoMudar={mais.mudar} />
    </header>
  );
}

/**
 * Botão de ícone travado: continua focável e lê a dica (aria-describedby). Sem hover no toque (E48):
 * ao tocar, o aviso aparece (Sonner).
 */
function BotaoRedondoTravado({ rotulo, aviso, children }: { rotulo: string; aviso: string; children: React.ReactNode }) {
  const id = useId();
  return (
    <>
      <button
        type="button"
        aria-label={rotulo}
        aria-disabled="true"
        aria-describedby={id}
        onClick={() => toast(aviso, { id: rotulo })}
        className="alvo-toque flex size-10 items-center justify-center rounded-full bg-sobre-escuro-superficie text-texto-invertido-sec outline-none focus-visible:ring-2 focus-visible:ring-texto-invertido"
      >
        {children}
      </button>
      <span id={id} className="sr-only">
        Disponível em breve
      </span>
    </>
  );
}

export function BarraDeBaixo({
  grupos,
  podeCriarConteudo,
  podeCriarDocumento,
  pessoa,
  sair,
}: {
  grupos: GrupoDoMenu[];
  podeCriarConteudo: boolean;
  podeCriarDocumento: boolean;
  pessoa: Pessoa;
  sair: () => Promise<void>;
}) {
  const caminho = usePathname();
  const mais = useFolha();
  const criar = useFolha();
  if (telaComBarraPropria(caminho)) return null;

  const { barra, mais: gruposDoMais } = menuDoCelular(grupos);
  // Na ordem do Figma: os dois primeiros, o “+”, o resto e o “Mais”.
  const [antes, depois] = [barra.slice(0, 2), barra.slice(2)];
  const maisAtivo = gruposDoMais.some((g) => g.itens.some((i) => ativo(caminho, i.href)));

  return (
    <>
      {/* Reserva o lugar da barra no fim da página, para ela não cobrir o conteúdo. */}
      <div aria-hidden className="h-(--altura-barra-de-baixo) shrink-0 pb-[env(safe-area-inset-bottom)] box-content lg:hidden" />
      <nav
        id="barra-de-baixo"
        aria-label="Navegação do painel"
        data-barra-de-baixo
        data-substitui="menu-do-painel"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-borda-padrao bg-fundo-superficie pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <ul className="mx-auto flex h-(--altura-barra-de-baixo) max-w-[640px] items-stretch justify-between px-1">
          {antes.map((item) => (
            <li key={item.area} className="flex flex-1">
              <ItemDaBarra item={item} atual={ativo(caminho, item.href)} />
            </li>
          ))}
          {podeCriarConteudo ? (
            <li className="flex flex-1 items-center justify-center">
              <button
                type="button"
                aria-label="Criar conteúdo"
                aria-haspopup="dialog"
                onClick={() => criar.mudar(true)}
                className="flex size-14 -translate-y-3 items-center justify-center rounded-full bg-destaque-amarelo text-destaque-amarelo-texto shadow-[0_8px_20px_rgb(11_20_36/0.2)] outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Plus aria-hidden className="size-7" strokeWidth={2.25} />
              </button>
            </li>
          ) : null}
          {depois.map((item) => (
            <li key={item.area} className="flex flex-1">
              <ItemDaBarra item={item} atual={ativo(caminho, item.href)} />
            </li>
          ))}
          {gruposDoMais.length > 0 ? (
            <li className="flex flex-1">
              <button
                type="button"
                aria-haspopup="dialog"
                aria-current={maisAtivo ? "page" : undefined}
                onClick={() => mais.mudar(true)}
                className={classeDoItem(maisAtivo)}
              >
                <Ellipsis aria-hidden className="size-5" />
                Mais
              </button>
            </li>
          ) : null}
        </ul>
      </nav>
      <FolhaMais grupos={gruposDoMais} pessoa={pessoa} sair={sair} aberta={mais.aberta} aoMudar={mais.mudar} />
      {podeCriarConteudo ? <FolhaCriar podeCriarDocumento={podeCriarDocumento} aberta={criar.aberta} aoMudar={criar.mudar} /> : null}
    </>
  );
}

function classeDoItem(atual: boolean) {
  return cn(
    "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-[12px] texto-etiqueta outline-none focus-visible:ring-2 focus-visible:ring-ring",
    atual ? "text-destaque-azul" : "text-texto-secundario",
  );
}

function ItemDaBarra({ item, atual }: { item: ItemDoMenu; atual: boolean }) {
  return (
    <Link href={item.href} aria-current={atual ? "page" : undefined} className={classeDoItem(atual)}>
      <IconeFigma src={ICONES[item.icone] ?? "/painel/menu-documento.svg"} />
      <span className="max-w-full truncate">{item.rotulo}</span>
    </Link>
  );
}

/** O resto do menu (E49; padrão da folha do “Novo comunicado”, Figma 170:18978), mais a conta e o Sair. */
function FolhaMais({
  grupos,
  pessoa,
  sair,
  aberta,
  aoMudar,
}: {
  grupos: GrupoDoMenu[];
  pessoa: Pessoa;
  sair: () => Promise<void>;
  aberta: boolean;
  aoMudar: (aberta: boolean) => void;
}) {
  const caminho = usePathname();
  return (
    <Drawer open={aberta} onOpenChange={aoMudar}>
      <DrawerContent aria-describedby={undefined}>
        <DrawerHeader titulo="Mais" oculto />
        <DrawerBody className="gap-4 pt-2">
          <nav aria-label="Mais áreas do painel">
            <ul className="flex flex-col gap-1">
              {grupos.map((grupo) => (
                <li key={grupo.titulo ?? "inicio"} className="flex flex-col gap-1">
                  {grupo.titulo ? <p className="pt-2 pb-1 pl-3 texto-etiqueta text-texto-terciario">{grupo.titulo}</p> : null}
                  <ul className="flex flex-col gap-1">
                    {grupo.itens.map((item) => {
                      const atual = ativo(caminho, item.href);
                      return (
                        <li key={item.area}>
                          <Link
                            href={item.href}
                            aria-current={atual ? "page" : undefined}
                            onClick={() => aoMudar(false)}
                            className={cn(
                              "flex min-h-12 items-center gap-3 rounded-[12px] px-3 texto-navegacao outline-none focus-visible:ring-2 focus-visible:ring-ring",
                              atual ? "bg-destaque-azul-suave text-destaque-azul" : "text-texto-primario active:bg-fundo-superficie-alt",
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
          </nav>
          <div className="flex flex-col gap-2 border-t border-borda-padrao pt-3">
            <Link
              href="/"
              target="_blank"
              className="flex min-h-12 items-center gap-3 rounded-[12px] px-3 texto-pequeno text-texto-secundario outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <IconeFigma src="/painel/icone-seta-diagonal.svg" tamanho={18} />
              Ver site público
            </Link>
            <div className="flex items-center gap-3 rounded-[14px] bg-fundo-superficie-alt p-3">
              <span className="flex size-[38px] shrink-0 items-center justify-center rounded-full bg-destaque-amarelo texto-titulo-card-pequeno text-destaque-marinho-fixo">
                {iniciais(pessoa.nome)}
              </span>
              <div className="flex min-w-0 flex-1 flex-col">
                <p className="wrap-break-word texto-titulo-card-pequeno text-texto-primario">{pessoa.nome}</p>
                <p className="wrap-break-word texto-pequeno text-texto-secundario">{NOME_DO_PERFIL[pessoa.perfil]}</p>
              </div>
              <BotaoSair sair={sair} pessoaId={pessoa.id} className="text-texto-secundario focus-visible:ring-ring" />
            </div>
          </div>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}

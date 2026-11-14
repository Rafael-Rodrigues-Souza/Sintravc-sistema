import type { Metadata } from "next";

import { FaixaSemInternet } from "@/components/painel/faixa-sem-internet";
import { NavegacaoLateral } from "@/components/painel/navegacao-lateral";
import { BarraDeBaixo, TopoMobile } from "@/components/painel/navegacao-mobile";
import { sessaoDaEquipe } from "@/lib/acesso/sessao-da-equipe";
import { pode } from "@/lib/permissoes";
import { itensDoMenu } from "@/lib/permissoes/menu";

import { acaoSair } from "../(acesso)/acoes";

export const metadata: Metadata = {
  title: { default: "Painel", template: "%s · Painel · SINTRAVC" },
  robots: { index: false, follow: false },
};

/**
 * Moldura do painel: só abre com sessão válida da equipe (E05). O menu sai de pode() (RN06): o mesmo
 * para o menu lateral (a partir de lg) e para o topo e a barra de baixo do celular (E49), que toda
 * rota do painel recebe daqui.
 */
export default async function LayoutPainel({ children }: { children: React.ReactNode }) {
  const pessoa = await sessaoDaEquipe();
  const menu = {
    grupos: itensDoMenu(pessoa.quem),
    pessoa: { id: pessoa.id, nome: pessoa.nome, perfil: pessoa.perfil },
    sair: acaoSair,
  };
  const criar = {
    podeCriarConteudo: pode(pessoa.quem, "criar", { tipo: "noticia" }),
    podeCriarDocumento: pode(pessoa.quem, "criar", { tipo: "documento" }),
  };

  return (
    <div className="flex min-h-dvh flex-col bg-fundo-pagina lg:flex-row">
      <NavegacaoLateral {...menu} {...criar} />
      <TopoMobile {...menu} />
      <main className="flex min-w-0 flex-1 flex-col">
        <FaixaSemInternet />
        {children}
      </main>
      <BarraDeBaixo {...menu} {...criar} />
    </div>
  );
}

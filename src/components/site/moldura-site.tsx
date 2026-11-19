import { cookies } from "next/headers";

import { lerConfigSite } from "@/lib/config-site";
import { linkFiliacao, linkWhatsApp } from "@/lib/config-site/links";

import { AvisoCookies } from "./aviso-cookies";
import { BarraSuperior } from "./barra-superior";
import { Cabecalho } from "./cabecalho";
import { COOKIE_CONSENTIMENTO, lerEscolha } from "./consentimento-comum";
import { ProvedorSite } from "./provedor-site";
import { Rodape } from "./rodape";

/**
 * Moldura de todas as páginas do site (#13): barra superior, cabeçalho, conteúdo, rodapé e aviso de
 * cookies. Lê a ConfigSite (RN43) e a escolha de cookies (E56) no servidor. Usada pelo layout do
 * grupo (site) e pela página 404.
 */
export async function MolduraSite({ children }: { children: React.ReactNode }) {
  // cookies() primeiro: marca a página como dinâmica antes de tocar no banco (sem pré-renderizar no build).
  const loja = await cookies();
  const config = await lerConfigSite();
  const { contato } = config;
  const filiacao = linkFiliacao(config);

  return (
    <ProvedorSite
      contato={{ linkFiliacao: filiacao, linkWhatsApp: linkWhatsApp(contato.whatsappRecepcao), horario: contato.horario }}
      escolhaInicial={lerEscolha(loja.get(COOKIE_CONSENTIMENTO)?.value)}
    >
      <div id="topo" className="flex min-h-dvh flex-col bg-fundo-pagina">
        <a
          href="#conteudo"
          className="texto-botao sr-only z-50 rounded-full bg-destaque-amarelo px-5 py-3 text-destaque-amarelo-texto focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Pular para o conteúdo
        </a>
        <BarraSuperior config={config} />
        <Cabecalho linkFiliacao={filiacao} />
        <main id="conteudo" tabIndex={-1} className="flex-1 outline-none">
          {children}
        </main>
        <Rodape config={config} linkFiliacao={filiacao} />
        <AvisoCookies />
      </div>
    </ProvedorSite>
  );
}

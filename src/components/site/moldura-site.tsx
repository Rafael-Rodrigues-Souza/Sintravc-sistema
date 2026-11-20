import { cookies } from "next/headers";

import { comunicadosNoAr } from "@/lib/comunicados/faixa";
import { lerConfigSite } from "@/lib/config-site";
import { linkFiliacao, linkWhatsApp } from "@/lib/config-site/links";
import { lerParametro } from "@/lib/parametros";

import { AvisoCookies } from "./aviso-cookies";
import { BarraSuperior } from "./barra-superior";
import { Cabecalho } from "./cabecalho";
import { COOKIE_CONSENTIMENTO, lerEscolha } from "./consentimento-comum";
import { COOKIE_COMUNICADOS_FECHADOS, lerFechados } from "./comunicados-fechados";
import { FaixaComunicado } from "./faixa-comunicado";
import { ProvedorSite } from "./provedor-site";
import { Rodape } from "./rodape";

/**
 * Moldura de todas as páginas do site (#13): barra superior, cabeçalho, conteúdo, rodapé e aviso de
 * cookies, com a faixa de comunicado logo abaixo do cabeçalho (RF08, E58). Lê a ConfigSite (RN43), a
 * escolha de cookies (E56) e os comunicados no ar no servidor, a cada visita. Usada pelo layout do
 * grupo (site) e pela página 404.
 */
export async function MolduraSite({ children }: { children: React.ReactNode }) {
  // cookies() primeiro: marca a página como dinâmica antes de tocar no banco (sem pré-renderizar no build).
  const loja = await cookies();
  const [config, faixa] = await Promise.all([lerConfigSite(), comunicadosParaAFaixa(loja)]);
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
        <FaixaComunicado comunicados={faixa.comunicados} intervaloSegundos={faixa.intervaloSegundos} />
        <main id="conteudo" tabIndex={-1} className="flex-1 outline-none">
          {children}
        </main>
        <Rodape config={config} linkFiliacao={filiacao} />
        <AvisoCookies />
      </div>
    </ProvedorSite>
  );
}

/**
 * Os comunicados no ar que o visitante ainda não fechou (E58). Se a leitura falhar, o site segue sem
 * a faixa em vez de cair.
 */
async function comunicadosParaAFaixa(loja: Awaited<ReturnType<typeof cookies>>) {
  const fechados = new Set(lerFechados(loja.get(COOKIE_COMUNICADOS_FECHADOS)?.value));
  try {
    const [noAr, intervaloSegundos] = await Promise.all([comunicadosNoAr(), lerParametro("comunicados.alternar_segundos")]);
    return { comunicados: noAr.filter((c) => !fechados.has(c.id)), intervaloSegundos };
  } catch (erro) {
    console.error("Faixa de comunicado: falha ao ler os comunicados no ar.", erro);
    return { comunicados: [], intervaloSegundos: 0 };
  }
}

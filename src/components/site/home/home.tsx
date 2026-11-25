import { FilieSe } from "@/components/site/filie-se";
import { lerConfigSite } from "@/lib/config-site";
import { linkFiliacao, linkWhatsApp } from "@/lib/config-site/links";
import { programaDoSite, ultimoPrograma } from "@/lib/episodios/site";
import { categoriasDoSite, listarNoticiasDoSite, totalNoAr } from "@/lib/noticias-do-site/consultas";
import { destaquesDaHome } from "@/lib/pagina-inicial/site";

import { AcessoRapido } from "./acesso-rapido";
import { CarrosselHome } from "./carrossel-home";
import { RedesHome } from "./redes-home";
import { paraALista, slidesNaTela } from "./slides";
import { NOTICIAS_NA_HOME, UltimasNoticias } from "./ultimas-noticias";
import { UltimoPrograma } from "./ultimo-programa";

/**
 * A Home (Figma 32:550 / 35:722; RF01, US01, E62): carrossel e “Em destaque”, acesso rápido, últimas
 * notícias, último programa, redes e Filie-se. A faixa de comunicado vem da moldura do site. O site lê
 * o publicado; a prévia do painel passa `versao="rascunho"`.
 */
export async function Home({ categoria, versao = "publicado" }: { categoria: string | null; versao?: "publicado" | "rascunho" }) {
  const agora = new Date();
  const [config, destaques, episodio, programa, categorias, total] = await Promise.all([
    lerConfigSite(),
    destaquesDaHome(agora, versao),
    ultimoPrograma(agora),
    programaDoSite(),
    categoriasDoSite(),
    totalNoAr(),
  ]);
  const daCategoria = categoria ? (categorias.find((c) => c.slug === categoria) ?? null) : null;
  const noticias =
    categoria && !daCategoria ? [] : (await listarNoticiasDoSite({ categoriaId: daCategoria?.id, porPagina: NOTICIAS_NA_HOME })).itens;

  return (
    <>
      <h1 className="sr-only">SINTRAVC · Sindicato dos Rodoviários de Vitória da Conquista</h1>
      <div className="bg-fundo-marinho">
        <div className="conteudo-site pt-4 pb-7 lg:pt-12 lg:pb-14">
          <CarrosselHome
            slides={slidesNaTela(destaques.slides, programa, agora)}
            lista={destaques.lista.map(paraALista)}
            intervaloSegundos={destaques.intervaloSegundos}
            modo={versao === "rascunho" ? "previa" : "site"}
          />
        </div>
      </div>
      <AcessoRapido linkWhatsApp={linkWhatsApp(config.contato.whatsappRecepcao)} />
      <UltimasNoticias noticias={noticias} categorias={categorias} categoriaAtual={categoria} total={total} />
      <UltimoPrograma episodio={episodio} programa={programa} agora={agora} />
      <RedesHome redes={config.redes} contadores={config.contadores} />
      <FilieSe linkFiliacao={linkFiliacao(config)} />
    </>
  );
}

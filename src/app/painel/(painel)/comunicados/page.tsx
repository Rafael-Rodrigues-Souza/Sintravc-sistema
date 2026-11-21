import type { Metadata } from "next";

import { exigirArea } from "@/lib/acesso/sessao-da-equipe";
import { contarPorAba, listarComunicados, MAXIMO_NA_FILA, paginaDoEncerrado } from "@/lib/comunicados/comunicados";
import { ABAS, type Aba } from "@/lib/comunicados/regras";
import { comunicadosNoAr } from "@/lib/comunicados/faixa";
import { dataNaBahia, horaNaBahia } from "@/lib/datas";
import { lerParametro } from "@/lib/parametros";
import { pode } from "@/lib/permissoes";
import { ehUuid } from "@/lib/uuid";

import { AreaComunicados, type ItemNaTela } from "./area-comunicados";

export const metadata: Metadata = { title: "Comunicados" };

const POR_PAGINA = 20;

/** "24/10 08h00" no horário da Bahia (RNF06). */
function curto(d: Date) {
  return `${dataNaBahia(d).slice(0, 5)} ${horaNaBahia(d)}`;
}

/**
 * Comunicados (RF43, RF44, RN14; Figma 165:16358 e M 170:18854): o que está no site agora, as abas
 * No ar, Agendados, Rascunhos e Encerrados, o novo comunicado e o menu ⋯ de cada um. As abas seguem
 * o relógio (E58). `?abrir=<id>` abre o comunicado (clique no calendário de Conteúdos, E17);
 * `?aba=encerrados&ver=<id>` mostra o encerrado na página dele, rolado até a vista e destacado
 * (E17, E58); `?novo=1` abre o formulário vazio (menu “Criar conteúdo”).
 */
export default async function PaginaComunicados({ searchParams }: { searchParams: Promise<{ aba?: string; pagina?: string; abrir?: string; ver?: string; novo?: string }> }) {
  const pessoa = await exigirArea("comunicados");
  const p = await searchParams;
  const aba = (ABAS as readonly string[]).includes(p.aba ?? "") ? (p.aba as Aba) : "no_ar";
  // A aba No ar vem inteira: a fila só se reordena completa (E58).
  const porPagina = aba === "no_ar" ? MAXIMO_NA_FILA : POR_PAGINA;
  const agora = new Date();
  const deps = { quem: pessoa.quem, agora };
  const ver = aba === "encerrados" && ehUuid(p.ver) ? p.ver : undefined;
  const paginaDoVer = ver && !p.pagina ? await paginaDoEncerrado(ver, porPagina, deps) : null;
  const pagina = paginaDoVer ?? Math.max(1, Number.parseInt(p.pagina ?? "1", 10) || 1);

  const [contagem, lista, noAr, intervalo] = await Promise.all([
    contarPorAba(deps),
    listarComunicados({ aba, pagina, porPagina }, deps),
    comunicadosNoAr(agora),
    lerParametro("comunicados.alternar_segundos"),
  ]);

  const itens: ItemNaTela[] = lista.itens.map((c) => ({
    id: c.id,
    titulo: c.titulo,
    rotuloDoLink: c.rotuloDoLink,
    inicio: c.inicio ? curto(c.inicio) : null,
    fim: c.fim ? curto(c.fim) : null,
    encerradoEm: c.encerradoEm ? curto(c.encerradoEm) : null,
    situacao: c.situacao,
    podeExcluir: pode(pessoa.quem, "excluir", { tipo: "comunicado", criadoPorId: c.criadoPor, jaPublicado: c.jaPublicado }),
  }));

  return (
    <AreaComunicados
      aba={aba}
      contagem={contagem}
      itens={itens}
      pagina={pagina}
      totalDePaginas={Math.max(1, Math.ceil(lista.total / porPagina))}
      noAr={noAr}
      intervaloSegundos={intervalo}
      conferidoAs={horaNaBahia(agora)}
      podeGerenciar={pode(pessoa.quem, "gerenciar", { tipo: "comunicado" })}
      abrir={ehUuid(p.abrir) ? p.abrir : undefined}
      destacar={ver}
      novo={p.novo === "1"}
    />
  );
}

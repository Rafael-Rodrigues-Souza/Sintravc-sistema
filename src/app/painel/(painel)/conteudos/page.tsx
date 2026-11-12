import { Archive, CalendarDays, FileText, List, Plus, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { MenuCriar } from "@/components/painel/menu-criar";
import { Alerta } from "@/components/ui/alerta";
import { Button } from "@/components/ui/button";
import { exigirArea } from "@/lib/acesso/sessao-da-equipe";
import { itensDoCalendario, rascunhosSemData } from "@/lib/conteudos/calendario";
import { acoesDisponiveis } from "@/lib/conteudos/acoes-disponiveis";
import { carregarNoticia } from "@/lib/conteudos/carregar";
import { descreverAcao } from "@/lib/conteudos/descrever-acao";
import { ultimasAcoes } from "@/lib/conteudos/edicao-rapida";
import { diaNoCalendario, mesVizinho } from "@/lib/conteudos/grade-do-mes";
import { temAlteracoesNaoPublicadas } from "@/lib/conteudos/publicacao";
import {
  contarConteudosPorTipo,
  ESTADOS_DA_LISTA,
  listarAutores,
  listarCategorias,
  listarConteudos,
  POR_PAGINA,
  type EstadoConteudo,
  type ItemConteudo,
  type TipoConteudo,
} from "@/lib/conteudos/listar";
import { rotuloDaNoticia } from "@/lib/conteudos/dados";
import { rotuloDoDocumento } from "@/lib/documentos/dados";
import { seloDeVigencia } from "@/lib/documentos/selo";
import { bahiaEmCampos, dataHoraNaBahia, quandoNaBahia } from "@/lib/datas";
import { pode, type QuemDaEquipe } from "@/lib/permissoes";
import { cn } from "@/lib/utils";
import { ehUuid } from "@/lib/uuid";

import { Calendario } from "./calendario";
import { EdicaoRapida } from "./edicao-rapida";
import { FiltroSelect } from "./filtros";
import { ESTADO } from "./selos";
import { TabelaConteudos, type LinhaDaTabela } from "./tabela-conteudos";

export const metadata: Metadata = { title: "Conteúdos" };

type Busca = {
  tipo?: string;
  estado?: string;
  categoria?: string;
  autor?: string;
  busca?: string;
  pagina?: string;
  /** "calendario" mostra o calendário de publicações (RF36). */
  visao?: string;
  /** Mês do calendário, "AAAA-MM". */
  mes?: string;
  /** Notícia aberta na Edição rápida. */
  editar?: string;
  /** "1" mostra a aba Arquivados (RF35). */
  arquivados?: string;
};

const TIPOS: { valor: TipoConteudo | "todos"; rotulo: string }[] = [
  { valor: "todos", rotulo: "Todos" },
  { valor: "noticia", rotulo: "Notícias" },
  { valor: "edital", rotulo: "Editais" },
  { valor: "acordo", rotulo: "Acordos e convenções" },
];

/**
 * Conteúdos (RF35; Figma 110:845, 120:3650 e 214:33364): notícias, editais e acordos num lugar
 * só, com abas por tipo, busca, filtros e páginas, seleção em lote (Ocultar, Arquivar), o menu ⋯
 * de cada linha e a aba Arquivados (RF40, #11).
 * Também mostra o calendário de publicações (RF36, 115:2992) e a Edição rápida (115:2324).
 */
export default async function PaginaConteudos({ searchParams }: { searchParams: Promise<Busca> }) {
  const pessoa = await exigirArea("conteudos");
  const p = await searchParams;
  const tipo = TIPOS.some((t) => t.valor === p.tipo && t.valor !== "todos") ? (p.tipo as TipoConteudo) : undefined;
  const estado = (ESTADOS_DA_LISTA as readonly string[]).includes(p.estado ?? "") ? (p.estado as EstadoConteudo) : undefined;
  const categoriaId = ehUuid(p.categoria) ? p.categoria : undefined;
  const autorId = ehUuid(p.autor) ? p.autor : undefined;
  const busca = p.busca?.trim() ?? "";
  const pagina = Math.max(1, Number.parseInt(p.pagina ?? "1", 10) || 1);
  const calendario = p.visao === "calendario";
  const arquivados = !calendario && p.arquivados === "1";
  const hoje = diaNoCalendario(new Date());
  const mesAberto = lerMes(p.mes) ?? { ano: Number(hoje.slice(0, 4)), mes: Number(hoje.slice(5, 7)) };
  const mesTexto = (m: { ano: number; mes: number }) => `${m.ano}-${String(m.mes).padStart(2, "0")}`;
  const editarId = ehUuid(p.editar) ? p.editar : undefined;

  const deps = { quem: pessoa.quem };
  const [lista, porTipo, categorias, autores, doCalendario, rascunhos, rapida] = await Promise.all([
    calendario
      ? null
      : listarConteudos({ tipo, estado: arquivados ? undefined : estado, categoriaId, autorId, busca, pagina, arquivados }, deps),
    contarConteudosPorTipo(deps),
    listarCategorias(["noticias", "documentos"], deps),
    listarAutores(deps),
    calendario ? itensDoCalendario({ ...mesAberto, tipo }, deps) : null,
    calendario ? rascunhosSemData(deps) : null,
    editarId && pode(pessoa.quem, "editar", { tipo: "noticia" }) ? dadosDaEdicaoRapida(editarId, pessoa.quem) : null,
  ]);

  const endereco = (mudanca: Partial<Busca>) => {
    const valores: Busca = {
      tipo,
      estado,
      categoria: categoriaId,
      autor: autorId,
      busca,
      pagina: String(pagina),
      visao: calendario ? "calendario" : undefined,
      mes: calendario && p.mes ? mesTexto(mesAberto) : undefined,
      arquivados: arquivados ? "1" : undefined,
      ...mudanca,
    };
    const consulta = new URLSearchParams();
    for (const [chave, valor] of Object.entries(valores)) {
      if (valor && !(chave === "pagina" && valor === "1")) consulta.set(chave, valor);
    }
    return `/painel/conteudos${consulta.size ? `?${consulta}` : ""}`;
  };

  const podeCriar = pode(pessoa.quem, "criar", { tipo: "noticia" });
  const podeCriarDocumento = pode(pessoa.quem, "criar", { tipo: "documento" });
  const podeAgendar = pode(pessoa.quem, "agendar", { tipo: "noticia" });
  const podeEditar = pode(pessoa.quem, "editar", { tipo: "noticia" });
  const filtrando = !!(tipo || estado || categoriaId || autorId || busca);
  const total = lista?.total ?? 0;
  const totalDePaginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const primeiro = total === 0 ? 0 : (pagina - 1) * POR_PAGINA + 1;

  return (
    <div className="flex flex-1 flex-col gap-6 px-5 pt-8 pb-12 lg:px-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1.5">
          <h1 className="texto-titulo-card-grande text-texto-primario">Conteúdos</h1>
          <p className="max-w-[640px] texto-corpo text-texto-secundario">
            {calendario
              ? podeAgendar
                ? "Veja quando cada conteúdo entra no ar. Arraste uma notícia agendada ou um rascunho para mudar a data."
                : "Veja quando cada conteúdo entra no ar."
              : "Notícias, editais e acordos coletivos em um só lugar. Comunicados, Rádio Chofer e benefícios têm áreas próprias no menu."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 self-start">
          <nav aria-label="Modo de ver" className="flex items-center gap-1 rounded-full border border-borda-padrao bg-fundo-superficie-alt p-1">
            {[
              { rotulo: "Lista", icone: List, ativo: !calendario, href: endereco({ visao: undefined, mes: undefined, pagina: "1" }) },
              { rotulo: "Calendário", icone: CalendarDays, ativo: calendario, href: endereco({ visao: "calendario", pagina: "1" }) },
            ].map((modo) => (
              <Link
                key={modo.rotulo}
                href={modo.href}
                aria-current={modo.ativo ? "page" : undefined}
                className={cn(
                  "flex h-10 items-center gap-2 rounded-full px-4 texto-navegacao outline-none focus-visible:ring-[3px] focus-visible:ring-ring",
                  modo.ativo ? "bg-fundo-superficie text-texto-primario shadow-sm" : "text-texto-secundario hover:text-texto-primario",
                )}
              >
                <modo.icone aria-hidden className="size-[18px]" />
                {modo.rotulo}
              </Link>
            ))}
          </nav>
          {podeCriar ? (
            <MenuCriar podeCriarDocumento={podeCriarDocumento}>
              <Button>
                <Plus aria-hidden />
                Criar conteúdo
              </Button>
            </MenuCriar>
          ) : null}
        </div>
      </header>

      <nav aria-label="Tipos de conteúdo" className="flex flex-wrap items-center gap-2">
        {TIPOS.map((aba) => {
          const atual = !arquivados && (tipo ?? "todos") === aba.valor;
          return (
            <Link
              key={aba.valor}
              href={endereco({ tipo: aba.valor === "todos" ? undefined : aba.valor, pagina: "1", arquivados: undefined })}
              aria-current={atual ? "page" : undefined}
              className={cn(
                "flex items-center gap-2 rounded-full px-[18px] py-2.5 texto-navegacao outline-none focus-visible:ring-[3px] focus-visible:ring-ring",
                atual
                  ? "bg-destaque-amarelo text-destaque-marinho-fixo"
                  : "border border-borda-padrao bg-fundo-superficie text-texto-secundario hover:bg-fundo-superficie-alt",
              )}
            >
              {aba.rotulo}
              <span className={cn("texto-etiqueta", atual ? "opacity-70" : "text-texto-terciario")}>{porTipo[aba.valor]}</span>
            </Link>
          );
        })}
        {calendario ? null : (
          <Link
            href={endereco({ arquivados: "1", tipo: undefined, estado: undefined, pagina: "1" })}
            aria-current={arquivados ? "page" : undefined}
            className={cn(
              "flex items-center gap-2 rounded-full px-[18px] py-2.5 texto-navegacao outline-none focus-visible:ring-[3px] focus-visible:ring-ring sm:ml-auto",
              arquivados
                ? "bg-destaque-marinho-fixo text-texto-invertido"
                : "border border-borda-padrao bg-fundo-superficie text-texto-secundario hover:bg-fundo-superficie-alt",
            )}
          >
            <Archive aria-hidden className="size-4" />
            Arquivados
            <span className={cn("texto-etiqueta", arquivados ? "opacity-70" : "text-texto-terciario")}>{porTipo.arquivados}</span>
          </Link>
        )}
      </nav>

      {calendario && doCalendario && rascunhos ? (
        <Calendario
          key={mesTexto(mesAberto)}
          ano={mesAberto.ano}
          mes={mesAberto.mes}
          hoje={hoje}
          dias={Object.fromEntries(
            Object.entries(doCalendario.dias).map(([dia, itens]) => [
              dia,
              itens.map((i) => ({ id: i.id, titulo: i.titulo, estado: i.estado, quando: i.quando.toISOString(), revisao: i.revisao })),
            ]),
          )}
          rascunhos={rascunhos.itens.map(({ id, titulo, revisao }) => ({ id, titulo, revisao }))}
          totalDeRascunhos={rascunhos.total}
          podeAgendar={podeAgendar}
          hrefMesAnterior={endereco({ mes: mesTexto(mesVizinho(mesAberto.ano, mesAberto.mes, -1)) })}
          hrefProximoMes={endereco({ mes: mesTexto(mesVizinho(mesAberto.ano, mesAberto.mes, 1)) })}
          hrefHoje={endereco({ mes: undefined })}
        />
      ) : null}

      {arquivados ? (
        <p className="texto-pequeno text-texto-secundario">
          Arquivados ficam fora do site e das listas, com histórico e anexos. Restaure como rascunho para revisar e publicar de novo.
        </p>
      ) : null}

      {calendario || arquivados || podeCriarDocumento ? null : (
        <Alerta tipo="informacao" titulo="Editais e acordos coletivos: só o Administrador geral publica">
          Você pode ver, baixar e citar esses documentos nas notícias. Para corrigir ou substituir um documento oficial, avise o
          Administrador geral.
        </Alerta>
      )}

      {lista ? (
      <>
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
        <form role="search" action="/painel/conteudos" className="lg:min-w-[320px] lg:flex-1">
          {Object.entries({ tipo, estado, categoria: categoriaId, autor: autorId, arquivados: arquivados ? "1" : undefined }).map(([nome, valor]) =>
            valor ? <input key={nome} type="hidden" name={nome} value={valor} /> : null,
          )}
          <label className="flex h-11 w-full items-center gap-2.5 rounded-[12px] border border-borda-padrao bg-fundo-superficie px-3.5 text-texto-terciario focus-within:ring-[3px] focus-within:ring-ring">
            <Search aria-hidden className="size-[18px]" />
            <span className="sr-only">Buscar conteúdo</span>
            <input
              type="search"
              name="busca"
              defaultValue={busca}
              placeholder="Buscar por título, autor ou palavra-chave"
              className="min-w-0 flex-1 bg-transparent texto-pequeno text-texto-primario outline-none placeholder:text-texto-terciario"
            />
          </label>
        </form>
        <div className="flex flex-wrap gap-2">
          {arquivados ? null : (
            <FiltroSelect
              nome="estado"
              rotulo="Estado"
              valor={estado ?? ""}
              opcoes={[{ valor: "", rotulo: "Todos" }, ...ESTADOS_DA_LISTA.map((e) => ({ valor: e, rotulo: ESTADO[e].rotulo }))]}
            />
          )}
          <FiltroSelect
            nome="categoria"
            rotulo="Categoria"
            valor={categoriaId ?? ""}
            opcoes={[{ valor: "", rotulo: "Todas" }, ...categorias.map((c) => ({ valor: c.id, rotulo: c.nome }))]}
          />
          <FiltroSelect
            nome="autor"
            rotulo="Autor"
            valor={autorId ?? ""}
            opcoes={[{ valor: "", rotulo: "Todos" }, ...autores.map((a) => ({ valor: a.id, rotulo: a.nome }))]}
          />
        </div>
      </div>

      {lista.itens.length === 0 ? (
        <Vazio
          filtrando={filtrando}
          busca={busca}
          podeCriar={podeCriar}
          podeCriarDocumento={podeCriarDocumento}
          arquivados={arquivados}
          hrefLimpar={arquivados ? "/painel/conteudos?arquivados=1" : "/painel/conteudos"}
        />
      ) : (
        <TabelaConteudos
          key={endereco({})}
          arquivados={arquivados}
          linhas={lista.itens.map((item) =>
            linhaDaTabela(item, pessoa.quem, item.tipo === "noticia" && !arquivados && podeEditar ? endereco({ editar: item.id }) : null),
          )}
          rodape={
            <footer className="flex flex-col items-center justify-between gap-3 border-t border-borda-padrao px-5 py-4 sm:flex-row">
              <p className="texto-pequeno text-texto-secundario">
                Mostrando {primeiro}–{primeiro + lista.itens.length - 1} de {total} {total === 1 ? "conteúdo" : "conteúdos"}
              </p>
              {totalDePaginas > 1 ? (
                <nav aria-label="Páginas" className="flex items-center gap-3">
                  {pagina > 1 ? (
                    <Button asChild variant="secundario" size="pequeno">
                      <Link href={endereco({ pagina: String(pagina - 1) })}>Anterior</Link>
                    </Button>
                  ) : null}
                  <span className="texto-pequeno text-texto-secundario">
                    Página {pagina} de {totalDePaginas}
                  </span>
                  {pagina < totalDePaginas ? (
                    <Button asChild variant="secundario" size="pequeno">
                      <Link href={endereco({ pagina: String(pagina + 1) })}>Próxima</Link>
                    </Button>
                  ) : null}
                </nav>
              ) : null}
            </footer>
          }
        />
      )}
      </>
      ) : null}

      {rapida ? (
        <EdicaoRapida
          key={`${rapida.noticia.id}:${rapida.noticia.revisao}`}
          noticia={rapida.noticia}
          categorias={rapida.categorias}
          acoes={rapida.acoes}
          hrefAoFechar={endereco({ editar: undefined })}
        />
      ) : null}
    </div>
  );
}

/** "2026-10" vira { ano: 2026, mes: 10 }; qualquer outra coisa, nada (fica o mês de hoje). */
function lerMes(texto: string | undefined) {
  const partes = /^(\d{4})-(\d{2})$/.exec(texto ?? "");
  if (!partes) return null;
  const ano = Number(partes[1]);
  const mes = Number(partes[2]);
  return mes >= 1 && mes <= 12 && ano >= 2000 && ano <= 2100 ? { ano, mes } : null;
}

/** O que a Edição rápida precisa (só notícias: editais e acordos chegam no #12). */
async function dadosDaEdicaoRapida(id: string, quem: Parameters<typeof carregarNoticia>[1]["quem"]) {
  const noticia = await carregarNoticia(id, { quem });
  if (!noticia || noticia.estado === "arquivado") return null;
  // "Últimas ações" vêm da Atividade, que só o ADM vê (spec §2.3): para os outros, o quadro não aparece.
  const [acoes, categorias] = await Promise.all([
    pode(quem, "ver", { tipo: "atividade" }) ? ultimasAcoes(id, { quem }) : [],
    listarCategorias(["noticias"], { quem }),
  ]);
  return {
    categorias: categorias.map(({ id: idCategoria, nome }) => ({ id: idCategoria, nome })),
    noticia: {
      id: noticia.id,
      revisao: noticia.revisao,
      estado: noticia.estado,
      titulo: noticia.dados.titulo,
      categoriaId: noticia.dados.categoriaId,
      agendadoPara: noticia.agendadoPara?.toISOString() ?? null,
      publicadoEm: noticia.publicadoEm?.toISOString() ?? null,
      temAlteracoesNaoPublicadas: temAlteracoesNaoPublicadas(noticia),
      motivoOculto: noticia.motivoOculto,
      podeArquivar: pode(quem, "arquivar", { tipo: "noticia" }),
      sugestaoDeData: noticia.agendadoPara
        ? bahiaEmCampos(noticia.agendadoPara)
        : { data: bahiaEmCampos(new Date(Date.now() + 24 * 60 * 60 * 1000)).data, hora: "08:00" },
    },
    acoes: acoes.map((a, i) => ({
      id: `${i}`,
      texto: descreverAcao(a.acao, a.detalhe),
      detalhe: `${a.quemNome ?? "Sistema"} · ${quandoNaBahia(a.quando)}`,
    })),
  };
}

/** A linha da tabela, com os textos prontos no horário da Bahia e o menu de ações de quem está vendo. */
function linhaDaTabela(item: ItemConteudo, quem: QuemDaEquipe, hrefRapida: string | null): LinhaDaTabela {
  return {
    id: item.id,
    tipo: item.tipo,
    titulo: item.tipo === "noticia" ? rotuloDaNoticia(item.titulo) : rotuloDoDocumento(item.tipo, item.titulo),
    semTitulo: !item.titulo,
    estado: item.estado,
    categoria: item.categoria,
    autorNome: item.autorNome,
    noSite: textoNoSite(item),
    atualizado: quandoNaBahia(item.atualizadoEm),
    hrefEditor: `/painel/conteudos/${item.tipo === "noticia" ? "noticia" : "documento"}/${item.id}`,
    hrefRapida,
    // Edital e acordo: o mesmo menu, só para o ADM (RN08, E46).
    acoes: acoesDisponiveis(item, quem),
    seloVigencia: item.datasDoSelo ? seloDeVigencia({ estado: item.estado, ...item.datasDoSelo }, new Date()) : null,
    somenteVer: item.tipo !== "noticia" && !pode(quem, "editar", { tipo: "documento" }),
  };
}

/** Coluna "No site" (Figma 110:845). Oculto mostra "Retirado em", que vem de `ocultado_em` (E45). */
function textoNoSite(item: ItemConteudo) {
  if (item.estado === "agendado" && item.agendadoPara) return `Agendada para ${dataHoraNaBahia(item.agendadoPara)}`;
  if (item.estado === "oculto") return item.ocultadoEm ? `Retirado em ${quandoNaBahia(item.ocultadoEm)}` : "Fora do site";
  if (item.estado === "arquivado" || (item.estado === "rascunho" && item.jaPublicado)) return "Fora do site";
  return item.publicadoEm ? `Desde ${quandoNaBahia(item.publicadoEm)}` : "Não publicado";
}

/** Vazio (E23; Figma 118:3448, “Nenhum conteúdo encontrado”): ícone, frase e ação. */
function Vazio({
  filtrando,
  busca,
  podeCriar,
  podeCriarDocumento,
  arquivados,
  hrefLimpar,
}: {
  filtrando: boolean;
  busca: string;
  podeCriar: boolean;
  podeCriarDocumento: boolean;
  arquivados: boolean;
  hrefLimpar: string;
}) {
  if (arquivados && !filtrando) {
    return (
      <section className="flex flex-col items-center gap-3 rounded-[16px] border border-borda-padrao bg-fundo-superficie px-6 py-10 text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-status-neutro-fundo text-texto-secundario">
          <Archive aria-hidden className="size-7" />
        </span>
        <h2 className="texto-titulo-card text-texto-primario">Nenhum conteúdo arquivado</h2>
        <p className="max-w-[420px] texto-pequeno text-texto-secundario">
          O que você arquivar sai do site e das listas e fica guardado aqui, com histórico e anexos.
        </p>
        <Button asChild variant="secundario">
          <Link href="/painel/conteudos">Ver conteúdos</Link>
        </Button>
      </section>
    );
  }
  return (
    <section className="flex flex-col items-center gap-3 rounded-[16px] border border-borda-padrao bg-fundo-superficie px-6 py-10 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-status-neutro-fundo text-texto-secundario">
        {filtrando ? <Search aria-hidden className="size-7" /> : <FileText aria-hidden className="size-7" />}
      </span>
      <h2 className="texto-titulo-card text-texto-primario">{filtrando ? "Nenhum conteúdo encontrado" : "Ainda não há conteúdos"}</h2>
      <p className="max-w-[420px] texto-pequeno text-texto-secundario">
        {filtrando
          ? busca
            ? `Não há resultados para “${busca}” com os filtros atuais.`
            : "Não há conteúdos com os filtros atuais."
          : "Escreva a primeira notícia. Ela fica como rascunho até você publicar."}
      </p>
      <div className="flex flex-wrap justify-center gap-2.5 pt-1">
        {filtrando ? (
          <Button asChild variant="secundario">
            <Link href={hrefLimpar}>Limpar filtros</Link>
          </Button>
        ) : null}
        {podeCriar && !arquivados ? (
          <MenuCriar podeCriarDocumento={podeCriarDocumento} alinhar="start">
            <Button>
              <Plus aria-hidden />
              Criar conteúdo
            </Button>
          </MenuCriar>
        ) : null}
      </div>
    </section>
  );
}

import { FileText, FolderClosed, Pencil, Plus, Scale, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { MenuCriar } from "@/components/painel/menu-criar";
import { Alerta } from "@/components/ui/alerta";
import { Button } from "@/components/ui/button";
import { exigirArea } from "@/lib/acesso/sessao-da-equipe";
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
import { quandoNaBahia } from "@/lib/datas";
import { pode } from "@/lib/permissoes";
import { cn } from "@/lib/utils";

import { FiltroSelect } from "./filtros";
import { ESTADO, SeloCategoria, SeloEstado } from "./selos";

export const metadata: Metadata = { title: "Conteúdos" };

type Busca = { tipo?: string; estado?: string; categoria?: string; autor?: string; busca?: string; pagina?: string };

const TIPOS: { valor: TipoConteudo | "todos"; rotulo: string }[] = [
  { valor: "todos", rotulo: "Todos" },
  { valor: "noticia", rotulo: "Notícias" },
  { valor: "edital", rotulo: "Editais" },
  { valor: "acordo", rotulo: "Acordos e convenções" },
];

const NOME_DO_TIPO: Record<TipoConteudo, { rotulo: string; icone: typeof FileText }> = {
  noticia: { rotulo: "Notícia", icone: FileText },
  edital: { rotulo: "Edital", icone: FolderClosed },
  acordo: { rotulo: "Acordo", icone: Scale },
};

const UUID = /^[0-9a-f-]{36}$/i;

/**
 * Conteúdos (RF35; Figma 110:845, 120:3650 e 214:33364): notícias, editais e acordos num lugar
 * só, com abas por tipo, busca, filtros e páginas. Seleção em lote e Arquivados chegam no #11.
 */
export default async function PaginaConteudos({ searchParams }: { searchParams: Promise<Busca> }) {
  const pessoa = await exigirArea("conteudos");
  const p = await searchParams;
  const tipo = TIPOS.some((t) => t.valor === p.tipo && t.valor !== "todos") ? (p.tipo as TipoConteudo) : undefined;
  const estado = (ESTADOS_DA_LISTA as readonly string[]).includes(p.estado ?? "") ? (p.estado as EstadoConteudo) : undefined;
  const categoriaId = p.categoria && UUID.test(p.categoria) ? p.categoria : undefined;
  const autorId = p.autor && UUID.test(p.autor) ? p.autor : undefined;
  const busca = p.busca?.trim() ?? "";
  const pagina = Math.max(1, Number.parseInt(p.pagina ?? "1", 10) || 1);

  const deps = { quem: pessoa.quem };
  const [lista, porTipo, categorias, autores] = await Promise.all([
    listarConteudos({ tipo, estado, categoriaId, autorId, busca, pagina }, deps),
    contarConteudosPorTipo(deps),
    listarCategorias("noticias", deps),
    listarAutores(deps),
  ]);

  const endereco = (mudanca: Partial<Busca>) => {
    const valores: Busca = { tipo, estado, categoria: categoriaId, autor: autorId, busca, pagina: String(pagina), ...mudanca };
    const consulta = new URLSearchParams();
    for (const [chave, valor] of Object.entries(valores)) {
      if (valor && !(chave === "pagina" && valor === "1")) consulta.set(chave, valor);
    }
    return `/painel/conteudos${consulta.size ? `?${consulta}` : ""}`;
  };

  const podeCriar = pode(pessoa.quem, "criar", { tipo: "noticia" });
  const podeCriarDocumento = pode(pessoa.quem, "criar", { tipo: "documento" });
  const filtrando = !!(tipo || estado || categoriaId || autorId || busca);
  const totalDePaginas = Math.max(1, Math.ceil(lista.total / POR_PAGINA));
  const primeiro = lista.total === 0 ? 0 : (pagina - 1) * POR_PAGINA + 1;

  return (
    <div className="flex flex-1 flex-col gap-6 px-5 pt-8 pb-12 lg:px-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1.5">
          <h1 className="texto-titulo-card-grande text-texto-primario">Conteúdos</h1>
          <p className="max-w-[640px] texto-corpo text-texto-secundario">
            Notícias, editais e acordos coletivos em um só lugar. Comunicados, Rádio Chofer e benefícios têm áreas próprias no menu.
          </p>
        </div>
        {podeCriar ? (
          <MenuCriar podeCriarDocumento={podeCriarDocumento}>
            <Button className="self-start">
              <Plus aria-hidden />
              Criar conteúdo
            </Button>
          </MenuCriar>
        ) : null}
      </header>

      <nav aria-label="Tipos de conteúdo" className="flex flex-wrap items-center gap-2">
        {TIPOS.map((aba) => {
          const atual = (tipo ?? "todos") === aba.valor;
          return (
            <Link
              key={aba.valor}
              href={endereco({ tipo: aba.valor === "todos" ? undefined : aba.valor, pagina: "1" })}
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
      </nav>

      {podeCriarDocumento ? null : (
        <Alerta tipo="informacao" titulo="Editais e acordos coletivos: só o Administrador geral publica">
          Você pode ver, baixar e citar esses documentos nas notícias. Para corrigir ou substituir um documento oficial, avise o
          Administrador geral.
        </Alerta>
      )}

      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
        <form role="search" action="/painel/conteudos" className="lg:min-w-[320px] lg:flex-1">
          {Object.entries({ tipo, estado, categoria: categoriaId, autor: autorId }).map(([nome, valor]) =>
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
          <FiltroSelect
            nome="estado"
            rotulo="Estado"
            valor={estado ?? ""}
            opcoes={[{ valor: "", rotulo: "Todos" }, ...ESTADOS_DA_LISTA.map((e) => ({ valor: e, rotulo: ESTADO[e].rotulo }))]}
          />
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
        <Vazio filtrando={filtrando} busca={busca} podeCriar={podeCriar} podeCriarDocumento={podeCriarDocumento} />
      ) : (
        <section aria-label="Lista de conteúdos" className="overflow-hidden rounded-[16px] border border-borda-padrao bg-fundo-superficie">
          <table className="w-full border-collapse text-left">
            <thead className="hidden bg-fundo-superficie-alt md:table-header-group">
              <tr className="texto-etiqueta text-texto-secundario uppercase">
                <th scope="col" className="px-5 py-3.5 font-[inherit]">Título</th>
                <th scope="col" className="px-3 py-3.5 font-[inherit]">Tipo</th>
                <th scope="col" className="px-3 py-3.5 font-[inherit]">Estado</th>
                <th scope="col" className="hidden px-3 py-3.5 font-[inherit] xl:table-cell">No site</th>
                <th scope="col" className="px-3 py-3.5 font-[inherit]">Atualizado</th>
                <th scope="col" className="px-5 py-3.5 font-[inherit]">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {lista.itens.map((item) => (
                <Linha key={item.id} item={item} />
              ))}
            </tbody>
          </table>
          <footer className="flex flex-col items-center justify-between gap-3 border-t border-borda-padrao px-5 py-4 sm:flex-row">
            <p className="texto-pequeno text-texto-secundario">
              Mostrando {primeiro}–{primeiro + lista.itens.length - 1} de {lista.total} {lista.total === 1 ? "conteúdo" : "conteúdos"}
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
        </section>
      )}
    </div>
  );
}

function hrefDoEditor(item: ItemConteudo) {
  return item.tipo === "noticia" ? `/painel/conteudos/noticia/${item.id}` : null;
}

function Linha({ item }: { item: ItemConteudo }) {
  const tipo = NOME_DO_TIPO[item.tipo];
  const href = hrefDoEditor(item);
  const titulo = item.titulo || "Notícia sem manchete";
  return (
    <tr className="flex flex-col gap-2 border-t border-borda-padrao px-5 py-4 first:border-t-0 md:table-row md:px-0 md:py-0">
      <td className="md:px-5 md:py-4">
        <div className="flex min-w-0 flex-col gap-1">
          {href ? (
            <Link
              href={href}
              className={cn(
                "line-clamp-2 texto-titulo-card-pequeno outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring md:line-clamp-1",
                item.titulo ? "text-texto-primario" : "text-texto-terciario italic",
              )}
            >
              {titulo}
            </Link>
          ) : (
            <span className="texto-titulo-card-pequeno text-texto-primario">{titulo}</span>
          )}
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1 texto-pequeno text-texto-secundario">
            {item.categoria ? <SeloCategoria nome={item.categoria.nome} cor={item.categoria.cor} /> : null}
            {item.autorNome}
          </span>
        </div>
      </td>
      <td className="texto-pequeno text-texto-secundario md:px-3 md:py-4">
        <span className="inline-flex items-center gap-1.5">
          <tipo.icone aria-hidden className="size-4" />
          {tipo.rotulo}
        </span>
      </td>
      <td className="md:px-3 md:py-4">
        <SeloEstado estado={item.estado} />
      </td>
      <td className="hidden texto-pequeno text-texto-secundario md:px-3 md:py-4 xl:table-cell">
        {item.publicadoEm ? `Desde ${quandoNaBahia(item.publicadoEm)}` : "Não publicado"}
      </td>
      <td className="texto-pequeno text-texto-secundario md:px-3 md:py-4">
        <span className="md:hidden">Atualizado em </span>
        {quandoNaBahia(item.atualizadoEm)}
      </td>
      <td className="md:px-5 md:py-4">
        {href ? (
          <Link
            href={href}
            aria-label={`Editar “${titulo}”`}
            className="inline-flex size-9 items-center justify-center rounded-[10px] text-texto-secundario outline-none hover:bg-fundo-superficie-alt hover:text-texto-primario focus-visible:ring-[3px] focus-visible:ring-ring"
          >
            <Pencil aria-hidden className="size-[18px]" />
          </Link>
        ) : null}
      </td>
    </tr>
  );
}

/** Vazio (E23; Figma 118:3448, “Nenhum conteúdo encontrado”): ícone, frase e ação. */
function Vazio({
  filtrando,
  busca,
  podeCriar,
  podeCriarDocumento,
}: {
  filtrando: boolean;
  busca: string;
  podeCriar: boolean;
  podeCriarDocumento: boolean;
}) {
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
            <Link href="/painel/conteudos">Limpar filtros</Link>
          </Button>
        ) : null}
        {podeCriar ? (
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

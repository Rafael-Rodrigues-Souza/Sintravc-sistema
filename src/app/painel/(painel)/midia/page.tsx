import type { Metadata } from "next";
import Link from "next/link";

import { IconeFigma } from "@/components/icone-figma";
import { Button } from "@/components/ui/button";
import { exigirArea } from "@/lib/acesso/sessao-da-equipe";
import { urlPublica } from "@/lib/armazenamento";
import { dataNaBahia } from "@/lib/datas";
import { lerEnvArmazenamento } from "@/lib/env";
import { linhaDoCartao, podeTerLogo, siglaDoFormato, tamanhoLegivel, tipoLegivel } from "@/lib/midia/apresentacao";
import { limitesDaMidia } from "@/lib/midia/enviar";
import { erroDeTamanho } from "@/lib/midia/erros";
import {
  contarMidia,
  detalharMidia,
  FILTROS,
  listarMidia,
  POR_PAGINA,
  type FiltroMidia,
  type ItemMidia,
} from "@/lib/midia/listar";
import { pode } from "@/lib/permissoes";
import { cn } from "@/lib/utils";
import { ehUuid } from "@/lib/uuid";

import { DetalhesArquivo, MiniaturaDeArquivo, type ArquivoDetalhado } from "./detalhes-arquivo";
import { AreaDeSoltar, BotaoEnviarArquivos, ListaDeEnvios, ProvedorDeEnvios } from "./envios";

export const metadata: Metadata = { title: "Mídia" };

type Busca = { filtro?: string; busca?: string; arquivo?: string; pagina?: string };

/**
 * Mídia (RF48, RF49; Figma 116:2727 com a correção C1): biblioteca com filtros e busca, envio com
 * progresso (HEIC convertido no servidor), detalhes com texto alternativo e exclusão só sem uso.
 */
export default async function PaginaMidia({ searchParams }: { searchParams: Promise<Busca> }) {
  const pessoa = await exigirArea("midia");
  const parametros = await searchParams;
  const filtro: FiltroMidia = (FILTROS as readonly string[]).includes(parametros.filtro ?? "")
    ? (parametros.filtro as FiltroMidia)
    : "todos";
  const busca = parametros.busca?.trim() ?? "";
  const pagina = Math.max(1, Number.parseInt(parametros.pagina ?? "1", 10) || 1);

  const env = lerEnvArmazenamento();
  const [lista, contagem, detalhe, limites] = await Promise.all([
    listarMidia({ filtro, busca, pagina, porPagina: POR_PAGINA }),
    contarMidia(),
    ehUuid(parametros.arquivo) ? detalharMidia(parametros.arquivo) : undefined,
    limitesDaMidia(),
  ]);

  const endereco = (mudanca: Partial<Busca>) => {
    const valores: Busca = { filtro, busca, arquivo: detalhe?.id, pagina: String(pagina), ...mudanca };
    const consulta = new URLSearchParams();
    if (valores.filtro && valores.filtro !== "todos") consulta.set("filtro", valores.filtro);
    if (valores.busca) consulta.set("busca", valores.busca);
    if (valores.pagina && valores.pagina !== "1") consulta.set("pagina", valores.pagina);
    if (valores.arquivo) consulta.set("arquivo", valores.arquivo);
    const texto = consulta.toString();
    return `/painel/midia${texto ? `?${texto}` : ""}`;
  };

  const podeEnviar = pode(pessoa.quem, "enviar", { tipo: "midia" });
  const totalDePaginas = Math.max(1, Math.ceil(lista.total / POR_PAGINA));

  const arquivoDetalhado: ArquivoDetalhado | undefined = detalhe
    ? {
        id: detalhe.id,
        url: urlPublica(detalhe.chaveR2, env),
        nomeArquivo: detalhe.nomeArquivo,
        tipo: detalhe.tipo,
        sigla: siglaDoFormato(detalhe.mime),
        logo: podeTerLogo(detalhe.mime),
        alt: detalhe.alt,
        legenda: detalhe.legenda,
        usos: detalhe.usos,
        informacoes: [
          { rotulo: "Tipo", valor: tipoLegivel(detalhe.mime) },
          ...(detalhe.largura && detalhe.altura
            ? [{ rotulo: "Dimensões", valor: `${detalhe.largura} × ${detalhe.altura} px` }]
            : []),
          ...(detalhe.paginas
            ? [{ rotulo: "Páginas", valor: String(detalhe.paginas) }]
            : []),
          { rotulo: "Tamanho", valor: tamanhoLegivel(detalhe.bytes) },
          { rotulo: "Enviado", valor: `${detalhe.enviadoPor} · ${dataNaBahia(detalhe.criadoEm)}` },
        ],
      }
    : undefined;

  const abas: { valor: FiltroMidia; rotulo: string; total: number }[] = [
    { valor: "todos", rotulo: "Todos", total: contagem.todos },
    { valor: "imagens", rotulo: "Imagens", total: contagem.imagens },
    { valor: "pdfs", rotulo: "PDFs", total: contagem.pdfs },
    { valor: "documentos", rotulo: "Documentos", total: contagem.documentos },
  ];

  // Arrastar e soltar só para quem pode enviar; para os outros, a área é um bloco comum.
  const Conteudo = podeEnviar ? AreaDeSoltar : "div";

  return (
    <ProvedorDeEnvios
      tamanhoMaximoBytes={limites.tamanhoMaximoBytes}
      mensagemDeTamanho={erroDeTamanho(limites.tamanhoMaximoBytes).message}
    >
      <Conteudo className="flex flex-1 flex-col gap-6 px-5 pt-8 pb-12 lg:px-10">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-col gap-1.5">
            <h1 className="texto-titulo-card-grande text-texto-primario">Mídia</h1>
            <p className="texto-corpo text-texto-secundario">
              Imagens, PDFs e documentos usados no site. Tudo o que você envia fica aqui para reutilizar.
            </p>
          </div>
          {podeEnviar ? <BotaoEnviarArquivos /> : null}
        </header>

        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <nav aria-label="Filtros da Mídia" className="flex flex-wrap items-center gap-2">
            {abas.map((aba) => (
              <Link
                key={aba.valor}
                href={endereco({ filtro: aba.valor, pagina: "1", arquivo: undefined })}
                aria-current={filtro === aba.valor ? "page" : undefined}
                className={cn(
                  "alvo-toque flex items-center gap-2 rounded-full px-[18px] py-2.5 texto-navegacao outline-none focus-visible:ring-[3px] focus-visible:ring-ring",
                  filtro === aba.valor
                    ? "bg-destaque-amarelo text-destaque-marinho-fixo"
                    : "border border-borda-padrao bg-fundo-superficie text-texto-secundario hover:bg-fundo-superficie-alt",
                )}
              >
                {aba.rotulo}
                <span className={cn("texto-etiqueta", filtro === aba.valor ? "opacity-70" : "text-texto-terciario")}>
                  {aba.total}
                </span>
              </Link>
            ))}
            <Link
              href={endereco({ filtro: "sem_alt", pagina: "1", arquivo: undefined })}
              aria-current={filtro === "sem_alt" ? "page" : undefined}
              className={cn(
                "alvo-toque flex items-center gap-1.5 rounded-full py-[9px] pr-4 pl-3.5 texto-titulo-card-pequeno text-status-perigo-texto outline-none focus-visible:ring-[3px] focus-visible:ring-ring",
                "bg-status-perigo-fundo",
                filtro === "sem_alt" && "ring-2 ring-status-perigo-texto",
              )}
            >
              <IconeFigma src="/painel/icone-alerta.svg" tamanho={16} />
              Sem texto alternativo · {contagem.semAlt}
            </Link>
          </nav>
          <form role="search" action="/painel/midia" className="xl:ml-auto">
            {filtro !== "todos" ? <input type="hidden" name="filtro" value={filtro} /> : null}
            <label className="flex h-11 w-full items-center gap-2.5 rounded-[12px] border border-borda-padrao bg-fundo-superficie px-3.5 text-texto-terciario focus-within:ring-[3px] focus-within:ring-ring xl:w-[240px]">
              <IconeFigma src="/painel/icone-busca.svg" tamanho={18} />
              <span className="sr-only">Buscar arquivo</span>
              <input
                type="search"
                name="busca"
                defaultValue={busca}
                placeholder="Buscar arquivo"
                className="min-w-0 flex-1 bg-transparent texto-pequeno text-texto-primario outline-none placeholder:text-texto-terciario"
              />
            </label>
          </form>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <ListaDeEnvios />
            {lista.itens.length === 0 ? (
              <Vazio busca={busca} filtro={filtro} podeEnviar={podeEnviar} hrefLimpar="/painel/midia" />
            ) : (
              <ul
                aria-label="Arquivos"
                className={cn(
                  "grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4",
                  !arquivoDetalhado && "2xl:grid-cols-5",
                )}
              >
                {lista.itens.map((item) => (
                  <li key={item.id}>
                    <Cartao
                      item={item}
                      url={urlPublica(item.chaveR2, env)}
                      href={endereco({ arquivo: item.id })}
                      selecionado={item.id === detalhe?.id}
                    />
                  </li>
                ))}
              </ul>
            )}
            {totalDePaginas > 1 ? (
              <nav aria-label="Páginas" className="flex items-center justify-center gap-3 pt-2">
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
          </div>

          {arquivoDetalhado ? (
            <DetalhesArquivo
              arquivo={arquivoDetalhado}
              hrefFechar={endereco({ arquivo: undefined })}
              podeEditar={pode(pessoa.quem, "editar_alt", { tipo: "midia" })}
              // O perfil decide se aparece a área de excluir; se o arquivo estiver em uso, ela mostra o bloqueio (RN16).
              podeExcluir={pode(pessoa.quem, "excluir", { tipo: "midia", emUso: false })}
            />
          ) : null}
        </div>
      </Conteudo>
    </ProvedorDeEnvios>
  );
}

function Cartao({ item, url, href, selecionado }: { item: ItemMidia; url: string; href: string; selecionado: boolean }) {
  const semAlt = item.tipo === "imagem" && !item.alt?.trim();
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={selecionado ? "true" : undefined}
      className={cn(
        "flex h-full flex-col gap-2.5 rounded-[16px] bg-fundo-superficie px-2 pt-2 pb-3 outline-none focus-visible:ring-[3px] focus-visible:ring-ring",
        selecionado ? "border-2 border-destaque-azul" : "border border-borda-padrao hover:border-borda-forte",
      )}
    >
      <div className={cn("relative h-28 w-full overflow-hidden rounded-[10px]", item.tipo === "imagem" && podeTerLogo(item.mime) && "fundo-xadrez")}>
        {item.tipo === "imagem" ? (
          // PNG e WebP (logos) inteiros e sobre o xadrez, nos dois temas; JPG (foto) preenche (E48).
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" loading="lazy" className={cn("size-full", podeTerLogo(item.mime) ? "object-contain" : "object-cover")} />
        ) : (
          <MiniaturaDeArquivo sigla={siglaDoFormato(item.mime)} tipo={item.tipo} className="h-full" />
        )}
        {selecionado ? (
          <span className="absolute top-2 left-2 flex size-6 items-center justify-center rounded-full bg-destaque-azul text-texto-invertido">
            <IconeFigma src="/painel/icone-check-marca.svg" tamanho={14} />
          </span>
        ) : null}
      </div>
      <div className="flex min-w-0 flex-col gap-0.5 px-1">
        <p className="truncate texto-titulo-card-pequeno text-texto-primario">{item.nomeArquivo}</p>
        <p className="truncate texto-pequeno text-texto-terciario">{linhaDoCartao(item)}</p>
      </div>
      <div className="flex flex-wrap gap-1.5 px-1 pt-0.5">
        {item.usos > 0 ? (
          <Selo className="bg-destaque-azul-suave text-destaque-azul">Usado em {item.usos}</Selo>
        ) : (
          <Selo className="bg-status-neutro-fundo text-status-neutro-texto">Sem uso</Selo>
        )}
        {semAlt ? (
          <Selo className="gap-1 bg-status-perigo-fundo text-status-perigo-texto">
            <IconeFigma src="/painel/icone-alerta.svg" tamanho={12} />
            Sem alt
          </Selo>
        ) : null}
      </div>
    </Link>
  );
}

function Selo({ className, children }: { className: string; children: React.ReactNode }) {
  return <span className={cn("inline-flex items-center rounded-full px-2 py-[3px] texto-etiqueta uppercase", className)}>{children}</span>;
}

/** Vazio (E23): ícone, frase e ação. */
function Vazio({
  busca,
  filtro,
  podeEnviar,
  hrefLimpar,
}: {
  busca: string;
  filtro: FiltroMidia;
  podeEnviar: boolean;
  hrefLimpar: string;
}) {
  const filtrando = busca !== "" || filtro !== "todos";
  return (
    <section className="flex flex-col items-center gap-3 rounded-[16px] border border-borda-padrao bg-fundo-superficie px-6 py-10 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-status-neutro-fundo text-texto-secundario">
        <IconeFigma src={filtrando ? "/painel/icone-busca.svg" : "/painel/menu-imagem.svg"} tamanho={28} />
      </span>
      <h2 className="texto-titulo-card text-texto-primario">
        {filtrando ? "Nenhum arquivo encontrado" : "A Mídia ainda está vazia"}
      </h2>
      <p className="max-w-[420px] texto-pequeno text-texto-secundario">
        {filtrando
          ? busca
            ? `Não há resultados para “${busca}” com os filtros atuais.`
            : "Não há arquivos neste filtro."
          : "Envie fotos, PDFs e documentos. Eles ficam guardados aqui para usar nas notícias, documentos e benefícios."}
      </p>
      <div className="flex flex-wrap justify-center gap-2.5 pt-1">
        {filtrando ? (
          <Button asChild variant="secundario">
            <Link href={hrefLimpar}>Limpar filtros</Link>
          </Button>
        ) : null}
        {podeEnviar && !filtrando ? <BotaoEnviarArquivos /> : null}
      </div>
    </section>
  );
}

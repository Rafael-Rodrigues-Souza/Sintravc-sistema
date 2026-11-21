import { Plus } from "lucide-react";
import Link from "next/link";

import { IconeFigma } from "@/components/icone-figma";
import { CartaoDocumento } from "@/components/site/cartao-documento";
import { Button } from "@/components/ui/button";
import { DOCUMENTOS_PAGINA } from "@/conteudo/site";
import { enderecoDaAba, type AbaDocumentos, type FiltrosDeDocumentos } from "@/lib/documentos-do-site/filtros";
import { gruposPorMes, type ListaDeDocumentos } from "@/lib/documentos-do-site/pagina";

/**
 * A lista de uma aba (Figma 73:858 / 75:1640; E60). Editais em grupos pelo mês da publicação;
 * Acordos sem grupos, com o quadro do ano. “Carregar mais publicações” é um link (`?mais=N`) que
 * mantém a rolagem: funciona sem JavaScript e os grupos continuam certos.
 */
export function ListaDeDocumentos({ aba, filtros, lista }: { aba: AbaDocumentos; filtros: FiltrosDeDocumentos; lista: ListaDeDocumentos }) {
  const t = DOCUMENTOS_PAGINA;
  const acordos = aba === "acordos-coletivos";
  const cartao = (item: ListaDeDocumentos["itens"][number]) => (
    <CartaoDocumento
      documento={item.cartao}
      href={item.href}
      novo={item.novo}
      ano={acordos ? item.ano : undefined}
      rotuloAbrir={acordos ? t.acordos.abrir : undefined}
    />
  );
  return (
    <div className="flex flex-col gap-4" data-testid="lista-documentos">
      {acordos ? (
        <ul className="flex flex-col gap-4">
          {lista.itens.map((item) => (
            <li key={item.id}>{cartao(item)}</li>
          ))}
        </ul>
      ) : (
        gruposPorMes(lista.itens).map((grupo) => (
          <section key={grupo.chave} aria-labelledby={`mes-${grupo.chave}`} className="flex flex-col gap-4">
            <h3 id={`mes-${grupo.chave}`} className="flex items-center gap-3 pt-2 texto-eyebrow text-texto-secundario">
              {grupo.rotulo}
              <span aria-hidden className="h-px flex-1 bg-borda-padrao" />
            </h3>
            <ul className="flex flex-col gap-4">
              {grupo.itens.map((item) => (
                <li key={item.id}>{cartao(item)}</li>
              ))}
            </ul>
          </section>
        ))
      )}
      {lista.temMais ? (
        <div className="flex justify-center pt-4">
          <Button asChild variant="secundario" className="w-full sm:w-auto">
            <Link href={enderecoDaAba(aba, { ...filtros, mais: filtros.mais + 1 })} scroll={false}>
              <Plus aria-hidden />
              {t.carregarMais}
            </Link>
          </Button>
        </div>
      ) : null}
    </div>
  );
}

/** Estado vazio do E23: ícone, frase e ação. Sem resultado nos filtros, “Limpar filtros”. */
export function VazioDeDocumentos({ aba, filtrando }: { aba: AbaDocumentos; filtrando: boolean }) {
  const t = DOCUMENTOS_PAGINA;
  const daAba = aba === "editais" ? t.editais : t.acordos;
  return (
    <div className="flex flex-col items-center gap-3 rounded-[16px] border border-borda-padrao bg-fundo-superficie px-6 py-10 text-center">
      <span aria-hidden className="flex size-16 items-center justify-center rounded-full bg-status-neutro-fundo text-texto-secundario">
        <IconeFigma src={filtrando ? "/site/icone-busca.svg" : "/site/icone-documento.svg"} tamanho={28} />
      </span>
      <h3 className="texto-titulo-card text-texto-primario">{filtrando ? t.semResultadoTitulo : daAba.vazioTitulo}</h3>
      <p className="max-w-[420px] texto-pequeno text-texto-secundario">{filtrando ? t.semResultadoTexto : daAba.vazioTexto}</p>
      <Button asChild variant="secundario" className="mt-1">
        <Link href={filtrando ? enderecoDaAba(aba, {}) : "/"}>{filtrando ? t.semResultadoAcao : t.vazioAcao}</Link>
      </Button>
    </div>
  );
}

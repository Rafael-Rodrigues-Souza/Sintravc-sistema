"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { IconeFigma } from "@/components/icone-figma";
import { Alerta } from "@/components/ui/alerta";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Campo } from "@/components/ui/campo";
import { enquadramentoDaImagem } from "@/lib/midia/apresentacao";
import type { UsoDaMidia } from "@/lib/midia/erros";
import { cn } from "@/lib/utils";

import { acaoExcluirMidia, acaoSalvarDetalhes, type EstadoDetalhes } from "./acoes";

export type ArquivoDetalhado = {
  id: string;
  url: string;
  nomeArquivo: string;
  tipo: "imagem" | "pdf" | "documento";
  sigla: string;
  /** PNG ou WebP (logos): a prévia mostra a imagem inteira, sobre o xadrez. */
  mostrarInteira: boolean;
  alt: string | null;
  legenda: string | null;
  informacoes: { rotulo: string; valor: string }[];
  usos: UsoDaMidia[];
};

/**
 * "Detalhes do arquivo" (Figma 116:2727): prévia, nome, texto alternativo, legenda e crédito,
 * informações, "Usado em", Copiar link, Salvar e excluir (RF48, RF49, RN16).
 */
export function DetalhesArquivo({
  arquivo,
  hrefFechar,
  podeEditar,
  podeExcluir,
}: {
  arquivo: ArquivoDetalhado;
  hrefFechar: string;
  podeEditar: boolean;
  podeExcluir: boolean;
}) {
  const [estado, salvar, salvando] = React.useActionState<EstadoDetalhes, FormData>(acaoSalvarDetalhes, {});

  React.useEffect(() => {
    if (estado.salvoEm) toast.success("Alterações salvas.");
  }, [estado.salvoEm]);

  // No celular os detalhes ficam abaixo da grade: ao escolher um arquivo, a tela desce até eles.
  const painel = React.useRef<HTMLElement>(null);
  React.useEffect(() => {
    if (window.matchMedia("(max-width: 1023px)").matches) painel.current?.scrollIntoView({ block: "start" });
  }, [arquivo.id]);

  async function copiarLink() {
    try {
      await navigator.clipboard.writeText(arquivo.url);
      toast.success("Link copiado.");
    } catch {
      toast.error("Não foi possível copiar. Selecione o endereço e copie à mão.", { description: arquivo.url });
    }
  }

  return (
    <aside
      ref={painel}
      aria-labelledby="titulo-detalhes"
      className="flex w-full flex-col gap-4 rounded-[20px] border border-borda-padrao bg-fundo-superficie p-5 lg:sticky lg:top-6 lg:w-[340px] lg:shrink-0"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id="titulo-detalhes" className="texto-titulo-card text-texto-primario">
          Detalhes do arquivo
        </h2>
        <Link
          href={hrefFechar}
          scroll={false}
          aria-label="Fechar os detalhes"
          className="flex size-8 items-center justify-center rounded-full bg-fundo-superficie-alt text-texto-secundario outline-none hover:brightness-95 focus-visible:ring-[3px] focus-visible:ring-ring"
        >
          <IconeFigma src="/painel/icone-fechar.svg" tamanho={16} />
        </Link>
      </div>

      <Previa arquivo={arquivo} />

      <form action={salvar} className="flex flex-col gap-4" key={arquivo.id}>
        <input type="hidden" name="id" value={arquivo.id} />
        {estado.erro ? <Alerta tipo="erro" titulo={estado.erro} /> : null}
        <Campo
          id="nomeArquivo"
          name="nomeArquivo"
          rotulo="Nome do arquivo"
          defaultValue={arquivo.nomeArquivo}
          erro={estado.erros?.nomeArquivo}
          maxLength={200}
          disabled={!podeEditar}
          required
        />
        {arquivo.tipo === "imagem" ? (
          <Campo
            id="alt"
            name="alt"
            rotulo="Texto alternativo *"
            ajuda="Descreva a imagem para quem não pode vê-la. Obrigatório para publicar."
            defaultValue={arquivo.alt ?? ""}
            erro={estado.erros?.alt}
            maxLength={250}
            disabled={!podeEditar}
          />
        ) : (
          <input type="hidden" name="alt" value={arquivo.alt ?? ""} />
        )}
        <Campo
          id="legenda"
          name="legenda"
          rotulo="Legenda e crédito"
          placeholder="Foto: Nome/SINTRAVC"
          defaultValue={arquivo.legenda ?? ""}
          erro={estado.erros?.legenda}
          maxLength={300}
          disabled={!podeEditar}
        />

        <dl className="flex flex-col gap-2 py-1">
          {arquivo.informacoes.map((info) => (
            <div key={info.rotulo} className="flex items-start gap-3">
              <dt className="w-[110px] shrink-0 texto-pequeno text-texto-terciario">{info.rotulo}</dt>
              <dd className="min-w-0 flex-1 texto-titulo-card-pequeno break-words text-texto-primario">{info.valor}</dd>
            </div>
          ))}
        </dl>

        {arquivo.usos.length > 0 ? (
          <div className="flex flex-col gap-2">
            <p className="texto-etiqueta text-texto-terciario uppercase">Usado em</p>
            <ul className="flex flex-col gap-2">
              {arquivo.usos.map((uso) => (
                <li key={`${uso.donoTipo}:${uso.donoId}`} className="flex items-center gap-2 text-destaque-azul">
                  <IconeFigma src="/painel/menu-documento.svg" tamanho={16} />
                  {uso.href ? (
                    <Link href={uso.href} className="truncate texto-pequeno hover:underline">
                      {uso.rotulo}
                    </Link>
                  ) : (
                    <span className="truncate texto-pequeno">{uso.rotulo}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2.5">
          <Button type="button" variant="secundario" onClick={copiarLink}>
            <IconeFigma src="/painel/icone-copiar.svg" tamanho={18} />
            Copiar link
          </Button>
          {podeEditar ? (
            <Button type="submit" disabled={salvando}>
              {salvando ? "Salvando…" : "Salvar"}
            </Button>
          ) : null}
        </div>
      </form>

      {podeExcluir ? <Excluir arquivo={arquivo} hrefFechar={hrefFechar} /> : null}
    </aside>
  );
}

function Previa({ arquivo }: { arquivo: ArquivoDetalhado }) {
  if (arquivo.tipo === "imagem") {
    const { fundo, imagem } = enquadramentoDaImagem(arquivo.mostrarInteira);
    return (
      // A URL vem do armazenamento (R2/MinIO), fora do otimizador de imagens do Next.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={arquivo.url}
        alt={arquivo.alt ?? ""}
        className={cn("h-[170px] w-full rounded-[14px]", fundo, imagem)}
      />
    );
  }
  return <MiniaturaDeArquivo sigla={arquivo.sigla} tipo={arquivo.tipo} className="h-[170px] rounded-[14px]" />;
}

/** Miniatura de PDF e documento: ícone e sigla, sobre o fundo do tipo (Figma 116:2952). */
export function MiniaturaDeArquivo({
  sigla,
  tipo,
  className,
}: {
  sigla: string;
  tipo: "pdf" | "documento";
  className?: string;
}) {
  const cor = tipo === "pdf" ? "bg-status-perigo-fundo text-status-perigo-texto" : "bg-destaque-azul-suave text-destaque-azul";
  return (
    <div className={`flex w-full flex-col items-center justify-center gap-1 ${cor} ${className ?? ""}`}>
      <IconeFigma src="/painel/menu-documento.svg" tamanho={32} />
      <span className="texto-etiqueta uppercase">{sigla}</span>
    </div>
  );
}

function Excluir({ arquivo, hrefFechar }: { arquivo: ArquivoDetalhado; hrefFechar: string }) {
  const router = useRouter();
  const [excluindo, iniciar] = React.useTransition();
  const [aberto, setAberto] = React.useState(false);
  const emUso = arquivo.usos.length;

  if (emUso > 0) {
    return (
      <p className="flex items-start gap-2 texto-pequeno text-texto-terciario">
        <IconeFigma src="/painel/icone-lixeira.svg" tamanho={16} className="mt-0.5" />
        Não é possível excluir: o arquivo está em uso em {emUso === 1 ? "1 conteúdo" : `${emUso} conteúdos`}. Tire o
        arquivo desses conteúdos e tente de novo.
      </p>
    );
  }

  return (
    <AlertDialog open={aberto} onOpenChange={setAberto}>
      <AlertDialogTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 self-start rounded-[8px] texto-pequeno text-status-perigo-texto outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring"
        >
          <IconeFigma src="/painel/icone-lixeira.svg" tamanho={16} />
          Excluir arquivo
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent
        icone="/painel/icone-lixeira.svg"
        tom="perigo"
        titulo="Excluir arquivo da Mídia?"
        descricao={`“${arquivo.nomeArquivo}” não está em uso e será removido definitivamente. Esta ação não pode ser desfeita.`}
      >
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button variant="secundario" disabled={excluindo}>
              Cancelar
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              variant="perigo"
              disabled={excluindo}
              onClick={(evento) => {
                evento.preventDefault();
                iniciar(async () => {
                  const resultado = await acaoExcluirMidia(arquivo.id);
                  setAberto(false);
                  if (resultado.ok) {
                    toast.success(`${arquivo.nomeArquivo} foi excluído.`);
                    router.push(hrefFechar, { scroll: false });
                    router.refresh();
                  } else {
                    toast.error(resultado.erro);
                    router.refresh();
                  }
                });
              }}
            >
              {excluindo ? "Excluindo…" : "Excluir arquivo"}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

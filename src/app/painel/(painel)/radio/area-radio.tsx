"use client";

import { ExternalLink, MoreHorizontal, Pencil, Plus, Radio, Star, Trash2, Undo2 } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DropdownMenu } from "radix-ui";
import * as React from "react";
import { toast } from "sonner";

import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogFooter } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { ProgramaAoVivo as Programa } from "@/lib/config-site/esquema";
import type { Situacao } from "@/lib/episodios/regras";
import { duracaoPorExtenso } from "@/lib/youtube/duracao";
import { cn } from "@/lib/utils";

import {
  acaoCarregarEpisodio,
  acaoExcluirEpisodio,
  acaoMarcarUltimoPrograma,
  acaoTirarDoSite,
  type EpisodioNoFormulario,
  type Resposta,
} from "./acoes";
import { FormularioEpisodio } from "./formulario-episodio";
import { SEM_CONEXAO } from "./pecas";
import { ProgramaAoVivo } from "./programa-ao-vivo";

export type EpisodioNaLista = {
  id: string;
  numero: number;
  titulo: string;
  capaUrl: string;
  /** "29/10/2026 · 13h", no horário da Bahia. */
  exibicao: string | null;
  /** "28:10". */
  duracao: string | null;
  duracaoSeg: number | null;
  ultimoPrograma: boolean;
  situacao: Situacao;
  podeExcluir: boolean;
};

/** Selos de estado (Figma 166:17373 e 118:3448, “Ciclo de vida”). */
const SELO: Record<Situacao, { rotulo: string; classe: string; ponto: string }> = {
  rascunho: { rotulo: "Rascunho", classe: "bg-status-neutro-fundo text-status-neutro-texto", ponto: "border border-current" },
  agendado: { rotulo: "Agendado", classe: "bg-destaque-azul-suave text-destaque-azul", ponto: "bg-current" },
  no_ar: { rotulo: "Publicado", classe: "bg-status-sucesso-fundo text-status-sucesso-texto", ponto: "bg-current" },
};

type Confirmacao = { tipo: "tirar" | "excluir"; item: EpisodioNaLista } | null;

/** Rádio Chofer no painel (RF45, P10; Figma 166:17373). Sem frame mobile: segue o E50 (lista vira cartões). */
export function AreaRadio({
  episodios,
  pagina,
  totalDePaginas,
  programa,
  podeGerenciar,
  proximoNumero,
  temas,
  ultimoMarcado,
  limites,
  novo: abrirNovo,
}: {
  episodios: EpisodioNaLista[];
  pagina: number;
  totalDePaginas: number;
  programa: Programa;
  podeGerenciar: boolean;
  proximoNumero: number;
  temas: { id: string; nome: string }[];
  ultimoMarcado: { id: string; numero: number } | null;
  limites: { tamanhoMaximoBytes: number; mensagemDeTamanho: string };
  novo?: boolean;
}) {
  const router = useRouter();
  const caminho = usePathname();
  const parametros = useSearchParams();
  const [formAberto, setFormAberto] = React.useState(false);
  const [emEdicao, setEmEdicao] = React.useState<EpisodioNoFormulario | null>(null);
  const [confirmacao, setConfirmacao] = React.useState<Confirmacao>(null);
  const [ocupado, setOcupado] = React.useState(false);

  const novo = () => {
    setEmEdicao(null);
    setFormAberto(true);
  };

  // “Criar conteúdo › Episódio da Rádio Chofer” (?novo=1), mesmo com a tela já aberta: abre o modal vazio uma vez.
  const [pedidoDeNovo, setPedidoDeNovo] = React.useState(false);
  if (!!abrirNovo !== pedidoDeNovo) {
    setPedidoDeNovo(!!abrirNovo);
    if (abrirNovo && podeGerenciar) novo();
  }

  // E limpa o endereço, para o voltar e o atualizar não abrirem de novo.
  React.useEffect(() => {
    if (!abrirNovo) return;
    const novos = new URLSearchParams(parametros.toString());
    novos.delete("novo");
    router.replace(`${caminho}${novos.size ? `?${novos}` : ""}`, { scroll: false });
    // Só na chegada.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abrirNovo]);

  const editar = (id: string) =>
    acaoCarregarEpisodio({ id })
      .catch(() => SEM_CONEXAO)
      .then((r) => {
        if (r.tipo === "erro") {
          toast.error(r.mensagem, { duration: Infinity, closeButton: true });
          return;
        }
        setEmEdicao(r.episodio);
        setFormAberto(true);
      });

  const depois = (r: Resposta, sucesso: string) => {
    if (r.tipo === "erro") {
      toast.error(r.mensagem, { duration: Infinity, closeButton: true });
      return false;
    }
    toast.success(sucesso);
    router.refresh();
    return true;
  };

  const marcarUltimo = async (item: EpisodioNaLista) => {
    depois(await acaoMarcarUltimoPrograma({ id: item.id }).catch(() => SEM_CONEXAO), `Ep. ${item.numero} agora é o último programa`);
  };

  const confirmar = async () => {
    if (!confirmacao) return;
    setOcupado(true);
    const { tipo, item } = confirmacao;
    const r = await (tipo === "tirar" ? acaoTirarDoSite({ id: item.id }) : acaoExcluirEpisodio({ id: item.id })).catch(() => SEM_CONEXAO);
    setOcupado(false);
    if (depois(r, tipo === "tirar" ? `Ep. ${item.numero} saiu do site e voltou para os rascunhos` : "Rascunho excluído")) setConfirmacao(null);
  };

  const href = (p: number) => `/painel/radio${p > 1 ? `?pagina=${p}` : ""}`;
  const acoes = (item: EpisodioNaLista) =>
    podeGerenciar ? (
      <Menu
        item={item}
        aoEditar={() => editar(item.id)}
        aoMarcarUltimo={() => marcarUltimo(item)}
        aoTirar={() => setConfirmacao({ tipo: "tirar", item })}
        aoExcluir={() => setConfirmacao({ tipo: "excluir", item })}
      />
    ) : null;

  return (
    <div className="flex flex-1 flex-col gap-5 px-4 pt-5 pb-12 lg:gap-6 lg:px-10 lg:pt-8">
      <header className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1.5">
          <h1 className="texto-titulo-card-grande text-texto-primario">Rádio Chofer</h1>
          <p className="hidden max-w-[720px] texto-corpo text-texto-secundario lg:block">
            Episódios publicados a partir do YouTube. O site exibe o player do YouTube, sem guardar vídeos no servidor.
          </p>
        </div>
        {podeGerenciar ? (
          <Button onClick={novo} aria-label="Adicionar episódio" className="shrink-0 rounded-full">
            <Plus aria-hidden />
            <span aria-hidden>
              Adicionar<span className="hidden lg:inline"> episódio</span>
            </span>
          </Button>
        ) : null}
      </header>

      <ProgramaAoVivo programa={programa} podeGerenciar={podeGerenciar} />

      <section aria-labelledby="episodios-titulo" className="flex min-w-0 flex-col gap-4 lg:overflow-hidden lg:rounded-[20px] lg:border lg:border-borda-padrao lg:bg-fundo-superficie">
        <h2 id="episodios-titulo" className="sr-only">
          Episódios
        </h2>
        {episodios.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-[20px] border border-dashed border-borda-padrao px-6 py-12 text-center lg:m-6">
            <span className="flex size-14 items-center justify-center rounded-full bg-status-neutro-fundo text-texto-secundario">
              <Radio aria-hidden className="size-6" />
            </span>
            <p className="texto-corpo text-texto-secundario">Nenhum episódio ainda. Cole o link de um vídeo do YouTube para começar.</p>
            {podeGerenciar ? (
              <Button variant="secundario" size="pequeno" onClick={novo}>
                <Plus aria-hidden />
                Adicionar episódio
              </Button>
            ) : null}
          </div>
        ) : (
          <>
            {/* Computador e tablet deitado: a lista do Figma (166:17373). */}
            <ul className="hidden lg:block">
              {episodios.map((item) => (
                <li key={item.id} data-testid="linha-episodio" className="flex items-center gap-6 border-t border-borda-padrao px-6 py-4 first:border-t-0">
                  <Capa item={item} className="w-[110px]" />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <Rotulo item={item} />
                    <p className="texto-titulo-card-pequeno break-words text-texto-primario">{item.titulo}</p>
                  </div>
                  <Quando item={item} className="w-[150px] shrink-0" />
                  <div className="w-[120px] shrink-0">
                    <Selo situacao={item.situacao} />
                  </div>
                  <div className="shrink-0">{acoes(item)}</div>
                </li>
              ))}
            </ul>

            {/* Celular e tablet em pé: cartões (E50). */}
            <ul className="flex flex-col gap-3 lg:hidden">
              {episodios.map((item) => (
                <li key={item.id} data-testid="cartao-episodio" className="flex flex-col gap-3 rounded-[20px] border border-borda-padrao bg-fundo-superficie p-4">
                  <div className="flex items-start gap-3">
                    <Capa item={item} className="w-[96px]" />
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <Rotulo item={item} />
                      <p className="texto-titulo-card-pequeno break-words text-texto-primario">{item.titulo}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <Selo situacao={item.situacao} />
                    <div className="flex min-w-0 items-center gap-3">
                      <Quando item={item} className="min-w-0 text-right" />
                      {acoes(item)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {totalDePaginas > 1 ? (
              <nav aria-label="Páginas" className="flex items-center justify-between gap-3 lg:px-6 lg:pb-5">
                <Button asChild variant="secundario" size="pequeno" aria-disabled={pagina <= 1}>
                  <Link href={href(pagina - 1)}>Anterior</Link>
                </Button>
                <span className="texto-pequeno text-texto-secundario">
                  Página {pagina} de {totalDePaginas}
                </span>
                <Button asChild variant="secundario" size="pequeno" aria-disabled={pagina >= totalDePaginas}>
                  <Link href={href(pagina + 1)}>Próxima</Link>
                </Button>
              </nav>
            ) : null}
          </>
        )}
      </section>

      {podeGerenciar ? (
        <FormularioEpisodio
          aberto={formAberto}
          aoMudar={setFormAberto}
          inicial={emEdicao}
          proximoNumero={proximoNumero}
          temas={temas}
          ultimoMarcado={ultimoMarcado}
          limites={limites}
          aoSalvar={() => {
            setFormAberto(false);
            router.refresh();
          }}
        />
      ) : null}

      <AlertDialog open={!!confirmacao} onOpenChange={(aberta) => !aberta && !ocupado && setConfirmacao(null)}>
        {confirmacao ? (
          <AlertDialogContent
            icone={confirmacao.tipo === "tirar" ? "/painel/icone-ocultar.svg" : "/painel/icone-lixeira.svg"}
            tom="perigo"
            titulo={confirmacao.tipo === "tirar" ? `Tirar o Ep. ${confirmacao.item.numero} do site?` : "Excluir rascunho?"}
            descricao={
              confirmacao.tipo === "tirar"
                ? `O episódio sai da página Rádio Chofer agora e volta para os rascunhos.${confirmacao.item.ultimoPrograma ? " Ele deixa de ser o último programa: o topo passa a mostrar o mais recente no ar." : ""} Para pôr de volta, edite e publique de novo.`
                : `O rascunho do Ep. ${confirmacao.item.numero} será apagado de vez. Esta ação não pode ser desfeita.`
            }
          >
            <AlertDialogFooter>
              <AlertDialogCancel asChild>
                <Button variant="secundario" size="pequeno" disabled={ocupado}>
                  {confirmacao.tipo === "tirar" ? "Manter no site" : "Cancelar"}
                </Button>
              </AlertDialogCancel>
              <Button variant="perigo" size="pequeno" disabled={ocupado} onClick={confirmar}>
                {ocupado ? "Aguarde…" : confirmacao.tipo === "tirar" ? "Tirar do site" : "Excluir rascunho"}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        ) : null}
      </AlertDialog>
    </div>
  );
}

function Capa({ item, className }: { item: EpisodioNaLista; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element -- miniatura pela rota do painel ou pela Mídia
  return <img src={item.capaUrl} alt="" loading="lazy" className={cn("aspect-video shrink-0 rounded-[8px] bg-fundo-superficie-alt object-cover", className)} />;
}

function Rotulo({ item }: { item: EpisodioNaLista }) {
  return (
    <p className="flex flex-wrap items-center gap-2">
      <span className="texto-etiqueta text-texto-terciario uppercase">Ep. {item.numero}</span>
      {item.ultimoPrograma ? (
        <span className="rounded-full bg-destaque-azul-suave px-2.5 py-0.5 texto-etiqueta text-destaque-azul uppercase">Último programa</span>
      ) : null}
    </p>
  );
}

function Quando({ item, className }: { item: EpisodioNaLista; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-0.5 texto-pequeno", className)}>
      <span className="text-texto-primario">{item.exibicao ?? "Sem data"}</span>
      <span className="text-texto-secundario">
        {item.duracao && item.duracaoSeg ? (
          <>
            <span aria-hidden>{item.duracao}</span>
            <span className="sr-only">{duracaoPorExtenso(item.duracaoSeg)}</span>
            {" · "}
          </>
        ) : null}
        YouTube
      </span>
    </div>
  );
}

function Selo({ situacao }: { situacao: Situacao }) {
  const { rotulo, classe, ponto } = SELO[situacao];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 texto-etiqueta whitespace-nowrap uppercase", classe)}>
      <span aria-hidden className={cn("size-1.5 rounded-full", ponto)} />
      {rotulo}
    </span>
  );
}

function Menu({
  item,
  aoEditar,
  aoMarcarUltimo,
  aoTirar,
  aoExcluir,
}: {
  item: EpisodioNaLista;
  aoEditar: () => void;
  aoMarcarUltimo: () => void;
  aoTirar: () => void;
  aoExcluir: () => void;
}) {
  const classeDoItem =
    "flex min-h-11 cursor-pointer items-center gap-2.5 rounded-[10px] px-3 py-2.5 texto-pequeno text-texto-primario outline-none data-[highlighted]:bg-fundo-superficie-alt";
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={`Ações do Ep. ${item.numero}`}
          className="alvo-toque inline-flex size-9 items-center justify-center rounded-[10px] border border-borda-padrao text-texto-secundario outline-none hover:bg-fundo-superficie-alt focus-visible:ring-[3px] focus-visible:ring-ring"
        >
          <MoreHorizontal aria-hidden className="size-4" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="z-50 flex min-w-[240px] flex-col gap-0.5 rounded-[14px] border border-borda-padrao bg-fundo-superficie p-1.5 shadow-[0_12px_32px_rgb(11_20_36/0.16)]"
        >
          <DropdownMenu.Item onSelect={aoEditar} className={classeDoItem}>
            <Pencil aria-hidden className="size-4" />
            Editar
          </DropdownMenu.Item>
          {!item.ultimoPrograma ? (
            <DropdownMenu.Item onSelect={aoMarcarUltimo} className={classeDoItem}>
              <Star aria-hidden className="size-4" />
              Marcar como último programa
            </DropdownMenu.Item>
          ) : null}
          {item.situacao === "no_ar" ? (
            <DropdownMenu.Item asChild className={classeDoItem}>
              <a href="/radio-chofer" target="_blank" rel="noopener">
                <ExternalLink aria-hidden className="size-4" />
                Ver no site
                <span className="sr-only">(abre em nova aba)</span>
              </a>
            </DropdownMenu.Item>
          ) : null}
          {item.situacao !== "rascunho" ? (
            <>
              <DropdownMenu.Separator className="mx-2 my-1 h-px bg-borda-padrao" />
              <DropdownMenu.Item onSelect={aoTirar} className={cn(classeDoItem, "text-destaque-vermelho")}>
                <Undo2 aria-hidden className="size-4" />
                Tirar do site
              </DropdownMenu.Item>
            </>
          ) : null}
          {item.podeExcluir ? (
            <>
              <DropdownMenu.Separator className="mx-2 my-1 h-px bg-borda-padrao" />
              <DropdownMenu.Item onSelect={aoExcluir} className={cn(classeDoItem, "text-destaque-vermelho")}>
                <Trash2 aria-hidden className="size-4" />
                Excluir
              </DropdownMenu.Item>
            </>
          ) : null}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

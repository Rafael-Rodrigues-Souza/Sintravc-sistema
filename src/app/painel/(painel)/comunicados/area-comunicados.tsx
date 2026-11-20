"use client";

import {
  ArrowDown,
  ArrowUp,
  CalendarX2,
  Clock,
  Copy,
  GripVertical,
  Info,
  Link2,
  Megaphone,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DropdownMenu } from "radix-ui";
import * as React from "react";
import { toast } from "sonner";

import { IconeFigma } from "@/components/icone-figma";
import { FaixaComunicado, type ComunicadoNaFaixa } from "@/components/site/faixa-comunicado";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogFooter } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ABAS, type Aba } from "@/lib/comunicados/regras";
import type { Situacao } from "@/lib/comunicados/regras";
import { cn } from "@/lib/utils";

import {
  acaoCancelarAgendamento,
  acaoCarregarComunicado,
  acaoDuplicarComunicado,
  acaoEncerrarComunicado,
  acaoExcluirComunicado,
  acaoReordenarFila,
  type ComunicadoNoFormulario,
  type Resposta,
} from "./acoes";
import { FormularioComunicado } from "./formulario-comunicado";

export type ItemNaTela = {
  id: string;
  mensagem: string;
  rotuloDoLink: string | null;
  /** "24/10 08h00", no horário da Bahia. */
  inicio: string | null;
  fim: string | null;
  encerradoEm: string | null;
  situacao: Situacao;
  podeExcluir: boolean;
};

const ROTULO_DA_ABA: Record<Aba, string> = { no_ar: "No ar", agendados: "Agendados", rascunhos: "Rascunhos", encerrados: "Encerrados" };

/** Selos de estado (Figma 118:3448, “Ciclo de vida”): Encerrado só existe no comunicado. */
const SELO: Record<Situacao, { rotulo: string; classe: string; ponto: string }> = {
  rascunho: { rotulo: "Rascunho", classe: "bg-status-neutro-fundo text-status-neutro-texto", ponto: "border border-current" },
  agendado: { rotulo: "Agendado", classe: "bg-destaque-azul-suave text-destaque-azul", ponto: "bg-current" },
  no_ar: { rotulo: "Publicado", classe: "bg-status-sucesso-fundo text-status-sucesso-texto", ponto: "bg-current" },
  encerrado: { rotulo: "Encerrado", classe: "bg-status-neutro-fundo text-status-neutro-texto", ponto: "bg-current opacity-60" },
};

const VAZIO: Record<Aba, string> = {
  no_ar: "Nenhum comunicado no ar agora. O site está sem faixa.",
  agendados: "Nenhum comunicado agendado.",
  rascunhos: "Nenhum rascunho guardado.",
  encerrados: "Nenhum comunicado encerrado ainda.",
};

/** O encerrado vindo do calendário (E58): contorno marinho e fundo amarelo claro, nos dois temas. */
const DESTAQUE = "bg-destaque-amarelo/20 outline-2 -outline-offset-2 outline-destaque-marinho-fixo dark:outline-destaque-amarelo";

const SEM_CONEXAO = { tipo: "erro" as const, mensagem: "Sem conexão com o servidor. Confira a internet e tente de novo." };

type Confirmacao = { tipo: "encerrar" | "excluir"; item: ItemNaTela } | null;

export function AreaComunicados({
  aba,
  contagem,
  itens,
  pagina,
  totalDePaginas,
  noAr,
  intervaloSegundos,
  conferidoAs,
  podeGerenciar,
  abrir,
  destacar,
  novo: abrirNovo,
}: {
  aba: Aba;
  contagem: Record<Aba, number>;
  itens: ItemNaTela[];
  pagina: number;
  totalDePaginas: number;
  noAr: ComunicadoNaFaixa[];
  intervaloSegundos: number;
  conferidoAs: string;
  podeGerenciar: boolean;
  abrir?: string;
  /** Encerrado vindo do calendário de Conteúdos (E17, E58): rolado até a vista e destacado. */
  destacar?: string;
  novo?: boolean;
}) {
  const router = useRouter();
  const caminho = usePathname();
  const parametros = useSearchParams();
  const [formAberto, setFormAberto] = React.useState(false);
  const [emEdicao, setEmEdicao] = React.useState<ComunicadoNoFormulario | null>(null);
  const [confirmacao, setConfirmacao] = React.useState<Confirmacao>(null);
  const [ocupado, setOcupado] = React.useState(false);
  // A ordem mexida aqui (fila) vale até chegar a lista nova do servidor.
  const [mexida, setMexida] = React.useState<{ base: ItemNaTela[]; itens: ItemNaTela[] } | null>(null);
  const ordem = mexida?.base === itens ? mexida.itens : itens;
  const setOrdem = (novos: ItemNaTela[]) => setMexida({ base: itens, itens: novos });
  const [arrastando, setArrastando] = React.useState<string | null>(null);
  const [aviso, setAviso] = React.useState("");

  const novo = () => {
    setEmEdicao(null);
    setFormAberto(true);
  };

  // “Criar conteúdo › Comunicado” (?novo=1), mesmo com a tela já aberta: abre o formulário vazio uma vez.
  const [pedidoDeNovo, setPedidoDeNovo] = React.useState(false);
  if (!!abrirNovo !== pedidoDeNovo) {
    setPedidoDeNovo(!!abrirNovo);
    if (abrirNovo && podeGerenciar) novo();
  }

  const editar = (id: string) =>
    acaoCarregarComunicado({ id })
      .catch(() => SEM_CONEXAO)
      .then((r) => {
        if (r.tipo === "erro") {
          toast.error(r.mensagem, { duration: Infinity, closeButton: true });
        } else if (r.comunicado.situacao === "encerrado") {
          toast.info("Este comunicado já foi encerrado. Use “Duplicar” para publicar de novo.");
        } else {
          setEmEdicao(r.comunicado);
          setFormAberto(true);
        }
      });

  // Vindo do calendário de Conteúdos (E17) ou do “Criar conteúdo”: abre o formulário e limpa o endereço.
  React.useEffect(() => {
    if (!abrir && !abrirNovo) return;
    if (abrir) void editar(abrir);
    const novos = new URLSearchParams(parametros.toString());
    novos.delete("abrir");
    novos.delete("novo");
    router.replace(`${caminho}${novos.size ? `?${novos}` : ""}`, { scroll: false });
    // Só na chegada.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abrir, abrirNovo]);

  // A tabela (computador) e os cartões (celular) existem os dois: rola até o que está na tela.
  React.useEffect(() => {
    if (!destacar) return;
    const alvo = [...document.querySelectorAll<HTMLElement>("[data-destacado]")].find((el) => el.offsetParent !== null);
    alvo?.scrollIntoView({ block: "center", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, [destacar]);

  const depois = (r: Resposta, sucesso: string) => {
    if (r.tipo === "erro") {
      toast.error(r.mensagem, { duration: Infinity, closeButton: true });
      return false;
    }
    toast.success(sucesso);
    router.refresh();
    return true;
  };

  const duplicar = async (item: ItemNaTela) => {
    const r = await acaoDuplicarComunicado({ id: item.id }).catch(() => SEM_CONEXAO);
    if (!depois(r, "Cópia criada nos rascunhos") || r.tipo !== "ok") return;
    await editar(r.id);
  };

  const cancelarAgendamento = async (item: ItemNaTela) => {
    depois(await acaoCancelarAgendamento({ id: item.id }).catch(() => SEM_CONEXAO), "Agendamento cancelado: o comunicado voltou para os rascunhos");
  };

  const confirmar = async () => {
    if (!confirmacao) return;
    setOcupado(true);
    const { tipo, item } = confirmacao;
    const r = await (tipo === "encerrar" ? acaoEncerrarComunicado({ id: item.id }) : acaoExcluirComunicado({ id: item.id })).catch(() => SEM_CONEXAO);
    setOcupado(false);
    if (depois(r, tipo === "encerrar" ? "Comunicado encerrado: a faixa saiu do site" : "Rascunho excluído")) setConfirmacao(null);
  };

  /** Fila (RF43): grava a ordem nova de todos os que estão no ar. */
  const reordenar = async (novaOrdem: ItemNaTela[], anuncio?: string) => {
    const antes = ordem;
    setOrdem(novaOrdem);
    const r = await acaoReordenarFila({ ids: novaOrdem.map((i) => i.id) }).catch(() => SEM_CONEXAO);
    if (r.tipo === "erro") {
      setOrdem(antes);
      toast.error(r.mensagem, { duration: Infinity, closeButton: true });
      return;
    }
    if (anuncio) setAviso(anuncio);
    router.refresh();
  };

  const mover = (id: string, passo: -1 | 1) => {
    const de = ordem.findIndex((i) => i.id === id);
    const para = de + passo;
    if (de < 0 || para < 0 || para >= ordem.length) return;
    const nova = [...ordem];
    const [item] = nova.splice(de, 1);
    nova.splice(para, 0, item!);
    void reordenar(nova, `Agora na posição ${para + 1} de ${nova.length} na fila.`);
  };

  const soltarSobre = (alvoId: string) => {
    if (!arrastando || arrastando === alvoId) return;
    const nova = ordem.filter((i) => i.id !== arrastando);
    const destino = nova.findIndex((i) => i.id === alvoId);
    const de = ordem.findIndex((i) => i.id === arrastando);
    const alvoDe = ordem.findIndex((i) => i.id === alvoId);
    nova.splice(alvoDe > de ? destino + 1 : destino, 0, ordem[de]!);
    setArrastando(null);
    void reordenar(nova);
  };

  const fila = aba === "no_ar" && podeGerenciar && ordem.length > 1;
  const href = (mudanca: { aba?: Aba; pagina?: number }) => {
    const consulta = new URLSearchParams();
    const proximaAba = mudanca.aba ?? aba;
    if (proximaAba !== "no_ar") consulta.set("aba", proximaAba);
    const proximaPagina = mudanca.pagina ?? (mudanca.aba ? 1 : pagina);
    if (proximaPagina > 1) consulta.set("pagina", String(proximaPagina));
    return `/painel/comunicados${consulta.size ? `?${consulta}` : ""}`;
  };

  return (
    <div className="flex flex-1 flex-col gap-5 px-4 pt-5 pb-12 lg:gap-6 lg:px-10 lg:pt-8">
      <header className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1.5">
          <h1 className="texto-titulo-card-grande text-texto-primario">Comunicados</h1>
          <p className="hidden max-w-[720px] texto-corpo text-texto-secundario lg:block">
            Faixas de aviso que aparecem abaixo do cabeçalho, em todas as páginas do site, durante o período escolhido.
          </p>
        </div>
        {podeGerenciar ? (
          <Button onClick={novo} aria-label="Novo comunicado" className="shrink-0">
            <Plus aria-hidden className="lg:hidden" />
            <Megaphone aria-hidden className="hidden lg:block" />
            <span aria-hidden>
              Novo<span className="hidden lg:inline"> comunicado</span>
            </span>
          </Button>
        ) : null}
      </header>

      {/* No site agora: a mesma faixa do site, com as setas (165:16358). No celular, só a faixa (170:18854). */}
      <section aria-labelledby="no-site-agora" className="flex flex-col gap-4 lg:rounded-[20px] lg:border lg:border-borda-padrao lg:bg-fundo-superficie lg:p-6">
        <div className="hidden items-start justify-between gap-4 lg:flex">
          <div className="flex flex-col gap-1">
            <h2 id="no-site-agora" className="texto-titulo-card text-texto-primario">
              No site agora
            </h2>
            <p className="texto-pequeno text-texto-secundario">
              {noAr.length === 0
                ? "Nenhum comunicado no ar. O site está sem faixa."
                : noAr.length === 1
                  ? "1 comunicado no ar."
                  : `${noAr.length} comunicados no ar. Eles se alternam na ordem da fila.`}
            </p>
          </div>
          <p className="flex items-center gap-2 texto-pequeno text-status-sucesso-texto">
            <span aria-hidden className="size-2 rounded-full bg-current" />
            Conferido às {conferidoAs}
          </p>
        </div>
        <h2 className="sr-only lg:hidden">No site agora</h2>
        {noAr.length > 0 ? (
          <FaixaComunicado modo="previa" comunicados={noAr} intervaloSegundos={intervaloSegundos} className="overflow-hidden rounded-[8px] lg:rounded-[4px]" />
        ) : null}
      </section>

      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_310px] lg:items-start">
        <section aria-label="Lista de comunicados" className="flex min-w-0 flex-col gap-4 lg:overflow-hidden lg:rounded-[20px] lg:border lg:border-borda-padrao lg:bg-fundo-superficie">
          <nav
            aria-label="Estados dos comunicados"
            className="-mx-4 -my-1 flex items-center gap-2 overflow-x-auto px-4 py-1 [scrollbar-width:none] lg:mx-0 lg:mt-0 lg:mb-0 lg:px-6 lg:pt-5 lg:pb-1"
          >
            {ABAS.map((a) => {
              const atual = a === aba;
              return (
                <Link
                  key={a}
                  href={href({ aba: a })}
                  aria-current={atual ? "page" : undefined}
                  className={cn(
                    "alvo-toque flex shrink-0 items-center gap-2 rounded-full px-[18px] py-2.5 whitespace-nowrap texto-navegacao outline-none focus-visible:ring-[3px] focus-visible:ring-ring",
                    atual
                      ? "bg-destaque-amarelo text-destaque-marinho-fixo"
                      : "border border-borda-padrao bg-fundo-superficie text-texto-secundario hover:bg-fundo-superficie-alt",
                  )}
                >
                  {ROTULO_DA_ABA[a]}
                  <span className={cn("texto-etiqueta", atual ? "opacity-70" : "text-texto-terciario")}>{contagem[a]}</span>
                </Link>
              );
            })}
          </nav>

          <p role="status" className="sr-only">
            {aviso}
          </p>

          {ordem.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-[20px] border border-dashed border-borda-padrao px-6 py-12 text-center lg:mx-6 lg:mb-6">
              <span className="flex size-14 items-center justify-center rounded-full bg-status-neutro-fundo text-texto-secundario">
                <CalendarX2 aria-hidden className="size-6" />
              </span>
              <p className="texto-corpo text-texto-secundario">{VAZIO[aba]}</p>
              {podeGerenciar ? (
                <Button variant="secundario" size="pequeno" onClick={novo}>
                  <Plus aria-hidden />
                  Criar comunicado
                </Button>
              ) : null}
            </div>
          ) : (
            <>
              {/* Computador e tablet deitado: tabela (165:16358). */}
              <table className="hidden w-full border-collapse lg:table">
                <caption className="sr-only">
                  {ROTULO_DA_ABA[aba]}
                  {fila ? ": arraste a alça ou use as setas do teclado nela para mudar a ordem da fila" : ""}
                </caption>
                <thead>
                  <tr className="bg-fundo-superficie-alt texto-etiqueta text-texto-terciario uppercase">
                    <th scope="col" className="w-14 py-3">
                      <span className="sr-only">{fila ? "Posição na fila" : ""}</span>
                    </th>
                    <th scope="col" className="py-3 pr-4 text-left font-[inherit]">
                      Mensagem
                    </th>
                    <th scope="col" className="w-[170px] py-3 pr-4 text-left font-[inherit]">
                      Período
                    </th>
                    <th scope="col" className="w-[140px] py-3 pr-4 text-left font-[inherit]">
                      Estado
                    </th>
                    <th scope="col" className="w-16 py-3">
                      <span className="sr-only">Ações</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ordem.map((item, i) => (
                    <tr
                      key={item.id}
                      data-testid="linha-comunicado"
                      data-destacado={item.id === destacar ? "" : undefined}
                      aria-current={item.id === destacar ? "true" : undefined}
                      draggable={fila}
                      onDragStart={(e) => {
                        e.dataTransfer.effectAllowed = "move";
                        e.dataTransfer.setData("text/plain", item.id);
                        setArrastando(item.id);
                      }}
                      onDragOver={(e) => {
                        if (arrastando) e.preventDefault();
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        soltarSobre(item.id);
                      }}
                      onDragEnd={() => setArrastando(null)}
                      className={cn("border-t border-borda-padrao align-middle", arrastando === item.id && "opacity-50", item.id === destacar && DESTAQUE)}
                    >
                      <td className="py-4 text-center">
                        {fila ? (
                          <button
                            type="button"
                            aria-label={`Posição ${i + 1} de ${ordem.length} na fila. Use as setas para cima e para baixo para mudar.`}
                            onKeyDown={(e) => {
                              if (e.key === "ArrowUp") {
                                e.preventDefault();
                                mover(item.id, -1);
                              } else if (e.key === "ArrowDown") {
                                e.preventDefault();
                                mover(item.id, 1);
                              }
                            }}
                            className="inline-flex size-9 cursor-grab items-center pointer-coarse:size-11 justify-center rounded-[10px] text-texto-terciario outline-none hover:bg-fundo-superficie-alt focus-visible:ring-[3px] focus-visible:ring-ring active:cursor-grabbing"
                          >
                            <GripVertical aria-hidden className="size-4" />
                          </button>
                        ) : null}
                      </td>
                      <td className="py-4 pr-4">
                        <Mensagem item={item} />
                      </td>
                      <td className="py-4 pr-4 texto-pequeno text-texto-primario">
                        <Periodo item={item} />
                      </td>
                      <td className="py-4 pr-4">
                        <Selo situacao={item.situacao} />
                      </td>
                      <td className="py-4 pr-5 text-right">
                        {podeGerenciar ? (
                          <Menu
                            item={item}
                            posicao={fila ? { atual: i, total: ordem.length } : null}
                            aoEditar={() => editar(item.id)}
                            aoEncerrar={() => setConfirmacao({ tipo: "encerrar", item })}
                            aoExcluir={() => setConfirmacao({ tipo: "excluir", item })}
                            aoDuplicar={() => duplicar(item)}
                            aoCancelarAgendamento={() => cancelarAgendamento(item)}
                            aoMover={(passo) => mover(item.id, passo)}
                          />
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Celular e tablet em pé: cartões (170:18854). */}
              <ul className="flex flex-col gap-3 lg:hidden">
                {ordem.map((item, i) => (
                  <li
                    key={item.id}
                    data-testid="cartao-comunicado"
                    data-destacado={item.id === destacar ? "" : undefined}
                    aria-current={item.id === destacar ? "true" : undefined}
                    className={cn(
                      "flex flex-col gap-3 rounded-[20px] border border-borda-padrao bg-fundo-superficie p-4",
                      item.id === destacar && DESTAQUE,
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <Selo situacao={item.situacao} />
                      {podeGerenciar ? (
                        <Menu
                          item={item}
                          posicao={fila ? { atual: i, total: ordem.length } : null}
                          aoEditar={() => editar(item.id)}
                          aoEncerrar={() => setConfirmacao({ tipo: "encerrar", item })}
                          aoExcluir={() => setConfirmacao({ tipo: "excluir", item })}
                          aoDuplicar={() => duplicar(item)}
                          aoCancelarAgendamento={() => cancelarAgendamento(item)}
                          aoMover={(passo) => mover(item.id, passo)}
                        />
                      ) : null}
                    </div>
                    <Mensagem item={item} />
                    {item.inicio && item.fim ? (
                      <p className="flex items-center gap-2 texto-pequeno text-texto-secundario">
                        <Clock aria-hidden className="size-4 shrink-0" />
                        <span>
                          {item.inicio} <span aria-hidden>→</span>
                          <span className="sr-only">até</span> {item.encerradoEm ?? item.fim}
                        </span>
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>

              {totalDePaginas > 1 ? (
                <nav aria-label="Páginas" className="flex items-center justify-between gap-3 lg:px-6 lg:pb-5">
                  <Button asChild variant="secundario" size="pequeno" aria-disabled={pagina <= 1}>
                    <Link href={href({ pagina: pagina - 1 })}>Anterior</Link>
                  </Button>
                  <span className="texto-pequeno text-texto-secundario">
                    Página {pagina} de {totalDePaginas}
                  </span>
                  <Button asChild variant="secundario" size="pequeno" aria-disabled={pagina >= totalDePaginas}>
                    <Link href={href({ pagina: pagina + 1 })}>Próxima</Link>
                  </Button>
                </nav>
              ) : null}
            </>
          )}
        </section>

        {/* Lateral só no computador (165:16358): o celular não tem esses cartões (170:18854). */}
        <aside className="hidden flex-col gap-5 lg:flex">
          <section className="flex flex-col gap-4 rounded-[20px] border border-borda-padrao bg-fundo-superficie p-6">
            <h2 className="texto-titulo-card text-texto-primario">Como funciona</h2>
            <ul className="flex flex-col gap-3.5 texto-pequeno text-texto-secundario">
              <li className="flex gap-3">
                <Megaphone aria-hidden className="mt-0.5 size-[18px] shrink-0 text-destaque-azul" />
                Aparece abaixo do cabeçalho em todas as páginas do site.
              </li>
              <li className="flex gap-3">
                <GripVertical aria-hidden className="mt-0.5 size-[18px] shrink-0 text-destaque-azul" />
                Com mais de um no ar, eles se alternam na ordem da fila.
              </li>
              <li className="flex gap-3">
                <Clock aria-hidden className="mt-0.5 size-[18px] shrink-0 text-destaque-azul" />
                Entra e sai do ar sozinho, no período definido.
              </li>
              <li className="flex gap-3">
                <Info aria-hidden className="mt-0.5 size-[18px] shrink-0 text-destaque-azul" />
                Texto curto: até 140 caracteres. Detalhes vão no link “Saiba mais”.
              </li>
            </ul>
          </section>
          <section className="flex flex-col gap-2 rounded-[16px] bg-destaque-azul-suave p-5">
            <h2 className="flex items-center gap-2.5 texto-titulo-card-pequeno text-destaque-azul">
              <Info aria-hidden className="size-5" />
              Quem pode publicar
            </h2>
            <p className="texto-pequeno text-texto-primario">
              Administrador geral e Comunicação. Toda publicação e encerramento fica registrada em Atividade.
            </p>
          </section>
        </aside>
      </div>

      {podeGerenciar ? (
        <FormularioComunicado
          aberto={formAberto}
          aoMudar={setFormAberto}
          inicial={emEdicao}
          aoSalvar={() => {
            setFormAberto(false);
            router.refresh();
          }}
        />
      ) : null}

      <AlertDialog open={!!confirmacao} onOpenChange={(aberta) => !aberta && !ocupado && setConfirmacao(null)}>
        {confirmacao ? (
          <AlertDialogContent
            icone={confirmacao.tipo === "encerrar" ? "/painel/icone-alerta.svg" : "/painel/icone-lixeira.svg"}
            tom="perigo"
            titulo={confirmacao.tipo === "encerrar" ? "Encerrar comunicado?" : "Excluir rascunho?"}
            descricao={
              confirmacao.tipo === "encerrar"
                ? `A faixa “${resumo(confirmacao.item.mensagem)}” sai do site agora, antes do fim do período. O registro continua em Atividade.`
                : `O rascunho “${resumo(confirmacao.item.mensagem)}” será apagado de vez. Esta ação não pode ser desfeita.`
            }
          >
            <AlertDialogFooter>
              <AlertDialogCancel asChild>
                <Button variant="secundario" size="pequeno" disabled={ocupado}>
                  {confirmacao.tipo === "encerrar" ? "Manter no ar" : "Cancelar"}
                </Button>
              </AlertDialogCancel>
              <Button variant="perigo" size="pequeno" disabled={ocupado} onClick={confirmar}>
                {ocupado ? "Aguarde…" : confirmacao.tipo === "encerrar" ? "Encerrar agora" : "Excluir rascunho"}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        ) : null}
      </AlertDialog>
    </div>
  );
}

function resumo(mensagem: string) {
  return mensagem.length > 40 ? `${mensagem.slice(0, 39).trimEnd()}…` : mensagem;
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

function Mensagem({ item }: { item: ItemNaTela }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <p className="texto-titulo-card-pequeno break-words text-texto-primario">{item.mensagem}</p>
      <p className="hidden items-center gap-1.5 texto-pequeno text-texto-secundario lg:flex">
        <Link2 aria-hidden className="size-3.5 shrink-0" />
        <span className="min-w-0 truncate">{item.rotuloDoLink ? `Saiba mais → ${item.rotuloDoLink}` : "Sem link"}</span>
      </p>
    </div>
  );
}

function Periodo({ item }: { item: ItemNaTela }) {
  if (item.situacao === "encerrado" && item.encerradoEm) {
    return (
      <>
        <span className="block">De {item.inicio ?? "—"}</span>
        <span className="block text-texto-secundario">saiu {item.encerradoEm}</span>
      </>
    );
  }
  return (
    <>
      <span className="block">De {item.inicio ?? "—"}</span>
      <span className="block text-texto-secundario">até {item.fim ?? "—"}</span>
    </>
  );
}

function Menu({
  item,
  posicao,
  aoEditar,
  aoEncerrar,
  aoExcluir,
  aoDuplicar,
  aoCancelarAgendamento,
  aoMover,
}: {
  item: ItemNaTela;
  posicao: { atual: number; total: number } | null;
  aoEditar: () => void;
  aoEncerrar: () => void;
  aoExcluir: () => void;
  aoDuplicar: () => void;
  aoCancelarAgendamento: () => void;
  aoMover: (passo: -1 | 1) => void;
}) {
  const classeDoItem =
    "flex min-h-11 cursor-pointer items-center gap-2.5 rounded-[10px] px-3 py-2.5 texto-pequeno text-texto-primario outline-none data-[highlighted]:bg-fundo-superficie-alt";
  const { situacao } = item;
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={`Ações do comunicado “${resumo(item.mensagem)}”`}
          className="alvo-toque inline-flex size-9 items-center justify-center rounded-[10px] border border-borda-padrao text-texto-secundario outline-none hover:bg-fundo-superficie-alt focus-visible:ring-[3px] focus-visible:ring-ring"
        >
          <MoreHorizontal aria-hidden className="size-4" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="z-50 flex min-w-[220px] flex-col gap-0.5 rounded-[14px] border border-borda-padrao bg-fundo-superficie p-1.5 shadow-[0_12px_32px_rgb(11_20_36/0.16)]"
        >
          {situacao !== "encerrado" ? (
            <DropdownMenu.Item onSelect={aoEditar} className={classeDoItem}>
              <Pencil aria-hidden className="size-4" />
              Editar
            </DropdownMenu.Item>
          ) : null}
          {posicao && posicao.atual > 0 ? (
            <DropdownMenu.Item onSelect={() => aoMover(-1)} className={classeDoItem}>
              <ArrowUp aria-hidden className="size-4" />
              Subir na fila
            </DropdownMenu.Item>
          ) : null}
          {posicao && posicao.atual < posicao.total - 1 ? (
            <DropdownMenu.Item onSelect={() => aoMover(1)} className={classeDoItem}>
              <ArrowDown aria-hidden className="size-4" />
              Descer na fila
            </DropdownMenu.Item>
          ) : null}
          {situacao === "agendado" ? (
            <DropdownMenu.Item onSelect={aoCancelarAgendamento} className={classeDoItem}>
              <CalendarX2 aria-hidden className="size-4" />
              Cancelar agendamento
            </DropdownMenu.Item>
          ) : null}
          {situacao === "encerrado" ? (
            <DropdownMenu.Item onSelect={aoDuplicar} className={classeDoItem}>
              <Copy aria-hidden className="size-4" />
              Duplicar
            </DropdownMenu.Item>
          ) : null}
          {situacao === "no_ar" ? (
            <>
              <DropdownMenu.Separator className="mx-2 my-1 h-px bg-borda-padrao" />
              <DropdownMenu.Item onSelect={aoEncerrar} className={cn(classeDoItem, "text-destaque-vermelho")}>
                <IconeFigma src="/painel/icone-alerta.svg" tamanho={16} />
                Encerrar agora
              </DropdownMenu.Item>
            </>
          ) : null}
          {situacao === "rascunho" && item.podeExcluir ? (
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

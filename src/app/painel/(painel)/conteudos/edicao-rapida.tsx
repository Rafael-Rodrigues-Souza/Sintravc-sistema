"use client";

import { Archive, CalendarDays, Clock, Eye, EyeOff, FileText, Pencil, Upload } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Dialog as DialogPrimitive } from "radix-ui";
import * as React from "react";
import { toast } from "sonner";

import { IconeFigma } from "@/components/icone-figma";
import { AlertDialog, AlertDialogContent, AlertDialogFooter } from "@/components/ui/alert-dialog";
import { Alerta } from "@/components/ui/alerta";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { LIMITE_MANCHETE } from "@/lib/conteudos/dados";
import type { EstadoConteudo } from "@/lib/conteudos/listar";
import type { CampoObrigatorio } from "@/lib/conteudos/obrigatorios";
import { camposEmTexto, dataHoraNaBahia } from "@/lib/datas";
import { cn } from "@/lib/utils";

import { acaoPublicarNoticia, acaoSalvarEdicaoRapida } from "./acoes";
import { ConfirmarAcao, type PedidoDeAcao } from "./ciclo-de-vida";
import { SeloEstado } from "./selos";

export type NoticiaDaEdicaoRapida = {
  id: string;
  revisao: number;
  estado: EstadoConteudo;
  titulo: string;
  categoriaId: string | null;
  agendadoPara: string | null;
  publicadoEm: string | null;
  temAlteracoesNaoPublicadas: boolean;
  /** Oculta: o motivo registrado (RN11). */
  motivoOculto: string | null;
  /** Quem está vendo pode arquivar (o servidor confere de novo). */
  podeArquivar: boolean;
  /** Data e hora já preenchidas quando a pessoa escolhe "Agendado": a agendada, ou amanhã às 08h00. */
  sugestaoDeData: { data: string; hora: string };
};

export type AcaoParaMostrar = { id: string; texto: string; detalhe: string };

type Situacao = "rascunho" | "agendado" | "publicado" | "oculto";

const ROTULO_DO_CAMPO: Record<CampoObrigatorio, string> = {
  titulo: "Manchete",
  lide: "Lide",
  corpo: "Corpo da notícia",
  imagensDoCorpo: "Texto alternativo das imagens do corpo",
  capaAlt: "Texto alternativo da capa",
  assinatura: "Assinatura",
  categoriaId: "Categoria",
};
const SEM_CONEXAO = "Sem conexão com o servidor. Confira a internet e tente de novo.";

/**
 * Edição rápida (RF36; Figma 115:2324, com a correção C3: o exemplo é uma notícia): título,
 * categoria, situação e data sem sair da lista. Na publicada, a situação é Publicado ou Oculto
 * (com motivo, RN11); Arquivar fica no rodapé (#11, correção E44). Fixar chega no #15.
 * Fecha com X, Esc ou clique fora; com mudança não salva, pergunta antes.
 */
export function EdicaoRapida({
  noticia,
  categorias,
  acoes,
  hrefAoFechar,
}: {
  noticia: NoticiaDaEdicaoRapida;
  categorias: { id: string; nome: string }[];
  acoes: AcaoParaMostrar[];
  hrefAoFechar: string;
}) {
  const router = useRouter();
  const situacaoInicial: Situacao =
    noticia.estado === "agendado" || noticia.estado === "publicado" || noticia.estado === "oculto" ? noticia.estado : "rascunho";
  const camposIniciais = noticia.sugestaoDeData;

  const [aberto, setAberto] = React.useState(true);
  const [titulo, setTitulo] = React.useState(noticia.titulo);
  const [categoriaId, setCategoriaId] = React.useState(noticia.categoriaId ?? "");
  const [situacao, setSituacao] = React.useState<Situacao>(situacaoInicial);
  const [quando, setQuando] = React.useState(camposIniciais);
  const [salvando, setSalvando] = React.useState(false);
  const [publicandoAlteracoes, setPublicandoAlteracoes] = React.useState(false);
  const [perguntarAoFechar, setPerguntarAoFechar] = React.useState(false);
  const [erro, setErro] = React.useState<{ mensagem: string; campo?: string } | null>(null);
  const [faltam, setFaltam] = React.useState<CampoObrigatorio[] | null>(null);
  const [conflito, setConflito] = React.useState(false);
  const [comAlteracoes, setComAlteracoes] = React.useState(noticia.temAlteracoesNaoPublicadas);
  const [motivo, setMotivo] = React.useState("");
  const [pedido, setPedido] = React.useState<PedidoDeAcao | null>(null);

  // Publicada ou oculta: já foi ao ar; a situação é Publicado ou Oculto, e o título vai para a cópia de trabalho (E42).
  const noAr = noticia.estado === "publicado" || noticia.estado === "oculto";
  const vaiOcultar = noticia.estado === "publicado" && situacao === "oculto";
  const mudou =
    titulo !== noticia.titulo ||
    categoriaId !== (noticia.categoriaId ?? "") ||
    situacao !== situacaoInicial ||
    (situacao === "agendado" && (quando.data !== camposIniciais.data || quando.hora !== camposIniciais.hora)) ||
    (vaiOcultar && motivo !== "");

  const fechar = () => {
    setAberto(false);
    router.push(hrefAoFechar, { scroll: false });
  };
  const pedirParaFechar = () => (mudou && !salvando ? setPerguntarAoFechar(true) : fechar());

  const salvar = async (evento: React.FormEvent) => {
    evento.preventDefault();
    if (salvando) return;
    setErro(null);
    setFaltam(null);
    if ((situacao !== "rascunho" || noAr) && !categoriaId) {
      setErro({ mensagem: "Escolha a categoria.", campo: "categoriaId" });
      return;
    }
    if (vaiOcultar && !motivo.trim()) {
      setErro({ mensagem: "Escreva o motivo para ocultar.", campo: "motivo" });
      document.getElementById("rapida-motivo")?.focus();
      return;
    }
    setSalvando(true);
    const resposta = await acaoSalvarEdicaoRapida({
      id: noticia.id,
      revisaoBase: noticia.revisao,
      titulo,
      categoriaId: categoriaId || null,
      situacao,
      quando: situacao === "agendado" ? quando : null,
      motivo: vaiOcultar ? motivo : undefined,
    }).catch(() => ({ tipo: "erro" as const, mensagem: SEM_CONEXAO, campo: undefined }));
    setSalvando(false);

    if (resposta.tipo === "salva") {
      router.refresh();
      if (resposta.temAlteracoesNaoPublicadas) {
        setComAlteracoes(true);
        toast.success("Alterações salvas. Elas só vão ao site quando você publicar.");
        return;
      }
      toast.success(
        resposta.estado === "agendado"
          ? `Notícia agendada para ${camposEmTexto(quando)}.`
          : resposta.estado === "oculto" && noticia.estado !== "oculto"
            ? "Notícia oculta do site."
            : resposta.estado === "publicado" && noticia.estado !== "publicado"
              ? noticia.estado === "oculto"
                ? "Notícia de volta ao site."
                : "Notícia publicada."
              : "Alterações salvas.",
      );
      fechar();
    } else if (resposta.tipo === "conflito") {
      setConflito(true);
    } else if (resposta.tipo === "faltam") {
      setFaltam(resposta.campos);
    } else {
      setErro({ mensagem: resposta.mensagem, campo: resposta.campo });
    }
  };

  const publicarAlteracoes = async () => {
    setPublicandoAlteracoes(true);
    const resposta = await acaoPublicarNoticia({ id: noticia.id, revisaoBase: noticia.revisao }, crypto.randomUUID()).catch(() => ({
      tipo: "erro" as const,
      mensagem: SEM_CONEXAO,
    }));
    setPublicandoAlteracoes(false);
    if (resposta.tipo === "publicada") {
      toast.success("Alterações publicadas.");
      router.refresh();
      fechar();
    } else if (resposta.tipo === "conflito") {
      setConflito(true);
    } else if (resposta.tipo === "faltam") {
      setFaltam(resposta.campos);
    } else {
      setErro({ mensagem: resposta.mensagem });
    }
  };

  const erroNoCampo = (campo: string) => (erro?.campo === campo ? erro.mensagem : undefined);
  const hrefEditor = `/painel/conteudos/noticia/${noticia.id}`;

  return (
    <DialogPrimitive.Root open={aberto} onOpenChange={(valor) => (valor ? null : pedirParaFechar())}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-fundo-sobreposicao data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          aria-describedby="edicao-rapida-descricao"
          className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[480px] flex-col border-l border-borda-padrao bg-fundo-superficie outline-none data-[state=open]:animate-in data-[state=open]:slide-in-from-right motion-reduce:animate-none"
        >
          <form onSubmit={salvar} className="flex min-h-0 flex-1 flex-col">
            <header className="flex items-start gap-3 border-b border-borda-padrao px-6 pt-6 pb-5">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p className="flex items-center gap-2 texto-pequeno text-texto-secundario">
                  <FileText aria-hidden className="size-4" />
                  Notícia
                  <SeloEstado estado={noticia.estado} />
                </p>
                <DialogPrimitive.Title className="texto-titulo-card-grande text-texto-primario">Edição rápida</DialogPrimitive.Title>
                <DialogPrimitive.Description id="edicao-rapida-descricao" className="texto-pequeno text-texto-secundario">
                  Ajuste o essencial sem sair da lista. Para mudar o texto, abra o editor completo.
                </DialogPrimitive.Description>
              </div>
              <DialogPrimitive.Close
                type="button"
                aria-label="Fechar"
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-fundo-superficie-alt text-texto-primario outline-none hover:brightness-95 focus-visible:ring-[3px] focus-visible:ring-ring"
              >
                <IconeFigma src="/painel/icone-fechar.svg" tamanho={18} />
              </DialogPrimitive.Close>
            </header>

            <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6 py-6">
              {conflito ? (
                <Alerta tipo="aviso" titulo="Alguém salvou esta notícia enquanto você editava">
                  <div className="flex flex-col items-start gap-2">
                    Atualize para ver a versão mais recente antes de mudar de novo.
                    <Button type="button" variant="secundario" size="pequeno" onClick={() => router.refresh()}>
                      Atualizar
                    </Button>
                  </div>
                </Alerta>
              ) : null}
              {faltam ? (
                <Alerta tipo="erro" titulo={faltam.length === 1 ? "Falta 1 item para ir ao ar" : `Faltam ${faltam.length} itens para ir ao ar`}>
                  <div className="flex flex-col items-start gap-2">
                    {faltam.map((c) => ROTULO_DO_CAMPO[c]).join(", ")}.
                    <Link href={hrefEditor} className="font-semibold text-destaque-azul underline underline-offset-2">
                      Abrir editor completo
                    </Link>
                  </div>
                </Alerta>
              ) : null}
              {erro && !erro.campo ? <Alerta tipo="erro" titulo={erro.mensagem} /> : null}
              {noticia.estado === "publicado" && comAlteracoes ? (
                <Alerta tipo="informacao" titulo="Há alterações que ainda não estão no site">
                  <div className="flex flex-col items-start gap-2">
                    O site continua mostrando a versão publicada até você publicar as alterações.
                    <Button type="button" size="pequeno" disabled={publicandoAlteracoes || mudou} onClick={() => void publicarAlteracoes()}>
                      <Upload aria-hidden />
                      {publicandoAlteracoes ? "Publicando…" : "Publicar alterações"}
                    </Button>
                  </div>
                </Alerta>
              ) : null}

              <div className="flex flex-col gap-2">
                <Label htmlFor="rapida-titulo">Título</Label>
                <Textarea
                  id="rapida-titulo"
                  rows={2}
                  className="min-h-[52px]"
                  value={titulo}
                  maxLength={LIMITE_MANCHETE}
                  aria-invalid={erroNoCampo("titulo") ? true : undefined}
                  onChange={(e) => setTitulo(e.target.value)}
                />
                {erroNoCampo("titulo") ? <p className="texto-pequeno text-status-perigo-texto">{erroNoCampo("titulo")}</p> : null}
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="rapida-categoria">
                  Categoria <span className="text-destaque-vermelho">*</span>
                </Label>
                <select
                  id="rapida-categoria"
                  value={categoriaId}
                  aria-invalid={erroNoCampo("categoriaId") ? true : undefined}
                  onChange={(e) => setCategoriaId(e.target.value)}
                  className="h-[52px] w-full rounded-[14px] border border-borda-forte bg-fundo-superficie px-4 texto-corpo text-texto-primario outline-none focus-visible:border-destaque-azul focus-visible:ring-[4px] focus-visible:ring-destaque-azul/15 aria-invalid:border-destaque-vermelho"
                >
                  <option value="">Escolha a categoria</option>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
                {erroNoCampo("categoriaId") ? <p className="texto-pequeno text-status-perigo-texto">{erroNoCampo("categoriaId")}</p> : null}
              </div>

              {noAr ? (
                <fieldset className="flex flex-col gap-2.5">
                  <legend className="mb-2.5 texto-rotulo text-texto-primario">
                    Situação no site <span className="text-destaque-vermelho">*</span>
                  </legend>
                  <RadioGroup value={situacao} onValueChange={(v) => setSituacao(v as Situacao)} aria-label="Situação no site" className="gap-2.5">
                    <OpcaoSituacao
                      valor="publicado"
                      marcada={situacao === "publicado"}
                      titulo={noticia.estado === "oculto" ? "Mostrar no site" : "Publicado"}
                      detalhe={
                        noticia.estado === "oculto"
                          ? "Volta ao site como estava quando foi ocultada."
                          : noticia.publicadoEm
                            ? `No site desde ${dataHoraNaBahia(new Date(noticia.publicadoEm))}.`
                            : "Visível no site."
                      }
                      icone={<Eye aria-hidden className="size-[18px]" />}
                    />
                    <OpcaoSituacao
                      valor="oculto"
                      marcada={situacao === "oculto"}
                      titulo="Oculto"
                      detalhe="Fora do site, mas guardado aqui. Pode voltar a qualquer momento."
                      icone={<EyeOff aria-hidden className="size-[18px]" />}
                    />
                  </RadioGroup>
                  {noticia.estado === "oculto" && noticia.motivoOculto ? (
                    <p className="texto-pequeno text-texto-secundario">Motivo: {noticia.motivoOculto}</p>
                  ) : null}
                  {vaiOcultar ? (
                    <div className="flex flex-col gap-2 pt-1">
                      <Label htmlFor="rapida-motivo">
                        Motivo para ocultar <span className="text-destaque-vermelho">*</span>
                      </Label>
                      <Textarea
                        id="rapida-motivo"
                        value={motivo}
                        maxLength={500}
                        placeholder="Ex.: a data da assembleia mudou"
                        aria-invalid={erroNoCampo("motivo") ? true : undefined}
                        onChange={(e) => setMotivo(e.target.value)}
                      />
                      <p className={erroNoCampo("motivo") ? "texto-pequeno text-status-perigo-texto" : "texto-pequeno text-texto-terciario"}>
                        {erroNoCampo("motivo") ?? "Fica registrado em Atividade."}
                      </p>
                    </div>
                  ) : null}
                  <p className="texto-pequeno text-texto-secundario">Título e categoria só mudam no site quando você publicar as alterações.</p>
                </fieldset>
              ) : (
                <fieldset className="flex flex-col gap-2.5">
                  <legend className="mb-2.5 texto-rotulo text-texto-primario">
                    Situação no site <span className="text-destaque-vermelho">*</span>
                  </legend>
                  <RadioGroup value={situacao} onValueChange={(v) => setSituacao(v as Situacao)} aria-label="Situação no site" className="gap-2.5">
                    <OpcaoSituacao
                      valor="rascunho"
                      marcada={situacao === "rascunho"}
                      titulo={noticia.estado === "agendado" ? "Rascunho (cancelar agendamento)" : "Rascunho"}
                      detalhe="Fica fora do site até alguém publicar."
                      icone={<Pencil aria-hidden className="size-[18px]" />}
                    />
                    <OpcaoSituacao
                      valor="publicado"
                      marcada={situacao === "publicado"}
                      titulo="Publicar agora"
                      detalhe="Fica visível assim que você salvar."
                      icone={<Eye aria-hidden className="size-[18px]" />}
                    />
                    <OpcaoSituacao
                      valor="agendado"
                      marcada={situacao === "agendado"}
                      titulo="Agendado"
                      detalhe="Entra no ar sozinho na data abaixo."
                      icone={<CalendarDays aria-hidden className="size-[18px]" />}
                    />
                  </RadioGroup>
                </fieldset>
              )}

              {situacao === "agendado" && !noAr ? (
                <div className="flex flex-col gap-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="rapida-data">Data</Label>
                      <div className="relative">
                        <CalendarDays aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-texto-terciario" />
                        <Input
                          id="rapida-data"
                          type="date"
                          className="pl-10"
                          value={quando.data}
                          aria-invalid={erroNoCampo("agendadoPara") ? true : undefined}
                          onChange={(e) => setQuando({ ...quando, data: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="rapida-hora">Hora</Label>
                      <div className="relative">
                        <Clock aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-texto-terciario" />
                        <Input
                          id="rapida-hora"
                          type="time"
                          className="pl-10"
                          value={quando.hora}
                          aria-invalid={erroNoCampo("agendadoPara") ? true : undefined}
                          onChange={(e) => setQuando({ ...quando, hora: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                  {erroNoCampo("agendadoPara") ? (
                    <p className="texto-pequeno text-status-perigo-texto">{erroNoCampo("agendadoPara")}</p>
                  ) : (
                    <p className="texto-pequeno text-texto-secundario">Horário de Vitória da Conquista.</p>
                  )}
                </div>
              ) : null}

              {acoes.length > 0 ? (
                <section aria-label="Últimas ações" className="flex flex-col gap-3 rounded-[14px] bg-fundo-superficie-alt p-4">
                  <h3 className="texto-etiqueta text-texto-secundario uppercase">Últimas ações</h3>
                  <ul className="flex flex-col gap-3">
                    {acoes.map((a) => (
                      <li key={a.id} className="flex gap-2.5">
                        <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-destaque-azul" />
                        <span className="flex flex-col">
                          <span className="texto-corpo text-texto-primario">{a.texto}</span>
                          <span className="texto-pequeno text-texto-secundario">{a.detalhe}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </div>

            <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-borda-padrao bg-fundo-superficie-alt px-6 py-4">
              <div className="flex flex-wrap items-center gap-2">
                <Button asChild variant="secundario">
                  <Link href={hrefEditor}>
                    <Pencil aria-hidden />
                    Abrir editor completo
                  </Link>
                </Button>
                {noticia.podeArquivar ? (
                  <Button
                    type="button"
                    variant="secundario"
                    disabled={salvando}
                    onClick={() => setPedido({ acao: "arquivar", alvos: [{ id: noticia.id, titulo: titulo || "Sem título", acoes: ["arquivar"] }] })}
                  >
                    <Archive aria-hidden />
                    Arquivar
                  </Button>
                ) : null}
              </div>
              <Button type="submit" disabled={salvando || !mudou}>
                {salvando ? "Salvando…" : "Salvar alterações"}
              </Button>
            </footer>
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>

      <ConfirmarAcao
        pedido={pedido}
        aoFechar={() => setPedido(null)}
        aoConcluir={(_acao, feitos) => {
          router.refresh();
          if (feitos.length > 0) fechar();
        }}
      />

      <AlertDialog open={perguntarAoFechar} onOpenChange={setPerguntarAoFechar}>
        <AlertDialogContent
          icone="/painel/icone-alerta.svg"
          tom="aviso"
          titulo="Fechar sem salvar?"
          descricao="As mudanças desta edição rápida ainda não foram salvas."
        >
          <AlertDialogFooter>
            <Button type="button" variant="secundario" onClick={() => setPerguntarAoFechar(false)}>
              Continuar editando
            </Button>
            <Button
              type="button"
              variant="perigo"
              onClick={() => {
                setPerguntarAoFechar(false);
                fechar();
              }}
            >
              Fechar sem salvar
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DialogPrimitive.Root>
  );
}

function OpcaoSituacao({
  valor,
  marcada,
  titulo,
  detalhe,
  icone,
}: {
  valor: Situacao;
  marcada: boolean;
  titulo: string;
  detalhe: string;
  icone: React.ReactNode;
}) {
  const id = `situacao-${valor}`;
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-[14px] border p-4",
        marcada ? "border-destaque-azul bg-destaque-azul-suave" : "border-borda-padrao bg-fundo-superficie hover:bg-fundo-superficie-alt",
      )}
    >
      <RadioGroupItem id={id} value={valor} className="mt-0.5" />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="texto-titulo-card-pequeno text-texto-primario">{titulo}</span>
        <span className="texto-pequeno text-texto-secundario">{detalhe}</span>
      </span>
      <span className="text-texto-secundario">{icone}</span>
    </label>
  );
}

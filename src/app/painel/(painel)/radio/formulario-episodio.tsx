"use client";

import { CalendarDays, CheckCircle2, ImageIcon, LoaderCircle, SquarePlay, Undo2 } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { Alerta } from "@/components/ui/alerta";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { Drawer, DrawerBody, DrawerContent, DrawerHeader } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { bahiaParaUtc, camposEmTexto } from "@/lib/datas";
import {
  botaoDoModal,
  conferirCampos,
  RESUMO_MAX,
  TITULO_MAX,
  TRANSCRICAO_MAX,
  type CampoDoEpisodio,
  type CamposEpisodio,
  type ModoDeSalvar,
} from "@/lib/episodios/regras";
import { duracaoPorExtenso, segundosDoTexto, textoDaDuracao } from "@/lib/youtube/duracao";
import { idDoYoutube } from "@/lib/youtube/link";
import { cn } from "@/lib/utils";

import { SeletorDeMidia } from "../conteudos/noticia/seletor-midia";
import { acaoBuscarVideo, acaoSalvarEpisodio, type EpisodioNoFormulario } from "./acoes";
import { Interruptor, SEM_CONEXAO, useTelaGrande } from "./pecas";

type Limites = { tamanhoMaximoBytes: number; mensagemDeTamanho: string };

/** O que a busca no YouTube achou, para o quadro “Vídeo encontrado”. */
type Video =
  | { estado: "vazio" }
  | { estado: "buscando"; youtubeId: string }
  | { estado: "encontrado"; youtubeId: string; titulo: string; canal: string; duracaoSeg: number | null }
  | { estado: "manual"; youtubeId: string };

const camposVazios = (numero: number): CamposEpisodio => ({
  link: "",
  numero: String(numero),
  titulo: "",
  duracao: "",
  resumo: "",
  temaId: "",
  data: "",
  hora: "",
  transcricao: "",
  capaMidiaId: "",
  ultimoPrograma: false,
  tituloYoutube: "",
  canalYoutube: "",
});

/**
 * Adicionar episódio e edição (RF45, E61; Figma 166:17629). O link do YouTube preenche título, capa
 * e duração (com a chave da Data API, D4); tudo pode ser ajustado antes de salvar (CA-US25.1).
 * A capa pode ser trocada por uma imagem da Mídia. Abaixo de lg, folha inferior (E50).
 */
export function FormularioEpisodio({
  aberto,
  aoMudar,
  inicial,
  proximoNumero,
  temas,
  ultimoMarcado,
  limites,
  aoSalvar,
}: {
  aberto: boolean;
  aoMudar: (aberto: boolean) => void;
  inicial: EpisodioNoFormulario | null;
  proximoNumero: number;
  temas: { id: string; nome: string }[];
  ultimoMarcado: { id: string; numero: number } | null;
  limites: Limites;
  aoSalvar: () => void;
}) {
  const grande = useTelaGrande();
  const situacao = inicial?.situacao ?? "rascunho";
  const titulo = !inicial ? "Adicionar episódio" : situacao === "rascunho" ? "Editar rascunho" : "Editar episódio";
  const descricao =
    situacao === "no_ar"
      ? "Este episódio está no site. As mudanças aparecem na hora."
      : "Cole o link do vídeo. Título, capa e duração vêm do YouTube; você pode ajustar.";

  const corpo = (
    <Corpo
      key={inicial?.id ?? `novo-${aberto}`}
      inicial={inicial}
      proximoNumero={proximoNumero}
      temas={temas}
      ultimoMarcado={ultimoMarcado}
      limites={limites}
      grande={grande}
      aoSalvar={aoSalvar}
      aoCancelar={() => aoMudar(false)}
    />
  );

  if (grande) {
    return (
      <Dialog open={aberto} onOpenChange={aoMudar}>
        <DialogContent className="max-w-[660px]">
          <DialogHeader titulo={titulo} descricao={descricao} />
          {corpo}
        </DialogContent>
      </Dialog>
    );
  }
  return (
    <Drawer open={aberto} onOpenChange={aoMudar} repositionInputs={false}>
      <DrawerContent>
        <DrawerHeader titulo={titulo} descricao={descricao} />
        {corpo}
      </DrawerContent>
    </Drawer>
  );
}

function Corpo({
  inicial,
  proximoNumero,
  temas,
  ultimoMarcado,
  limites,
  grande,
  aoSalvar,
  aoCancelar,
}: {
  inicial: EpisodioNoFormulario | null;
  proximoNumero: number;
  temas: { id: string; nome: string }[];
  ultimoMarcado: { id: string; numero: number } | null;
  limites: Limites;
  grande: boolean;
  aoSalvar: () => void;
  aoCancelar: () => void;
}) {
  const situacao = inicial?.situacao ?? "rascunho";
  const [campos, setCampos] = React.useState<CamposEpisodio>(inicial?.campos ?? camposVazios(proximoNumero));
  const mudar = (mudanca: Partial<CamposEpisodio>) => setCampos((atuais) => ({ ...atuais, ...mudanca }));
  const [video, setVideo] = React.useState<Video>(() => {
    const id = inicial ? idDoYoutube(inicial.campos.link) : null;
    if (!id) return { estado: "vazio" };
    return inicial!.campos.tituloYoutube
      ? { estado: "encontrado", youtubeId: id, titulo: inicial!.campos.tituloYoutube, canal: inicial!.campos.canalYoutube, duracaoSeg: null }
      : { estado: "manual", youtubeId: id };
  });
  const [capaDaMidia, setCapaDaMidia] = React.useState<string | null>(inicial?.capaDaMidiaUrl ?? null);
  const [seletor, setSeletor] = React.useState(false);
  const [erro, setErro] = React.useState<{ mensagem: string; campo?: CampoDoEpisodio } | null>(null);
  const [gravando, setGravando] = React.useState<ModoDeSalvar | null>(null);
  const [duracaoDoYoutube, setDuracaoDoYoutube] = React.useState(false);
  const buscado = React.useRef(inicial ? idDoYoutube(inicial.campos.link) : null);
  const pedido = React.useRef(0);
  // A hora em que o formulário abriu decide entre “Agendar” e “Publicar”.
  const [abertoEm] = React.useState(() => new Date());

  const erroNo = (campo: CampoDoEpisodio) => (erro?.campo === campo ? erro.mensagem : undefined);
  const exibicao = campos.data && campos.hora ? bahiaParaUtc(campos.data, campos.hora) : null;
  const rotuloPrincipal = botaoDoModal(situacao, exibicao, abertoEm);
  const vaiAgendar = rotuloPrincipal === "Agendar episódio";

  /** Busca o vídeo no YouTube quando o link muda para um vídeo novo (ao colar, ao sair do campo ou com Enter). */
  const buscar = async (link: string) => {
    const id = idDoYoutube(link);
    if (!link.trim()) return;
    if (!id) {
      setVideo({ estado: "vazio" });
      buscado.current = null;
      setErro({ mensagem: "Este link não é de um vídeo do YouTube. Cole o link do vídeo (youtube.com/watch… ou youtu.be/…).", campo: "link" });
      return;
    }
    if (buscado.current === id) return;
    buscado.current = id;
    const numero = ++pedido.current;
    setVideo({ estado: "buscando", youtubeId: id });
    if (erro?.campo === "link") setErro(null);
    const r = await acaoBuscarVideo({ link, episodioId: inicial?.id }).catch(() => SEM_CONEXAO);
    if (numero !== pedido.current) return;
    if (r.tipo === "erro") {
      buscado.current = null;
      setVideo({ estado: "vazio" });
      setErro({ mensagem: r.mensagem, campo: r.campo === "link" ? "link" : undefined });
      return;
    }
    const achado = r.resultado;
    if (achado.tipo === "fora_do_ar") {
      setVideo({ estado: "manual", youtubeId: achado.youtubeId });
      mudar({ tituloYoutube: "", canalYoutube: "" });
      return;
    }
    setVideo({ estado: "encontrado", youtubeId: achado.youtubeId, titulo: achado.titulo, canal: achado.canal ?? "", duracaoSeg: achado.duracaoSeg });
    setCampos((atuais) => ({
      ...atuais,
      tituloYoutube: achado.titulo,
      canalYoutube: achado.canal ?? "",
      // Só preenche o que ainda está vazio: o que a pessoa já ajustou fica.
      titulo: atuais.titulo.trim() ? atuais.titulo : achado.titulo.slice(0, TITULO_MAX),
      duracao: atuais.duracao.trim() || !achado.duracaoSeg ? atuais.duracao : textoDaDuracao(achado.duracaoSeg),
    }));
    setDuracaoDoYoutube(!!achado.duracaoSeg);
  };

  const salvar = async (modo: ModoDeSalvar) => {
    const conferido = conferirCampos(campos, modo);
    if (!conferido.ok) {
      setErro({ mensagem: conferido.mensagem, campo: conferido.campo });
      document.getElementById(`episodio-${conferido.campo}`)?.focus();
      return;
    }
    setGravando(modo);
    setErro(null);
    const r = await acaoSalvarEpisodio({ id: inicial?.id, modo, campos }).catch(() => SEM_CONEXAO);
    setGravando(null);
    if (r.tipo === "erro") {
      const campo = r.campo as CampoDoEpisodio | undefined;
      setErro({ mensagem: r.mensagem, campo });
      if (campo) document.getElementById(`episodio-${campo}`)?.focus();
      return;
    }
    toast.success(
      r.situacao === "no_ar"
        ? situacao === "no_ar"
          ? "Episódio atualizado no site"
          : "Episódio publicado: já está no site"
        : r.situacao === "agendado"
          ? `Episódio agendado para ${camposEmTexto({ data: campos.data, hora: campos.hora })}`
          : "Rascunho salvo",
    );
    aoSalvar();
  };

  const idDoVideo = video.estado === "vazio" ? null : video.youtubeId;
  const capa = capaDaMidia ?? (idDoVideo ? `/painel/radio/capa/${idDoVideo}` : null);
  const duracaoSeg = segundosDoTexto(campos.duracao);
  const avisoDoUltimo =
    ultimoMarcado && ultimoMarcado.id !== inicial?.id
      ? `Substitui o Ep. ${ultimoMarcado.numero} na Home e no topo da página Rádio Chofer.`
      : "Aparece na Home e no topo da página Rádio Chofer.";

  const camposDoFormulario = (
    <>
      {erro && !erro.campo ? (
        <Alerta tipo="erro" titulo="Não foi possível salvar">
          {erro.mensagem}
        </Alerta>
      ) : null}

      <div className="flex flex-col gap-2">
        <Label htmlFor="episodio-link">Link do vídeo no YouTube *</Label>
        <div className="relative">
          <SquarePlay aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-texto-terciario" />
          <Input
            id="episodio-link"
            type="url"
            inputMode="url"
            autoComplete="off"
            className="pl-10"
            placeholder="https://youtu.be/…"
            value={campos.link}
            aria-invalid={erroNo("link") ? true : undefined}
            aria-describedby="episodio-link-mensagem"
            onChange={(e) => {
              mudar({ link: e.target.value });
              if (erro?.campo === "link") setErro(null);
            }}
            onPaste={(e) => {
              // O valor do campo só muda depois do evento: busca na volta seguinte, com o texto já colado.
              const campo = e.currentTarget;
              window.setTimeout(() => void buscar(campo.value), 0);
            }}
            onBlur={(e) => void buscar(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void buscar(e.currentTarget.value);
              }
            }}
          />
        </div>
        <p id="episodio-link-mensagem" className={cn("texto-pequeno", erroNo("link") ? "text-status-perigo-texto" : "text-texto-secundario")}>
          {erroNo("link") ?? "youtube.com/watch…, youtu.be/… ou /shorts/…. Nenhum vídeo é guardado no site."}
        </p>
      </div>

      <div role="status" aria-live="polite" className="contents">
        {video.estado === "buscando" ? (
          <p className="flex items-center gap-2 texto-pequeno text-texto-secundario">
            <LoaderCircle aria-hidden className="size-4 animate-spin motion-reduce:animate-none" />
            Buscando o vídeo no YouTube…
          </p>
        ) : null}
        {video.estado === "encontrado" || video.estado === "manual" ? (
          <div
            data-testid="video-encontrado"
            className={cn(
              "flex flex-col gap-3 rounded-[16px] p-3 sm:flex-row sm:items-center sm:gap-4",
              video.estado === "encontrado" ? "bg-status-sucesso-fundo" : "bg-status-aviso-fundo",
            )}
          >
            {capa ? (
              // eslint-disable-next-line @next/next/no-img-element -- miniatura da prévia, pela rota do painel
              <img src={capa} alt="" className="aspect-video w-full shrink-0 rounded-[10px] object-cover sm:w-[124px]" />
            ) : null}
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              {video.estado === "encontrado" ? (
                <>
                  <p className="flex items-center gap-1.5 texto-titulo-card-pequeno text-status-sucesso-texto">
                    <CheckCircle2 aria-hidden className="size-4 shrink-0" />
                    Vídeo encontrado
                  </p>
                  <p className="texto-pequeno break-words text-texto-primario">
                    “{video.titulo}”
                    {duracaoSeg ? ` · ${textoDaDuracao(duracaoSeg)}` : ""}
                    {video.canal ? ` · canal ${video.canal}` : ""}
                  </p>
                </>
              ) : (
                <>
                  <p className="texto-titulo-card-pequeno text-status-aviso-texto">Não conseguimos falar com o YouTube agora</p>
                  <p className="texto-pequeno text-texto-primario">Preencha o título e a duração à mão. O vídeo continua valendo.</p>
                </>
              )}
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                <button
                  type="button"
                  onClick={() => setSeletor(true)}
                  className="alvo-toque inline-flex items-center gap-1.5 texto-pequeno font-semibold text-destaque-azul underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring"
                >
                  <ImageIcon aria-hidden className="size-4" />
                  Trocar capa
                </button>
                {capaDaMidia ? (
                  <button
                    type="button"
                    onClick={() => {
                      setCapaDaMidia(null);
                      mudar({ capaMidiaId: "" });
                    }}
                    className="alvo-toque inline-flex items-center gap-1.5 texto-pequeno font-semibold text-destaque-azul underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring"
                  >
                    <Undo2 aria-hidden className="size-4" />
                    Usar a do YouTube
                  </button>
                ) : null}
              </div>
              {erroNo("capa") ? <p className="texto-pequeno text-status-perigo-texto">{erroNo("capa")}</p> : null}
            </div>
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-3 sm:grid-cols-[112px_minmax(0,1fr)]">
        <div className="flex flex-col gap-2">
          <Label htmlFor="episodio-numero">Nº *</Label>
          <Input
            id="episodio-numero"
            inputMode="numeric"
            value={campos.numero}
            aria-invalid={erroNo("numero") ? true : undefined}
            aria-describedby={erroNo("numero") ? "episodio-numero-erro" : undefined}
            onChange={(e) => mudar({ numero: e.target.value.replace(/\D/g, "").slice(0, 5) })}
          />
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-3">
            <Label htmlFor="episodio-titulo">Título no site *</Label>
            <span aria-hidden className={cn("texto-pequeno", campos.titulo.length >= TITULO_MAX ? "text-status-perigo-texto" : "text-texto-terciario")}>
              {campos.titulo.length}/{TITULO_MAX}
            </span>
          </div>
          <Input
            id="episodio-titulo"
            value={campos.titulo}
            maxLength={TITULO_MAX}
            aria-invalid={erroNo("titulo") ? true : undefined}
            aria-describedby={erroNo("titulo") ? "episodio-titulo-erro" : undefined}
            onChange={(e) => mudar({ titulo: e.target.value })}
          />
        </div>
        {erroNo("numero") ? (
          <p id="episodio-numero-erro" className="col-span-2 -mt-1 texto-pequeno text-status-perigo-texto">
            {erroNo("numero")}
          </p>
        ) : null}
        {erroNo("titulo") ? (
          <p id="episodio-titulo-erro" className="col-span-2 -mt-1 texto-pequeno text-status-perigo-texto">
            {erroNo("titulo")}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <Label htmlFor="episodio-resumo">Resumo</Label>
          <span aria-hidden className={cn("texto-pequeno", campos.resumo.length >= RESUMO_MAX ? "text-status-perigo-texto" : "text-texto-terciario")}>
            {campos.resumo.length}/{RESUMO_MAX}
          </span>
        </div>
        <Textarea
          id="episodio-resumo"
          rows={2}
          maxLength={RESUMO_MAX}
          className="min-h-[72px]"
          value={campos.resumo}
          aria-invalid={erroNo("resumo") ? true : undefined}
          aria-describedby="episodio-resumo-ajuda"
          onChange={(e) => mudar({ resumo: e.target.value })}
        />
        <p id="episodio-resumo-ajuda" className={cn("texto-pequeno", erroNo("resumo") ? "text-status-perigo-texto" : "text-texto-secundario")}>
          {erroNo("resumo") ?? "Aparece no card do episódio. Até 2 linhas."}
        </p>
      </div>

      <div className="grid gap-[18px] sm:grid-cols-2 sm:gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="episodio-tema">Tema</Label>
          <select
            id="episodio-tema"
            value={campos.temaId}
            disabled={temas.length === 0}
            aria-invalid={erroNo("tema") ? true : undefined}
            aria-describedby="episodio-tema-ajuda"
            onChange={(e) => mudar({ temaId: e.target.value })}
            className="h-[52px] w-full rounded-[14px] border border-borda-forte bg-fundo-superficie px-4 texto-corpo text-texto-primario outline-none focus-visible:border-destaque-azul focus-visible:ring-[4px] focus-visible:ring-destaque-azul/15 disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-destaque-vermelho"
          >
            <option value="">{temas.length === 0 ? "Nenhum tema cadastrado" : "Sem tema"}</option>
            {temas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome}
              </option>
            ))}
          </select>
          <p id="episodio-tema-ajuda" className={cn("texto-pequeno", erroNo("tema") ? "text-status-perigo-texto" : "text-texto-secundario")}>
            {erroNo("tema") ??
              (temas.length === 0 ? "O Administrador geral cria os temas em Configurações › Categorias." : "Filtra os episódios na página do site.")}
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="episodio-duracao">Duração</Label>
          <Input
            id="episodio-duracao"
            inputMode="numeric"
            placeholder="28:10"
            value={campos.duracao}
            aria-invalid={erroNo("duracao") ? true : undefined}
            aria-describedby="episodio-duracao-ajuda"
            onChange={(e) => {
              mudar({ duracao: e.target.value });
              setDuracaoDoYoutube(false);
            }}
          />
          <p id="episodio-duracao-ajuda" className={cn("texto-pequeno", erroNo("duracao") ? "text-status-perigo-texto" : "text-texto-secundario")}>
            {erroNo("duracao") ??
              (duracaoDoYoutube && duracaoSeg
                ? `Veio do YouTube (${duracaoPorExtenso(duracaoSeg)}). Pode ajustar.`
                : "Como 28:10 ou 1:02:30. Opcional.")}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="episodio-exibicao">Exibição *</Label>
        <div className="relative">
          <CalendarDays aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-texto-terciario" />
          <Input
            id="episodio-exibicao"
            type="datetime-local"
            className="pl-10"
            value={campos.data && campos.hora ? `${campos.data}T${campos.hora}` : ""}
            aria-invalid={erroNo("exibicao") ? true : undefined}
            aria-describedby="episodio-exibicao-ajuda"
            onChange={(e) => mudar({ data: e.target.value.slice(0, 10), hora: e.target.value.slice(11, 16) })}
          />
        </div>
        <p id="episodio-exibicao-ajuda" className={cn("texto-pequeno", erroNo("exibicao") ? "text-status-perigo-texto" : "text-texto-secundario")}>
          {erroNo("exibicao") ??
            (vaiAgendar
              ? "Horário de Vitória da Conquista. No futuro, o episódio entra no site sozinho nessa hora."
              : "Horário de Vitória da Conquista. Agora ou antes, o episódio entra no site assim que você publicar.")}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <Label htmlFor="episodio-transcricao">Transcrição (opcional)</Label>
          <span aria-hidden className="texto-pequeno text-texto-terciario">
            {campos.transcricao.length.toLocaleString("pt-BR")}/{TRANSCRICAO_MAX.toLocaleString("pt-BR")}
          </span>
        </div>
        <Textarea
          id="episodio-transcricao"
          rows={4}
          maxLength={TRANSCRICAO_MAX}
          className="max-h-60 min-h-[96px]"
          value={campos.transcricao}
          aria-invalid={erroNo("transcricao") ? true : undefined}
          aria-describedby="episodio-transcricao-ajuda"
          onChange={(e) => mudar({ transcricao: e.target.value })}
        />
        <p id="episodio-transcricao-ajuda" className={cn("texto-pequeno", erroNo("transcricao") ? "text-status-perigo-texto" : "text-texto-secundario")}>
          {erroNo("transcricao") ?? "Cole o texto que o YouTube Studio gera. Com texto, o site mostra “Ler transcrição”."}
        </p>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <p id="episodio-ultimo" className="texto-corpo-destaque text-texto-primario">
            Marcar como “Último programa”
          </p>
          <p id="episodio-ultimo-ajuda" className="texto-pequeno text-texto-secundario">
            {avisoDoUltimo}
          </p>
        </div>
        <Interruptor ligado={campos.ultimoPrograma} rotuloId="episodio-ultimo" descricaoId="episodio-ultimo-ajuda" aoMudar={(v) => mudar({ ultimoPrograma: v })} />
      </div>

      <SeletorDeMidia
        aberto={seletor}
        aoMudarAberto={setSeletor}
        so="imagens"
        titulo="Capa do episódio"
        descricao="Escolha uma imagem da Mídia ou envie uma nova. No lugar da capa do YouTube."
        limites={limites}
        aoEscolher={(arquivo) => {
          setCapaDaMidia(arquivo.url);
          mudar({ capaMidiaId: arquivo.id });
        }}
      />
    </>
  );

  const botoes = (
    <>
      {situacao === "rascunho" ? (
        <Button type="button" variant="secundario" disabled={!!gravando} onClick={() => salvar("rascunho")} className="flex-1 sm:flex-none">
          {gravando === "rascunho" ? "Salvando…" : grande ? "Salvar rascunho" : "Rascunho"}
        </Button>
      ) : (
        <Button type="button" variant="secundario" disabled={!!gravando} onClick={aoCancelar} className="flex-1 sm:flex-none">
          Cancelar
        </Button>
      )}
      <Button type="submit" disabled={!!gravando} className="flex-1 sm:flex-none">
        {vaiAgendar ? <CalendarDays aria-hidden /> : null}
        {gravando === "programar" ? "Salvando…" : grande ? rotuloPrincipal : rotuloPrincipal.replace(" episódio", "")}
      </Button>
    </>
  );

  const aoEnviar = (e: React.FormEvent) => {
    e.preventDefault();
    void salvar("programar");
  };

  if (grande) {
    return (
      <form onSubmit={aoEnviar} noValidate className="flex min-h-0 flex-col">
        <DialogBody>{camposDoFormulario}</DialogBody>
        <DialogFooter>{botoes}</DialogFooter>
      </form>
    );
  }
  return (
    <form onSubmit={aoEnviar} noValidate className="flex min-h-0 flex-col">
      <DrawerBody className="gap-[18px] px-5 pt-2">{camposDoFormulario}</DrawerBody>
      <div className="flex gap-3 border-t border-borda-padrao px-5 py-3">{botoes}</div>
    </form>
  );
}

"use client";

import { useEditorState, type Editor } from "@tiptap/react";
import { ChevronLeft, Cloud, CloudOff, Eye, ImageIcon, LoaderCircle, MapPin, Redo2, Undo2, Upload, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { useConectado } from "@/components/painel/use-conexao";
import { Alerta } from "@/components/ui/alerta";
import { Button } from "@/components/ui/button";
import { Campo } from "@/components/ui/campo";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LIMITE_LINHA_FINA, LIMITE_MANCHETE, type ArquivoConhecido, type DadosNoticia } from "@/lib/conteudos/dados";
import { armazemDoNavegador, criarFilaDoRascunho, type EstadoDaFila, type VersaoServidor } from "@/lib/conteudos/fila-rascunho";
import type { EstadoConteudo } from "@/lib/conteudos/listar";
import { horaNaBahia } from "@/lib/datas";
import { cn } from "@/lib/utils";

import { acaoResolverConflito, acaoSalvarRascunho } from "../acoes";
import { SeloEstado } from "../selos";
import { CorpoRico, MENSAGEM_SEM_INTERNET_MIDIA } from "./corpo-rico";
import { Etiquetas } from "./etiquetas";
import { FontesEAnexos } from "./fontes-anexos";
import { ModalConflito, ModalSair } from "./modais";
import { SeletorDeMidia } from "./seletor-midia";

export type InicioDoEditor = {
  id: string | null;
  revisao: number;
  estado: EstadoConteudo;
  dados: DadosNoticia;
  salvoEm: string | null;
  servidor: VersaoServidor | null;
};

type Saida = { tipo: "link"; href: string } | { tipo: "formulario"; formulario: HTMLFormElement };

const DICA_EM_BREVE = "Disponível em breve";
const DICA_SEM_INTERNET = "Sem internet: publicar e agendar voltam quando a conexão voltar";

/**
 * Editor de notícia (RF37, RF38; Figma 112:1091 e 120:3836). O rascunho é salvo sozinho pela
 * fila (fila-rascunho.ts): sem internet, fica guardado neste computador, só para esta pessoa (E02, E40).
 */
export function EditorNoticia({
  pessoaId,
  inicio,
  categorias,
  arquivosIniciais,
  intervaloMs,
  limites,
}: {
  pessoaId: string;
  inicio: InicioDoEditor;
  categorias: { id: string; nome: string }[];
  arquivosIniciais: Record<string, ArquivoConhecido>;
  intervaloMs: number;
  limites: { tamanhoMaximoBytes: number; mensagemDeTamanho: string };
}) {
  const router = useRouter();
  const conectado = useConectado();
  const [dados, setDados] = React.useState(inicio.dados);
  const [base, setBase] = React.useState(inicio.dados);
  const [arquivos, setArquivos] = React.useState(arquivosIniciais);
  const [corpoEditor, setCorpoEditor] = React.useState<Editor | null>(null);
  const [seletorCapa, setSeletorCapa] = React.useState(false);
  const [decidirDepois, setDecidirDepois] = React.useState(false);
  const [resolvendo, setResolvendo] = React.useState(false);
  const [erroConflito, setErroConflito] = React.useState<string | null>(null);
  const [guardadaEm, setGuardadaEm] = React.useState<Date | null>(null);
  const [saida, setSaida] = React.useState<Saida | null>(null);
  const [salvandoParaSair, setSalvandoParaSair] = React.useState(false);
  const liberarSaida = React.useRef(false);

  // Uma sessão de edição por vez que o editor abre: a Atividade registra a edição uma vez por sessão (E40).
  const [sessaoEdicao] = React.useState(() => crypto.randomUUID());
  const [fila] = React.useState(() =>
    criarFilaDoRascunho({
      pessoaId,
      id: inicio.id,
      revisao: inicio.revisao,
      salvoEm: inicio.salvoEm,
      intervaloMs,
      enviar: (pedido) => acaoSalvarRascunho(pedido, sessaoEdicao),
      online: () => navigator.onLine,
      armazem: armazemDoNavegador(),
      versaoServidor: inicio.servidor ?? undefined,
    }),
  );
  const estado = React.useSyncExternalStore(fila.assinar, fila.estado, fila.estado);
  // Saiu do editor sem passar pelo modal (ex.: botão Voltar do navegador): salva o que estiver pendente.
  // A cópia no navegador continua como garantia se o envio não chegar.
  React.useEffect(
    () => () => {
      if (fila.temPendencia()) void fila.salvarAgora();
      fila.destruir();
    },
    [fila],
  );

  // Ao abrir: há uma cópia desta pessoa guardada neste navegador? (E02, computador compartilhado)
  // O navegador só pode ser lido depois da hidratação (no servidor não há localStorage): por isso o efeito.
  React.useEffect(() => {
    const retomada = fila.retomar();
    if (retomada.tipo === "nada") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGuardadaEm(new Date(retomada.guardadoEm));
    if (retomada.tipo === "retomada") {
      setDados(retomada.dados);
      toast.info("Recuperamos as alterações guardadas neste computador.");
    }
  }, [fila]);

  // A conexão voltou: envia o que ficou guardado.
  React.useEffect(() => {
    if (conectado) void fila.conexaoVoltou();
  }, [conectado, fila]);

  // Notícia nova: depois do primeiro salvamento, o endereço passa a ser o da notícia (sem recarregar o editor).
  React.useEffect(() => {
    if (estado.id && !window.location.pathname.endsWith(estado.id)) {
      window.history.replaceState(null, "", `/painel/conteudos/noticia/${estado.id}`);
    }
  }, [estado.id]);

  // O valor mais recente, para juntar mudanças seguidas sem depender do ciclo de renderização.
  const dadosAtuais = React.useRef(dados);
  React.useEffect(() => {
    dadosAtuais.current = dados;
  }, [dados]);
  const mudar = React.useCallback(
    (mudanca: Partial<DadosNoticia>) => {
      const novos = { ...dadosAtuais.current, ...mudanca };
      dadosAtuais.current = novos;
      setDados(novos);
      fila.alterar(novos);
    },
    [fila],
  );

  // Ctrl+S / ⌘S salva na hora.
  React.useEffect(() => {
    const aoTeclar = (evento: KeyboardEvent) => {
      if ((evento.ctrlKey || evento.metaKey) && evento.key.toLowerCase() === "s") {
        evento.preventDefault();
        void fila.salvarAgora();
      }
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [fila]);

  // Sair com alteração pendente (CA-US21.4): links e formulários do painel abrem o modal; fechar a aba, o aviso do navegador.
  React.useEffect(() => {
    const aoClicar = (evento: MouseEvent) => {
      if (liberarSaida.current || !fila.temPendencia() || evento.defaultPrevented) return;
      if (evento.button !== 0 || evento.ctrlKey || evento.metaKey || evento.shiftKey || evento.altKey) return;
      const link = (evento.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
      const destino = new URL(link.href, window.location.href);
      if (destino.origin !== window.location.origin || destino.pathname === window.location.pathname) return;
      evento.preventDefault();
      evento.stopPropagation();
      setSaida({ tipo: "link", href: destino.pathname + destino.search });
    };
    const aoEnviar = (evento: SubmitEvent) => {
      if (liberarSaida.current || !fila.temPendencia()) return;
      const formulario = evento.target as HTMLFormElement;
      if (formulario.closest("[data-editor-noticia]") || formulario.closest("[role=dialog]")) return;
      evento.preventDefault();
      evento.stopPropagation();
      setSaida({ tipo: "formulario", formulario });
    };
    const antesDeFechar = (evento: BeforeUnloadEvent) => {
      if (liberarSaida.current || !fila.temPendencia()) return;
      evento.preventDefault();
      evento.returnValue = "";
    };
    document.addEventListener("click", aoClicar, true);
    document.addEventListener("submit", aoEnviar, true);
    window.addEventListener("beforeunload", antesDeFechar);
    return () => {
      document.removeEventListener("click", aoClicar, true);
      document.removeEventListener("submit", aoEnviar, true);
      window.removeEventListener("beforeunload", antesDeFechar);
    };
  }, [fila]);

  const seguirSaida = (destino: Saida) => {
    liberarSaida.current = true;
    setSaida(null);
    if (destino.tipo === "link") router.push(destino.href);
    else destino.formulario.requestSubmit();
  };

  const salvarESair = async () => {
    if (!saida) return;
    setSalvandoParaSair(true);
    await fila.salvarAgora();
    setSalvandoParaSair(false);
    const depois = fila.estado();
    if (depois.situacao === "sincronizado") return seguirSaida(saida);
    if (depois.situacao === "sem_internet") {
      toast.info("Guardado neste computador. Será salvo quando a conexão voltar.");
      return seguirSaida(saida);
    }
    setSaida(null);
    // Erro fica até a pessoa fechar (RN42).
    toast.error(depois.erro?.mensagem ?? "Não foi possível salvar. Confira o aviso no topo do editor.", {
      duration: Infinity,
      closeButton: true,
    });
  };

  const resolver = async (escolha: "minha" | "servidor") => {
    const conflito = estado.conflito;
    if (!conflito || !estado.id) return;
    setResolvendo(true);
    setErroConflito(null);
    const resposta = await acaoResolverConflito(
      {
        id: estado.id,
        escolha,
        revisaoServidor: conflito.servidor.revisao,
        dados: escolha === "minha" ? conflito.minha : conflito.servidor.dados,
      },
      sessaoEdicao,
    ).catch(() => ({ tipo: "erro" as const, mensagem: "Sem conexão com o servidor. Confira a internet e tente de novo." }));
    setResolvendo(false);
    if (resposta.tipo === "salvo") {
      const escolhidos = escolha === "minha" ? conflito.minha : conflito.servidor.dados;
      setDados(escolhidos);
      setBase(escolhidos);
      fila.conflitoResolvido(resposta);
      setDecidirDepois(false);
      toast.success(escolha === "minha" ? "Sua versão foi mantida." : "A versão do servidor foi mantida.");
    } else if (resposta.tipo === "conflito") {
      fila.conflitoAtualizado(resposta.servidor);
      setErroConflito("Alguém salvou de novo enquanto você escolhia. Confira as versões e escolha outra vez.");
    } else if (resposta.tipo === "erro") {
      setErroConflito(resposta.mensagem);
    } else {
      setErroConflito("Sem conexão com o servidor. Confira a internet e tente de novo.");
    }
  };

  const erroDoCampo = (campo: keyof DadosNoticia) => (estado.erro?.campo === campo ? estado.erro.mensagem : undefined);
  const capa = dados.capaMidiaId ? arquivos[dados.capaMidiaId] : undefined;
  const emConflito = estado.situacao === "conflito" && estado.conflito;

  return (
    <div data-editor-noticia className="flex flex-1 flex-col">
      <header className="sticky top-0 z-30 flex flex-col gap-3 border-b border-borda-padrao bg-fundo-cabecalho px-5 py-3 sm:flex-row sm:items-center lg:px-10">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Link
            href="/painel/conteudos"
            aria-label="Voltar para Conteúdos"
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-fundo-superficie-alt text-texto-primario outline-none hover:brightness-95 focus-visible:ring-[3px] focus-visible:ring-ring"
          >
            <ChevronLeft aria-hidden className="size-5" />
          </Link>
          <div className="flex min-w-0 flex-col">
            <div className="flex items-center gap-2">
              <h1 className="truncate texto-titulo-card text-texto-primario">{estado.id ? "Editar notícia" : "Nova notícia"}</h1>
              <SeloEstado estado={inicio.estado} />
            </div>
            <StatusDoSalvamento estado={estado} temId={!!estado.id} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DesfazerRefazer editor={corpoEditor} />
          <BotaoTravado rotulo="Pré-visualizar" dica={DICA_EM_BREVE} icone={<Eye aria-hidden />} />
          <Button type="button" variant="secundario" size="pequeno" onClick={() => void fila.salvarAgora()}>
            Salvar rascunho
          </Button>
          <BotaoTravado
            rotulo="Publicar…"
            dica={conectado ? DICA_EM_BREVE : DICA_SEM_INTERNET}
            icone={<Upload aria-hidden />}
            primario
          />
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-6 px-5 pt-6 pb-12 lg:px-10 xl:flex-row xl:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          {estado.situacao === "erro" && estado.erro ? (
            <Alerta tipo="erro" titulo="Não foi possível salvar">
              {estado.erro.mensagem} Suas alterações continuam guardadas neste computador.
            </Alerta>
          ) : null}
          {emConflito && decidirDepois ? (
            <Alerta tipo="aviso" titulo="Há duas versões deste rascunho">
              <div className="flex flex-col items-start gap-2">
                O salvamento automático está parado até você escolher qual versão manter.
                <Button type="button" variant="secundario" size="pequeno" onClick={() => setDecidirDepois(false)}>
                  Resolver conflito
                </Button>
              </div>
            </Alerta>
          ) : null}

          <Cartao titulo="Texto da notícia" descricao="Manchete, linha fina e lide aparecem no topo da matéria, nesta ordem.">
            <CampoComContador
              id="manchete"
              rotulo="Manchete"
              ajuda="Seja direto: diga o fato principal em uma frase."
              limite={LIMITE_MANCHETE}
              valor={dados.titulo}
              erro={erroDoCampo("titulo")}
              aoMudar={(titulo) => mudar({ titulo })}
            />
            <CampoComContador
              id="linha-fina"
              rotulo="Linha fina"
              limite={LIMITE_LINHA_FINA}
              valor={dados.linhaFina}
              erro={erroDoCampo("linhaFina")}
              aoMudar={(linhaFina) => mudar({ linhaFina })}
              multilinha
            />
            <div className="flex flex-col gap-2">
              <Label htmlFor="lide">Lide</Label>
              <Textarea
                id="lide"
                value={dados.lide}
                maxLength={2000}
                aria-describedby="lide-ajuda"
                aria-invalid={erroDoCampo("lide") ? true : undefined}
                onChange={(evento) => mudar({ lide: evento.target.value })}
              />
              <p id="lide-ajuda" className={cn("texto-pequeno", erroDoCampo("lide") ? "text-status-perigo-texto" : "text-texto-terciario")}>
                {erroDoCampo("lide") ?? "Primeiro parágrafo: responda o quê, quem, quando, onde e por quê."}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <span className="texto-rotulo text-texto-primario" id="rotulo-corpo">
                Corpo da notícia
              </span>
              <CorpoRico
                valor={dados.corpo}
                aoMudar={(corpo) => mudar({ corpo })}
                aoCriar={setCorpoEditor}
                conectado={conectado}
                limites={limites}
                rodape={<StatusCurto estado={estado} />}
              />
            </div>
          </Cartao>

          <Cartao titulo="Imagem de capa" descricao="Aparece no topo da notícia e nos cards do site. Tamanho recomendado: 1200 × 675 px.">
            <div className="flex flex-col gap-5 md:flex-row">
              <div className="flex flex-col gap-3 md:w-[280px]">
                <div className="flex aspect-video w-full items-center justify-center overflow-hidden rounded-[14px] bg-fundo-superficie-alt">
                  {capa ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={capa.url} alt="" className="size-full object-cover" />
                  ) : (
                    <ImageIcon aria-hidden className="size-10 text-texto-terciario" />
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="secundario"
                    size="pequeno"
                    aria-disabled={!conectado || undefined}
                    aria-describedby={conectado ? undefined : "dica-capa-sem-internet"}
                    onClick={() => conectado && setSeletorCapa(true)}
                  >
                    {capa ? "Trocar" : "Escolher imagem"}
                  </Button>
                  {capa ? (
                    <Button type="button" variant="secundario" size="pequeno" onClick={() => mudar({ capaMidiaId: null })}>
                      Tirar
                    </Button>
                  ) : null}
                </div>
                {conectado ? null : (
                  <p id="dica-capa-sem-internet" className="texto-pequeno text-texto-terciario">
                    {MENSAGEM_SEM_INTERNET_MIDIA}
                  </p>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-4">
                <Campo
                  id="capa-alt"
                  rotulo="Texto alternativo"
                  ajuda="Obrigatório para publicar. Ex.: “Trabalhadores reunidos em assembleia na sede do sindicato.”"
                  placeholder="Descreva o que aparece na imagem"
                  value={dados.capaAlt}
                  maxLength={250}
                  erro={erroDoCampo("capaAlt")}
                  onChange={(evento) => mudar({ capaAlt: evento.target.value })}
                />
                <Campo
                  id="capa-legenda"
                  rotulo="Legenda e crédito"
                  value={dados.capaLegenda}
                  maxLength={300}
                  erro={erroDoCampo("capaLegenda")}
                  onChange={(evento) => mudar({ capaLegenda: evento.target.value })}
                />
              </div>
            </div>
          </Cartao>

          <Cartao titulo="Fontes, links e anexos" descricao="Opcional. Ajuda o leitor a conferir a informação.">
            <FontesEAnexos
              links={dados.links}
              aoMudar={(links) => mudar({ links })}
              arquivos={arquivos}
              aoConhecerArquivo={(id, arquivo) => setArquivos((atuais) => ({ ...atuais, [id]: arquivo }))}
              conectado={conectado}
              limites={limites}
            />
            <div className="flex flex-col gap-2">
              <Label htmlFor="palavras-chave">
                Palavras-chave <span className="texto-pequeno font-normal text-texto-terciario">Ajudam na busca do site</span>
              </Label>
              <Etiquetas id="palavras-chave" valor={dados.palavrasChave} aoMudar={(palavrasChave) => mudar({ palavrasChave })} />
            </div>
          </Cartao>
        </div>

        <aside className="flex flex-col gap-6 xl:sticky xl:top-[88px] xl:w-[320px]">
          <Cartao
            titulo="Publicação"
            acao={<SeloEstado estado={inicio.estado} />}
          >
            <Campo
              id="assinatura"
              rotulo="Assinatura"
              icone="/painel/menu-pessoas.svg"
              placeholder="Ex.: Redação SINTRAVC"
              value={dados.assinatura}
              maxLength={120}
              erro={erroDoCampo("assinatura")}
              onChange={(evento) => mudar({ assinatura: evento.target.value })}
            />
            <div className="flex flex-col gap-2">
              <Label htmlFor="local">Local</Label>
              <div className="relative">
                <MapPin aria-hidden className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-texto-terciario" />
                <Input
                  id="local"
                  className="pl-[46px]"
                  placeholder="Ex.: Vitória da Conquista (BA)"
                  value={dados.local}
                  maxLength={120}
                  onChange={(evento) => mudar({ local: evento.target.value })}
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="categoria">Categoria</Label>
              <select
                id="categoria"
                value={dados.categoriaId ?? ""}
                aria-invalid={erroDoCampo("categoriaId") ? true : undefined}
                onChange={(evento) => mudar({ categoriaId: evento.target.value || null })}
                className="h-[52px] w-full rounded-[14px] border border-borda-forte bg-fundo-superficie px-4 texto-corpo text-texto-primario outline-none focus-visible:border-destaque-azul focus-visible:ring-[4px] focus-visible:ring-destaque-azul/15 aria-invalid:border-destaque-vermelho"
              >
                <option value="">Escolha a categoria</option>
                {categorias.map((categoria) => (
                  <option key={categoria.id} value={categoria.id}>
                    {categoria.nome}
                  </option>
                ))}
              </select>
              {erroDoCampo("categoriaId") ? (
                <p className="texto-pequeno text-status-perigo-texto">{erroDoCampo("categoriaId")}</p>
              ) : null}
            </div>
            <p className="flex items-start gap-2 rounded-[12px] bg-fundo-superficie-alt p-3 texto-pequeno text-texto-secundario">
              <User aria-hidden className="mt-0.5 size-4 shrink-0" />
              Fica como rascunho, fora do site, até alguém publicar.
            </p>
          </Cartao>
        </aside>
      </div>

      <SeletorDeMidia
        aberto={seletorCapa}
        aoMudarAberto={setSeletorCapa}
        so="imagens"
        titulo="Imagem de capa"
        descricao="Escolha uma imagem da Mídia ou envie uma nova."
        limites={limites}
        aoEscolher={(arquivo) => {
          setArquivos((atuais) => ({ ...atuais, [arquivo.id]: { nomeArquivo: arquivo.nomeArquivo, url: arquivo.url } }));
          mudar({
            capaMidiaId: arquivo.id,
            capaAlt: dados.capaAlt || arquivo.alt,
            capaLegenda: dados.capaLegenda || arquivo.legenda,
          });
        }}
      />

      <ModalSair
        aberto={!!saida}
        titulo={dados.titulo}
        salvando={salvandoParaSair}
        aoVoltar={() => setSaida(null)}
        aoDescartar={() => {
          fila.descartar();
          if (saida) seguirSaida(saida);
        }}
        aoSalvarESair={() => void salvarESair()}
      />
      {emConflito ? (
        <ModalConflito
          aberto={!decidirDepois}
          minha={emConflito.minha}
          servidor={emConflito.servidor}
          base={base}
          guardadaEm={guardadaEm}
          resolvendo={resolvendo}
          erro={erroConflito}
          aoEscolher={(escolha) => void resolver(escolha)}
          aoDecidirDepois={() => setDecidirDepois(true)}
        />
      ) : null}
    </div>
  );
}

function Cartao({
  titulo,
  descricao,
  acao,
  children,
}: {
  titulo: string;
  descricao?: string;
  acao?: React.ReactNode;
  children: React.ReactNode;
}) {
  const id = React.useId();
  return (
    <section aria-labelledby={id} className="flex flex-col gap-5 rounded-[20px] border border-borda-padrao bg-fundo-superficie p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 id={id} className="texto-titulo-card text-texto-primario">
            {titulo}
          </h2>
          {descricao ? <p className="texto-pequeno text-texto-secundario">{descricao}</p> : null}
        </div>
        {acao}
      </div>
      {children}
    </section>
  );
}

function CampoComContador({
  id,
  rotulo,
  ajuda,
  limite,
  valor,
  erro,
  aoMudar,
  multilinha,
}: {
  id: string;
  rotulo: string;
  ajuda?: string;
  limite: number;
  valor: string;
  erro?: string;
  aoMudar: (valor: string) => void;
  multilinha?: boolean;
}) {
  const mensagem = erro ?? ajuda;
  const props = {
    id,
    value: valor,
    maxLength: limite,
    "aria-invalid": erro ? true : undefined,
    "aria-describedby": `${id}-contador${mensagem ? ` ${id}-mensagem` : ""}`,
  } as const;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline gap-2">
        <Label htmlFor={id}>{rotulo}</Label>
        <span id={`${id}-contador`} className="texto-pequeno text-texto-terciario" aria-live="polite">
          <span className="sr-only">Caracteres usados: </span>
          {valor.length}/{limite}
        </span>
      </div>
      {multilinha ? (
        <Textarea {...props} className="min-h-[72px]" onChange={(evento) => aoMudar(evento.target.value)} />
      ) : (
        <Input {...props} onChange={(evento) => aoMudar(evento.target.value)} />
      )}
      {mensagem ? (
        <p id={`${id}-mensagem`} className={cn("texto-pequeno", erro ? "text-status-perigo-texto" : "text-texto-terciario")}>
          {mensagem}
        </p>
      ) : null}
    </div>
  );
}

function textoDoStatus(estado: EstadoDaFila, temId: boolean): string {
  switch (estado.situacao) {
    case "salvando":
      return "Salvando…";
    case "pendente":
      return "Alterações ainda não salvas";
    case "sem_internet":
      return "Sem internet · guardado neste computador";
    case "conflito":
      return "Há duas versões do rascunho";
    case "erro":
      return "Não foi possível salvar";
    default:
      if (estado.salvoEm) return `Salvo automaticamente às ${horaNaBahia(new Date(estado.salvoEm))}`;
      return temId ? "Tudo salvo" : "Comece a escrever: o rascunho é salvo sozinho";
  }
}

function StatusDoSalvamento({ estado, temId }: { estado: EstadoDaFila; temId: boolean }) {
  const Icone = estado.situacao === "salvando" ? LoaderCircle : estado.situacao === "sem_internet" ? CloudOff : Cloud;
  return (
    <p
      role="status"
      aria-live="polite"
      data-testid="status-do-salvamento"
      className={cn(
        "flex items-center gap-1.5 texto-pequeno",
        estado.situacao === "erro" || estado.situacao === "conflito" ? "text-status-perigo-texto" : "text-texto-secundario",
      )}
    >
      <Icone aria-hidden className={cn("size-4", estado.situacao === "salvando" && "animate-spin motion-reduce:animate-none")} />
      {textoDoStatus(estado, temId)}
    </p>
  );
}

function StatusCurto({ estado }: { estado: EstadoDaFila }) {
  const texto =
    estado.situacao === "sincronizado" && estado.salvoEm
      ? "Alterações salvas"
      : estado.situacao === "sem_internet"
        ? "Guardado neste computador"
        : null;
  if (!texto) return null;
  return (
    <span className="inline-flex items-center gap-1.5">
      {estado.situacao === "sem_internet" ? <CloudOff aria-hidden className="size-4" /> : <Cloud aria-hidden className="size-4" />}
      {texto}
    </span>
  );
}

/** Desfazer e refazer do topo (Figma 112:1091): agem no texto rico, como os da barra (E40). */
function DesfazerRefazer({ editor }: { editor: Editor | null }) {
  const pode = useEditorState({
    editor,
    selector: ({ editor: e }) => (e ? { desfazer: e.can().undo(), refazer: e.can().redo() } : null),
  });
  const classe =
    "flex size-10 items-center justify-center rounded-full text-texto-secundario outline-none hover:bg-fundo-superficie-alt focus-visible:ring-[3px] focus-visible:ring-ring disabled:opacity-40 [&_svg]:size-5";
  return (
    <div className="flex items-center">
      <button
        type="button"
        aria-label="Desfazer no corpo (Ctrl+Z)"
        title="Desfazer no corpo (Ctrl+Z)"
        disabled={!pode?.desfazer}
        onClick={() => editor?.chain().focus().undo().run()}
        className={classe}
      >
        <Undo2 aria-hidden />
      </button>
      <button
        type="button"
        aria-label="Refazer no corpo (Ctrl+Shift+Z)"
        title="Refazer no corpo (Ctrl+Shift+Z)"
        disabled={!pode?.refazer}
        onClick={() => editor?.chain().focus().redo().run()}
        className={classe}
      >
        <Redo2 aria-hidden />
      </button>
    </div>
  );
}

/** Botão que ainda não funciona aqui: fica visível, travado, com a dica lida pelo leitor de tela. */
function BotaoTravado({ rotulo, dica, icone, primario }: { rotulo: string; dica: string; icone: React.ReactNode; primario?: boolean }) {
  const id = React.useId();
  return (
    <span className="inline-flex" title={dica}>
      <Button type="button" variant={primario ? "primario" : "secundario"} size="pequeno" aria-disabled aria-describedby={id}>
        {icone}
        {rotulo}
      </Button>
      <span id={id} className="sr-only">
        {dica}
      </span>
    </span>
  );
}

"use client";

import { CalendarDays, Link2, X } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { FaixaComunicado } from "@/components/site/faixa-comunicado";
import { Alerta } from "@/components/ui/alerta";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { Drawer, DrawerBody, DrawerContent, DrawerHeader } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LIMITE_TEXTO, LIMITE_TITULO, normalizarLinkDoComunicado, type CampoDoComunicado } from "@/lib/comunicados/regras";
import { bahiaParaUtc, camposEmTexto } from "@/lib/datas";
import { cn } from "@/lib/utils";

import { acaoBuscarConteudos, acaoSalvarComunicado, type ComunicadoNoFormulario, type ConteudoDoLink, type PedidoSalvar } from "./acoes";

type Campo = CampoDoComunicado;
type LinkEscolhido = ComunicadoNoFormulario["link"];

/** Campo de várias linhas com contador de caracteres (título e texto do comunicado). */
function CampoDeTexto({
  id,
  rotulo,
  valor,
  limite,
  linhas,
  aoMudar,
  erro,
  ajuda,
}: {
  id: string;
  rotulo: string;
  valor: string;
  limite: number;
  linhas: number;
  aoMudar: (valor: string) => void;
  erro?: string;
  ajuda: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <Label htmlFor={id}>{rotulo}</Label>
        <span aria-hidden className={cn("texto-pequeno", valor.length >= limite ? "text-status-perigo-texto" : "text-texto-terciario")}>
          {valor.length}/{limite}
        </span>
      </div>
      <Textarea
        id={id}
        value={valor}
        maxLength={limite}
        rows={linhas}
        className={linhas > 2 ? "min-h-[120px]" : "min-h-[80px]"}
        aria-invalid={erro ? true : undefined}
        aria-describedby={`${id}-ajuda`}
        onChange={(e) => aoMudar(e.target.value)}
      />
      <p id={`${id}-ajuda`} className={cn("texto-pequeno", erro ? "text-status-perigo-texto" : "text-texto-secundario")}>
        {erro ?? ajuda}
      </p>
    </div>
  );
}

/** "2026-10-24T08:00" (datetime-local) ⇄ { data, hora } no horário da Bahia. */
const paraCampo = (q: { data: string; hora: string } | null) => (q ? `${q.data}T${q.hora}` : "");
const doCampo = (valor: string) => (valor ? { data: valor.slice(0, 10), hora: valor.slice(11, 16) } : null);

/** Computador e tablet deitado: modal (165:16711). Abaixo de lg: folha inferior (170:18978, E49). */
function useTelaGrande() {
  const [grande, setGrande] = React.useState(true);
  React.useEffect(() => {
    const consulta = window.matchMedia("(min-width: 1024px)");
    const mudar = () => setGrande(consulta.matches);
    mudar();
    consulta.addEventListener("change", mudar);
    return () => consulta.removeEventListener("change", mudar);
  }, []);
  return grande;
}

/**
 * Novo comunicado e edição (RF43; Figma 165:16711 e 170:18978): título de até 140 caracteres (o que a
 * faixa mostra), texto de até 1.000 (na janela e na página Comunicados), link “Saiba mais” opcional (notícia, edital ou acordo publicado, ou um endereço), começo e fim, prévia da
 * faixa e o resumo de quando entra e sai do ar. No ar, o começo fica travado (E58).
 */
export function FormularioComunicado({
  aberto,
  aoMudar,
  inicial,
  aoSalvar,
}: {
  aberto: boolean;
  aoMudar: (aberto: boolean) => void;
  /** Sem `inicial`: novo comunicado. */
  inicial: ComunicadoNoFormulario | null;
  aoSalvar: () => void;
}) {
  const grande = useTelaGrande();
  const situacao = inicial?.situacao ?? "rascunho";
  const titulo = !inicial ? "Novo comunicado" : situacao === "rascunho" ? "Editar rascunho" : "Editar comunicado";
  const descricao = situacao === "no_ar" ? "Este comunicado está no site. As mudanças aparecem na hora." : "Aviso curto que aparece no topo de todas as páginas do site.";

  const corpo = <Corpo key={inicial?.id ?? "novo"} inicial={inicial} grande={grande} aoSalvar={aoSalvar} aoCancelar={() => aoMudar(false)} />;

  if (grande) {
    return (
      <Dialog open={aberto} onOpenChange={aoMudar}>
        <DialogContent className="max-w-[566px]">
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
  grande,
  aoSalvar,
  aoCancelar,
}: {
  inicial: ComunicadoNoFormulario | null;
  grande: boolean;
  aoSalvar: () => void;
  aoCancelar: () => void;
}) {
  const situacao = inicial?.situacao ?? "rascunho";
  const noAr = situacao === "no_ar";
  const [titulo, setTitulo] = React.useState(inicial?.titulo ?? "");
  const [texto, setTexto] = React.useState(inicial?.texto ?? "");
  const [link, setLink] = React.useState<LinkEscolhido>(inicial?.link ?? null);
  const [inicio, setInicio] = React.useState(paraCampo(inicial?.inicio ?? null));
  const [fim, setFim] = React.useState(paraCampo(inicial?.fim ?? null));
  const [erro, setErro] = React.useState<{ mensagem: string; campo?: Campo } | null>(null);
  const [gravando, setGravando] = React.useState<"rascunho" | "programar" | null>(null);
  const [textoDoLink, setTextoDoLink] = React.useState("");
  // A hora em que o formulário abriu decide entre “Agendar” e “Publicar agora”.
  const [abertoEm] = React.useState(() => Date.now());

  const inicioCampos = doCampo(inicio);
  const fimCampos = doCampo(fim);
  const inicioUtc = inicioCampos ? bahiaParaUtc(inicioCampos.data, inicioCampos.hora) : null;
  const entraAgora = !noAr && !!inicioUtc && inicioUtc.getTime() <= abertoEm;
  const erroNo = (campo: Campo) => (erro?.campo === campo ? erro.mensagem : undefined);

  const rotuloPrincipal =
    situacao === "agendado" || noAr ? "Salvar alterações" : entraAgora ? (grande ? "Publicar agora" : "Publicar") : grande ? "Agendar comunicado" : "Agendar";

  const salvar = async (modo: "rascunho" | "programar") => {
    // Texto digitado no link e não escolhido na lista: vale como endereço, se for um.
    let linkFinal = link;
    if (!linkFinal && textoDoLink.trim()) {
      linkFinal = { tipo: "url", url: textoDoLink };
    }
    const pedido: PedidoSalvar = {
      id: inicial?.id,
      modo,
      titulo,
      texto,
      link: linkFinal?.tipo === "conteudo" ? { tipo: "conteudo", id: linkFinal.id } : linkFinal,
      inicio: inicioCampos,
      fim: fimCampos,
    };
    setGravando(modo);
    setErro(null);
    const resposta = await acaoSalvarComunicado(pedido).catch(() => ({
      tipo: "erro" as const,
      mensagem: "Sem conexão com o servidor. Confira a internet e tente de novo.",
      campo: undefined,
    }));
    setGravando(null);
    if (resposta.tipo === "erro") {
      setErro({ mensagem: resposta.mensagem, campo: resposta.campo });
      if (resposta.campo) document.getElementById(`comunicado-${resposta.campo}`)?.focus();
      return;
    }
    toast.success(
      resposta.situacao === "no_ar"
        ? inicial && situacao === "no_ar"
          ? "Comunicado atualizado no site"
          : "Comunicado publicado: já está no site"
        : resposta.situacao === "agendado"
          ? "Comunicado agendado"
          : "Rascunho salvo",
    );
    aoSalvar();
  };

  const resumo =
    inicioCampos && fimCampos && (noAr || inicioUtc) ? (
      <Alerta tipo="informacao" titulo={noAr ? "No ar agora" : entraAgora ? "Entra no ar assim que você publicar" : `Entra no ar em ${curto(inicioCampos)}`}>
        E sai sozinho em {curto(fimCampos)}. Você pode encerrar antes a qualquer momento.
      </Alerta>
    ) : null;

  const campos = (
    <>
      {erro && !erro.campo ? <Alerta tipo="erro" titulo="Não foi possível salvar">{erro.mensagem}</Alerta> : null}

      <CampoDeTexto
        id="comunicado-titulo"
        rotulo="Título *"
        valor={titulo}
        limite={LIMITE_TITULO}
        linhas={2}
        aoMudar={setTitulo}
        erro={erroNo("titulo")}
        ajuda={`O que aparece na faixa amarela do site (até ${LIMITE_TITULO} caracteres).`}
      />

      <CampoDeTexto
        id="comunicado-texto"
        rotulo="Texto do comunicado *"
        valor={texto}
        limite={LIMITE_TEXTO}
        linhas={5}
        aoMudar={setTexto}
        erro={erroNo("texto")}
        ajuda={`Aparece com o título quando a pessoa abre o comunicado (até ${LIMITE_TEXTO} caracteres). Pode pular linha.`}
      />

      <CampoDoLink
        link={link}
        aoEscolher={(l) => {
          setLink(l);
          if (erro?.campo === "link") setErro(null);
        }}
        aoDigitar={setTextoDoLink}
        erro={erroNo("link")}
      />

      <div className="grid gap-[18px] sm:grid-cols-2 sm:gap-3">
        <CampoQuando
          id="comunicado-inicio"
          rotulo="Começa em *"
          valor={inicio}
          aoMudar={setInicio}
          erro={erroNo("inicio")}
          travado={noAr}
          ajuda={noAr ? "Já está no ar: o começo não muda." : undefined}
        />
        <CampoQuando id="comunicado-fim" rotulo="Termina em *" valor={fim} aoMudar={setFim} erro={erroNo("fim")} />
      </div>
      <p className="-mt-2 texto-pequeno text-texto-secundario">Horário de Vitória da Conquista.</p>

      {grande ? (
        <div className="flex flex-col gap-2">
          <p className="texto-eyebrow text-texto-terciario">Prévia no site</p>
          <div className="overflow-hidden rounded-[8px]">
            <FaixaComunicado
              modo="miniatura"
              intervaloSegundos={0}
              comunicados={[
                {
                  id: "previa",
                  titulo: titulo.trim() || "O título aparece aqui.",
                  texto: "",
                  link: link || textoDoLink.trim() ? { href: "#", externo: false } : null,
                },
              ]}
            />
          </div>
          {/* Ao abrir o comunicado (janela e página Comunicados): o título e o texto inteiro. */}
          <div data-testid="previa-aberta" className="flex max-h-48 flex-col gap-1.5 overflow-y-auto rounded-[8px] bg-destaque-amarelo px-4 py-3 text-destaque-marinho-fixo">
            <p className="texto-titulo-card-pequeno break-words">{titulo.trim() || "O título aparece aqui."}</p>
            <p className="texto-pequeno break-words whitespace-pre-line">{texto.trim() || "O texto do comunicado aparece aqui."}</p>
          </div>
        </div>
      ) : null}
      {resumo}
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
        {situacao === "rascunho" && grande ? <CalendarDays aria-hidden /> : null}
        {gravando === "programar" ? "Salvando…" : rotuloPrincipal}
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
        <DialogBody>{campos}</DialogBody>
        <DialogFooter>{botoes}</DialogFooter>
      </form>
    );
  }
  return (
    <form onSubmit={aoEnviar} noValidate className="flex min-h-0 flex-col">
      <DrawerBody className="gap-[18px] px-5 pt-2">{campos}</DrawerBody>
      <div className="flex gap-3 border-t border-borda-padrao px-5 py-3">{botoes}</div>
    </form>
  );
}

/** "24/10 às 08h00". */
function curto(q: { data: string; hora: string }) {
  return camposEmTexto(q).replace(/\/\d{4} /, " ");
}

function CampoQuando({
  id,
  rotulo,
  valor,
  aoMudar,
  erro,
  ajuda,
  travado,
}: {
  id: string;
  rotulo: string;
  valor: string;
  aoMudar: (v: string) => void;
  erro?: string;
  ajuda?: string;
  travado?: boolean;
}) {
  const mensagem = erro ?? ajuda;
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{rotulo}</Label>
      <div className="relative">
        <CalendarDays aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-texto-terciario" />
        <Input
          id={id}
          type="datetime-local"
          className="pl-10"
          value={valor}
          disabled={travado}
          aria-invalid={erro ? true : undefined}
          aria-describedby={mensagem ? `${id}-mensagem` : undefined}
          onChange={(e) => aoMudar(e.target.value)}
        />
      </div>
      {mensagem ? (
        <p id={`${id}-mensagem`} className={cn("texto-pequeno", erro ? "text-status-perigo-texto" : "text-texto-terciario")}>
          {mensagem}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Link “Saiba mais”: busca uma notícia, edital ou acordo publicado pelo título, ou aceita um
 * endereço colado (combobox com lista; setas, Enter e Esc pelo teclado).
 */
function CampoDoLink({
  link,
  aoEscolher,
  aoDigitar,
  erro,
}: {
  link: LinkEscolhido;
  aoEscolher: (l: LinkEscolhido) => void;
  aoDigitar: (texto: string) => void;
  erro?: string;
}) {
  const [texto, setTexto] = React.useState("");
  const [itens, setItens] = React.useState<ConteudoDoLink[]>([]);
  const [aberta, setAberta] = React.useState(false);
  const [ativo, setAtivo] = React.useState(-1);
  const pedido = React.useRef(0);

  React.useEffect(() => {
    if (!aberta) return;
    const numero = ++pedido.current;
    const espera = window.setTimeout(async () => {
      const r = await acaoBuscarConteudos(texto).catch(() => null);
      if (numero === pedido.current && r?.tipo === "ok") setItens(r.itens);
    }, 250);
    return () => window.clearTimeout(espera);
  }, [texto, aberta]);

  const endereco = texto.trim() ? normalizarLinkDoComunicado(texto) : null;
  const opcoes: { chave: string; rotulo: string; escolher: () => void }[] = [
    ...(endereco ? [{ chave: "endereco", rotulo: `Usar o endereço ${endereco}`, escolher: () => aoEscolher({ tipo: "url", url: endereco }) }] : []),
    ...itens.map((i) => ({ chave: i.id, rotulo: i.rotulo, escolher: () => aoEscolher({ tipo: "conteudo", id: i.id, rotulo: i.rotulo }) })),
  ];

  const escolher = (i: number) => {
    opcoes[i]?.escolher();
    setTexto("");
    aoDigitar("");
    setAberta(false);
  };

  const idLista = "comunicado-link-lista";
  const idMensagem = "comunicado-link-mensagem";

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="comunicado-link">Link “Saiba mais” (opcional)</Label>
      {link ? (
        <div className="flex min-h-12 items-center gap-3 rounded-[14px] border border-borda-forte bg-fundo-superficie py-1.5 pr-1.5 pl-4">
          <Link2 aria-hidden className="size-[18px] shrink-0 text-texto-terciario" />
          <span id="comunicado-link" tabIndex={-1} className="min-w-0 flex-1 truncate texto-corpo text-texto-primario">
            {link.tipo === "conteudo" ? link.rotulo : link.url}
          </span>
          <button
            type="button"
            onClick={() => aoEscolher(null)}
            aria-label="Tirar o link"
            className="alvo-toque flex size-9 shrink-0 items-center justify-center rounded-[10px] text-texto-secundario outline-none hover:bg-fundo-superficie-alt focus-visible:ring-[3px] focus-visible:ring-ring"
          >
            <X aria-hidden className="size-4" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Link2 aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-texto-terciario" />
          <Input
            id="comunicado-link"
            role="combobox"
            aria-expanded={aberta && opcoes.length > 0}
            aria-controls={idLista}
            aria-autocomplete="list"
            aria-activedescendant={ativo >= 0 ? `${idLista}-${ativo}` : undefined}
            aria-invalid={erro ? true : undefined}
            aria-describedby={idMensagem}
            autoComplete="off"
            className="pl-10"
            placeholder="Busque uma notícia ou cole um endereço"
            value={texto}
            onFocus={() => setAberta(true)}
            onBlur={() => window.setTimeout(() => setAberta(false), 150)}
            onChange={(e) => {
              setTexto(e.target.value);
              aoDigitar(e.target.value);
              setAberta(true);
              setAtivo(-1);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setAberta(true);
                setAtivo((a) => Math.min(a + 1, opcoes.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setAtivo((a) => Math.max(a - 1, 0));
              } else if (e.key === "Enter" && aberta && ativo >= 0) {
                e.preventDefault();
                escolher(ativo);
              } else if (e.key === "Escape" && aberta) {
                e.preventDefault();
                e.stopPropagation();
                setAberta(false);
              }
            }}
          />
          {aberta && opcoes.length > 0 ? (
            <ul
              id={idLista}
              role="listbox"
              aria-label="Conteúdos publicados"
              className="absolute inset-x-0 top-full z-10 mt-1 flex max-h-60 flex-col gap-0.5 overflow-y-auto rounded-[14px] border border-borda-padrao bg-fundo-superficie p-1.5 shadow-[0_12px_32px_rgb(11_20_36/0.16)]"
            >
              {opcoes.map((o, i) => (
                <li
                  key={o.chave}
                  id={`${idLista}-${i}`}
                  role="option"
                  aria-selected={i === ativo}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => escolher(i)}
                  className={cn(
                    "flex min-h-11 cursor-pointer items-center gap-2 rounded-[10px] px-3 py-2 texto-pequeno text-texto-primario",
                    i === ativo ? "bg-fundo-superficie-alt" : "hover:bg-fundo-superficie-alt",
                  )}
                >
                  {o.chave === "endereco" ? <Link2 aria-hidden className="size-4 shrink-0" /> : null}
                  <span className="min-w-0 flex-1 truncate">{o.rotulo}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )}
      <p id={idMensagem} className={cn("texto-pequeno", erro ? "text-status-perigo-texto" : "text-texto-terciario")}>
        {erro ?? "Notícia, edital ou acordo publicado, ou o endereço de uma página."}
      </p>
    </div>
  );
}

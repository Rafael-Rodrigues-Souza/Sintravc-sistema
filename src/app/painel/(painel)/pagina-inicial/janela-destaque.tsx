"use client";

import { CalendarDays, ImageOff, ImagePlus, Search } from "lucide-react";
import * as React from "react";

import { SEM_CONEXAO } from "@/components/painel/sem-conexao";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { HOME_PAGINA } from "@/conteudo/site";
import { bahiaEmCampos, bahiaParaUtc } from "@/lib/datas";
import type { OpcaoDeDestaque } from "@/lib/pagina-inicial/itens";
import { BOTAO_PADRAO, DESTINOS_DA_CHAMADA, NOME_DO_DESTINO, type DadosDaChamada, type DestinoDaChamada, type LimitesDaHome } from "@/lib/pagina-inicial/regras";
import { cn } from "@/lib/utils";

import { SeletorDeMidia } from "../conteudos/noticia/seletor-midia";
import { acaoOpcoesDeDestaque } from "./acoes";

/** O que a janela edita de um item que já está no carrossel. */
export type ItemEditado = {
  indice: number;
  tipo: "noticia" | "episodio" | "programa" | "chamada";
  titulo: string;
  entraEm: string | null;
  saiEm: string | null;
  fraseChamada: string | null;
  chamada: DadosDaChamada | null;
  /** A foto da Chamada, para a miniatura. */
  fotoUrl: string | null;
};

export type PedidoDaJanela = { modo: "adicionar"; sugerida?: OpcaoDeDestaque } | ({ modo: "editar" } & ItemEditado);

type Tipo = "noticia" | "episodio" | "programa" | "chamada";

export type ResultadoDaJanela = {
  tipo: Tipo;
  opcao: OpcaoDeDestaque | null;
  entraEm: string | null;
  saiEm: string | null;
  fraseChamada: string | null;
  chamada: DadosDaChamada | null;
  /** A foto escolhida, para a miniatura da lista. */
  fotoUrl: string | null;
};

type LimitesDaMidia = { tamanhoMaximoBytes: number; mensagemDeTamanho: string };

const NOME_DO_TIPO: Record<Tipo, string> = { noticia: "Notícia", episodio: "Episódio", programa: "Programa Rádio Chofer", chamada: "Chamada" };

/** ISO → valor do campo datetime-local, no horário da Bahia (RNF06). */
function paraCampo(iso: string | null): string {
  if (!iso) return "";
  const { data, hora } = bahiaEmCampos(new Date(iso));
  return `${data}T${hora}`;
}

/** Valor do campo → ISO. Vazio vira null; data que não existe, undefined (erro). */
function doCampo(valor: string): string | null | undefined {
  if (!valor) return null;
  return bahiaParaUtc(valor.slice(0, 10), valor.slice(11, 16))?.toISOString();
}

const limpar = (v: string) => v.trim().replace(/\s+/g, " ");

type Campo = "item" | "entraEm" | "saiEm" | "fraseChamada" | "foto" | "fotoAlt" | "textoApoio" | "botaoTexto";

/**
 * A janela do carrossel (E62, E63): “Adicionar destaque” (tipo, busca no que está no ar, ou os campos
 * da Chamada, e as datas) e “Editar” (datas e frase; na Chamada, todos os campos). Só mostra o que
 * está no ar; a notícia sem capa fica travada.
 */
export function JanelaDestaque({
  pedido,
  aoFechar,
  aoEscolher,
  temPrograma,
  noCarrossel,
  limites,
  limitesDaMidia,
}: {
  pedido: PedidoDaJanela | null;
  aoFechar: () => void;
  aoEscolher: (resultado: ResultadoDaJanela) => void;
  temPrograma: boolean;
  noCarrossel: Set<string>;
  limites: LimitesDaHome;
  limitesDaMidia: LimitesDaMidia;
}) {
  return (
    <Dialog open={!!pedido} onOpenChange={(aberta) => !aberta && aoFechar()}>
      {pedido ? (
        <DialogContent className="max-w-[640px]" aria-describedby={undefined}>
          <Conteudo
            pedido={pedido}
            aoFechar={aoFechar}
            aoEscolher={aoEscolher}
            temPrograma={temPrograma}
            noCarrossel={noCarrossel}
            limites={limites}
            limitesDaMidia={limitesDaMidia}
          />
        </DialogContent>
      ) : null}
    </Dialog>
  );
}

function Conteudo({
  pedido,
  aoFechar,
  aoEscolher,
  temPrograma,
  noCarrossel,
  limites,
  limitesDaMidia,
}: {
  pedido: PedidoDaJanela;
  aoFechar: () => void;
  aoEscolher: (resultado: ResultadoDaJanela) => void;
  temPrograma: boolean;
  noCarrossel: Set<string>;
  limites: LimitesDaHome;
  limitesDaMidia: LimitesDaMidia;
}) {
  const editando = pedido.modo === "editar" ? pedido : null;
  const [tipo, setTipo] = React.useState<Tipo>(editando?.tipo ?? "noticia");
  const comBusca = !editando && (tipo === "noticia" || tipo === "episodio");
  const [busca, setBusca] = React.useState("");
  const [opcoes, setOpcoes] = React.useState<OpcaoDeDestaque[] | null>(null);
  const [erroDaBusca, setErroDaBusca] = React.useState<string | null>(null);
  const [escolhida, setEscolhida] = React.useState<OpcaoDeDestaque | null>(pedido.modo === "adicionar" ? (pedido.sugerida ?? null) : null);
  const [entraEm, setEntraEm] = React.useState(paraCampo(editando?.entraEm ?? null));
  const [saiEm, setSaiEm] = React.useState(paraCampo(editando?.saiEm ?? null));
  const [frase, setFrase] = React.useState(editando?.fraseChamada ?? "");
  // Chamada (E63)
  const [foto, setFoto] = React.useState<{ id: string; url: string | null } | null>(
    editando?.chamada ? { id: editando.chamada.fotoMidiaId, url: editando.fotoUrl } : null,
  );
  const [fotoAlt, setFotoAlt] = React.useState(editando?.chamada?.fotoAlt ?? "");
  const [apoio, setApoio] = React.useState(editando?.chamada?.textoApoio ?? "");
  const [destino, setDestino] = React.useState<DestinoDaChamada>(editando?.chamada?.destino ?? "filie_se");
  const [botao, setBotao] = React.useState(editando?.chamada ? (editando.chamada.botaoTexto ?? BOTAO_PADRAO[editando.chamada.destino]) : BOTAO_PADRAO.filie_se);
  const [seletorAberto, setSeletorAberto] = React.useState(false);
  const [erro, setErro] = React.useState<{ campo: Campo; mensagem: string } | null>(null);
  const ehChamada = tipo === "chamada";
  const fraseMaxima = ehChamada ? limites.chamadaFraseMaximo : limites.fraseChamadaMaximo;

  // Busca no servidor, com uma pausa curta depois da digitação.
  React.useEffect(() => {
    if (!comBusca) return;
    // A sugerida (E43) aparece mesmo se for mais antiga que as primeiras da lista.
    const comAEscolhida = (lista: OpcaoDeDestaque[]) =>
      !escolhida || escolhida.tipo !== tipo || busca.trim() || lista.some((o) => o.itemId === escolhida.itemId) ? lista : [escolhida, ...lista];
    let valendo = true;
    const relogio = setTimeout(async () => {
      setErroDaBusca(null);
      const r = await acaoOpcoesDeDestaque({ tipo, busca }).catch(() => SEM_CONEXAO);
      if (!valendo) return;
      if (r.tipo === "erro") {
        setErroDaBusca(r.mensagem);
        setOpcoes([]);
      } else {
        setOpcoes(comAEscolhida(r.opcoes));
      }
    }, 250);
    return () => {
      valendo = false;
      clearTimeout(relogio);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo, busca, comBusca]);

  const travadaPorque = (o: OpcaoDeDestaque): string | null => {
    if (noCarrossel.has(o.chave)) return "Já está no carrossel";
    if (!o.temCapa) return "Esta notícia não tem capa";
    return null;
  };

  /** Trocar o destino troca também o texto do botão, se ele ainda for o padrão do destino anterior. */
  const mudarDestino = (novo: DestinoDaChamada) => {
    if (limpar(botao) === BOTAO_PADRAO[destino] || !limpar(botao)) setBotao(BOTAO_PADRAO[novo]);
    setDestino(novo);
  };

  const confirmar = (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    let opcao: OpcaoDeDestaque | null = null;
    if (comBusca) {
      if (!escolhida) return setErro({ campo: "item", mensagem: "Escolha o que vai para o destaque." });
      opcao = escolhida;
    }
    const fraseLimpa = limpar(frase) || null;
    let chamada: DadosDaChamada | null = null;
    if (ehChamada) {
      if (!foto) return setErro({ campo: "foto", mensagem: "Escolha a foto da Chamada." });
      if (!limpar(fotoAlt)) return setErro({ campo: "fotoAlt", mensagem: "Descreva a foto no texto alternativo." });
      if (!fraseLimpa) return setErro({ campo: "fraseChamada", mensagem: "Escreva a frase da Chamada." });
      if (fraseLimpa.length > fraseMaxima) return setErro({ campo: "fraseChamada", mensagem: `A frase da Chamada tem até ${fraseMaxima} caracteres.` });
      const apoioLimpo = limpar(apoio);
      if (!apoioLimpo) return setErro({ campo: "textoApoio", mensagem: "Escreva o texto de apoio." });
      if (apoioLimpo.length > limites.chamadaApoioMaximo) {
        return setErro({ campo: "textoApoio", mensagem: `O texto de apoio tem até ${limites.chamadaApoioMaximo} caracteres.` });
      }
      const botaoLimpo = limpar(botao);
      if (botaoLimpo.length > limites.chamadaBotaoMaximo) {
        return setErro({ campo: "botaoTexto", mensagem: `O texto do botão tem até ${limites.chamadaBotaoMaximo} caracteres.` });
      }
      // Igual ao padrão do destino (ou vazio): guarda vazio, e o site usa o padrão.
      chamada = { fotoMidiaId: foto.id, fotoAlt: limpar(fotoAlt), textoApoio: apoioLimpo, botaoTexto: botaoLimpo && botaoLimpo !== BOTAO_PADRAO[destino] ? botaoLimpo : null, destino };
    } else if (fraseLimpa && fraseLimpa.length > fraseMaxima) {
      return setErro({ campo: "fraseChamada", mensagem: `A frase de chamada tem até ${fraseMaxima} caracteres.` });
    }
    const entra = doCampo(entraEm);
    const sai = doCampo(saiEm);
    if (entra === undefined) return setErro({ campo: "entraEm", mensagem: "Esta data não existe. Confira o dia e a hora." });
    if (sai === undefined) return setErro({ campo: "saiEm", mensagem: "Esta data não existe. Confira o dia e a hora." });
    if (entra && sai && new Date(sai) <= new Date(entra)) return setErro({ campo: "saiEm", mensagem: "A saída tem de ser depois da entrada." });
    if (sai && new Date(sai) <= new Date() && sai !== editando?.saiEm) return setErro({ campo: "saiEm", mensagem: "A saída já passou. Escolha uma data no futuro." });
    aoEscolher({ tipo, opcao, entraEm: entra, saiEm: sai, fraseChamada: fraseLimpa, chamada, fotoUrl: foto?.url ?? null });
  };

  const titulo = editando ? (editando.tipo === "chamada" ? "Editar Chamada" : "Editar destaque") : "Adicionar destaque";
  const descricao = editando ? editando.titulo : "Só aparece o que está no site. O destaque vai para o fim do carrossel.";

  return (
    <>
      <form onSubmit={confirmar} className="flex min-h-0 flex-1 flex-col" noValidate>
        <DialogHeader titulo={titulo} descricao={descricao} />
        <DialogBody>
          {!editando ? (
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 texto-rotulo text-texto-primario">Tipo</legend>
              <div className="flex flex-wrap gap-2">
                {(["noticia", "episodio", "programa", "chamada"] as const).map((t) => {
                  const travado = t === "programa" && temPrograma;
                  return (
                    <label
                      key={t}
                      className={cn(
                        "alvo-toque flex cursor-pointer items-center gap-2 rounded-full border border-borda-padrao px-4 py-2 texto-navegacao has-[:checked]:border-destaque-marinho has-[:checked]:bg-destaque-marinho has-[:checked]:text-texto-invertido has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring dark:has-[:checked]:border-destaque-amarelo dark:has-[:checked]:bg-destaque-amarelo dark:has-[:checked]:text-destaque-marinho-fixo",
                        travado && "cursor-not-allowed opacity-50",
                      )}
                    >
                      <input
                        type="radio"
                        name="tipo"
                        value={t}
                        checked={tipo === t}
                        disabled={travado}
                        onChange={() => {
                          setTipo(t);
                          setEscolhida(null);
                          setOpcoes(null);
                          setErro(null);
                        }}
                        className="sr-only"
                      />
                      {NOME_DO_TIPO[t]}
                    </label>
                  );
                })}
              </div>
              {temPrograma ? <p className="texto-pequeno text-texto-secundario">O programa Rádio Chofer já está no carrossel.</p> : null}
            </fieldset>
          ) : null}

          {!editando && tipo === "programa" ? (
            <p className="rounded-[12px] bg-fundo-superficie-alt p-4 texto-pequeno text-texto-primario">
              O slide do programa mostra “{HOME_PAGINA.programaTitulo}”, o horário do programa ao vivo e os botões para ouvir o último programa e ver todos.
            </p>
          ) : null}

          {comBusca ? (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="busca-destaque">{tipo === "episodio" ? "Buscar episódio" : "Buscar notícia"}</Label>
                <div className="relative">
                  <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-texto-terciario" />
                  <Input id="busca-destaque" type="search" value={busca} onChange={(e) => setBusca(e.target.value)} className="pl-10" placeholder="Digite parte do título" />
                </div>
              </div>
              <fieldset aria-describedby={erro?.campo === "item" ? "erro-item" : undefined} className="flex flex-col gap-2">
                <legend className="sr-only">{tipo === "episodio" ? "Episódios no ar" : "Notícias publicadas"}</legend>
                {opcoes === null ? (
                  <div className="flex flex-col gap-2" aria-busy="true" aria-label="Carregando">
                    {Array.from({ length: 3 }, (_, i) => (
                      <Skeleton key={i} className="h-[72px] w-full rounded-[12px]" />
                    ))}
                  </div>
                ) : opcoes.length === 0 ? (
                  <div className="flex flex-col items-center gap-1 rounded-[12px] border border-dashed border-borda-padrao px-4 py-6 text-center">
                    <Search aria-hidden className="size-5 text-texto-terciario" />
                    <p className="texto-pequeno text-texto-primario">
                      {erroDaBusca ?? (busca.trim() ? "Nada encontrado com essa busca." : tipo === "episodio" ? "Nenhum episódio no ar." : "Nenhuma notícia publicada.")}
                    </p>
                    {busca.trim() ? (
                      <Button type="button" variant="secundario" size="pequeno" className="mt-2" onClick={() => setBusca("")}>
                        Limpar busca
                      </Button>
                    ) : null}
                  </div>
                ) : (
                  <ul className="flex max-h-[min(340px,40dvh)] flex-col gap-2 overflow-y-auto pr-1">
                    {opcoes.map((o) => {
                      const motivo = travadaPorque(o);
                      return (
                        <li key={o.itemId}>
                          <label
                            className={cn(
                              "flex cursor-pointer items-center gap-3 rounded-[12px] border border-borda-padrao p-2.5 has-[:checked]:border-destaque-azul has-[:checked]:bg-destaque-azul-suave has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring",
                              motivo && "cursor-not-allowed opacity-60",
                            )}
                          >
                            <input
                              type="radio"
                              name="opcao"
                              value={o.itemId}
                              checked={escolhida?.itemId === o.itemId}
                              disabled={!!motivo}
                              onChange={() => {
                                setEscolhida(o);
                                setErro(null);
                              }}
                              className="sr-only"
                            />
                            <span className="flex aspect-video w-20 shrink-0 items-center justify-center overflow-hidden rounded-[8px] bg-fundo-superficie-alt text-texto-terciario">
                              {o.capaUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={o.capaUrl} alt="" className="size-full object-cover" loading="lazy" />
                              ) : (
                                <ImageOff aria-hidden className="size-5" />
                              )}
                            </span>
                            <span className="flex min-w-0 flex-col gap-0.5">
                              <span className="texto-etiqueta text-destaque-azul uppercase">{o.rotulo}</span>
                              <span className="line-clamp-2 texto-titulo-card-pequeno break-words text-texto-primario">{o.titulo}</span>
                              {motivo ? <span className="texto-pequeno text-texto-secundario">{motivo}</span> : null}
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                )}
                {erro?.campo === "item" ? (
                  <p id="erro-item" role="alert" className="texto-pequeno text-status-perigo-texto">
                    {erro.mensagem}
                  </p>
                ) : null}
              </fieldset>
            </div>
          ) : null}

          {ehChamada ? (
            <div className="flex flex-col gap-2">
              <p className="texto-rotulo text-texto-primario" id="foto-chamada-rotulo">
                Foto
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <span className="flex aspect-video w-full shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-fundo-superficie-alt text-texto-terciario sm:w-[160px]">
                  {foto?.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={foto.url} alt="" className="size-full object-cover" />
                  ) : (
                    <ImageOff aria-hidden className="size-6" />
                  )}
                </span>
                <div className="flex flex-col gap-1.5">
                  <Button type="button" variant="secundario" onClick={() => setSeletorAberto(true)} aria-describedby="foto-chamada-mensagem">
                    <ImagePlus aria-hidden />
                    {foto ? "Trocar foto" : "Escolher foto"}
                  </Button>
                  <p
                    id="foto-chamada-mensagem"
                    role={erro?.campo === "foto" ? "alert" : undefined}
                    className={cn("texto-pequeno", erro?.campo === "foto" ? "text-status-perigo-texto" : "text-texto-terciario")}
                  >
                    {erro?.campo === "foto" ? erro.mensagem : "Foto horizontal, da Mídia. Foto com pessoas só com autorização delas."}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {ehChamada ? (
            <CampoTexto
              id="foto-alt"
              rotulo="Texto alternativo da foto"
              valor={fotoAlt}
              aoMudar={setFotoAlt}
              ajuda="Descreva a foto para quem não pode ver. Vem da Mídia; ajuste se precisar."
              erro={erro?.campo === "fotoAlt" ? erro.mensagem : undefined}
            />
          ) : null}

          <CampoComContador
              id="frase-chamada"
              rotulo={ehChamada ? "Frase" : "Frase de chamada (opcional)"}
              valor={frase}
              aoMudar={setFrase}
              maximo={fraseMaxima}
              linhas={2}
              ajuda={ehChamada ? "O texto grande do slide. Escreva uma frase curta e direta." : "Aparece no site no lugar da linha fina. Vazia, fica a linha fina."}
              erro={erro?.campo === "fraseChamada" ? erro.mensagem : undefined}
            />

          {ehChamada ? (
            <CampoComContador
              id="texto-apoio"
              rotulo="Texto de apoio"
              valor={apoio}
              aoMudar={setApoio}
              maximo={limites.chamadaApoioMaximo}
              linhas={3}
              ajuda="Aparece embaixo da frase."
              erro={erro?.campo === "textoApoio" ? erro.mensagem : undefined}
            />
          ) : null}

          {ehChamada ? (
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 texto-rotulo text-texto-primario">Para onde vai o botão</legend>
              <div className="flex flex-wrap gap-2">
                {DESTINOS_DA_CHAMADA.map((d) => (
                  <label
                    key={d}
                    className="alvo-toque flex cursor-pointer items-center gap-2 rounded-full border border-borda-padrao px-4 py-2 texto-navegacao has-[:checked]:border-destaque-marinho has-[:checked]:bg-destaque-marinho has-[:checked]:text-texto-invertido has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring dark:has-[:checked]:border-destaque-amarelo dark:has-[:checked]:bg-destaque-amarelo dark:has-[:checked]:text-destaque-marinho-fixo"
                  >
                    <input type="radio" name="destino" value={d} checked={destino === d} onChange={() => mudarDestino(d)} className="sr-only" />
                    {NOME_DO_DESTINO[d]}
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}

          {ehChamada ? (
            <CampoComContador
              id="botao-texto"
              rotulo="Texto do botão"
              valor={botao}
              aoMudar={setBotao}
              maximo={limites.chamadaBotaoMaximo}
              ajuda={`Vazio: “${BOTAO_PADRAO[destino]}”.`}
              erro={erro?.campo === "botaoTexto" ? erro.mensagem : undefined}
            />
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <CampoQuando
              id="entra-em"
              rotulo="Entra em"
              valor={entraEm}
              aoMudar={setEntraEm}
              ajuda="Vazio: entra quando você publicar. Horário de Vitória da Conquista."
              erro={erro?.campo === "entraEm" ? erro.mensagem : undefined}
            />
            <CampoQuando
              id="sai-em"
              rotulo="Sai em"
              valor={saiEm}
              aoMudar={setSaiEm}
              ajuda="Vazio: fica até alguém tirar."
              erro={erro?.campo === "saiEm" ? erro.mensagem : undefined}
            />
          </div>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="secundario" onClick={aoFechar}>
            Cancelar
          </Button>
          <Button type="submit">{editando ? "Salvar" : "Pôr no carrossel"}</Button>
        </DialogFooter>
      </form>
      {ehChamada ? (
        <SeletorDeMidia
          aberto={seletorAberto}
          aoMudarAberto={setSeletorAberto}
          so="imagens"
          titulo="Foto da Chamada"
          descricao="Escolha uma foto da Mídia ou envie uma nova. Foto com pessoas só com autorização delas."
          limites={limitesDaMidia}
          aoEscolher={(arquivo) => {
            setFoto({ id: arquivo.id, url: arquivo.url });
            if (!limpar(fotoAlt)) setFotoAlt(arquivo.alt);
            setSeletorAberto(false);
            setErro(null);
          }}
        />
      ) : null}
    </>
  );
}

function CampoTexto({ id, rotulo, valor, aoMudar, ajuda, erro }: { id: string; rotulo: string; valor: string; aoMudar: (v: string) => void; ajuda: string; erro?: string }) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{rotulo}</Label>
      <Input id={id} value={valor} onChange={(e) => aoMudar(e.target.value)} aria-invalid={erro ? true : undefined} aria-describedby={`${id}-mensagem`} />
      <p id={`${id}-mensagem`} role={erro ? "alert" : undefined} className={cn("texto-pequeno", erro ? "text-status-perigo-texto" : "text-texto-terciario")}>
        {erro ?? ajuda}
      </p>
    </div>
  );
}

function CampoComContador({
  id,
  rotulo,
  valor,
  aoMudar,
  maximo,
  linhas,
  ajuda,
  erro,
}: {
  id: string;
  rotulo: string;
  valor: string;
  aoMudar: (v: string) => void;
  maximo: number;
  /** Com linhas, uma área de texto; sem, um campo de uma linha. */
  linhas?: number;
  ajuda: string;
  erro?: string;
}) {
  const tamanho = limpar(valor).length;
  const props = {
    id,
    value: valor,
    "aria-invalid": erro ? true : undefined,
    "aria-describedby": `${id}-mensagem ${id}-contador`,
  } as const;
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{rotulo}</Label>
      {linhas ? <Textarea rows={linhas} {...props} onChange={(e) => aoMudar(e.target.value)} /> : <Input {...props} onChange={(e) => aoMudar(e.target.value)} />}
      <div className="flex items-start justify-between gap-3">
        <p id={`${id}-mensagem`} role={erro ? "alert" : undefined} className={cn("texto-pequeno", erro ? "text-status-perigo-texto" : "text-texto-terciario")}>
          {erro ?? ajuda}
        </p>
        <p id={`${id}-contador`} className={cn("shrink-0 texto-pequeno tabular-nums", tamanho > maximo ? "text-status-perigo-texto" : "text-texto-terciario")}>
          {tamanho}/{maximo}
        </p>
      </div>
    </div>
  );
}

function CampoQuando({ id, rotulo, valor, aoMudar, ajuda, erro }: { id: string; rotulo: string; valor: string; aoMudar: (v: string) => void; ajuda: string; erro?: string }) {
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
          aria-invalid={erro ? true : undefined}
          aria-describedby={`${id}-mensagem`}
          onChange={(e) => aoMudar(e.target.value)}
        />
      </div>
      <p id={`${id}-mensagem`} role={erro ? "alert" : undefined} className={cn("texto-pequeno", erro ? "text-status-perigo-texto" : "text-texto-terciario")}>
        {mensagem}
      </p>
    </div>
  );
}

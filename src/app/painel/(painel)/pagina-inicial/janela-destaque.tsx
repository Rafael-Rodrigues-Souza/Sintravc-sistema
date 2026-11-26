"use client";

import { CalendarDays, ImageOff, Search } from "lucide-react";
import * as React from "react";

import { SEM_CONEXAO } from "@/components/painel/sem-conexao";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { bahiaEmCampos, bahiaParaUtc } from "@/lib/datas";
import type { OpcaoDeDestaque } from "@/lib/pagina-inicial/opcoes";
import { chaveDoItem } from "@/lib/pagina-inicial/regras";
import { cn } from "@/lib/utils";

import { acaoOpcoesDeDestaque } from "./acoes";

export type PedidoDaJanela =
  | { modo: "adicionar"; sugerida?: OpcaoDeDestaque }
  | { modo: "editar"; indice: number; entraEm: string | null; saiEm: string | null; fraseChamada: string | null; titulo: string }
  | { modo: "trocar"; posicao: number };

type Tipo = "noticia" | "episodio" | "programa";

export type ResultadoDaJanela = { opcao: OpcaoDeDestaque | null; entraEm: string | null; saiEm: string | null; fraseChamada: string | null };

const NOME_DO_TIPO: Record<Tipo, string> = { noticia: "Notícia", episodio: "Episódio", programa: "Programa Rádio Chofer" };

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

/**
 * A janela do carrossel e da lista (E62): “Adicionar destaque” (tipo, busca no que está no ar e as
 * datas e a frase de chamada), “Editar” (datas e frase) e “Trocar” (só notícias, para uma posição da lista). Só mostra o que está no
 * ar; a notícia sem capa fica travada no carrossel.
 */
export function JanelaDestaque({
  pedido,
  aoFechar,
  aoEscolher,
  temPrograma,
  noCarrossel,
  naLista,
  fraseMaxima,
}: {
  pedido: PedidoDaJanela | null;
  aoFechar: () => void;
  aoEscolher: (resultado: ResultadoDaJanela) => void;
  temPrograma: boolean;
  noCarrossel: Set<string>;
  naLista: Set<string>;
  /** `home.frase_chamada_maximo`. */
  fraseMaxima: number;
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
            naLista={naLista}
            fraseMaxima={fraseMaxima}
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
  naLista,
  fraseMaxima,
}: {
  pedido: PedidoDaJanela;
  aoFechar: () => void;
  aoEscolher: (resultado: ResultadoDaJanela) => void;
  temPrograma: boolean;
  noCarrossel: Set<string>;
  naLista: Set<string>;
  fraseMaxima: number;
}) {
  const comBusca = pedido.modo !== "editar";
  const comDatas = pedido.modo !== "trocar";
  const [tipo, setTipo] = React.useState<Tipo>("noticia");
  const [busca, setBusca] = React.useState("");
  const [opcoes, setOpcoes] = React.useState<OpcaoDeDestaque[] | null>(null);
  const [erroDaBusca, setErroDaBusca] = React.useState<string | null>(null);
  const [escolhida, setEscolhida] = React.useState<OpcaoDeDestaque | null>(pedido.modo === "adicionar" ? (pedido.sugerida ?? null) : null);
  const [entraEm, setEntraEm] = React.useState(pedido.modo === "editar" ? paraCampo(pedido.entraEm) : "");
  const [saiEm, setSaiEm] = React.useState(pedido.modo === "editar" ? paraCampo(pedido.saiEm) : "");
  const [frase, setFrase] = React.useState(pedido.modo === "editar" ? (pedido.fraseChamada ?? "") : "");
  const [erro, setErro] = React.useState<{ campo: "item" | "entraEm" | "saiEm" | "fraseChamada"; mensagem: string } | null>(null);

  // Busca no servidor, com uma pausa curta depois da digitação.
  React.useEffect(() => {
    if (!comBusca || tipo === "programa") return;
    // A sugerida (E43) aparece mesmo se for mais antiga que as primeiras da lista.
    const comAEscolhida = (lista: OpcaoDeDestaque[]) =>
      !escolhida || escolhida.tipo !== tipo || busca.trim() || lista.some((o) => o.id === escolhida.id) ? lista : [escolhida, ...lista];
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
    if (pedido.modo === "trocar") return naLista.has(o.id) ? "Já está na lista" : null;
    if (noCarrossel.has(chaveDoItem({ tipo: o.tipo, itemId: o.id }))) return "Já está no carrossel";
    if (!o.temCapa) return "Esta notícia não tem capa";
    return null;
  };

  const confirmar = (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    let opcao: OpcaoDeDestaque | null = null;
    if (pedido.modo !== "editar" && tipo !== "programa") {
      if (!escolhida) return setErro({ campo: "item", mensagem: pedido.modo === "trocar" ? "Escolha uma notícia." : "Escolha o que vai para o destaque." });
      opcao = escolhida;
    }
    if (!comDatas) return aoEscolher({ opcao, entraEm: null, saiEm: null, fraseChamada: null });
    const fraseLimpa = frase.trim().replace(/\s+/g, " ") || null;
    if (fraseLimpa && fraseLimpa.length > fraseMaxima) {
      return setErro({ campo: "fraseChamada", mensagem: `A frase de chamada tem até ${fraseMaxima} caracteres.` });
    }
    const entra = doCampo(entraEm);
    const sai = doCampo(saiEm);
    if (entra === undefined) return setErro({ campo: "entraEm", mensagem: "Esta data não existe. Confira o dia e a hora." });
    if (sai === undefined) return setErro({ campo: "saiEm", mensagem: "Esta data não existe. Confira o dia e a hora." });
    if (entra && sai && new Date(sai) <= new Date(entra)) return setErro({ campo: "saiEm", mensagem: "A saída tem de ser depois da entrada." });
    if (sai && new Date(sai) <= new Date()) return setErro({ campo: "saiEm", mensagem: "A saída já passou. Escolha uma data no futuro." });
    aoEscolher({ opcao, entraEm: entra, saiEm: sai, fraseChamada: fraseLimpa });
  };

  const titulo =
    pedido.modo === "adicionar" ? "Adicionar destaque" : pedido.modo === "editar" ? "Editar destaque" : `Escolher a notícia da posição ${pedido.posicao + 1}`;
  const descricao =
    pedido.modo === "adicionar"
      ? "Só aparece o que está no site. O destaque vai para o fim do carrossel."
      : pedido.modo === "editar"
        ? pedido.titulo
        : "Só aparecem as notícias publicadas.";

  return (
    <form onSubmit={confirmar} className="flex min-h-0 flex-1 flex-col" noValidate>
      <DialogHeader titulo={titulo} descricao={descricao} />
      <DialogBody>
        {pedido.modo === "adicionar" ? (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 texto-rotulo text-texto-primario">Tipo</legend>
            <div className="flex flex-wrap gap-2">
              {(["noticia", "episodio", "programa"] as const).map((t) => {
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

        {comBusca && tipo === "programa" ? (
          <p className="rounded-[12px] bg-fundo-superficie-alt p-4 texto-pequeno text-texto-primario">
            O slide do programa mostra “A voz dos rodoviários de Conquista”, o horário do programa ao vivo e os botões para ouvir o último programa e ver todos.
          </p>
        ) : null}

        {comBusca && tipo !== "programa" ? (
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
                      <li key={o.id}>
                        <label
                          className={cn(
                            "flex cursor-pointer items-center gap-3 rounded-[12px] border border-borda-padrao p-2.5 has-[:checked]:border-destaque-azul has-[:checked]:bg-destaque-azul-suave has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring",
                            motivo && "cursor-not-allowed opacity-60",
                          )}
                        >
                          <input
                            type="radio"
                            name="opcao"
                            value={o.id}
                            checked={escolhida?.id === o.id}
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

        {comDatas ? (
          <div className="flex flex-col gap-2">
            <Label htmlFor="frase-chamada">Frase de chamada (opcional)</Label>
            <Textarea
              id="frase-chamada"
              rows={2}
              value={frase}
              onChange={(e) => setFrase(e.target.value)}
              aria-invalid={erro?.campo === "fraseChamada" ? true : undefined}
              aria-describedby="frase-chamada-mensagem frase-chamada-contador"
            />
            <div className="flex items-start justify-between gap-3">
              <p
                id="frase-chamada-mensagem"
                role={erro?.campo === "fraseChamada" ? "alert" : undefined}
                className={cn("texto-pequeno", erro?.campo === "fraseChamada" ? "text-status-perigo-texto" : "text-texto-terciario")}
              >
                {erro?.campo === "fraseChamada" ? erro.mensagem : "Aparece no site no lugar da linha fina. Vazia, fica a linha fina."}
              </p>
              <p
                id="frase-chamada-contador"
                className={cn("shrink-0 texto-pequeno tabular-nums", frase.trim().length > fraseMaxima ? "text-status-perigo-texto" : "text-texto-terciario")}
              >
                {frase.trim().length}/{fraseMaxima}
              </p>
            </div>
          </div>
        ) : null}

        {comDatas ? (
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
        ) : null}
      </DialogBody>
      <DialogFooter>
        <Button type="button" variant="secundario" onClick={aoFechar}>
          Cancelar
        </Button>
        <Button type="submit">{pedido.modo === "adicionar" ? "Pôr no carrossel" : pedido.modo === "editar" ? "Salvar" : "Escolher notícia"}</Button>
      </DialogFooter>
    </form>
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

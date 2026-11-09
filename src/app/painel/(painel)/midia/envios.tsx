"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { IconeFigma } from "@/components/icone-figma";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** O que o seletor de arquivos sugere. Quem decide é o servidor, pelos bytes (E39). */
const ACEITOS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".heic",
  ".heif",
  ".pdf",
  ".docx",
  ".xlsx",
  ".odt",
  ".ods",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
].join(",");

type Envio = { chave: string; nome: string; estado: "enviando" | "erro"; progresso: number; erro?: string };

type Contexto = {
  escolher: () => void;
  adicionar: (arquivos: File[]) => void;
  envios: Envio[];
  descartar: (chave: string) => void;
};

const ContextoEnvios = React.createContext<Contexto | null>(null);

function useEnvios() {
  const contexto = React.useContext(ContextoEnvios);
  if (!contexto) throw new Error("useEnvios fora do ProvedorDeEnvios.");
  return contexto;
}

/** Envia um arquivo para POST /api/midia, avisando o progresso. */
function enviar(arquivo: File, aoProgredir: (porcento: number) => void): Promise<{ id: string } | { erro: string }> {
  return new Promise((resolver) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/midia");
    xhr.responseType = "json";
    xhr.upload.onprogress = (evento) => {
      if (evento.lengthComputable) aoProgredir(Math.round((evento.loaded / evento.total) * 100));
    };
    xhr.onload = () => {
      const corpo = xhr.response as { id?: string; erro?: string } | null;
      if (xhr.status === 201 && corpo?.id) resolver({ id: corpo.id });
      else resolver({ erro: corpo?.erro ?? "Não foi possível enviar agora. Tente de novo em alguns minutos." });
    };
    xhr.onerror = () => resolver({ erro: "Sem conexão com o servidor. Confira a internet e tente de novo." });
    const dados = new FormData();
    dados.set("arquivo", arquivo);
    xhr.send(dados);
  });
}

/**
 * Fila de envios da Mídia (Figma 116:2727, "Envios"). Um arquivo por vez, com a barra de progresso;
 * o erro fica na lista até a pessoa tentar outro arquivo.
 */
export function ProvedorDeEnvios({
  tamanhoMaximoBytes,
  mensagemDeTamanho,
  children,
}: {
  tamanhoMaximoBytes: number;
  mensagemDeTamanho: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const entrada = React.useRef<HTMLInputElement>(null);
  const [envios, setEnvios] = React.useState<Envio[]>([]);
  const fila = React.useRef(Promise.resolve());

  const atualizar = React.useCallback((chave: string, mudanca: Partial<Envio>) => {
    setEnvios((atuais) => atuais.map((envio) => (envio.chave === chave ? { ...envio, ...mudanca } : envio)));
  }, []);

  const descartar = React.useCallback((chave: string) => {
    setEnvios((atuais) => atuais.filter((envio) => envio.chave !== chave));
  }, []);

  const adicionar = React.useCallback(
    (arquivos: File[]) => {
      for (const arquivo of arquivos) {
        const chave = `${arquivo.name}-${arquivo.size}-${crypto.randomUUID()}`;
        if (arquivo.size > tamanhoMaximoBytes) {
          setEnvios((atuais) => [...atuais, { chave, nome: arquivo.name, estado: "erro", progresso: 0, erro: mensagemDeTamanho }]);
          continue;
        }
        setEnvios((atuais) => [...atuais, { chave, nome: arquivo.name, estado: "enviando", progresso: 0 }]);
        fila.current = fila.current.then(async () => {
          const resultado = await enviar(arquivo, (progresso) => atualizar(chave, { progresso }));
          if ("erro" in resultado) {
            atualizar(chave, { estado: "erro", erro: resultado.erro });
            return;
          }
          descartar(chave);
          toast.success(`${arquivo.name} está na Mídia.`);
          router.refresh();
        });
      }
    },
    [atualizar, descartar, mensagemDeTamanho, router, tamanhoMaximoBytes],
  );

  const contexto = React.useMemo<Contexto>(
    () => ({ escolher: () => entrada.current?.click(), adicionar, envios, descartar }),
    [adicionar, envios, descartar],
  );

  return (
    <ContextoEnvios.Provider value={contexto}>
      <input
        ref={entrada}
        type="file"
        multiple
        accept={ACEITOS}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        data-testid="entrada-arquivos"
        onChange={(evento) => {
          adicionar(Array.from(evento.target.files ?? []));
          evento.target.value = "";
        }}
      />
      {children}
    </ContextoEnvios.Provider>
  );
}

export function BotaoEnviarArquivos() {
  const { escolher } = useEnvios();
  return (
    <Button type="button" onClick={escolher}>
      <IconeFigma src="/painel/icone-enviar.svg" tamanho={18} />
      Enviar arquivos
    </Button>
  );
}

/** O que está sendo arrastado tem arquivo? Texto e link não contam. */
function temArquivo(evento: React.DragEvent) {
  return Array.from(evento.dataTransfer.types).includes("Files");
}

/**
 * Arrastar e soltar: a área de conteúdo inteira recebe os arquivos, que entram na mesma fila do botão
 * "Enviar arquivos". Só é montada para quem pode enviar; o botão continua sendo o caminho pelo teclado
 * e no celular. Sem desenho no Figma: ver `correcoes-figma.md` (N16).
 */
export function AreaDeSoltar({ className, children }: { className?: string; children: React.ReactNode }) {
  const { adicionar } = useEnvios();
  // dragenter e dragleave disparam a cada elemento filho; o contador diz quando o arquivo saiu de vez.
  const entradas = React.useRef(0);
  const [arrastando, setArrastando] = React.useState(false);

  return (
    <div
      data-testid="area-de-soltar"
      className={cn("relative", className)}
      onDragEnter={(evento) => {
        if (!temArquivo(evento)) return;
        evento.preventDefault();
        entradas.current += 1;
        setArrastando(true);
      }}
      onDragOver={(evento) => {
        if (!temArquivo(evento)) return;
        evento.preventDefault();
        evento.dataTransfer.dropEffect = "copy";
      }}
      onDragLeave={(evento) => {
        if (!temArquivo(evento)) return;
        entradas.current = Math.max(0, entradas.current - 1);
        if (entradas.current === 0) setArrastando(false);
      }}
      onDrop={(evento) => {
        if (!temArquivo(evento)) return;
        evento.preventDefault();
        entradas.current = 0;
        setArrastando(false);
        adicionar(Array.from(evento.dataTransfer.files));
      }}
    >
      {children}
      {arrastando ? (
        <div
          aria-hidden
          data-testid="camada-soltar"
          className="pointer-events-none absolute inset-2 z-20 rounded-[20px] border-2 border-dashed border-destaque-azul bg-fundo-pagina/85 backdrop-blur-[2px]"
        >
          <div className="sticky top-0 flex h-[calc(100dvh-1rem)] max-h-full flex-col items-center justify-center gap-3 px-6 text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-destaque-azul-suave text-destaque-azul">
              <IconeFigma src="/painel/icone-enviar.svg" tamanho={24} />
            </span>
            <p className="texto-titulo-card text-texto-primario">Solte os arquivos para enviar</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** A caixa "Envios": um arquivo enviando (com %) e os que deram erro. */
export function ListaDeEnvios() {
  const { envios, escolher, descartar } = useEnvios();
  if (envios.length === 0) return null;

  return (
    <section
      aria-label="Envios"
      aria-live="polite"
      className="flex w-full flex-col gap-3 rounded-[16px] border border-borda-padrao bg-fundo-superficie px-5 py-4"
    >
      {envios.map((envio) =>
        envio.estado === "enviando" ? (
          <div key={envio.chave} className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-destaque-azul-suave text-destaque-azul">
              <IconeFigma src="/painel/icone-enviar.svg" tamanho={18} />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <div className="flex items-start justify-between gap-3">
                <p className="truncate texto-titulo-card-pequeno text-texto-primario">{envio.nome}</p>
                <p className="texto-pequeno text-texto-secundario">{envio.progresso}%</p>
              </div>
              <div
                role="progressbar"
                aria-label={`Enviando ${envio.nome}`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={envio.progresso}
                className="h-1.5 w-full overflow-hidden rounded-full bg-fundo-superficie-alt"
              >
                <div
                  className="h-1.5 rounded-full bg-destaque-azul transition-[width] duration-200"
                  style={{ width: `${envio.progresso}%` }}
                />
              </div>
            </div>
          </div>
        ) : (
          <div key={envio.chave} className="flex flex-col gap-3 sm:flex-row sm:items-center" role="alert">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-status-perigo-fundo text-status-perigo-texto">
                <IconeFigma src="/painel/icone-alerta.svg" tamanho={18} />
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <p className="truncate texto-titulo-card-pequeno text-texto-primario">{envio.nome}</p>
                <p className="texto-pequeno text-status-perigo-texto">{envio.erro}</p>
              </div>
            </div>
            <Button
              type="button"
              variant="secundario"
              className="self-start sm:self-auto"
              onClick={() => {
                descartar(envio.chave);
                escolher();
              }}
            >
              Tentar outro arquivo
            </Button>
          </div>
        ),
      )}
    </section>
  );
}

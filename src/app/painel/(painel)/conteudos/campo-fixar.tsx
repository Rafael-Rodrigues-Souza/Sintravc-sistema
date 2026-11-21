"use client";

import * as React from "react";
import { toast } from "sonner";

import { AlertDialog, AlertDialogContent, AlertDialogFooter } from "@/components/ui/alert-dialog";
import { Alerta } from "@/components/ui/alerta";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { bahiaEmCampos, somarDias } from "@/lib/datas";
import type { SituacaoDaFixacao } from "@/lib/conteudos/fixar";

import { acaoFixarNoticia } from "./acoes";

/** Quantos dias a data começa à frente quando a pessoa marca a caixa (só uma sugestão). */
const SUGESTAO_DIAS = 7;

/** "2026-11-10" → "10/11/2026". */
export function diaNaTela(dia: string): string {
  const [ano, mes, d] = dia.split("-");
  return `${d}/${mes}/${ano}`;
}

/**
 * “Fixar no topo de Notícias até <data>” (RF78, RN58, E14, E59), no editor (seção Publicação) e na
 * Edição rápida. Grava na hora, fora do salvamento automático (a fixação não é texto da notícia):
 * - na publicada, vale na hora; se outra estiver fixada, pede confirmação (AlertDialog) antes;
 * - no rascunho e na agendada, guarda a intenção, que vale ao publicar, e avisa qual sairá do topo.
 */
export function CampoFixar({
  id,
  noAr,
  situacao,
  aoMudar,
  prefixo = "fixar",
}: {
  /** Nulo enquanto a notícia nova não foi salva: a caixa fica travada. */
  id: string | null;
  noAr: boolean;
  situacao: SituacaoDaFixacao;
  /** Avisa a tela (o modal Publicar mostra a fixação). */
  aoMudar?: (s: SituacaoDaFixacao) => void;
  /** Prefixo dos ids (editor e Edição rápida podem estar na mesma página). */
  prefixo?: string;
}) {
  const [salva, setSalva] = React.useState(situacao);
  const [marcado, setMarcado] = React.useState(situacao.ate !== null);
  const [data, setData] = React.useState(situacao.ate ?? "");
  const [erro, setErro] = React.useState<string | null>(null);
  const [salvando, setSalvando] = React.useState(false);
  const [confirmar, setConfirmar] = React.useState<string | null>(null);
  const hoje = bahiaEmCampos(new Date()).data;

  function atualizar(nova: SituacaoDaFixacao) {
    setSalva(nova);
    aoMudar?.(nova);
  }

  async function gravar(ate: string | null) {
    if (!id) return;
    setSalvando(true);
    setErro(null);
    try {
      const r = await acaoFixarNoticia({ id, ate });
      if (r.tipo === "erro") {
        if (r.campo === "fixar_ate") setErro(r.mensagem);
        else toast.error("Não foi possível mudar a fixação.", { description: r.mensagem, duration: Infinity, closeButton: true });
        setMarcado(salva.ate !== null);
        setData(salva.ate ?? "");
        return;
      }
      // Na publicada, a outra saiu do topo agora; no rascunho, ela só sai quando esta for publicada.
      atualizar({ ate: r.ate, outra: r.vale ? null : salva.outra });
      if (noAr) {
        if (r.ate === null) toast.success("A notícia saiu do topo de Notícias.");
        else
          toast.success(`Notícia fixada no topo até ${diaNaTela(r.ate)}.`, {
            description: r.desafixadas.length > 0 ? `“${r.desafixadas.join("”, “")}” deixou de ser fixada.` : undefined,
          });
      }
    } catch {
      toast.error("Sem conexão com o servidor. Confira a internet e tente de novo.", { duration: Infinity, closeButton: true });
      setMarcado(salva.ate !== null);
      setData(salva.ate ?? "");
    } finally {
      setSalvando(false);
    }
  }

  /** Na publicada, fixar com outra no topo pede confirmação; mudar só a data da que já é a fixada, não. */
  function pedir(ate: string) {
    if (noAr && salva.outra && salva.ate === null) setConfirmar(ate);
    else void gravar(ate);
  }

  function aoMarcar(valor: boolean) {
    setMarcado(valor);
    if (valor) {
      const sugerida = somarDias(hoje, SUGESTAO_DIAS);
      setData(sugerida);
      pedir(sugerida);
    } else {
      setErro(null);
      if (salva.ate !== null) void gravar(null);
    }
  }

  function aoMudarData(valor: string) {
    setData(valor);
    setErro(null);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return;
    if (valor < hoje) {
      setErro("Escolha hoje ou uma data futura.");
      return;
    }
    if (valor !== salva.ate) pedir(valor);
  }

  const idCaixa = `${prefixo}-caixa`;
  const idData = `${prefixo}-ate`;
  return (
    <div className="flex flex-col gap-3" data-testid="campo-fixar">
      <div className="flex items-start gap-3">
        <Checkbox
          id={idCaixa}
          checked={marcado}
          disabled={!id || salvando}
          onCheckedChange={(v) => aoMarcar(v === true)}
          aria-describedby={`${idCaixa}-dica`}
          className="mt-0.5"
        />
        <div className="flex flex-col gap-0.5">
          <Label htmlFor={idCaixa} className="cursor-pointer texto-corpo text-texto-primario">
            Fixar no topo de Notícias
          </Label>
          <p id={`${idCaixa}-dica`} className="texto-pequeno text-texto-secundario">
            {!id
              ? "Comece a escrever: a notícia é salva sozinha e aí dá para fixar."
              : noAr
                ? "Aparece no bloco Destaque da página Notícias até o fim do dia escolhido."
                : "Vale quando a notícia for publicada, até o fim do dia escolhido."}
          </p>
        </div>
      </div>

      {marcado ? (
        <div className="flex flex-col gap-2 pl-8">
          <Label htmlFor={idData}>Até</Label>
          <Input
            id={idData}
            type="date"
            min={hoje}
            value={data}
            disabled={salvando}
            aria-invalid={erro ? true : undefined}
            aria-describedby={erro ? `${idData}-erro` : undefined}
            onChange={(evento) => aoMudarData(evento.target.value)}
          />
          {erro ? (
            <p id={`${idData}-erro`} className="texto-pequeno text-status-perigo-texto">
              {erro}
            </p>
          ) : null}
        </div>
      ) : null}

      {marcado && salva.outra ? (
        <Alerta tipo="aviso" titulo={`“${salva.outra.titulo}” está fixada até ${diaNaTela(salva.outra.ate)}`}>
          {noAr ? "Ao fixar esta, ela deixa de ser fixada." : "Ela deixa de ser fixada quando esta notícia for publicada."}
        </Alerta>
      ) : null}

      <AlertDialog
        open={confirmar !== null}
        onOpenChange={(aberto) => {
          if (aberto || salvando) return;
          setConfirmar(null);
          setMarcado(salva.ate !== null);
          setData(salva.ate ?? "");
        }}
      >
        <AlertDialogContent
          icone="/painel/icone-alerta.svg"
          tom="aviso"
          titulo="Fixar esta notícia?"
          descricao={
            salva.outra
              ? `“${salva.outra.titulo}” está fixada até ${diaNaTela(salva.outra.ate)} e deixa de ser fixada. Só uma notícia fica no topo de Notícias.`
              : "Só uma notícia fica no topo de Notícias."
          }
        >
          <AlertDialogFooter>
            <Button
              type="button"
              variant="secundario"
              disabled={salvando}
              onClick={() => {
                setConfirmar(null);
                setMarcado(salva.ate !== null);
                setData(salva.ate ?? "");
              }}
            >
              Voltar
            </Button>
            <Button
              type="button"
              disabled={salvando}
              onClick={async () => {
                const ate = confirmar;
                if (!ate) return;
                await gravar(ate);
                setConfirmar(null);
              }}
            >
              {salvando ? "Fixando…" : "Fixar esta notícia"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

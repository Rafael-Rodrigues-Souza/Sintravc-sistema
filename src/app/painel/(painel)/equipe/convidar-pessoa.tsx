"use client";

import { useActionState, useState } from "react";
import { toast } from "sonner";

import { IconeFigma } from "@/components/icone-figma";
import { Alerta } from "@/components/ui/alerta";
import { Button } from "@/components/ui/button";
import { Campo } from "@/components/ui/campo";
import { Dialog, DialogBody, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { NOME_DO_PERFIL, type Perfil } from "@/lib/permissoes";
import { cn } from "@/lib/utils";

import { acaoConvidar, type EstadoConvidar } from "./acoes";

const DESCRICAO_DO_PERFIL: Record<Perfil, string> = {
  ADM: "Acesso total: equipe, serviços e responsáveis, segurança, configurações e auditoria.",
  COM: "Notícias, comunicados, Rádio Chofer, página inicial e mídia.",
  ATD: "Agenda, horários e bloqueios só dos serviços em que for responsável. Não cria serviços.",
};

/**
 * Convidar pessoa (Figma 168:18823; RF51). Na Fase 1, só Administrador geral e Comunicação,
 * sem "Serviços sob responsabilidade" (CA-US29.3): os perfis vêm de perfisConvidaveis().
 */
export function ConvidarPessoa({ perfis, validadeHoras }: { perfis: Perfil[]; validadeHoras: number }) {
  const [aberto, setAberto] = useState(false);
  const [perfil, setPerfil] = useState<string>("");
  const [estado, enviar, enviando] = useActionState<EstadoConvidar, FormData>(async (anterior, formulario) => {
    const resultado = await acaoConvidar(anterior, formulario);
    if (resultado.enviadoPara) {
      setAberto(false);
      setPerfil("");
      toast.success(`Convite enviado para ${resultado.enviadoPara}.`);
    }
    return resultado;
  }, {});

  const valores = estado.valores;

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button className="self-start sm:self-auto">
          <IconeFigma src="/painel/icone-mais.svg" tamanho={18} />
          Convidar pessoa
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form action={enviar} className="flex min-h-0 flex-col" noValidate>
          <DialogHeader
            titulo="Convidar pessoa"
            descricao="A pessoa recebe um e-mail para criar a senha e entrar no painel."
          />
          <DialogBody>
            {estado.erro ? (
              <Alerta tipo="erro" titulo="O convite não foi enviado">
                {estado.erro}
              </Alerta>
            ) : null}
            <Campo
              id="convite-nome"
              name="nome"
              rotulo="Nome *"
              autoComplete="off"
              defaultValue={valores?.nome}
              erro={estado.erros?.nome}
              required
            />
            <Campo
              id="convite-email"
              name="email"
              type="email"
              rotulo="E-mail de trabalho *"
              icone="/painel/icone-email.svg"
              placeholder="nome@sintravc.org.br"
              autoComplete="off"
              defaultValue={valores?.email}
              erro={estado.erros?.email}
              required
            />
            <fieldset className="flex flex-col gap-2.5">
              <legend className="mb-2.5 texto-rotulo text-texto-primario">Perfil *</legend>
              <RadioGroup
                name="perfil"
                value={perfil || valores?.perfil || ""}
                onValueChange={setPerfil}
                aria-invalid={estado.erros?.perfil ? true : undefined}
                aria-describedby={estado.erros?.perfil ? "convite-perfil-erro" : undefined}
              >
                {perfis.map((opcao) => {
                  const marcado = (perfil || valores?.perfil) === opcao;
                  return (
                    <Label
                      key={opcao}
                      htmlFor={`convite-perfil-${opcao}`}
                      className={cn(
                        "cursor-pointer items-start gap-3 rounded-[12px] border px-3.5 py-3 transition-colors",
                        marcado
                          ? "border-2 border-destaque-azul bg-destaque-azul-suave px-[13px] py-[11px]"
                          : "border-borda-padrao hover:bg-fundo-superficie-alt",
                      )}
                    >
                      <RadioGroupItem id={`convite-perfil-${opcao}`} value={opcao} className="mt-0.5" />
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="texto-titulo-card-pequeno text-texto-primario">{NOME_DO_PERFIL[opcao]}</span>
                        <span className="texto-pequeno font-medium text-texto-secundario">{DESCRICAO_DO_PERFIL[opcao]}</span>
                      </span>
                    </Label>
                  );
                })}
              </RadioGroup>
              {estado.erros?.perfil ? (
                <p id="convite-perfil-erro" className="texto-pequeno text-status-perigo-texto">
                  {estado.erros.perfil}
                </p>
              ) : null}
            </fieldset>
            <Alerta tipo="informacao" titulo={`Convite válido por ${validadeHoras} horas`}>
              No primeiro acesso, a pessoa cria a senha e ativa a verificação em duas etapas. O convite fica registrado
              em Atividade.
            </Alerta>
          </DialogBody>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secundario">
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" disabled={enviando}>
              <IconeFigma src="/painel/icone-email.svg" tamanho={18} />
              {enviando ? "Enviando…" : "Enviar convite"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

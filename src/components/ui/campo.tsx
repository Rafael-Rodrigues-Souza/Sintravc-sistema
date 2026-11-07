import * as React from "react";

import { IconeFigma } from "@/components/icone-figma";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type CampoProps = React.ComponentProps<typeof Input> & {
  id: string;
  rotulo: string;
  /** Texto de ajuda abaixo da entrada. */
  ajuda?: string;
  /** Mensagem de erro: troca a ajuda e marca a entrada com `aria-invalid`. */
  erro?: string;
  /** Ícone à esquerda, dentro da entrada (ex.: /painel/icone-email.svg). */
  icone?: string;
};

/**
 * Campo 2.0 (Figma 63:853): rótulo, entrada e ajuda/erro, separados por 8 px.
 * A ajuda usa “2.0/Pequeno” em `texto/terciario`; no erro, `status/perigo-texto`.
 */
function Campo({ id, rotulo, ajuda, erro, icone, className, ...props }: CampoProps) {
  const idMensagem = `${id}-mensagem`;
  const mensagem = erro ?? ajuda;

  return (
    <div data-slot="campo" className={cn("flex flex-col gap-2", className)}>
      <Label htmlFor={id}>{rotulo}</Label>
      <div className="relative">
        {icone ? (
          <IconeFigma
            src={icone}
            className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-texto-terciario"
          />
        ) : null}
        <Input
          id={id}
          aria-invalid={erro ? true : undefined}
          aria-describedby={mensagem ? idMensagem : undefined}
          className={icone ? "pl-[46px]" : undefined}
          {...props}
        />
      </div>
      {mensagem ? (
        <p
          id={idMensagem}
          className={cn("texto-pequeno", erro ? "text-status-perigo-texto" : "text-texto-terciario")}
        >
          {mensagem}
        </p>
      ) : null}
    </div>
  );
}

export { Campo };

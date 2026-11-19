"use client";

import { useEffect } from "react";

import { IconeFigma } from "@/components/icone-figma";
import { Button } from "@/components/ui/button";

import { PaginaDeErro } from "./pagina-de-erro";
import { useSiteOpcional } from "./provedor-site";

/**
 * Corpo da página 500 (N2; Figma 295:58454 / 295:58768): “Tentar de novo” e “Falar no WhatsApp”.
 * O WhatsApp só aparece quando a ConfigSite chegou a carregar (sem ela, não há número).
 */
export function Conteudo500({ tentarDeNovo }: { tentarDeNovo: () => void }) {
  const site = useSiteOpcional();

  useEffect(() => {
    document.getElementById("titulo-erro")?.focus();
  }, []);

  return (
    <PaginaDeErro
      codigo="500"
      titulo="O site está fora do ar por um momento"
      texto="Pode ser um erro nosso ou uma manutenção programada. Não foi nada que você fez. Tente de novo em alguns minutos. Se precisar falar com o sindicato agora, chame no WhatsApp."
    >
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button onClick={tentarDeNovo}>Tentar de novo</Button>
        {site ? (
          <Button asChild variant="secundario">
            <a href={site.contato.linkWhatsApp} target="_blank" rel="noopener noreferrer">
              <IconeFigma src="/site/icone-whatsapp.svg" tamanho={18} />
              Falar no WhatsApp
            </a>
          </Button>
        ) : null}
      </div>
    </PaginaDeErro>
  );
}

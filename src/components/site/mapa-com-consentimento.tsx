"use client";

import { useState } from "react";

import { IconeFigma } from "@/components/icone-figma";
import { Button } from "@/components/ui/button";
import { MAPA } from "@/conteudo/site";
import { cn } from "@/lib/utils";

import { useSite } from "./provedor-site";

/**
 * Mapa do Google (RF06) que só carrega com a permissão da pessoa (RN45, E56): com “Aceitar todos” no
 * aviso de cookies, ou com o clique em “Carregar mapa” (vale só nesta página, sem gravar a escolha).
 */
export function MapaComConsentimento({ src, className }: { src: string; className?: string }) {
  const { escolha } = useSite();
  const [carregarAqui, setCarregarAqui] = useState(false);
  const liberado = escolha === "todos" || carregarAqui;

  return (
    <div className={cn("relative overflow-hidden rounded-[20px] border border-borda-padrao bg-fundo-superficie-alt", className)}>
      {liberado ? (
        <iframe
          src={src}
          title="Mapa da sede do SINTRAVC"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="absolute inset-0 size-full border-0"
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-destaque-azul-suave text-destaque-azul">
            <IconeFigma src="/site/icone-local.svg" tamanho={24} />
          </span>
          <p className="texto-corpo max-w-[360px] text-texto-secundario">
            {MAPA.semPermissao}
          </p>
          <Button variant="secundario" onClick={() => setCarregarAqui(true)}>
            Carregar mapa
          </Button>
        </div>
      )}
    </div>
  );
}

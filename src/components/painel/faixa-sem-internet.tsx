"use client";

import { CloudOff } from "lucide-react";

import { useConectado } from "./use-conexao";

/**
 * Sem internet (RF34, RN42, E02; Figma 118:3448): faixa em todas as telas do painel. Só o editor de
 * notícia guarda o rascunho no navegador; nos outros formulários, é só o aviso.
 */
export function FaixaSemInternet() {
  const conectado = useConectado();
  if (conectado) return null;
  return (
    <div
      role="status"
      className="flex items-start gap-3 border-b border-status-aviso-texto/20 bg-status-aviso-fundo px-5 py-3 lg:px-10"
    >
      <CloudOff aria-hidden className="mt-0.5 size-5 shrink-0 text-status-aviso-texto" />
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="texto-titulo-card-pequeno text-status-aviso-texto">Você está sem internet</p>
        <p className="texto-pequeno text-texto-primario">
          No editor de notícia, suas alterações ficam guardadas neste computador e são salvas quando a conexão voltar. Nas
          outras telas, espere a conexão voltar para salvar.
        </p>
      </div>
    </div>
  );
}

"use client";

import { createContext, useCallback, useContext, useMemo, useState, useTransition } from "react";

import { escolherCookies } from "./consentimento";
import type { EscolhaCookies } from "./consentimento-comum";

/**
 * Estado do site no navegador: a escolha do aviso de cookies (E56) e os links de contato que
 * as partes cliente usam (menu mobile, página 500). Os dados vêm da ConfigSite, no servidor.
 */
export type ContatoPublico = {
  linkFiliacao: string;
  linkWhatsApp: string;
  horario: string;
};

type ValorSite = {
  contato: ContatoPublico;
  escolha: EscolhaCookies | null;
  avisoAberto: boolean;
  abrirAviso: () => void;
  escolher: (escolha: EscolhaCookies) => void;
  salvando: boolean;
};

const ContextoSite = createContext<ValorSite | null>(null);

export function ProvedorSite({
  contato,
  escolhaInicial,
  children,
}: {
  contato: ContatoPublico;
  escolhaInicial: EscolhaCookies | null;
  children: React.ReactNode;
}) {
  const [escolha, setEscolha] = useState(escolhaInicial);
  const [reaberto, setReaberto] = useState(false);
  const [salvando, iniciar] = useTransition();

  const escolher = useCallback((nova: EscolhaCookies) => {
    setEscolha(nova);
    setReaberto(false);
    iniciar(() => escolherCookies(nova));
  }, []);
  const abrirAviso = useCallback(() => setReaberto(true), []);

  const valor = useMemo<ValorSite>(
    () => ({ contato, escolha, avisoAberto: escolha === null || reaberto, abrirAviso, escolher, salvando }),
    [contato, escolha, reaberto, abrirAviso, escolher, salvando],
  );
  return <ContextoSite.Provider value={valor}>{children}</ContextoSite.Provider>;
}

export function useSite(): ValorSite {
  const valor = useContext(ContextoSite);
  if (!valor) throw new Error("useSite() fora do ProvedorSite.");
  return valor;
}

/** Versão que não exige o provedor (página 500 da raiz, sem ConfigSite). */
export function useSiteOpcional(): ValorSite | null {
  return useContext(ContextoSite);
}

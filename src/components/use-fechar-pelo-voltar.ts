"use client";

import * as React from "react";

/**
 * O voltar do celular fecha uma janela por cima da página, sem sair dela (visualizador da Mídia, E53;
 * janela dos comunicados, E58). Ao abrir, entra uma entrada no histórico, marcada com o código desta
 * abertura, e o voltar a tira e fecha. Fechar pelo X, pelo Esc ou pelo fundo também tira a entrada
 * (history.back), para não sobrar um “voltar” que não faz nada.
 *
 * Devolve o `onOpenChange` para o Dialog do radix-ui.
 */
export function useFecharPeloVoltar(chave: string, aberto: boolean, aoMudar: (aberto: boolean) => void) {
  const marcaNoHistorico = React.useCallback(
    (): unknown => (window.history.state as Record<string, unknown> | null)?.[chave],
    [chave],
  );
  const abertura = React.useRef<string | null>(null);
  const fechar = React.useEffectEvent(() => {
    abertura.current = null;
    aoMudar(false);
  });
  React.useEffect(() => {
    if (!aberto) return;
    abertura.current ??= `${Date.now()}-${Math.random()}`;
    const minha = abertura.current;
    // No modo estrito do React o efeito roda duas vezes: a entrada só entra uma vez.
    if (marcaNoHistorico() !== minha) {
      window.history.pushState({ ...(window.history.state as object | null), [chave]: minha }, "");
    }
    const aoVoltar = () => {
      if (marcaNoHistorico() !== minha) fechar();
    };
    window.addEventListener("popstate", aoVoltar);
    return () => window.removeEventListener("popstate", aoVoltar);
  }, [aberto, chave, marcaNoHistorico]);

  return function mudar(novo: boolean) {
    if (novo) aoMudar(true);
    // Fecha pelo histórico: quem fecha de fato é o popstate acima.
    else if (abertura.current && marcaNoHistorico() === abertura.current) window.history.back();
    else fechar();
  };
}

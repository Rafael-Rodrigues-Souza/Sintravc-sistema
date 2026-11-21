"use client";

import { useEffect, useRef } from "react";

/**
 * Conta a visualização da notícia para as “Mais lidas” (E30, E59, T17). O aviso sai do navegador
 * depois que a página aparece: o prefetch de links e a maioria dos robôs não contam. Vai só o id
 * da notícia; nada de cookie, IP ou pessoa.
 */
export function ContarVisualizacao({ id }: { id: string }) {
  // Uma vez por notícia aberta: o modo estrito do React roda o efeito duas vezes no desenvolvimento.
  const contada = useRef<string | null>(null);
  useEffect(() => {
    if (contada.current === id) return;
    contada.current = id;
    const corpo = JSON.stringify({ id });
    try {
      const enviado = navigator.sendBeacon?.("/api/noticias/visualizacao", new Blob([corpo], { type: "application/json" }));
      if (!enviado) {
        void fetch("/api/noticias/visualizacao", { method: "POST", body: corpo, headers: { "content-type": "application/json" }, keepalive: true }).catch(
          () => {},
        );
      }
    } catch {
      // Contar é só um extra: se falhar, a leitura segue normal.
    }
  }, [id]);
  return null;
}

"use client";

import * as React from "react";

/**
 * Computador e tablet deitado: modal. Abaixo de lg (o corte do menu lateral, E49): folha inferior.
 * Usado pelos formulários de Comunicados e do Rádio Chofer.
 */
export function useTelaGrande() {
  const [grande, setGrande] = React.useState(true);
  React.useEffect(() => {
    const consulta = window.matchMedia("(min-width: 1024px)");
    const mudar = () => setGrande(consulta.matches);
    mudar();
    consulta.addEventListener("change", mudar);
    return () => consulta.removeEventListener("change", mudar);
  }, []);
  return grande;
}

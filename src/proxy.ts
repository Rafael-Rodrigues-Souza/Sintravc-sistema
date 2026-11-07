import { NextResponse, type NextRequest } from "next/server";

/**
 * Passa o endereço pedido para o painel (cabeçalho x-sintravc-caminho). Com ele, a sessão
 * vencida volta para a mesma página depois do login (E05, N3) e a tela 403 diz qual área é.
 * A permissão não é decidida aqui: cada página confere no servidor (sessaoDaEquipe, exigirArea).
 */
export function proxy(request: NextRequest) {
  const cabecalhos = new Headers(request.headers);
  cabecalhos.set("x-sintravc-caminho", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.next({ request: { headers: cabecalhos } });
}

export const config = {
  matcher: ["/painel/:path*"],
};

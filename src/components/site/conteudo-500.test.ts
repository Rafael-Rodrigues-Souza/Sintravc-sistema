import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ERRO_500 } from "@/conteudo/site";

import { Conteudo500 } from "./conteudo-500";
import { ProvedorSite } from "./provedor-site";

/**
 * Página 500 (N2). Não há e2e: provocar o erro no servidor do e2e exigiria uma rota ou um botão de
 * teste no código de produção, ou derrubar o banco no meio da rodada (e o cache da ConfigSite guarda
 * o último valor bom de propósito). Aqui o componente é renderizado como o servidor faria.
 */
const nada = () => {};

describe("Conteudo500", () => {
  it("sem a ConfigSite (a moldura falhou): título, texto e “Tentar de novo”, sem WhatsApp", () => {
    const html = renderToStaticMarkup(createElement(Conteudo500, { tentarDeNovo: nada }));
    expect(html).toContain(ERRO_500.titulo);
    expect(html).toContain(ERRO_500.texto);
    expect(html).not.toContain(ERRO_500.seForUrgente);
    expect(html).toContain("Tentar de novo");
    expect(html).not.toContain("wa.me");
    expect(html).toContain("Erro 500");
  });

  it("com a ConfigSite: também “Falar no WhatsApp”, com o número da recepção, sem mensagem pronta", () => {
    const contato = {
      linkFiliacao: "https://wa.me/557734234959?text=Ol%C3%A1",
      linkWhatsApp: "https://wa.me/557734234959",
      horario: "Segunda a sexta",
    };
    const html = renderToStaticMarkup(
      createElement(
        ProvedorSite,
        { contato, escolhaInicial: "essenciais" } as ComponentProps<typeof ProvedorSite>,
        createElement(Conteudo500, { tentarDeNovo: nada }),
      ),
    );
    expect(html).toContain(ERRO_500.seForUrgente);
    expect(html).toContain('href="https://wa.me/557734234959"');
    expect(html).toContain("Falar no WhatsApp");
  });
});

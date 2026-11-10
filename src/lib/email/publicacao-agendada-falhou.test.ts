import { describe, expect, it } from "vitest";

import { mensagemPublicacaoAgendadaFalhou } from "./modelos";

describe("M06 · Publicação agendada falhou (N6, E21)", () => {
  it("diz qual notícia, quando estava agendada, o que aconteceu e leva ao editor", async () => {
    const mensagem = await mensagemPublicacaoAgendadaFalhou("mariana@sintravc.org.br", {
      titulo: "Horário especial de atendimento no feriado",
      agendadaPara: "28/10/2026 · 16h00",
      motivo: "Falta preencher: Assinatura.",
      link: "http://localhost:3000/painel/conteudos/noticia/abc",
      urlSite: "http://localhost:3000",
    });

    expect(mensagem.para).toBe("mariana@sintravc.org.br");
    expect(mensagem.assunto).toBe("Não foi possível publicar “Horário especial de atendimento no feriado”");
    expect(mensagem.texto).toContain("A publicação agendada falhou");
    expect(mensagem.texto).toContain("28/10/2026 · 16h00");
    expect(mensagem.texto).toContain("Falta preencher: Assinatura.");
    expect(mensagem.texto).toContain("voltou para os rascunhos");
    expect(mensagem.html).toContain('href="http://localhost:3000/painel/conteudos/noticia/abc"');
  });
});

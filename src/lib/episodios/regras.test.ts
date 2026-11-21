import { describe, expect, it } from "vitest";

import { botaoDoModal, conferirCampos, situacaoDo, TRANSCRICAO_MAX, type CamposEpisodio } from "./regras";

const campos = (mais: Partial<CamposEpisodio> = {}): CamposEpisodio => ({
  link: "https://youtu.be/ab12Cd34Ef5",
  numero: "43",
  titulo: "Saúde mental no volante",
  duracao: "28:10",
  resumo: "",
  temaId: "",
  data: "2026-11-29",
  hora: "13:00",
  transcricao: "",
  capaMidiaId: "",
  ultimoPrograma: false,
  tituloYoutube: "",
  canalYoutube: "",
  ...mais,
});

describe("conferirCampos", () => {
  it("monta os dados com a exibição no horário da Bahia", () => {
    expect(conferirCampos(campos(), "programar")).toMatchObject({
      ok: true,
      dados: { youtubeId: "ab12Cd34Ef5", numero: 43, duracaoSeg: 1690, exibicaoEm: new Date("2026-11-29T16:00:00Z") },
    });
  });

  it("link que não é do YouTube: mensagem de link inválido (CA-US25.2)", () => {
    expect(conferirCampos(campos({ link: "https://vimeo.com/1" }), "rascunho")).toMatchObject({
      ok: false,
      campo: "link",
      mensagem: expect.stringContaining("não é de um vídeo do YouTube"),
    });
  });

  it("o rascunho não pede exibição; agendar e publicar pedem", () => {
    expect(conferirCampos(campos({ data: "", hora: "" }), "rascunho").ok).toBe(true);
    expect(conferirCampos(campos({ data: "", hora: "" }), "programar")).toMatchObject({ ok: false, campo: "exibicao" });
  });

  it("a duração é opcional, mas no formato certo (D4)", () => {
    expect(conferirCampos(campos({ duracao: "" }), "programar")).toMatchObject({ ok: true, dados: { duracaoSeg: null } });
    expect(conferirCampos(campos({ duracao: "28" }), "programar")).toMatchObject({ ok: false, campo: "duracao" });
  });

  it("número, título e transcrição dentro dos limites", () => {
    expect(conferirCampos(campos({ numero: "0" }), "rascunho")).toMatchObject({ ok: false, campo: "numero" });
    expect(conferirCampos(campos({ numero: "4.5" }), "rascunho")).toMatchObject({ ok: false, campo: "numero" });
    expect(conferirCampos(campos({ titulo: "x".repeat(121) }), "rascunho")).toMatchObject({ ok: false, campo: "titulo" });
    expect(conferirCampos(campos({ transcricao: "x".repeat(TRANSCRICAO_MAX) }), "rascunho").ok).toBe(true);
    expect(conferirCampos(campos({ transcricao: "x".repeat(TRANSCRICAO_MAX + 1) }), "rascunho")).toMatchObject({
      ok: false,
      campo: "transcricao",
    });
  });
});

describe("situação e botão do modal", () => {
  const agora = new Date("2026-11-21T15:00:00Z");

  it("segue o relógio", () => {
    expect(situacaoDo({ estado: "agendado", exibicaoEm: new Date("2026-11-21T14:00:00Z") }, agora)).toBe("no_ar");
    expect(situacaoDo({ estado: "agendado", exibicaoEm: new Date("2026-11-21T16:00:00Z") }, agora)).toBe("agendado");
    expect(situacaoDo({ estado: "rascunho", exibicaoEm: new Date("2026-11-21T14:00:00Z") }, agora)).toBe("rascunho");
  });

  it("agendar no futuro, publicar agora ou antes, salvar alterações no ar", () => {
    expect(botaoDoModal("rascunho", new Date("2026-11-22T16:00:00Z"), agora)).toBe("Agendar episódio");
    expect(botaoDoModal("rascunho", new Date("2026-11-20T16:00:00Z"), agora)).toBe("Publicar episódio");
    expect(botaoDoModal("rascunho", null, agora)).toBe("Agendar episódio");
    expect(botaoDoModal("no_ar", new Date("2026-11-20T16:00:00Z"), agora)).toBe("Salvar alterações");
  });
});

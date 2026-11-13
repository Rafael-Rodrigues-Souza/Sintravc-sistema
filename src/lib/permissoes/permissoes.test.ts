import { describe, expect, it } from "vitest";

import { areasDoPainel, exigir, perfisConvidaveis, pode, SemPermissao, type Quem } from ".";

// Expectativas copiadas à mão do spec §4 (✔ = S, — = N). Os casos ◐ estão mais abaixo.
const adm: Quem = { tipo: "equipe", id: "adm-1", perfil: "ADM" };
const com: Quem = { tipo: "equipe", id: "com-1", perfil: "COM" };
const atd: Quem = { tipo: "equipe", id: "atd-1", perfil: "ATD" };
const ass: Quem = { tipo: "associado", id: "ass-1" };
const vis: Quem = { tipo: "visitante" };

type Colunas = { ADM: boolean; COM: boolean; ATD: boolean; ASS: boolean; VIS: boolean };
type Linha = [string, (q: Quem) => boolean, Colunas];
const S = true;
const N = false;

const SO_ADM: Colunas = { ADM: S, COM: N, ATD: N, ASS: N, VIS: N };
const ADM_COM: Colunas = { ADM: S, COM: S, ATD: N, ASS: N, VIS: N };

const matriz: Linha[] = [
  ["Ver o site público", (q) => pode(q, "ver", { tipo: "site_publico" }), { ADM: S, COM: S, ATD: S, ASS: S, VIS: S }],
  ...(["criar", "editar", "publicar", "agendar", "ocultar", "arquivar", "restaurar"] as const).map(
    (acao): Linha => [
      `Notícia: ${acao} (de qualquer autor)`,
      (q) => pode(q, acao, { tipo: "noticia", autorId: "outra-pessoa" }),
      ADM_COM,
    ],
  ),
  ["Fixar notícia", (q) => pode(q, "fixar", { tipo: "noticia" }), ADM_COM],
  ["Ver versões da notícia", (q) => pode(q, "ver_versoes", { tipo: "noticia" }), ADM_COM],
  ["Restaurar versão da notícia", (q) => pode(q, "restaurar_versao", { tipo: "noticia" }), ADM_COM],
  ...(
    ["criar", "editar", "publicar", "agendar", "substituir", "ocultar", "arquivar", "restaurar", "ver_versoes", "restaurar_versao"] as const
  ).map(
    (acao): Linha => [`Edital, acordo e convenção: ${acao}`, (q) => pode(q, acao, { tipo: "documento" }), SO_ADM],
  ),
  ["Edital, acordo e convenção: excluir rascunho nunca publicado", (q) => pode(q, "excluir", { tipo: "documento", jaPublicado: false }), SO_ADM],
  ["Edital, acordo e convenção: excluir o que já foi ao ar", (q) => pode(q, "excluir", { tipo: "documento", jaPublicado: true }), { ADM: N, COM: N, ATD: N, ASS: N, VIS: N }],
  ["Edital, acordo e convenção: ver no painel", (q) => pode(q, "ver", { tipo: "documento" }), ADM_COM],
  ["Edital, acordo e convenção: baixar no painel", (q) => pode(q, "baixar", { tipo: "documento" }), ADM_COM],
  ["Comunicados", (q) => pode(q, "gerenciar", { tipo: "comunicado" }), ADM_COM],
  ["Rádio Chofer", (q) => pode(q, "gerenciar", { tipo: "radio" }), ADM_COM],
  ["Página inicial (destaques)", (q) => pode(q, "gerenciar", { tipo: "pagina_inicial" }), ADM_COM],
  ["Mídia: enviar", (q) => pode(q, "enviar", { tipo: "midia" }), ADM_COM],
  ["Mídia: editar texto alternativo", (q) => pode(q, "editar_alt", { tipo: "midia" }), ADM_COM],
  ["Mídia: excluir sem uso", (q) => pode(q, "excluir", { tipo: "midia", emUso: false }), ADM_COM],
  ["Benefícios (parceiros)", (q) => pode(q, "gerenciar", { tipo: "beneficio" }), SO_ADM],
  ["Categorias", (q) => pode(q, "gerenciar", { tipo: "categoria" }), SO_ADM],
  ["Configurações › Site", (q) => pode(q, "gerenciar", { tipo: "config_site" }), SO_ADM],
  ...(["convidar", "editar", "nova_senha", "redefinir_duas_etapas", "desativar"] as const).map(
    (acao): Linha => [`Equipe: ${acao}`, (q) => pode(q, acao, { tipo: "equipe" }), SO_ADM],
  ),
  ["Atividade: ver", (q) => pode(q, "ver", { tipo: "atividade" }), SO_ADM],
  ["Atividade: exportar", (q) => pode(q, "exportar", { tipo: "atividade" }), SO_ADM],
  ["Visão geral", (q) => pode(q, "ver", { tipo: "visao_geral" }), ADM_COM],
  ["Notificações do painel", (q) => pode(q, "ver", { tipo: "notificacao_painel" }), { ADM: S, COM: S, ATD: S, ASS: N, VIS: N }],
  ...(["criar", "alterar_cadastro", "abrir_no_site"] as const).map(
    (acao): Linha => [
      `Serviços: ${acao} (nome, ícone, limite, responsáveis, abrir no site)`,
      (q) => pode(q, acao, { tipo: "servico", responsaveisIds: ["atd-1"] }),
      SO_ADM,
    ],
  ),
  ["Agenda: ver grade e nomes (todos os serviços)", (q) => pode(q, "ver", { tipo: "agenda" }), { ADM: S, COM: N, ATD: S, ASS: N, VIS: N }],
  ["Filiar-se (WhatsApp)", (q) => pode(q, "filiar_se", { tipo: "filiacao" }), { ADM: N, COM: N, ATD: N, ASS: N, VIS: S }],
];

describe("pode(): cada linha da matriz do spec §4", () => {
  const pessoas = { ADM: adm, COM: com, ATD: atd, ASS: ass, VIS: vis };
  for (const [linha, chamar, esperado] of matriz) {
    for (const perfil of ["ADM", "COM", "ATD", "ASS", "VIS"] as const) {
      it(`${linha} · ${perfil}: ${esperado[perfil] ? "pode" : "não pode"}`, () => {
        expect(chamar(pessoas[perfil])).toBe(esperado[perfil]);
      });
    }
  }
});

describe("pode(): linhas condicionais (◐)", () => {
  it("Notícia: o ADM exclui rascunho nunca publicado de qualquer autor", () => {
    expect(pode(adm, "excluir", { tipo: "noticia", autorId: "com-1", jaPublicado: false })).toBe(true);
  });

  it("Notícia: o COM exclui só o rascunho nunca publicado de que é autor", () => {
    expect(pode(com, "excluir", { tipo: "noticia", autorId: "com-1", jaPublicado: false })).toBe(true);
    expect(pode(com, "excluir", { tipo: "noticia", autorId: "com-2", jaPublicado: false })).toBe(false);
  });

  it("Notícia: ninguém exclui notícia que já foi publicada", () => {
    expect(pode(adm, "excluir", { tipo: "noticia", autorId: "adm-1", jaPublicado: true })).toBe(false);
    expect(pode(com, "excluir", { tipo: "noticia", autorId: "com-1", jaPublicado: true })).toBe(false);
  });

  it("Notícia: sem saber o autor e se já foi publicada, a exclusão é negada", () => {
    expect(pode(adm, "excluir", { tipo: "noticia" })).toBe(false);
  });

  it("Mídia: não se exclui mídia em uso, nem sem saber se está em uso", () => {
    expect(pode(adm, "excluir", { tipo: "midia", emUso: true })).toBe(false);
    expect(pode(adm, "excluir", { tipo: "midia" })).toBe(false);
  });

  const doAtd = { responsaveisIds: ["atd-1"] };
  const deOutro = { responsaveisIds: ["atd-2"] };

  for (const acao of ["alterar_funcionamento", "bloquear_horario"] as const) {
    it(`Serviços: ${acao} — ADM em qualquer serviço, ATD só nos seus, COM nunca`, () => {
      expect(pode(adm, acao, { tipo: "servico", ...deOutro })).toBe(true);
      expect(pode(atd, acao, { tipo: "servico", ...doAtd })).toBe(true);
      expect(pode(atd, acao, { tipo: "servico", ...deOutro })).toBe(false);
      expect(pode(com, acao, { tipo: "servico", ...doAtd })).toBe(false);
    });
  }

  for (const acao of [
    "abrir_detalhe",
    "registrar_presenca",
    "cancelar",
    "remarcar",
    "agendar_balcao",
    "conceder_excecao",
  ] as const) {
    it(`Agenda: ${acao} — ADM em qualquer serviço, ATD só nos seus, COM nunca`, () => {
      expect(pode(adm, acao, { tipo: "agenda", servico: deOutro })).toBe(true);
      expect(pode(atd, acao, { tipo: "agenda", servico: doAtd })).toBe(true);
      expect(pode(atd, acao, { tipo: "agenda", servico: deOutro })).toBe(false);
      expect(pode(atd, acao, { tipo: "agenda" })).toBe(false);
      expect(pode(com, acao, { tipo: "agenda", servico: doAtd })).toBe(false);
    });
  }

  it("Histórico do associado: ADM vê tudo; ATD só o dos seus serviços; COM nada", () => {
    expect(pode(adm, "ver", { tipo: "historico_associado" })).toBe(true);
    expect(pode(atd, "ver", { tipo: "historico_associado", servico: doAtd })).toBe(true);
    expect(pode(atd, "ver", { tipo: "historico_associado", servico: deOutro })).toBe(false);
    expect(pode(atd, "ver", { tipo: "historico_associado" })).toBe(false);
    expect(pode(com, "ver", { tipo: "historico_associado", servico: doAtd })).toBe(false);
  });

  for (const acao of ["ver", "exportar"] as const) {
    it(`Relatórios: ${acao} — ADM todos; ATD só os seus serviços; COM nada`, () => {
      expect(pode(adm, acao, { tipo: "relatorio", servicos: [deOutro, doAtd] })).toBe(true);
      expect(pode(atd, acao, { tipo: "relatorio", servicos: [doAtd] })).toBe(true);
      expect(pode(atd, acao, { tipo: "relatorio", servicos: [doAtd, deOutro] })).toBe(false);
      expect(pode(com, acao, { tipo: "relatorio", servicos: [doAtd] })).toBe(false);
    });
  }

  it("Área do associado: só o próprio associado, com os próprios dados", () => {
    expect(pode(ass, "ver", { tipo: "area_associado", associadoId: "ass-1" })).toBe(true);
    expect(pode(ass, "ver", { tipo: "area_associado", associadoId: "ass-2" })).toBe(false);
    for (const q of [adm, com, atd, vis]) {
      expect(pode(q, "ver", { tipo: "area_associado", associadoId: "ass-1" })).toBe(false);
    }
  });
});

describe("pode(): o que não está na matriz é negado", () => {
  it("ação desconhecida (vinda de fora, sem o TypeScript) dá não, até para o ADM", () => {
    for (const acao of ["apagar_tudo", "constructor", "toString", "__proto__"]) {
      expect(pode(adm, acao as never, { tipo: "equipe" })).toBe(false);
    }
  });
});

describe("exigir()", () => {
  it("não faz nada quando pode", () => {
    expect(() => exigir(adm, "convidar", { tipo: "equipe" })).not.toThrow();
  });

  it("lança SemPermissao quando não pode", () => {
    expect(() => exigir(com, "convidar", { tipo: "equipe" })).toThrow(SemPermissao);
  });
});

describe("areasDoPainel(): o menu sai da mesma função", () => {
  it("COM vê Visão geral, Conteúdos, Comunicados, Rádio Chofer, Página inicial e Mídia (CA-US29.1)", () => {
    expect(areasDoPainel(com)).toEqual([
      "visao_geral",
      "conteudos",
      "comunicados",
      "radio",
      "pagina_inicial",
      "midia",
    ]);
  });

  it("ADM vê também Benefícios, Atividade, Equipe e Configurações; sem as áreas da Fase 2", () => {
    expect(areasDoPainel(adm)).toEqual([
      "visao_geral",
      "conteudos",
      "comunicados",
      "radio",
      "pagina_inicial",
      "midia",
      "beneficios",
      "atividade",
      "equipe",
      "configuracoes",
    ]);
  });

  it("Na Fase 2, o ATD vê Agenda, Serviços e Relatórios", () => {
    expect(areasDoPainel(atd, { fase: 2 })).toEqual(["agenda", "servicos", "relatorios"]);
  });

  it("Associado e visitante não têm menu de painel", () => {
    expect(areasDoPainel(ass)).toEqual([]);
    expect(areasDoPainel(vis)).toEqual([]);
  });
});

describe("perfisConvidaveis(): perfis do modal Convidar pessoa", () => {
  it("na Fase 1, só Administrador geral e Comunicação (CA-US29.3)", () => {
    expect(perfisConvidaveis(1)).toEqual(["ADM", "COM"]);
  });

  it("na Fase 2, também Atendimento", () => {
    expect(perfisConvidaveis(2)).toEqual(["ADM", "COM", "ATD"]);
  });
});

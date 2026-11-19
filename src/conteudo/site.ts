/**
 * Textos fixos das páginas institucionais do site (#13). Vieram do Figma, que usou arquivos do próprio
 * sindicato, e foram confirmados pelo Rafael em 18/11/2026 (comentário da issue #13).
 *
 * Entre colchetes, o que ainda falta (D5): o site mostra como marcador visível. Para trocar, edite só
 * este arquivo. Contato, missão e história ficam na ConfigSite (banco), não aqui.
 */

export const INSTITUICAO = {
  hero: {
    eyebrow: "Quem somos",
    titulo: "Juntos, somos mais fortes.",
    texto:
      "Representamos os trabalhadores do transporte rodoviário e o pessoal de apoio, defendendo direitos, valorizando cada profissional e construindo melhores condições de trabalho.",
    destaqueDaFoto: "A força do trabalhador move a nossa história.",
  },
  /** O primeiro número é o ano de fundação, que vem da ConfigSite (marco “fundacao”). */
  numeros: [
    { valor: "Trabalho", rotulo: "Defesa de direitos" },
    { valor: "União", rotulo: "Força coletiva" },
    { valor: "Regional", rotulo: "Vitória da Conquista e região" },
  ],
  proposito: {
    eyebrow: "Nosso propósito",
    titulo: "Uma entidade feita para representar e fortalecer você.",
    destaqueTitulo: "O trabalhador não está sozinho.",
    destaqueTexto: "Acreditamos na união, na participação e no diálogo como caminhos para conquistar avanços coletivos.",
  },
  valores: {
    eyebrow: "Nossos valores",
    titulo: "Princípios que orientam nossa atuação",
    texto: "Nosso compromisso se apoia em valores que colocam a categoria no centro das decisões.",
    itens: [
      { icone: "democracia", titulo: "Democracia e participação", texto: "Valorizamos a escuta, a participação da categoria e as decisões coletivas." },
      { icone: "autonomia", titulo: "Autonomia sindical", texto: "Atuamos com independência na defesa dos interesses dos trabalhadores." },
      { icone: "unidade", titulo: "Unidade e solidariedade", texto: "Acreditamos na força da organização coletiva e no apoio mútuo." },
      { icone: "respeito", titulo: "Respeito e pluralidade", texto: "Respeitamos diferentes ideias, histórias e convicções, sem discriminação." },
      { icone: "dignidade", titulo: "Dignidade no trabalho", texto: "Defendemos melhores salários, saúde, segurança e condições de trabalho." },
      { icone: "responsabilidade", titulo: "Responsabilidade", texto: "Buscamos agir com compromisso, transparência e respeito às decisões coletivas." },
    ],
  },
  naPratica: {
    eyebrow: "Na prática",
    titulo: "Como o sindicato está ao seu lado",
    texto: "Nossa atuação transforma demandas individuais e coletivas em diálogo, orientação e mobilização organizada.",
    itens: [
      { titulo: "Representação coletiva", texto: "Levamos as reivindicações da categoria às negociações e defendemos interesses coletivos." },
      { titulo: "Negociação trabalhista", texto: "Trabalhamos por acordos e convenções que garantam melhores condições de trabalho." },
      { titulo: "Orientação ao trabalhador", texto: "Orientamos sobre direitos e encaminhamentos, conforme os serviços disponíveis." },
      { titulo: "Participação da categoria", texto: "Assembleias e espaços de diálogo fortalecem a voz dos trabalhadores." },
    ],
  },
  historia: {
    eyebrow: "Nossa história",
    titulo: "Uma trajetória construída por trabalhadores",
  },
};

export type MembroDaDiretoria = { cargo: string; nome: string };

/**
 * Diretoria (estática nesta versão; C15). Lista enviada pelo sindicato e confirmada pelo Rafael em
 * 18/11/2026, na ordem da lista: presidente, vice e os outros 7. Cargos de diretoras no feminino.
 */
export const DIRETORIA = {
  gestao: "[20XX–20XX]",
  eleicao: "[Data da eleição]",
  descricao: "Conheça quem representa e defende a categoria dos rodoviários de Vitória da Conquista.",
  sobreAEscolha: "[Uma frase sobre como a diretoria é escolhida e qual é o seu papel]",
  mensagemDoPresidente: "[Mensagem curta do presidente para a categoria]",
  membros: [
    { cargo: "Presidente", nome: "Álvaro Silva Souza" },
    { cargo: "Vice-presidente", nome: "Eduardo Cesar Dutra de Oliveira" },
    { cargo: "Secretário-geral", nome: "João Antônio Ramos Matos" },
    { cargo: "Diretora Financeira", nome: "Beatriz Rios Viana" },
    { cargo: "Diretor Jurídico", nome: "José Evaristo Pereira Neto" },
    { cargo: "Diretora de Esporte e Lazer", nome: "Telma Pires Amorim Tavares" },
    { cargo: "Diretora da Mulher e Assistente Social", nome: "Maria do Carmo Gonçalves da Silva" },
    { cargo: "Diretora de Comunicação", nome: "Shirley Rodrigues Buriti Pereira" },
    { cargo: "Diretor do Aposentado", nome: "Juscimar Ferreira Oliveira" },
  ] satisfies MembroDaDiretoria[],
};

/** Iniciais para o lugar da foto: primeiro e último nome (“Álvaro Silva Souza” → “ÁS”). */
export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  const primeira = partes[0]?.[0] ?? "";
  const ultima = partes.length > 1 ? partes[partes.length - 1]![0] : "";
  return (primeira + ultima).toUpperCase();
}

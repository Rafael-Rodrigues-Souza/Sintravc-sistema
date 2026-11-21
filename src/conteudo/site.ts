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

/** Seção Filie-se (Figma 54:907 / 54:918). */
export const FILIE_SE = {
  eyebrow: "Filie-se",
  titulo: "Juntos, a categoria é mais forte.",
  texto:
    "Associados contam com assistência jurídica, convênios e benefícios exclusivos. A filiação é feita pela recepção do sindicato, direto pelo WhatsApp.",
};

/** Rodapé (Figma 295:51171 / 295:51234). */
export const RODAPE = {
  descricao: "Sindicato dos Rodoviários de Vitória da Conquista. Representando quem move a cidade.",
  nomeCompleto: "SINTRAVC — Sindicato dos Rodoviários de Vitória da Conquista",
};

/** Aviso de cookies (Figma 158:9425 / 159:9442; E56). O link para a Política vem depois de `texto`. */
export const AVISO_COOKIES = {
  texto:
    "Usamos só os cookies essenciais para o site funcionar. Vídeos do YouTube e o mapa do Google só carregam com a sua permissão. Saiba mais na",
  falhaAoGravar: "Não conseguimos guardar a sua escolha. Tente de novo.",
};

/** Mapa do Google antes da permissão (E56). */
export const MAPA = {
  semPermissao: "O mapa é do Google e só carrega com a sua permissão. Ao carregar, o Google pode guardar cookies.",
};

/** Página 404 (Figma 159:8590 / 159:8788). */
export const ERRO_404 = {
  titulo: "Página não encontrada",
  texto: "O endereço pode ter mudado ou o conteúdo saiu do ar. Volte ao início ou use um dos atalhos abaixo.",
};

/** Página 500 (N2; Figma 295:58454 / 295:58768). `seForUrgente` só aparece quando há WhatsApp. */
export const ERRO_500 = {
  titulo: "O site está fora do ar por um momento",
  texto: "Pode ser um erro nosso ou uma manutenção programada. Não foi nada que você fez. Tente de novo em alguns minutos.",
  seForUrgente: "Se precisar falar com o sindicato agora, chame no WhatsApp.",
};

/** Contato (Figma 87:629 / 89:964). Os dados (telefone, e-mail, endereço…) vêm da ConfigSite. */
export const CONTATO_PAGINA = {
  hero: {
    eyebrow: "Fale com a gente",
    titulo: "Entre em contato",
    texto: "Estamos aqui para ouvir você. Fale com o SINTRAVC para tirar dúvidas, buscar orientação ou conversar com nossa equipe.",
    presencial: "Atendimento presencial",
  },
  canais: {
    eyebrow: "Canais de atendimento",
    titulo: "Como podemos ajudar?",
    texto: "Escolha o canal mais conveniente para falar com o sindicato.",
    telefone: "Ligue para falar diretamente com nossa equipe.",
    whatsapp: "Envie uma mensagem e receba orientação pelo celular.",
    email: "Mande sua dúvida por escrito, com documentos se precisar.",
  },
  sede: {
    eyebrow: "Onde estamos",
    titulo: "Visite nossa sede",
    nome: "SINTRAVC — Sede",
    confirmeOHorario: "Confirme o horário antes de se deslocar.",
  },
  redes: {
    eyebrow: "Siga o sindicato",
    titulo: "Acompanhe o SINTRAVC nas redes sociais",
    texto: "Fique por dentro de notícias, comunicados, campanhas e atividades do sindicato.",
  },
};

/** Cartão amarelo da Diretoria. */
export const FALAR_COM_A_DIRETORIA = {
  titulo: "Quer falar com a diretoria?",
  texto: "Fale com a recepção pelo WhatsApp ou na sede para levar uma demanda ou marcar uma conversa com a diretoria.",
};

/** Política de privacidade e Termos de uso (D6): o alerta enquanto o texto não é o aprovado. */
export const PAGINA_LEGAL = {
  eyebrow: "Transparência",
  alertaTitulo: "Texto em validação",
  alertaTexto: "O texto final é escrito e aprovado pelo advogado do sindicato antes da publicação.",
};

/** Página Comunicados (E58, sem frame no Figma): os avisos no ar agora, na ordem da fila. */
export const COMUNICADOS_PAGINA = {
  eyebrow: "Avisos do sindicato",
  titulo: "Comunicados",
  texto: "Os avisos que estão no ar agora, inclusive os que você fechou na faixa amarela.",
  vazioTitulo: "Nenhum comunicado no momento",
  vazioTexto: "Quando o sindicato publicar um aviso, ele aparece aqui e na faixa amarela no alto do site.",
  vazioAcao: "Voltar ao início",
  noticiasTitulo: "Notícias recentes",
};

/** Página Notícias (Figma 80:629 / 81:995; E59). */
export const NOTICIAS_PAGINA = {
  eyebrow: "Fique por dentro",
  titulo: "Notícias do SINTRAVC",
  texto: "Informação, direitos e acontecimentos que impactam a nossa categoria. Acompanhe e fique por dentro.",
  destaque: "Destaque",
  maisLidas: "Mais lidas da semana",
  listaEyebrow: "Todas as notícias",
  listaTitulo: "Últimas notícias",
  buscaRotulo: "Buscar notícias",
  buscaDica: "Buscar notícias por título ou palavra-chave",
  ordemRotulo: "Ordenar",
  categoriasRotulo: "Assuntos",
  todas: "Todas",
  carregarMais: "Carregar mais notícias",
  vazioTitulo: "Nenhuma notícia publicada ainda",
  vazioTexto: "Quando o sindicato publicar uma notícia, ela aparece aqui.",
  vazioAcao: "Voltar ao início",
  semResultadoTitulo: "Nenhuma notícia encontrada",
  semResultadoTexto: "Tente outra palavra ou escolha outro assunto.",
  semResultadoAcao: "Limpar filtros",
};

/** “Tem uma sugestão de pauta?” (Figma 80:991): abre o WhatsApp da recepção, sem mensagem pronta (E59). */
export const SUGESTAO_DE_PAUTA = {
  titulo: "Tem uma sugestão de pauta?",
  texto: "Quer compartilhar uma informação relevante para a categoria? Mande para a gente — a notícia pode ser sua.",
  acao: "Enviar sugestão",
};

/**
 * Lateral da notícia aberta (Figma 100:15159; E59). O texto do “Precisa de orientação?” depende do
 * sindicato (D10): até lá, o marcador visível.
 */
export const NOTICIA_LATERAL = {
  orientacaoTitulo: "Precisa de orientação?",
  orientacaoTexto: "[Conteúdo a definir pelo sindicato]",
  orientacaoAcao: "Falar com o sindicato",
  canalTitulo: "Receba as notícias no WhatsApp",
  canalTexto: "Entre no canal oficial e receba comunicados, editais e notícias da categoria.",
  canalAcao: "Entrar no canal",
  maisNoticiasEyebrow: "Continue lendo",
  maisNoticiasTitulo: "Mais notícias",
  verTodas: "Ver todas as notícias",
  gostou: "Gostou da notícia?",
  gostouTexto: "Compartilhe e ajude a informação a chegar a mais trabalhadores.",
};

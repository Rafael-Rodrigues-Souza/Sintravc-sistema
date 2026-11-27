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

/** Página Documentos (Figma 73:629 / 74:1085 e 75:1438 / 76:1801; E60). */
export const DOCUMENTOS_PAGINA = {
  migalha: "Documentos",
  abasRotulo: "Documentos",
  listaEyebrow: "Arquivo oficial",
  anoRotulo: "Ano",
  todosOsAnos: "Todos os anos",
  tipoRotulo: "Tipo",
  todosOsTipos: "Todos os tipos",
  carregarMais: "Carregar mais publicações",
  semResultadoTitulo: "Nenhum documento encontrado",
  semResultadoTexto: "Tente outra palavra, outro tipo ou outro ano.",
  semResultadoAcao: "Limpar filtros",
  vazioAcao: "Voltar ao início",
  baixarPdf: "Baixar PDF",
  abrirDocumento: "Abrir documento",
  buscar: "Buscar",
  limparBusca: "Limpar a busca",
  abrirPdf: "Abrir PDF",
  editais: {
    eyebrow: "Transparência",
    titulo: "Editais",
    texto:
      "Acompanhe os editais do SINTRAVC, como convocações de assembleia, eleições e prestações de contas, sempre em PDF e em um só lugar. Confira os prazos e abra os arquivos para ler todas as orientações.",
    publicacoes: "publicações",
    prazos: "prazos em aberto",
    prazosCurto: "prazos abertos",
    atualizacao: "última atualização",
    atualizacaoCurto: "atualização",
    emDestaque: "Em destaque",
    abrir: "Abrir edital",
    listaTitulo: "Publicações",
    buscaRotulo: "Buscar editais",
    buscaDica: "Buscar por título, palavra-chave ou número do edital",
    buscaDicaCurta: "Buscar edital ou palavra-chave",
    unidade: ["publicação", "publicações"],
    vazioTitulo: "Nenhum edital publicado ainda",
    vazioTexto: "Quando o sindicato publicar um edital, ele aparece aqui.",
    tipos: { convocacao: "Convocações", eleicao: "Eleições", prestacao_contas: "Prestação de contas", outros: "Outros editais" },
  },
  acordos: {
    eyebrow: "Seus direitos",
    titulo: "Acordos coletivos",
    texto: "Consulte os instrumentos coletivos que definem as condições de trabalho da categoria: salários, jornada, benefícios e muito mais.",
    verVigente: "Ver acordo vigente",
    entenda: "Entenda ACT e CCT",
    emVigor: "em vigor",
    validoAte: "Válido até",
    abrir: "Ver documento",
    listaTitulo: "Consulte os instrumentos coletivos",
    buscaRotulo: "Buscar acordos e convenções",
    buscaDica: "Buscar por ano, empresa ou título",
    buscaDicaCurta: "Buscar por ano ou empresa",
    unidade: ["documento", "documentos"],
    vazioTitulo: "Nenhum acordo publicado ainda",
    vazioTexto: "Quando o sindicato publicar um acordo ou uma convenção, ele aparece aqui.",
    tipos: { act: "ACT", cct: "CCT" },
  },
  /** Explicação de ACT e CCT (Figma 75:1566): textos do Figma, aprovados pelo Rafael em 21/11/2026. */
  actECct: {
    eyebrow: "Qual é a diferença?",
    titulo: "Informação que fortalece seus direitos",
    texto: "O sindicato disponibiliza aqui os acordos e convenções oficialmente publicados. Leia o documento completo para conferir vigência, abrangência e cláusulas.",
    act: { sigla: "ACT", nome: "Acordo coletivo de trabalho", texto: "Negociado entre o sindicato e uma ou mais empresas. Vale para os trabalhadores das empresas que assinaram." },
    cct: { sigla: "CCT", nome: "Convenção coletiva de trabalho", texto: "Negociada entre o sindicato dos trabalhadores e o sindicato patronal. Vale para toda a categoria na região." },
  },
  /** Aviso abaixo da lista de Acordos (Figma 75:1784). */
  importante: {
    titulo: "Importante",
    texto: "A aplicação de cada instrumento depende do seu conteúdo, vigência e abrangência. Consulte o documento oficial e, em caso de dúvida, fale com o sindicato.",
  },
  /** Lateral de Acordos (Figma 75:1792). O texto do “Tem dúvidas?” prometia orientação de cada caso: marcador até o D10. */
  comoLer: {
    titulo: "Como ler um acordo coletivo",
    passos: ["Confira a vigência: datas de início e fim.", "Veja a abrangência: empresas e funções incluídas.", "Leia as cláusulas de salário, jornada e benefícios."],
  },
  duvidas: { titulo: "Tem dúvidas sobre um acordo coletivo?", texto: "[Conteúdo a definir pelo sindicato]", acao: "Falar no WhatsApp" },
  /** Lateral de Editais (Figma 73:1074). */
  transparencia: {
    titulo: "Transparência e informação",
    texto: "Todos os editais oficiais ficam disponíveis aqui em PDF, com data de publicação e prazo, para que nenhum trabalhador fique sem informação.",
  },
  canal: {
    titulo: "Receba os avisos no celular",
    texto: "Entre no canal do sindicato no WhatsApp e seja avisado sempre que um novo edital for publicado.",
    acao: "Entrar no canal",
  },
  naoEncontrou: {
    titulo: "Não encontrou o que procura?",
    texto: "Fale com o sindicato para confirmar a disponibilidade de um documento ou tirar dúvidas sobre uma publicação.",
    acao: "Fale conosco",
  },
  /** Documento aberto (N18, sem frame; E60). */
  aberto: {
    resumo: "Resumo",
    abrangencia: "Abrangência",
    partes: "Partes signatárias",
    numero: "Número",
    dataDocumento: "Data do documento",
    publicadoEm: "Publicado no site",
    prazo: "Prazo",
    vigencia: "Vigência",
    arquivo: "Arquivo",
    pdfTitulo: "Documento oficial em PDF",
    pdfTexto: "Abra no navegador para ler ou baixe para guardar no celular.",
    voltar: { editais: "Ver todos os editais", acordos: "Ver todos os acordos coletivos" },
  },
};

/** Página Rádio Chofer (Figma 157:8305 / 157:8607; RF05, E55, E61). */
export const RADIO_PAGINA = {
  migalha: "Rádio Chofer",
  eyebrow: "Programa do sindicato",
  titulo: "Rádio Chofer",
  texto: "O programa de comunicação do SINTRAVC, feito para motoristas e trabalhadores do transporte coletivo de Vitória da Conquista.",
  assistir: "Assistir no YouTube",
  inscrever: "Inscrever-se no canal",
  notaDoPlayer: "O vídeo vem do YouTube e só carrega quando você clica em reproduzir.",
  ultimoPrograma: "Último programa",
  semEpisodioNoTopo: "Os episódios aparecem aqui assim que forem publicados.",
  listaEyebrow: "Episódios",
  listaTitulo: "Todos os programas",
  buscaRotulo: "Buscar episódio",
  buscaDica: "Tema, convidado ou número",
  buscar: "Buscar",
  limparBusca: "Limpar a busca",
  temaRotulo: "Tema",
  todosOsTemas: "Todos os temas",
  carregarMais: "Carregar mais episódios",
  ouvirAgora: "Ouvir agora",
  lerTranscricao: "Ler transcrição",
  transcricao: "Transcrição",
  transcricaoCarregando: "Carregando a transcrição…",
  transcricaoErro: "Não conseguimos carregar a transcrição. Confira a internet e tente de novo.",
  tentarDeNovo: "Tentar de novo",
  vazioTitulo: "Nenhum episódio publicado ainda",
  vazioTexto: "Quando o sindicato publicar um programa, ele aparece aqui.",
  nadaEncontradoTitulo: "Nenhum episódio encontrado",
  nadaEncontradoTexto: "Tente outra palavra, o número do episódio ou outro tema.",
  limparFiltros: "Limpar filtros",
};


/**
 * Home (Figma 32:550 / 35:722; RF01, E62). Os textos vêm do Figma; o título do slide do programa foi
 * aprovado pelo Rafael (25/11/2026) e o texto dele é o mesmo da página Rádio Chofer.
 */
export const HOME_PAGINA = {
  carrosselRotulo: "Destaques",
  anterior: "Destaque anterior",
  proximo: "Próximo destaque",
  programaSelo: "Rádio Chofer",
  programaTitulo: "A voz dos rodoviários de Conquista",
  ouvirUltimo: "Ouvir o último programa",
  todosOsProgramas: "Todos os programas",
  lerNoticia: "Ler notícia",
  ouvirEpisodio: "Ouvir no Rádio Chofer",
  acessoEyebrow: "Serviços ao trabalhador",
  acessoTitulo: "Acesso rápido",
  acessoTexto: "Os documentos e canais que a categoria mais procura, a um clique de distância.",
  atalhos: {
    acordos: { titulo: "Acordos coletivos", texto: "Convenções e acordos em vigor para a categoria." },
    beneficios: { titulo: "Benefícios", texto: "O que o associado tem direito e como usar cada um." },
    editais: { titulo: "Editais", texto: "Convocações e editais oficiais em PDF." },
    whatsapp: { titulo: "Fale no WhatsApp", texto: "Tire dúvidas direto com o atendimento do sindicato." },
  },
  noticiasEyebrow: "Fique por dentro",
  noticiasTitulo: "Últimas notícias",
  verTodas: "Ver todas as notícias",
  categoriaRotulo: "Categoria",
  todasAsCategorias: "Todas as categorias",
  semNoticiasTitulo: "Nenhuma notícia publicada ainda",
  semNoticiasTexto: "Quando o sindicato publicar uma notícia, ela aparece aqui.",
  semNoticiasNaCategoria: "Nenhuma notícia nesta categoria.",
  verTodasAsCategorias: "Ver todas as categorias",
  radioEyebrow: "Rádio Chofer · Novo episódio",
  radioTitulo: "Último programa",
  aoVivoAgora: "Ao vivo agora",
  assistirAoVivo: "Assistir ao vivo",
  redesEyebrow: "Conecte-se",
  redesTitulo: "O sindicato também está nas redes",
  redesTexto: "Avisos em primeira mão, bastidores das ações e o Rádio Chofer completo.",
  redes: {
    instagram: { subtitulo: "Fotos e avisos", texto: "Fotos das assembleias, avisos rápidos e os bastidores das ações do sindicato.", acao: "Seguir no Instagram", contador: "seguidores" },
    facebook: { subtitulo: "Página do sindicato", texto: "Notícias e avisos do sindicato.", acao: "Seguir no Facebook", contador: "seguidores" },
    youtube: { subtitulo: "Rádio Chofer", texto: "Todos os episódios do Rádio Chofer, transmissões de assembleias e entrevistas.", acao: "Inscrever-se no canal", contador: "inscritos" },
    canalWhatsapp: {
      subtitulo: "Avisos oficiais",
      texto: "Receba os comunicados do sindicato direto no celular, sem precisar procurar.",
      acao: "Entrar no canal",
      contador: "rodoviários já recebem os avisos por aqui",
    },
  },
} as const;

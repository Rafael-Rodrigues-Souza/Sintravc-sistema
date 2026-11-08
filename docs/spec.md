# Especificação — SINTRAVC 2.0

**Versão 1.0 · 05/11/2026 · Responsável: Rafael Rodrigues Souza**

## Fontes e prioridade

1. Este spec consolida:
   - os docs v1.1 (`requisitos.md` com RF e RNF, `regras-de-negocio.md` com RN, `historias-de-usuario.md` e `criterios-de-aceitacao.md`);
   - a análise do Figma (`analise-figma.md`);
   - as decisões da entrevista (`decisoes.md`, E01–E31);
   - as correções de tela (`correcoes-figma.md`).
2. **Em caso de conflito, a ordem é: este spec → `decisoes.md` → docs v1.1 → Figma.**
3. Os IDs (RF, RN, US, CA, E, C, N, D) são os mesmos em todos os arquivos.

Stack: `stack.md`, sem mudanças. Hospedagem detalhada no E26.

---

## 1. Escopo por fase

| Fase | Entra | Não entra |
|---|---|---|
| **1** | <ul><li>Site público completo, sem “Entrar” no cabeçalho (E01).</li><li>Painel:<ul><li>acesso da equipe: convite, duas etapas, recuperação;</li><li>Visão geral;</li><li>Conteúdos (notícias, editais, acordos);</li><li>Comunicados;</li><li>Rádio Chofer;</li><li>Página inicial;</li><li>Benefícios;</li><li>Mídia;</li><li>Atividade;</li><li>Equipe e perfis;</li><li>Configurações.</li></ul></li><li>Perfis ADM e COM.</li><li>Tarefas automáticas de conteúdo.</li><li>Backup e deploy.</li></ul> | <ul><li>Qualquer chamada à API do sindicato.</li><li>Associado logado.</li></ul> |
| **2** | <ul><li>Entrar do associado: login, primeiro acesso, recuperar senha (E01).</li><li>Integração com a API (M17).</li><li>Área do associado: Início, Agendamentos, Notificações, Meus dados.</li><li>Cabeçalho conectado (sino, menu da conta, atalho Agendar).</li><li>Perfil ATD.</li><li>Agendamentos no painel: agenda, balcão, serviços, bloqueios, relatórios, mobile.</li><li>Tarefas automáticas de agendamento.</li></ul> | — |
| **Fora desta versão** | <ul><li>Edição da Diretoria pelo painel (C15).</li><li>Migração de conteúdo do site atual (B1).</li><li>Carteirinha digital (RN40).</li><li>E-mail de avisos para associados (E19).</li><li>Mais de um perfil por pessoa (E09).</li><li>Formulário de filiação (RN03).</li></ul> | — |

---

## 2. Entidades e relações

Notação: `PK` chave primária · `FK` chave estrangeira · `UQ` única · `?` opcional · `enc` criptografado. Todas as tabelas têm `criado_em` e `atualizado_em` (UTC). Datas são guardadas em UTC e exibidas em America/Bahia (RNF06).

### 2.1 Equipe e acesso (Fase 1)

| Entidade | Campos | Regras |
|---|---|---|
| **PessoaEquipe** | `id` PK; `nome`; `email` UQ; `perfil` (ADM, COM, ATD); `situacao` (pendente, ativa, desativada); `email_verificado`; `duas_etapas_ativas`; `tentativas_erradas`; `bloqueada_ate?`; `ultimo_acesso?`; `filtro_agenda?` (JSON, RN21) | Um perfil só (E09). Sempre ≥ 2 ADMs ativos (RN50). Desativar encerra as sessões e mantém o histórico. É a tabela de usuários do Better Auth (E35). A senha fica em **ContaLogin** e o segredo TOTP em **DuasEtapas** (E36). |
| **ContaLogin** | gerida pelo Better Auth; `pessoa_id` FK; `provedor` (`credential`); `senha_hash` | Senha com hash forte (RNF02). |
| **DuasEtapas** | gerida pelo Better Auth; `pessoa_id` FK; `segredo` enc; `codigos_recuperacao` enc | Segredo TOTP e códigos de recuperação, criptografados com `BETTER_AUTH_SECRET` (E36). |
| **SenhaAnterior** | `pessoa_id` FK; `senha_hash`; `criada_em` | Guarda o hash de cada senha nova, inclusive a atual, e só as N últimas (`equipe.senhas_anteriores_bloqueadas`, 3). A senha nova não pode ser igual a nenhuma delas (RN47, E37). |
| **Códigos de recuperação** | ficam em **DuasEtapas** (E36), não numa tabela própria | 8 por ativação (`equipe.codigos_recuperacao`), gerados pelo sistema no formato `XXXXX-XXXXX`, só maiúsculas e algarismos sem 0/O, 1/I/L; uso único, conferidos pelo plugin; redefinir as duas etapas invalida todos (RN49, E37). |
| **Convite** | `id`; `pessoa_id` FK; `token_hash` UQ; `expira_em` (+48 h); `usado_em?`; `criado_por?` FK | Reenviar invalida o anterior (`expira_em` = agora) (RN46). O convite só é gasto (`usado_em`) quando a pessoa conclui o aceite; até lá, reabrir o link recomeça do zero (E37). `criado_por` fica vazio quando o convite nasce pelo `pnpm criar-admin` (E33, E35). |
| **TokenSenha** | `id`; `sujeito` (equipe ou associado); `sujeito_id`; `token_hash` UQ; `expira_em` (+1 h); `usado_em?` | Uso único (RN48, RN52). |
| **Sessao** | gerida pelo Better Auth; `pessoa_id`; `token`; `expira_em`; `ultimo_uso`; `criado_em` | Equipe: 2 h sem uso ou 12 h após o login (E05), conferidos a cada requisição com os valores do `Parametro` (E36). Associado: RN51. |
| **ResponsavelServico** (Fase 2) | `pessoa_id` FK; `servico_id` FK; PK composta | Só para o perfil ATD (RN19). |

### 2.2 Conteúdo (Fase 1)

| Entidade | Campos | Regras |
|---|---|---|
| **Categoria** | `id`; `nome` UQ; `cor`; `ordem`; `escopos[]` (noticias, documentos, radio, beneficios†) | Só o ADM gerencia (RN08). † `beneficios` é padrão adotado (§10, P1). |
| **Conteudo** (base comum) | `id`; `tipo` (noticia, edital, acordo); `slug` UQ por tipo; `titulo`; `estado` (rascunho, agendado, publicado, oculto, arquivado); `agendado_para?`; `publicado_em?`; `ja_publicado` (bool); `motivo_oculto?`; `autor_id` FK; `categoria_id?` FK; `versao` (int) | Ciclo de vida da RN10. `ja_publicado` controla a exclusão (RN54). |
| **Noticia** (1:1 com Conteudo) | `linha_fina?` (≤ 200); `lide`; `corpo` (JSON do Tiptap); `capa_midia_id?` FK; `capa_alt`; `capa_legenda?`; `assinatura`; `local?`; `palavras_chave[]`; `fixada_ate?` | Manchete = `titulo` (≤ 110). Para publicar, o texto alternativo da capa é obrigatório (RN15). Só uma fixada por vez (RN58). |
| **Documento** (1:1 com Conteudo; edital e acordo) | `numero` (UQ por tipo); `subtipo` (edital: convocação, eleição, prestação de contas, outros; acordo: ACT, CCT); `data_documento`; `data_evento?`; `vigencia_inicio?`; `vigencia_fim?`; `abrangencia?`; `partes_signatarias?`; `resumo` (≤ 400); `pdf_midia_id` FK; `texto_pesquisavel?`; `confirmado_oficial_por` FK | Só o ADM (RN08, RN12). O selo Vigente, Encerrado ou Prazo é **calculado** pelas datas e não é estado (C2). |
| **ConteudoLink** | `conteudo_id` FK; `tipo` (fonte, anexo); `titulo`; `url?`; `midia_id?`; `visivel`; `ordem` | — |
| **ConteudoVersao** | `conteudo_id` FK; `versao`; `snapshot` (JSON); `criado_por` FK; `criado_em` | Gerada a cada publicação ou edição de algo publicado; restaurável como rascunho (E31). |
| **VisualizacaoDiaria** | `conteudo_id` FK; `dia`; `total`; PK composta | Contador anônimo para “Mais lidas” (E30). |
| **Comunicado** | `id`; `mensagem` (≤ 140); `link_conteudo_id?` FK ou `link_url?`; `inicio`; `fim`; `ordem_fila`; `estado` (rascunho, agendado, publicado, encerrado); `encerrado_por?` | É faixa, não Conteudo (RN14, C3). Pode ser duplicado depois de encerrado. |
| **Episodio** | `id`; `numero` UQ; `youtube_id` UQ; `titulo`; `resumo?`; `tema_categoria_id?` FK (escopo radio); `exibicao_em`; `duracao_seg?`; `capa_url`; `ultimo_programa` (UQ parcial: só um true); `estado` | Nenhum vídeo é guardado (RN17). Tema vem da Categoria (E15). |
| **DestaqueHome** | `id`; `versao` (rascunho ou publicado); `area` (carrossel, lista); `posicao`; `modo` (auto, escolhido); `item_tipo` (noticia, episodio, programa); `item_id?`; `entra_em?`; `sai_em?`; `escolhido_por?` | Carrossel com até 5 itens; lista com 3 posições. Só esta área controla a Home (E13). “Publicar alterações” copia o rascunho para o publicado. |
| **Parceiro** | `id`; `nome`; `logo_midia_id` FK; `categoria_id` FK; `desconto_pct` (0–100); `como_usar?`; `publico` (associado, associado e dependentes); `comeca_em?`; `valido_ate?`; `endereco_ou_site?`; `estado` | Só o ADM. Agendado quando `comeca_em` é futuro; vai para Arquivado ao vencer (RN57). |
| **Midia** | `id`; `chave_r2`; `nome_arquivo`; `tipo` (imagem, pdf, documento); `mime`; `largura?`; `altura?`; `bytes`; `paginas?`; `alt?`; `legenda?`; `enviado_por` FK | HEIC é convertido para JPG ou WebP (RN15). Até 10 MB; logo de parceiro até 2 MB (R7). |
| **MidiaUso** | `midia_id` FK; `dono_tipo`; `dono_id` | Mantida pelo servidor. Só pode excluir mídia sem uso (RN16). |
| **ConfigSite** | registro único (JSON validado por Zod): contato, horários, redes, missão, história, programa ao vivo (canal, dias, horário), contadores manuais | Fonte única do site (RN43). Atualiza em até 1 min. Criada com dados de exemplo junto com a estrutura do site; a tela de edição vem depois. |
| **RedirecionamentoUrl** | `origem` UQ; `destino`; `codigo` (301) | Preserva as URLs antigas (B2, D7). |

### 2.3 Transversais (Fase 1)

| Entidade | Campos | Regras |
|---|---|---|
| **Atividade** | `id`; `quando`; `ator_tipo` (pessoa, sistema, associado); `ator_id?`; `acao`; `area`; `alvo_tipo`; `alvo_id`; `alvo_rotulo`; `detalhe` (JSON); `motivo?` | **Só inserção**: UPDATE e DELETE são bloqueados no banco (RNF04). Guardada por 5 anos (E25). Visível só para o ADM. |
| **Parametro** | `chave` PK; `valor` (JSON); `descricao`; `regra` | Valores do `regras-de-negocio.md` §3, criados pela migração e lidos com cache de 60 s (T4, E35). Só o ADM altera, direto no banco. |
| **NotificacaoEquipe** | `id`; `pessoa_id` FK; `tipo`; `texto`; `link?`; `lida_em?` | — |

### 2.4 Associado e agendamentos (Fase 2)

| Entidade | Campos | Regras |
|---|---|---|
| **Associado** (cópia local da API) | `id`; `matricula` UQ; `cpf` enc; `cpf_hash` UQ; `nome`; `empresa`; `funcao`; `situacao` (ativo, inativo, pausado, desfiliado); `associado_desde`; `data_nascimento?`; `consultado_em` | Somente leitura no site (RN39). A última consulta vale por 24 h quando a API cai (E22). |
| **Dependente** | `id`; `associado_id` FK; `id_api` UQ; `nome`; `parentesco`; `ativo` | Vem da API (RN34). |
| **ContaAssociado** | `associado_id` PK/FK; `email` UQ; `email_pendente?`; `celular?`; `senha_hash`; `termos_versao`; `termos_aceitos_em`; `tentativas_erradas`; `bloqueada_ate?`; `ultimo_acesso` | RN51, RN53. Ao excluir, apaga esta linha e as notificações e cancela os agendamentos futuros (E24). |
| **AvisoAssociado** + **LeituraAviso** | Aviso: `id`; `tipo`; `titulo`; `texto`; `link?`; `para` (todos ou associado_id); `criado_em`. Leitura: `aviso_id`; `associado_id`; `lida_em` | Os avisos gerais são gravados **uma vez** e a leitura fica por associado (§11, T3). Guardados por 90 dias. |
| **Servico** | `id`; `nome`; `descricao`; `icone`; `duracao_min`; `capacidade`; `limite_mensal?` (vazio = sem limite); `local`; `aberto_no_site`; `indisponivel` | Só o ADM cria e altera nome, descrição, ícone, limite e responsáveis. O ATD altera duração, horários e local (RN19, RN37). As mudanças valem só para novos agendamentos (R15). |
| **ServicoHorario** | `servico_id` FK; `dia_semana`; `inicio`; `fim` (várias faixas por dia) | — |
| **Bloqueio** + **BloqueioServico** | `id`; `de`; `ate`; `dia_inteiro`; `faixa_inicio?`; `faixa_fim?`; `motivo` (visível ao associado); `criado_por` · N:N com Servico | Cancela e avisa quem já tinha horário (RN35). |
| **Agendamento** | `id`; `servico_id` FK; `associado_id` FK; `dependente_id?` FK; `inicio`; `fim`; `estado` (confirmado, concluido, faltou, cancelado, pendente_registro); `origem` (site, balcao); `criado_por?` FK; `excecao_limite`; `motivo_excecao?`; `cancelado_por_tipo?` (associado, equipe, bloqueio, sistema); `motivo_cancelamento?`; `mensagem_associado?`; `presenca_por?`; `presenca_em?`; `consulta_api_em`; `reconferir` | Capacidade e limite são conferidos **na mesma transação**, com lock por (serviço, início) (RNF05). |
| **Remarcacao** | `agendamento_id` FK; `inicio_anterior`; `por_tipo`; `por_id?`; `motivo?` | Remarcar não conta novo uso (RN26). |
| **Suspensao** | `id`; `associado_id`; `dependente_id?`; `inicio`; `fim` (+15 dias) | Vale por pessoa (E29). |

**Relações principais.**
- Associado 1:N Dependente.
- Associado 1:1 ContaAssociado.
- Servico N:N PessoaEquipe (responsáveis).
- Servico 1:N ServicoHorario.
- Servico N:N Bloqueio.
- Agendamento N:1 Servico.
- Agendamento N:1 Associado.
- Agendamento N:1 Dependente (opcional).
- Conteudo 1:1 Noticia ou Documento.
- Conteudo 1:N ConteudoVersao.
- Conteudo 1:N ConteudoLink.
- Midia N:N donos (via MidiaUso).
- Categoria 1:N Conteudo, Episodio e Parceiro.

---

## 3. Regras de negócio

As regras completas estão em `regras-de-negocio.md` (RN01–RN59). Aqui fica o resumo que orienta a implementação.

### 3.1 Acesso
- **Equipe.**
  - Entra por convite de 48 h: cria a senha (RN47), ativa as duas etapas pelo QR e recebe 8 códigos de recuperação (RN46, RN49).
  - Login com e-mail, senha e TOTP ou código de recuperação. 5 erros bloqueiam por 15 min e avisam o ADM por e-mail (RN05, E21).
  - Recupera a senha sozinha: link de 1 h, resposta genérica, encerra as outras sessões e envia e-mail de senha alterada (RN48).
  - Sessão: 2 h sem uso ou 12 h (E05).
  - Sempre ≥ 2 ADMs ativos (RN50).
  - As três regras de segurança são fixas (C9).
- **Associado (Fase 2).**
  - Primeiro acesso com CPF e matrícula conferidos na API; cria e-mail e senha e aceita os termos (RN02).
  - Login com CPF e senha; a filiação é conferida a cada login (RN01).
  - Senha com mínimo de 8 caracteres; 5 erros bloqueiam por 15 min; sessão de 30 dias com “Lembrar de mim” (RN51).
  - A situação da filiação só aparece depois de CPF e senha corretos (RN51).
  - Recuperação com resposta genérica e link de 1 h (RN52).
  - Trocar e-mail ou senha pede a senha atual; o novo e-mail é confirmado por link de 24 h (RN53).
  - API fora do ar: vale a última consulta de até 24 h (E22).

### 3.2 Conteúdo
- **Ciclo de vida:** Rascunho → Agendado ou Publicado → Oculto (com motivo) ou Arquivado → restaurar como Rascunho (RN10, RN11).
- **Sem aprovação.** Ações sensíveis pedem confirmação e vão para a Atividade (RN09).
- **Exclusão definitiva:** só de rascunho nunca publicado, pelo autor ou pelo ADM (RN54).
- **Versões:** são guardadas a cada publicação e podem ser restauradas como rascunho (E31).
- **Documentos oficiais:** só o ADM, só em PDF e com confirmação de versão oficial (RN12). O selo de vigência é calculado (C2). Aviso 2 dias antes do fim da vigência (RN44).
- **Comunicado:**
  - é faixa em todas as páginas (até 140 caracteres), com período;
  - entra e sai do ar sozinho e alterna na fila;
  - “Encerrar agora” pede confirmação;
  - pode ser duplicado (RN14).
- **Episódio:** usa o link do YouTube e o player só carrega no clique. Marcar “Último programa” substitui o anterior (RN17, R12).
- **Home:** só a área Página inicial controla os destaques, com rascunho e “Publicar alterações” (E13).
- **Notícia fixada:** uma por vez no topo da página Notícias (RN58).
- **Parceiro:** período com “Começa em” e “Válido até”; ao vencer, é arquivado sozinho (RN57).
- **Imagens:** JPG, PNG, WebP e HEIC (convertido); o texto alternativo é obrigatório para publicar (RN15). Só pode excluir mídia sem uso (RN16).
- **Sem internet:** só o rascunho do editor fica guardado no navegador (E02).

### 3.3 Agendamentos (Fase 2)
- **Confirmação:** automática, depois de conferir a filiação. Só horários livres, com até 30 dias de antecedência (RN23, RN24).
- **Por pessoa** (associado ou dependente):
  - 1 agendamento ativo por serviço (RN25);
  - limite mensal pela data do atendimento: conta confirmado, concluído e faltou; cancelado não conta; remarcar não conta (RN26).
- **Pelo associado:** cancela ou remarca até 2 h antes (RN27).
- **Pela equipe:** cancelar ou remarcar exige motivo e avisa o associado (RN28).
- **Lembretes:** 1 dia antes e 2 h antes; sem e-mail, não há lembrete (RN29).
- **Presença:**
  - a ação é “Atendido · Faltou” e o estado é Concluído ou Faltou (E18);
  - às 23h59 sem registro, o atendimento vira Pendente de registro;
  - o responsável é avisado e o ADM recebe um resumo diário (RN30, E16);
  - pendentes ficam fora do relatório.
- **Faltas:** 2 no mês do calendário suspendem a pessoa por 15 dias (RN31, E29).
- **Filiação deixa de ser ativa:** os agendamentos futuros são cancelados, com aviso. Falha da API nunca cancela (RN32, E22).
- **Balcão:**
  - só pelos responsáveis do serviço;
  - exceção ao limite com motivo;
  - o limite nunca é ultrapassado pelo site (RN33, R14).
- **Bloqueio:** cancela e avisa quem já tinha horário (RN35).
- **Capacidade:** atendimentos por horário (RN36).
- **Relatórios:** realizado = presença registrada. A exportação em PDF ou Excel não fica no servidor e vai para a Atividade (RN38, E25).

### 3.4 Notificações e e-mail
- O e-mail é só transacional (RN59).
- Avisos do sindicato aos associados são gerados ao publicar edital, acordo, comunicado ou parceiro (E20).
- O catálogo completo está na §7.

### 3.5 LGPD e guarda
- CPF criptografado, com hash para busca, e mascarado na tela (RNF03).
- Filiação é dado sensível (E03).
- Prazos provisórios (E25):
  - atendimentos: 5 anos;
  - Atividade: 5 anos;
  - logs de acesso: 6 meses;
  - notificações: 90 dias;
  - conta inativa: aviso após 2 anos sem login e exclusão do acesso 30 dias depois.
- Excluir o acesso: E24.
- Privacidade na agenda: RN56.

---

## 4. Permissões

Tudo é conferido **no servidor**, em toda ação (RNF01); esconder o botão não basta. Legenda: ✔ pode · ◐ condicional (ver nota) · — não pode.

| Recurso / ação | ADM | COM | ATD | ASS | VIS |
|---|---|---|---|---|---|
| Ver o site público | ✔ | ✔ | ✔ | ✔ | ✔ |
| Notícia: criar, editar, publicar, agendar, ocultar, arquivar, restaurar (de qualquer autor) | ✔ | ✔ | — | — | — |
| Notícia: excluir rascunho nunca publicado | ✔ | ◐ só o autor | — | — | — |
| Fixar notícia; ver e restaurar versões | ✔ | ✔ | — | — | — |
| Edital, acordo e convenção: criar, publicar, substituir, arquivar | ✔ | — | — | — | — |
| Edital, acordo e convenção: ver e baixar no painel | ✔ | ✔ | — | — | — |
| Comunicados | ✔ | ✔ | — | — | — |
| Rádio Chofer (episódios e programa ao vivo) | ✔ | ✔ | — | — | — |
| Página inicial (destaques) | ✔ | ✔ | — | — | — |
| Mídia: enviar, editar texto alternativo, excluir sem uso | ✔ | ✔ | — | — | — |
| Benefícios (parceiros) | ✔ | — | — | — | — |
| Categorias | ✔ | — | — | — | — |
| Configurações › Site | ✔ | — | — | — | — |
| Equipe: convidar, editar, nova senha, redefinir duas etapas, desativar | ✔ | — | — | — | — |
| Atividade: ver e exportar | ✔ | — | — | — | — |
| Visão geral e notificações do painel | ✔ | ✔ | ◐ só notificações | — | — |
| Serviços: criar, alterar nome, ícone, limite e responsáveis, abrir no site | ✔ | — | — | — | — |
| Serviços: alterar duração, horários e local | ✔ | — | ◐ só os seus | — | — |
| Bloquear horário | ✔ | — | ◐ só os seus | — | — |
| Agenda: ver grade e nomes | ✔ | — | ✔ todos os serviços | — | — |
| Agenda: abrir detalhe, presença, cancelar, remarcar, balcão, exceção | ✔ | — | ◐ só os seus | — | — |
| Histórico do associado no detalhe | ✔ tudo | — | ◐ só os seus serviços | — | — |
| Relatórios e exportação | ✔ todos | — | ◐ só os seus | — | — |
| Área do associado: os próprios dados, agendamentos (para si e dependentes), notificações | — | — | — | ✔ | — |
| Filiar-se (WhatsApp) | — | — | — | — | ✔ |

---

## 5. Telas por fase

Os IDs do Figma estão em `analise-figma.md` §1. As correções estão em `correcoes-figma.md`.

### Fase 1
- **Site:**
  - Home, Notícias e notícia aberta;
  - Sindicato (Instituição, Diretoria estática, Benefícios);
  - Documentos (Editais, Acordos);
  - Rádio Chofer e Contato;
  - menu mobile de visitante, 404, Política de privacidade, Termos de uso (só texto, D6) e aviso de cookies;
  - cabeçalho, menu e rodapé **sem “Entrar”** (N13).
- **Painel · acesso:**
  - login, duas etapas e código de recuperação;
  - esqueci minha senha, link enviado e nova senha;
  - convite (criar senha, duas etapas, códigos) e convite inválido;
  - sessão expirada (N3);
  - e-mails da equipe (N6).
- **Painel · conteúdo:**
  - Visão geral e notificações;
  - Conteúdos: lista, Comunicação, menu Criar, edição rápida, calendário;
  - Editor: notícia, documento, confirmar, pré-visualizar, histórico de versões (N14), conflito de versões (N4);
  - Comunicados (e mobile), Rádio Chofer, Página inicial, Benefícios, Mídia.
- **Painel · administração:**
  - Atividade;
  - Equipe e perfis: convidar, editar, menu de ações, redefinir duas etapas, desativar (N5);
  - Configurações: Site, Categorias e Regras de segurança (só leitura, “Regras fixas do sistema”, RF55);
  - 403 (N1) e 500 (N2).
- **Painel · mobile:** Visão geral, Conteúdos, Editor, Login, Comunicados.

### Fase 2
- **Entrar:**
  - Login (com erro e bloqueio no padrão do E23), acesso bloqueado;
  - primeiro acesso e filiação inativa;
  - recuperar senha com a mensagem genérica (E03);
  - nova senha e link vencido (N7);
  - sistema indisponível (N11).
- **Cabeçalho conectado:** sino, menu da conta, atalho Agendar e menu mobile conectado.
- **Área do associado:**
  - Início;
  - Agendamentos (lista, cancelar);
  - Novo agendamento 1-2-3 (limite, suspensão, horário tomado N10);
  - Remarcar;
  - Notificações;
  - Meus dados (e-mail pendente N8, excluir acesso N9).
- **Painel · agendamentos:**
  - Agenda do dia (ATD, todos os serviços, outro responsável, ADM, pendente);
  - detalhe, cancelar, remarcar, balcão e exceção;
  - Serviços e horários (ATD, ADM), editar, novo, bloquear;
  - Relatórios (ADM, ATD) e exportar;
  - mobile: agenda, relatórios, serviços.
- **E-mails do associado** (N12, N15).

**Estados não desenhados** seguem o padrão do E23:
- Alerta 2.0 nos formulários;
- vazio com ícone, frase e ação;
- Skeleton ao carregar;
- AlertDialog nas confirmações;
- Sonner nos avisos rápidos (6 s; erros ficam até fechar).

---

## 6. Tarefas automáticas (pg-boss)

Todas as tarefas são idempotentes, com nova tentativa e registro de falha (RNF13). Horários em America/Bahia.

| # | Tarefa | Quando | O que faz | Fase |
|---|---|---|---|---|
| T01 | Publicar agendados | No horário (job por item) | Notícia ou documento agendado → publicado; gera versão, Atividade e, se for documento, aviso aos associados (Fase 2). Falha → e-mail para quem agendou (E21). | 1 |
| T02 | Comunicados | No início e no fim do período | Entra e sai do ar; Atividade. | 1 |
| T03 | Episódios agendados | No horário | Publica. | 1 |
| T04 | Destaques da Home | Em `entra_em` e `sai_em` | Entra e sai do carrossel. | 1 |
| T05 | Notícia fixada | Em `fixada_ate` | Desafixa. | 1 |
| T06 | Parceiros | Diário 00h05 + no horário | Agendado → publicado; vencido → arquivado. | 1 |
| T07 | Tarefas da Visão geral | Diário 07h00 | Notificações: vigência em 2 dias, rascunhos parados há mais de 7 dias, imagens sem texto alternativo, parceiro vencendo (P5). | 1 |
| T08 | Conversão de mídia | No envio | HEIC → JPG ou WebP; redução de tamanho; extrai o texto do PDF (P3). | 1 |
| T09 | Backup | Diário 03h00 | Dump criptografado → servidor do sindicato; rotação 7/4/12 (E27). | 1 |
| T10 | Limpeza | Diário 04h00 | Logs com mais de 6 meses, notificações com mais de 90 dias, tokens vencidos (E25). | 1 |
| T11 | Lembretes | 1 dia antes e 2 h antes | E-mail e notificação (RN29). | 2 |
| T12 | Pendente de registro | Diário 23h59 | Confirmado sem presença → pendente; avisa os responsáveis e manda um resumo ao ADM (E16). | 2 |
| T13 | Suspensão | Na 2ª falta do mês; fim diário 00h05 | Cria e encerra a suspensão (RN31). | 2 |
| T14 | Verificação da filiação | Diário 02h00 + no login | Atualiza a cópia local; se não ativo, cancela os agendamentos futuros e avisa. Falha da API não cancela nada (RN32, E22). | 2 |
| T15 | Avisos do sindicato | Ao publicar edital, acordo, comunicado ou parceiro | Cria o aviso (E20). | 2 |
| T16 | Contas inativas | Diário | 2 anos sem login → e-mail; 30 dias depois → exclusão do acesso (E25). | 2 |
| T17 | Agregar visualizações | Contínuo (upsert) | Contador diário (E30). | 1 |

---

## 7. E-mails

Todos os e-mails são enviados por SMTP (D2), com modelos em React Email e remetente `nao-responda@`. Nenhum deles é de marketing (RN59).

| # | E-mail | Para | Fase | Desenho |
|---|---|---|---|---|
| M01 | Convite para a equipe (48 h) | Pessoa convidada | 1 | 265:40803 |
| M02 | Redefinir senha (1 h) | Equipe | 1 | 265:40830 |
| M03 | Senha alterada | Equipe | 1 | 265:40852 |
| M04 | Conta bloqueada por tentativas | Pessoa e ADMs | 1 | N6 |
| M05 | Duas etapas redefinidas | Pessoa | 1 | N6 |
| M06 | Publicação agendada falhou | Quem agendou | 1 | N6 |
| M07 | Redefinir senha (1 h) | Associado | 2 | N12 |
| M08 | Senha alterada | Associado | 2 | N12 |
| M09 | Confirmar novo e-mail (24 h) + aviso ao e-mail antigo | Associado | 2 | N12 |
| M10 | Agendamento confirmado (site ou balcão) | Associado | 2 | N12 |
| M11 | Lembrete (1 dia e 2 h) | Associado | 2 | N12 |
| M12 | Agendamento remarcado | Associado | 2 | N12 |
| M13 | Agendamento cancelado (equipe, bloqueio ou filiação), com motivo | Associado | 2 | N12 |
| M14 | Seu acesso será excluído (conta inativa) | Associado | 2 | N15 |

---

## 8. Requisitos não funcionais

Valem os RNF01–RNF15 de `requisitos.md`, com os ajustes de E05, E22, E26 e E28. Os pontos principais:

- **Desempenho:** LCP abaixo de 2,5 s em 4G; páginas públicas renderizadas no servidor e revalidadas ao publicar; player do YouTube só no clique.
- **Acessibilidade:** WCAG 2.1 AA; temas claro e escuro com os tokens do Figma.
- **SEO:**
  - título, descrição e imagem de compartilhamento por página (a capa da notícia é a imagem padrão, P4);
  - mapa do site;
  - **redirecionamentos 301 das URLs antigas** (B2).
- **Infraestrutura (E26–E28):**
  - Cloudflare na frente: DNS, CDN, certificado e WAF;
  - VPS com Docker para a aplicação e o Postgres;
  - Cloudflare R2 para arquivos;
  - homologação e produção via GitHub Actions;
  - backup diário criptografado, com teste trimestral.
- **Qualidade:** testes automáticos das regras de agendamento (lista em `stack.md` §6); testes de permissão por perfil; monitoramento com Sentry.

---

## 9. Riscos e pontos em aberto

| # | Risco / ponto | Impacto | Mitigação | Dono |
|---|---|---|---|---|
| X1 | **API do sindicato** sem documentação ainda (D1). | Toda a Fase 2. | Módulo isolado com versão simulada; contrato definido antes da Fase 2; última consulta de 24 h (E22). | Cliente (Leandro) |
| X2 | **Servidor (VPS)** ainda não definido (D8). | Deploy da Fase 1. | Definir com o Leandro no início; a homologação pode rodar num VPS provisório. | Cliente |
| X3 | **Conteúdo real** e **textos jurídicos** pendentes (D5, D6, D9). | Publicação. | O layout já aceita os textos; checklist 246:19523. | Cliente / advogado |
| X4 | **Lista de URLs antigas** (D7). | SEO na troca de site. | Tabela de redirecionamentos carregada antes da virada. | Cliente |
| X5 | **Entrega de e-mail** (SPF, DKIM, DMARC) (D2). | Convites e senhas da equipe na Fase 1. | Configurar o domínio cedo; testar com mail-tester. | Cliente + dev |
| X6 | **HEIC** depende de libvips com libheif na imagem Docker. | Envio de fotos do iPhone. | Imagem Docker própria, com teste automático de conversão. | Dev |
| X7 | **Corrida em agendamento** com capacidade maior que 1. | Dois associados no mesmo horário. | Lock por (serviço, início) + recontagem na transação; teste de concorrência (RNF05). | Dev |
| X8 | **Volume de avisos** para todos os associados (E20). | Crescimento da tabela. | Aviso gravado uma vez, com leitura por associado (T3). | Dev |
| X9 | **Prazos de guarda** provisórios (E25). | LGPD. | Prazos em parâmetros; validação do advogado (D9). | Advogado |
| X10 | **Correções e telas novas no Figma** (`correcoes-figma.md`, N1–N15). | Fidelidade visual. | Corrigir antes do ticket da tela correspondente. | Design |
| X11 | **Chave do YouTube** (D4). | Duração automática. | Sem a chave, a duração é digitada à mão. | Cliente |

---

## 10. Padrões adotados sem pergunta

Pode vetar qualquer um. Os itens seguem convenções de mercado ou a direção já dada nas decisões.

| # | Padrão | Motivo |
|---|---|---|
| P1 | As categorias de parceiro (Saúde, Educação, Beleza, Serviços) vêm de **Configurações › Categorias**, com o escopo “Benefícios”. | Mesmo modelo do E15; nada fica fixo no código. |
| P2 | Slug gerado a partir do título, único por tipo e editável antes da primeira publicação; depois disso, não muda. Se mudar, cria um redirecionamento 301 automático. | SEO (B2). |
| P3 | O texto pesquisável do documento é extraído do PDF automaticamente no envio e pode ser corrigido no editor. | R20. |
| P4 | A imagem de compartilhamento da notícia é a capa; a descrição é a linha fina. | RNF08, sem campos novos no editor. |
| P5 | Alerta de parceiro vencendo 30 dias antes. | R11 (o Figma mostra “18 dias” como exemplo). |
| P6 | Os contadores “[nº] rodoviários no canal” e similares são manuais, em Configurações › Site. | Não há integração com WhatsApp ou Instagram. |
| P7 | Exportar a Atividade também gera um registro na própria Atividade. | Coerente com a RN38 (R13). |
| P8 | Horário de “fim do dia” = 23h59 America/Bahia. | Texto da tela 244:37671 e ponto pendente da RN30. |
| P9 | Faltas contam pelo mês do calendário; o limite de 1 agendamento ativo vale por pessoa. | Premissas já adotadas na RN25 e na RN31. |
| P10 | Programa ao vivo (canal, dias, horário) editável por ADM e COM, na área Rádio Chofer. | Tela 166:17373. |
| P11 | Cancelar convite pendente: ação “Cancelar convite” no menu da pessoa (ADM), com confirmação no padrão. | Lacuna do Figma, resolvida pelo padrão do E23. |

---

## 11. Notas técnicas para os tickets

- **T1 · Auditoria.** Grave a Atividade na mesma transação da ação. Use uma função `registrarAtividade()` única. Bloqueie UPDATE e DELETE com trigger.
- **T2 · Permissões.** Faça uma camada `pode(pessoa, acao, recurso)` usada pelas *server actions* e pelas rotas, com testes por perfil (§4). O menu usa a mesma função.
- **T3 · Avisos em massa.** `AvisoAssociado` com `para = todos` + `LeituraAviso`. O contador do sino é igual aos avisos dos últimos 90 dias menos os lidos.
- **T4 · Parâmetros.** Guarde os valores das tabelas de parâmetros (`regras-de-negocio.md` §3) numa tabela `Parametro`, lida com cache. Só o ADM altera, e pelo banco; não há tela nesta versão.
- **T5 · API simulada.** Implemente a interface `ApiSindicato` com duas versões, real e falsa. Os dados de exemplo são os do Figma (José Carlos, Marta, dependentes). A homologação usa a falsa até D1.
- **T6 · Ordem sugerida da Fase 1:**
  1. base: projeto, tokens, Docker (dev com Postgres, Mailpit e MinIO, E32 e E34), CI e auditoria; primeiro administrador por comando (E33);
  2. acesso da equipe e permissões;
  3. Mídia;
  4. Conteúdos e editor;
  5. documentos;
  6. comunicados;
  7. site público;
  8. Rádio, Home e Benefícios;
  9. Configurações e Equipe;
  10. tarefas;
  11. SEO e redirecionamentos;
  12. backup e deploy.

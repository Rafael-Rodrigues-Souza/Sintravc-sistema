# Análise do Figma — SINTRAVC 2.0

> **Aprovada em 05/11/2026.**
> - C1, C2, C3 (exceto a pergunta do calendário), C9 e C15 foram resolvidos pelos docs v1.1. Ver `correcoes-figma.md`.
> - C4, C7 e C14 foram ignorados (dados de exemplo).
> - As decisões ficam em `decisoes.md`.

> Etapa 1 do planejamento. Somente leitura do arquivo Figma “Oficial Sintra Site” (`2mlqSKCNy170C8y0CyL5de`), feita em 04/11/2026 e comparada com os documentos desta pasta: `visao-geral.md`, `requisitos.md`, `escopo.md`, `historias-de-usuario.md`, `regras-de-negocio.md`, `criterios-de-aceitacao.md` e `stack.md`.

**Legenda**

- **[FATO]**: visível no Figma ou escrito nos docs. A fonte vem entre parênteses.
- **[INFERÊNCIA]**: dedução minha a partir do que aparece.
- **[NÃO CONFIRMADO]**: não aparece em lugar nenhum, ou aparece de forma ambígua. Precisa de decisão.

**Observações**

- Não existem briefing, ata da reunião nem questionário. Os docs desta pasta foram convertidos dos .docx v1.1 e são a única fonte escrita. **[FATO]**
- A análise usa **2 fases**, como nos docs: Fase 1 = site, acesso do associado e painel da Comunicação e do Administrador geral; Fase 2 = Área do associado, agendamentos e perfil Atendimento. Nada no Figma indica uma fase 3. A única pista é a nota “Diretoria entra numa próxima etapa”, item C15. **[FATO]**
- Cada tela tem versão clara e escura, que é um clone da clara com o modo escuro das variáveis. Este inventário lista só a clara. **[FATO]**
- A página “Todas as telas” é uma cópia de consulta e não foi analisada à parte. **[FATO]**

Perfis usados abaixo:

| Sigla | Perfil |
|---|---|
| VIS | Público (visitante) |
| ASS | Associado |
| COM | Funcionário · Comunicação |
| ATD | Funcionário · Atendimento |
| ADM | Admin · Administrador geral |
| SIS | Sistema (e-mails, tarefas automáticas) |

---

## 1. Inventário de telas

Os IDs são do Figma (`node-id`). “D” é desktop e “M” é mobile. A fase segue `visao-geral.md` §9 **[FATO]**, salvo indicação.

### 1.1 Site público (Fase 1, acesso VIS e ASS)

| Tela | ID (D / M) | Para que serve | Tag |
|---|---|---|---|
| Home | 32:550 / 35:722 | Carrossel “Em destaque” (3 itens), faixa de comunicado, Rádio Chofer (programa ao vivo e último episódio), Acesso rápido, Últimas notícias com filtro por categoria, redes sociais e canal do WhatsApp. | [FATO] |
| Home · associado conectado | 245:43617 / — | Cabeçalho com “Olá, José”, sino com contador e card extra “Agendar atendimento”. | [FATO] |
| Notícias (lista) | 80:629 / 81:995 | Destaque, “Mais lidas da semana”, busca, filtro por categoria com contadores, ordenação e lista paginada. | [FATO] |
| Notícia aberta | 100:15159 / 100:15345 | Matéria com categoria, autor, data publicada e atualizada, tempo de leitura, compartilhar, capa com legenda e crédito, citação, “O que você precisa saber” e “Leia também”. | [FATO] |
| Sindicato · Instituição | 56:519 / 57:813 | Quem somos, números, propósito, valores e linha do tempo. | [FATO] |
| Sindicato · Diretoria | 58:996 / 58:1368 | Gestão, presidente com foto e mensagem, 16 membros filtráveis (Executiva, Conselho fiscal, Suplentes). | [FATO] |
| Sindicato · Benefícios | 59:1455 / 59:2002 | Carteirinha ilustrativa, serviços do sindicato (jurídico, salões, exames indisponíveis, Passe Livre) e parceiros com desconto. | [FATO] |
| Documentos · Editais | 73:629 / 74:1085 | Contadores, destaque com “Faltam N dias”, busca, filtro por tipo, agrupamento por mês e PDF. | [FATO] |
| Documentos · Acordos coletivos | 75:1438 / 76:1801 | Acordo vigente, explicação ACT × CCT, lista por ano com selos Vigente e Encerrado. | [FATO] |
| Rádio Chofer | 157:8305 / 157:8607 | Programa (seg. a sex., 13h), player do YouTube, busca, filtro por tema e grade de episódios. | [FATO] |
| Contato | 87:629 / 89:964 | Telefone, WhatsApp, e-mail, endereço, horário, mapa e redes. | [FATO] |
| Menu mobile · visitante / conectado | 159:8305 · 159:8374 | Navegação mobile. A versão conectada mostra o associado, “Abrir minha área” e “Sair”. | [FATO] |
| Menu da conta (desktop) | 159:8456 | Área do associado, “Agendar atendimento” com selo “Fase 2”, notificações e Sair. | [FATO] |
| Erro 404 | 159:8590 / 159:8788 | Página não encontrada, com atalhos. | [FATO] |
| Política de privacidade | 159:8912 / 159:9121 | Texto-base, a ser validado pelo jurídico. | [FATO] |
| Aviso de cookies (primeira visita) | 159:9245 / 159:9442 | Consentimento de cookies. | [FATO] |
| Pendências de conteúdo | 246:19523 | Checklist interno do conteúdo real que falta. Não é tela do sistema. | [FATO] |
| Termos de uso | — | Aparece como link no rodapé e no primeiro acesso, mas **não tem tela**. | [FATO] link · [NÃO CONFIRMADO] tela |

### 1.2 Entrar (associado) (Fase 1, acesso VIS e ASS)

| Tela | ID (D / M) | Para que serve | Tag |
|---|---|---|---|
| Login | 64:63 / 64:181 | CPF e senha, “Lembrar de mim”, “Esqueci minha senha”, “Ativar meu acesso”, Filiar-se pelo WhatsApp e aviso “Em breve: agendamento”. | [FATO] |
| Login · acesso bloqueado | 155:8983 / 155:9078 | Alerta de filiação Pausada, com WhatsApp. | [FATO] |
| Primeiro acesso | 65:147 / 65:398 | Passo 1: CPF e matrícula, depois “Filiação confirmada”. Passo 2: e-mail com confirmação, senha com confirmação e aceite dos termos (LGPD). | [FATO] |
| Primeiro acesso · filiação inativa | 155:9154 / 155:9274 | Bloqueio com WhatsApp. | [FATO] |
| Recuperar senha | 155:9386 / 155:9482 | CPF e envio do link. Mostra o e-mail mascarado e diz que o link vale 30 minutos. | [FATO] |
| Nova senha do associado (link do e-mail) | — | **Não desenhada.** | [NÃO CONFIRMADO] |

### 1.3 Área do associado (Fase 2, acesso ASS)

| Tela | ID (D / M) | Para que serve | Tag |
|---|---|---|---|
| Início | 184:13092 / 187:14653 | Próximo agendamento com Remarcar e Cancelar, lembretes, atalhos de serviços, notícias e “Sua filiação”. | [FATO] |
| Agendamentos | 184:13470 / 187:14776 | Próximos e histórico (Concluído, Cancelado, Faltou) e “Como funciona”. | [FATO] |
| Cancelar (modal) | 184:13784 | Confirmação de cancelamento. | [FATO] |
| Novo agendamento · 1 Serviço | 185:13706 | “Para quem” (associado ou dependentes), serviços com duração, horário e uso do mês, e o bloqueio “Você já tem um horário”. | [FATO] |
| 1 Serviço · limite do mês atingido | 207:36901 | Estado de bloqueio. | [FATO] |
| 1 Serviço · suspenso por faltas | 245:42232 | “Novos agendamentos suspensos até 12/11.” | [FATO] |
| Novo agendamento · 2 Dia e horário | 185:14003 / 187:14898 | Dias com horários livres, feriado, horários (Livre, Escolhido, Ocupado) e resumo com prazo para cancelar. | [FATO] |
| Novo agendamento · 3 Confirmado | 185:14332 | Confirmação, lembretes e “Adicionar à agenda do celular”. | [FATO] |
| Remarcar · nova data | 245:41512 / 245:41765 | Mesmo seletor, com “Antes / Nova data”. | [FATO] |
| Remarcar · remarcado | 245:41953 | Confirmação. | [FATO] |
| Notificações | 186:14259 / 187:15007 | Lista com filtros (Todas, Avisos do sindicato, Documentos), marcar como lidas e retenção de 90 dias. | [FATO] |
| Meus dados | 186:14629 | Dados da filiação (somente leitura), e-mail e celular editáveis, Alterar senha, Baixar meus dados e Excluir meu acesso. | [FATO] |
| Alterar senha / Excluir acesso (confirmação) / Baixar dados (resultado) | — | Botões existem, mas as telas **não estão desenhadas**. | [NÃO CONFIRMADO] |
| Meus dados, Agendamentos (cancelar, remarcado), 1 e 3 no mobile | — | Só existem no desktop. | [INFERÊNCIA]: seguem o padrão mobile das outras telas |

### 1.4 Painel · acesso da equipe (Fase 1, fora do menu, acesso ADM, COM e ATD)

| Tela | ID (D / M) | Para que serve | Tag |
|---|---|---|---|
| Login da equipe | 169:18816 / 169:18946 | E-mail, senha e “Esqueci minha senha”. | [FATO] |
| Verificação em duas etapas | 169:18895 | Código do aplicativo autenticador e “Usar um código de recuperação”. | [FATO] |
| Usar código de recuperação | 262:40966 | Entrada com um código de uso único. | [FATO] |
| Esqueci minha senha / Link enviado | 262:40675 / 265:40937 · 262:40761 | Pedido do link e confirmação com a mesma resposta exista ou não o e-mail. | [FATO] |
| Redefinir senha · nova senha | 262:40849 | Nova senha (o link vale 1 h). | [FATO] |
| Primeiro acesso · criar senha | 262:40091 / 265:40873 | Convite: senha com mínimo de 10 caracteres. | [FATO] |
| Primeiro acesso · ativar duas etapas | 262:40216 | QR code, chave manual e primeiro código. | [FATO] |
| Primeiro acesso · códigos de recuperação | 262:40453 | 8 códigos, Baixar e Copiar, e “Guardei os códigos”. | [FATO] |
| Convite expirado ou já usado | 262:40589 | Link inválido. | [FATO] |
| E-mails: convite / redefinir senha / senha alterada | 265:40803 · 265:40830 · 265:40852 | Modelos de e-mail. | [FATO] |
| Conta bloqueada após 5 tentativas | — | A regra está nos Fluxos, mas a tela ou mensagem **não está desenhada**. | [FATO] regra · [NÃO CONFIRMADO] tela |

### 1.5 Painel · conteúdo e site (Fase 1, acesso ADM e COM)

| Tela | ID | Para que serve | Tag |
|---|---|---|---|
| Visão geral | 109:673 (M 119:3528) | Saudação, comunicado no ar, contadores por estado, “Precisa de atenção” e editados recentemente. | [FATO] |
| Visão geral · notificações (painel lateral) | 113:2228 | Notificações da equipe. | [FATO] |
| Conteúdos (lista) | 110:845 (M 120:3650) | Notícias, editais e acordos: abas por tipo, busca, filtros, seleção em lote (Ocultar, Arquivar) e paginação. | [FATO] |
| Conteúdos · perfil Comunicação / menu Criar | 214:33364 · 214:33805 | Mesma lista vista pela Comunicação. O menu Criar não oferece edital nem acordo. | [FATO] (`memória do projeto`) · [INFERÊNCIA]: o conteúdo do menu não foi lido |
| Conteúdos · edição rápida (painel lateral) | 115:2324 | Título, categoria, situação (publicar agora, agendar, oculto), data, “Fixar no topo de Notícias”, últimas ações e Arquivar. | [FATO] |
| Conteúdos · calendário | 115:2992 | Mês com publicados, agendados e fim de vigência; arrastar para reagendar; rascunhos sem data. | [FATO] |
| Editor · notícia | 112:1091 (M 120:3836) | Manchete (110), linha fina (200), lide, corpo rico, capa com texto alternativo e legenda, fontes, links e anexos, palavras-chave, assinatura, local, categoria, quando publicar e “Destacar na página inicial”. | [FATO] |
| Editor · confirmar publicação (modal) | 113:1314 | Resumo: entra no ar, onde aparece, visibilidade e checagem. | [FATO] |
| Editor · pré-visualização | 122:5800 | Prévia como no site. | [FATO] |
| Editor · documento oficial | 114:1972 (ADM) | Título oficial, número, tipo de edital, data do documento, data do evento ou prazo, vigência (início e fim), resumo (400), PDF oficial e “texto pesquisável”. | [FATO] |
| Editor · acordo ou convenção | — | Só existe a variante edital. RF41 cita “abrangência e partes signatárias”, que não aparecem. | [NÃO CONFIRMADO] |
| Comunicados | 165:16358 (M 170:18854) | Prévia no ar, contadores, tabela (mensagem, período, estado) e regras. | [FATO] |
| Comunicados · novo (modal / folha inferior) | 165:16711 / 170:18978 | Mensagem (140), link “Saiba mais”, início e fim, prévia, rascunho e agendar. | [FATO] |
| Rádio Chofer | 166:17373 | Programa ao vivo (canal, dias e horário) e lista de episódios com estado. | [FATO] |
| Rádio Chofer · adicionar episódio (modal) | 166:17629 | Link do YouTube com busca automática, número, título, resumo, tema, exibição e “Último programa”. | [FATO] |
| Página inicial (destaques) | 166:16879 | Carrossel (até 5, com entrada e saída agendadas), 3 destaques (automático ou escolhido), “Último programa” automático, prévia e “Publicar alterações”. | [FATO] |
| Benefícios (parceiros) | 167:17772 (ADM) | Tabela com categoria, desconto, validade e estado, e alerta de vencimento. | [FATO] |
| Benefícios · novo parceiro (painel lateral) | 167:18087 | Logo, nome, categoria, desconto, como usar, quem pode usar, válido até e endereço ou site. | [FATO] |
| Mídia | 116:2727 | Biblioteca com filtros, envio com progresso, erro de formato, detalhes, texto alternativo, legenda, “Usado em” e copiar link. | [FATO] |
| Busca global (Ctrl K) | — | Está em RF33, mas **não está desenhada**. | [FATO] doc · [NÃO CONFIRMADO] tela |

### 1.6 Painel · administração (Fase 1, acesso ADM)

| Tela | ID | Para que serve | Tag |
|---|---|---|---|
| Atividade | 116:3074 | Linha do tempo imutável com filtros por área, pessoa e período, e “Exportar planilha”. | [FATO] |
| Atividade · detalhe do registro | — | Está no Mapa (“Detalhes do registro”), mas **sem frame**. | [NÃO CONFIRMADO] |
| Equipe e perfis | 168:18397 | Pessoas (perfil, duas etapas, último acesso, serviços, Pendente), “Quem cuida de cada serviço” e “Comunicação × Administrador geral”. | [FATO] |
| Convidar pessoa / Editar acesso (modais) | 168:18823 · 202:31493 | Nome, e-mail, perfil e serviços sob responsabilidade. | [FATO] |
| Ações da pessoa (menu) / Redefinir duas etapas (modal) | 264:40915 · 264:41460 | Editar, nova senha, redefinir duas etapas e desativar. | [FATO] |
| Desativar acesso (confirmação) | — | **Não desenhada.** | [NÃO CONFIRMADO] |
| Configurações · Site | 167:18333 | Contato, horários, redes, missão e história. | [FATO] |
| Configurações · Categorias / nova categoria | 117:3030 · 117:3453 | Categorias com “Aparece em” e contagem, ordem por arrastar e cor da etiqueta. | [FATO] |
| Configurações · Regras de segurança | — | A aba existe, mas não tem frame próprio. Aparece só um cartão-resumo na tela Categorias. | [FATO] aba · [NÃO CONFIRMADO] conteúdo |

### 1.7 Painel · agendamentos (Fase 2, acesso ATD e ADM)

| Tela | ID | Para que serve | Tag |
|---|---|---|---|
| Agenda do dia (ATD: Meus serviços) | 190:25249 (M 191:26309) | Linha do tempo por serviço, contadores e filtro salvo por pessoa. | [FATO] |
| Agenda · todos os serviços / outro responsável / visão ADM | 205:32599 · 205:32887 · 244:37142 | Variações de filtro e de perfil. | [FATO] |
| Agenda · presença pendente | 244:37671 | Alerta de fim de expediente e estado Pendente. | [FATO] |
| Detalhe do agendamento (painel lateral) | 190:25620 | Associado, filiação consultada agora, contato, presença (Atendido ou Faltou), histórico, Cancelar e Remarcar. | [FATO] |
| Cancelar / remarcar (modais) | 190:25889 · 244:36706 | Motivo obrigatório, mensagem ao associado e aviso. | [FATO] |
| Agendar para associado (balcão) / exceção ao limite | 193:29683 · 243:36540 | Busca por CPF ou matrícula, “Para quem”, serviço, dia, horários livres e exceção com motivo. | [FATO] |
| Serviços e horários (ATD / ADM) | 191:25671 (M 245:37404) · 200:30880 | Seus serviços, “Somente consulta”, bloqueios, feriados e regras. | [FATO] |
| Editar serviço / Novo serviço (painéis laterais) | 191:26080 · 193:29116 | Campos travados para o ATD; criação completa só pelo ADM. | [FATO] |
| Bloquear horário (modal) | 193:29465 | Serviço, período, motivo e quantos agendamentos serão cancelados. | [FATO] |
| Relatórios (ADM / ATD) | 216:34990 · 218:35163 (M 245:37279) | Período, serviço, KPIs, barras por dia, tabela por serviço e lista. | [FATO] |
| Exportar relatório (modal) | 218:35770 | PDF ou Excel, seções incluídas e aviso de LGPD. | [FATO] |

### 1.8 Referência (não são telas do sistema)

Estados, confirmações e mensagens 118:3448 · Mapa do painel 172:19070 · Fluxos e regras 174:19090 · Componentes do site 31:530 e do painel 107:629. **[FATO]**

---

## 2. Entidades e campos

Os campos vêm dos rótulos e dados de exemplo das telas. Onde a tela não diz se o campo é obrigatório, não marquei; o asterisco (*) é o do próprio Figma. **[FATO]**, salvo marcação.

### 2.1 Pessoas e acesso

**Associado** (vem da API do sindicato e é somente leitura no site) **[FATO]** (`Meus dados` 186:14629, RN39)
- Campos: nome, CPF (mascarado na tela), matrícula, empresa, função, situação (Ativo, Inativo, Pausado ou Desfiliado) e “associado desde”.
- Guardado no sistema: e-mail, celular (opcional), senha, aceite de termos e LGPD com data, e preferência “Lembrar de mim”. **[FATO]** (Primeiro acesso, Meus dados, Login)
- Cópia local dos dados da API (cache, com data da última consulta). **[INFERÊNCIA]**, necessária para a agenda e os relatórios.

**Dependente** (vem da API) **[FATO]** (185:13706, RN34)
- Campos: nome, parentesco (esposa, filho) e vínculo com o associado.
- Identificador próprio na API. **[NÃO CONFIRMADO]**

**Pessoa da equipe** **[FATO]** (168:18397, 168:18823)
- Campos: nome, e-mail de trabalho, perfil (ADM, COM ou ATD), situação (Ativa, Pendente, Desativada), duas etapas ativa, último acesso e serviços sob responsabilidade (para ATD).
- Para o login: senha (com histórico das 3 últimas), segredo TOTP, 8 códigos de recuperação (hash e usado em), tentativas erradas e bloqueado até. **[FATO]** (RN05, RN47, RN49)
- O selo “Desativada” não aparece nas telas. **[INFERÊNCIA]**

**Convite** **[FATO]** (RN46, 168:18823)
- Campos: pessoa, token, criado por, criado em, expira em (48 h) e usado em. Reenviar invalida o anterior.

**Token de redefinição de senha**
- Equipe: 1 h, uso único. **[FATO]** (RN48)
- Associado: 30 min, segundo a tela 155:9386. **[FATO]** (Figma) · [NÃO CONFIRMADO] nos docs

**Sessão**: pessoa ou associado, dispositivo, criada em e expira em. Ao trocar a senha, as outras sessões são encerradas. **[FATO]** (RN48) · a duração da sessão é **[NÃO CONFIRMADO]**

### 2.2 Conteúdo

**Notícia** **[FATO]** (112:1091, 100:15159)
- Texto: manchete* (até 110), linha fina (até 200), lide e corpo em texto rico (parágrafo, negrito, itálico, sublinhado, H2, lista, citação).
- Imagem: capa (1200×675) com texto alternativo* e legenda e crédito.
- Fontes, links e anexos: título, domínio, tipo (Fonte ou Anexo) e “visível no site”.
- Publicação: palavras-chave, assinatura, local, categoria e autor.
- Estado, data de publicação e de atualização, e versão (“versão 3”).
- Destaque: “destacar na página inicial”, “fixar no topo de Notícias até <data>”.
- Calculado: tempo de leitura e contagem de palavras.
- Contagem de visualizações. **[INFERÊNCIA]**, exigida por “Mais lidas da semana”.

**Documento oficial (edital)** **[FATO]** (114:1972, 73:629)
- Identificação: título oficial*, número* e tipo de edital* (Convocação, Eleição, Prestação de contas, Outros).
- Datas: data do documento*, data do evento ou prazo, e vigência (início e fim).
- Conteúdo: resumo (até 400), PDF oficial (nome, tamanho, páginas) e texto pesquisável.
- Estado e confirmação “versão oficial e assinada”.

**Acordo ou convenção** **[FATO]** (75:1438, RF41)
- Campos: tipo (ACT ou CCT), ano, empresa ou abrangência, vigência (início e fim), PDF e selo Vigente ou Encerrado.
- Partes signatárias: estão em RF41, mas **não na tela**. **[NÃO CONFIRMADO]**

**Comunicado** **[FATO]** (165:16711)
- Campos: mensagem* (até 140), link “Saiba mais” (para uma notícia ou documento, opcional), começa em* e termina em*.
- Também: posição na fila e estado (Rascunho, Agendado, Publicado, Encerrado).

**Episódio do Rádio Chofer** **[FATO]** (166:17629)
- Campos: link do YouTube*, número*, título no site*, resumo (2 linhas), tema, exibição* (data e hora) e “último programa”.
- Vêm do YouTube: capa, duração e canal.
- Também: estado.

**Programa ao vivo (configuração)**: canal do YouTube e dias e horário (seg. a sex., 13h). **[FATO]** (166:17373)

**Destaque da página inicial** **[FATO]** (166:16879)
- Carrossel (até 5): item (notícia ou Rádio Chofer), ordem, entra em e sai em.
- Lista “Em destaque” (3 posições): automático ou escolhido, e escolhido por.
- “Publicar alterações”: as alterações ficam pendentes até publicar. Por isso há uma versão de rascunho da Home. **[INFERÊNCIA]**

**Parceiro (benefício)** **[FATO]** (167:18087)
- Campos: logo* (PNG ou SVG até 2 MB), nome*, categoria*, desconto* (0–100 %), como usar, quem pode usar* (associado ou associado e dependentes), válido até (vazio = sem prazo) e endereço ou site.
- Também: estado (Rascunho, Agendado, Publicado). Para o Agendado, ver o item C10.

**Serviço do sindicato em Benefícios** (Jurídico, Salões, Exames, Passe Livre): é texto fixo da página ou vem do cadastro de Serviço de agendamento? **[NÃO CONFIRMADO]**

**Categoria** **[FATO]** (117:3453)
- Campos: nome*, onde aparece* (Notícias e/ou Documentos), cor da etiqueta, ordem e contagem de conteúdos.

**Arquivo de mídia** **[FATO]** (116:2727)
- Arquivo: nome, tipo (imagem, PDF ou documento), dimensões, tamanho e páginas.
- Descrição: texto alternativo* e legenda e crédito.
- Origem e uso: enviado por, enviado em e “usado em” (lista de conteúdos).

**Configurações do site** **[FATO]** (167:18333)
- Contato: endereço, cidade, CEP, telefone, WhatsApp da recepção*, e-mail oficial e horário por faixa (seg–sex, sábado, domingo e feriados).
- Redes: Instagram, Facebook, YouTube e canal do WhatsApp.
- Textos: missão e história (texto rico).
- Contadores da Home e do Instagram, como “[nº] rodoviários já recebem os avisos”: manual ou automático? **[NÃO CONFIRMADO]**

**Regras de segurança** (interruptores): confirmar documentos oficiais, verificação em duas etapas e justificativa ao ocultar. **[FATO]** (117:3030). Ver o item C9.

**Diretoria** (membro: nome, cargo, grupo, foto 3:4, mensagem do presidente; gestão: período e data da eleição) **[FATO]** (58:996)
- Fora do painel nesta versão. **[FATO]** (`escopo.md`, 167:18333)

**Instituição**: números, valores e linha do tempo com anos. **[FATO]** (56:519)
- Só missão e história são editáveis em Configurações. O resto é fixo no código? **[INFERÊNCIA]**

### 2.3 Agendamentos

**Serviço** **[FATO]** (193:29116, 191:26080)
- Descrição: nome*, descrição para o associado e ícone*.
- Regras: responsáveis*, duração*, atendimentos ao mesmo tempo (capacidade), limite por associado* (sem limite ou N por mês) e local.
- Agenda: dias e horários (faixas por dia da semana, com intervalo).
- “Aberto no site” e “indisponível” (Exames).

**Bloqueio** **[FATO]** (193:29465)
- Campos: serviço (um ou todos os seus), de*, até*, período* (dia inteiro ou faixa) e motivo* (visível ao associado).

**Feriado**: aparece na lista de bloqueios (Finados, Proclamação). É um bloqueio comum ou um cadastro de feriados à parte? **[NÃO CONFIRMADO]**

**Agendamento** **[FATO]** (190:25620, 185:14003)
- Para quem: associado e pessoa atendida (o associado ou um dependente).
- Quando e onde: serviço, data e hora, duração e local.
- Estado: Confirmado, Concluído, Faltou, Cancelado ou Pendente de registro.
- Origem: site ou balcão, “marcado em”, marcado por.
- Cancelamento: motivo, mensagem ao associado, cancelado por (associado, equipe, bloqueio ou sistema) e cancelado em.
- Remarcação: data anterior (“Antes”), por quem e motivo.
- Exceção ao limite: sim ou não, com motivo.
- Presença: registrada por e quando.

**Suspensão por faltas**: pessoa, início, fim (15 dias) e faltas que a geraram. **[FATO]** (245:42232, RN31)
- A suspensão vale por pessoa (associado e cada dependente) ou para a família toda? A tela fala em “você”. **[NÃO CONFIRMADO]**

**Exportação de relatório**
- Campos: período, serviço, formato (PDF ou Excel), seções incluídas, gerado por e em. **[FATO]** (218:35770)
- O arquivo fica guardado? **[NÃO CONFIRMADO]**

### 2.4 Transversais

**Registro de Atividade** (auditoria): data e hora, pessoa ou “Sistema”, ação, área, objeto, detalhe e motivo. Somente inserção. **[FATO]** (116:3074, RN18)

**Notificação do associado**
- Campos: tipo (agendamento, aviso do sindicato, documento, benefício), título, texto, link, lida e criada em.
- Retenção de 90 dias. **[FATO]** (186:14259) · a retenção não está nos docs

**Notificação da equipe**: tipo, texto, lida e criada em. **[FATO]** (113:2228)

**Tarefa “Precisa de atenção”**: é calculada na hora (consulta), não fica guardada. **[INFERÊNCIA]** (RN44)

---

## 3. Fluxos

| # | Fluxo | Passos (resumo) | Tag |
|---|---|---|---|
| F01 | Login do associado | CPF + senha → API confere a situação → Ativo entra; Inativo, Pausado ou Desfiliado fica bloqueado com WhatsApp. | [FATO] (174:19090) |
| F02 | Primeiro acesso | CPF + matrícula → API → “Filiação confirmada” → e-mail (2×), senha (2×) e aceite → acesso criado. Não encontrado ou não ativo: bloqueio. | [FATO] |
| F03 | Recuperar senha do associado | CPF → link para o e-mail mascarado (30 min) → **tela de nova senha não desenhada** → login. | [FATO] até o envio · [NÃO CONFIRMADO] depois |
| F04 | Filiar-se | Botão → WhatsApp da recepção com mensagem pronta. | [FATO] |
| F05 | Convite da equipe | ADM convida (nome, e-mail, perfil, serviços) → e-mail (48 h) → cria a senha → ativa as duas etapas (QR) → guarda os 8 códigos → entra. Link vencido: tela inválida e o ADM reenvia. | [FATO] |
| F06 | Login da equipe | E-mail + senha → código TOTP ou código de recuperação → menu filtrado. 5 erros: bloqueio de 15 min e aviso ao ADM. | [FATO] |
| F07 | Recuperar senha da equipe | E-mail → resposta igual sempre → link (1 h) → nova senha → encerra sessões e envia e-mail “senha alterada” → login com duas etapas. | [FATO] |
| F08 | Perdeu o celular (equipe) | Código de recuperação; sem códigos, o ADM confirma a identidade e redefine as duas etapas com motivo → novo QR no próximo acesso. | [FATO] |
| F09 | Publicar notícia | Criar → editor (rascunho salvo sozinho) → pré-visualizar → “Publicar…” → modal de confirmação (agora ou agendado) → Atividade. Bloqueia se faltar campo obrigatório (ex.: texto alternativo). | [FATO] |
| F10 | Publicar documento oficial (ADM) | Editor de documento → PDF → confirmar “versão oficial e assinada” → publicado → no fim da vigência muda sozinho de estado e avisa. | [FATO] · o nome do estado está em C2 |
| F11 | Ocultar, arquivar e restaurar conteúdo | Ocultar pede motivo; arquivar aceita lote e desfazer; restaurar volta como rascunho. | [FATO] (118:3448) |
| F12 | Comunicado | Criar (140 caracteres, período) → rascunho ou agendado → entra sozinho → alterna na fila → sai sozinho, ou “Encerrar agora” com confirmação → pode ser duplicado. | [FATO] |
| F13 | Episódio do Rádio Chofer | Colar link → dados do YouTube → ajustar → rascunho ou agendar → “Último programa” substitui o anterior na Home. | [FATO] |
| F14 | Página inicial | Editar carrossel e destaques → salvo sozinho → prévia → “Publicar alterações”. | [FATO] |
| F15 | Envio de imagem | Upload com progresso → HEIC convertido → texto alternativo obrigatório para publicar. | [FATO] (fluxo) · a tela de Mídia contradiz, ver C1 |
| F16 | Novo agendamento (associado) | Para quem → serviço (bloqueia com 1 ativo, limite ou suspensão) → dia e horário (30 dias) → API confere → confirmado + notificação + e-mail → lembretes de 1 dia e 2 h. | [FATO] |
| F17 | Cancelar ou remarcar (associado) | Até 2 h antes; remarcar libera o horário antigo e não conta uso. | [FATO] |
| F18 | Balcão | Busca por CPF ou matrícula → para quem → serviço, dia e horário → limite atingido permite exceção com motivo → confirmado e aviso. | [FATO] |
| F19 | Presença e pendência | Atendido ou Faltou no detalhe → fim do expediente: alerta → 23h59: “Pendente de registro” + aviso → fora do relatório. | [FATO] (244:37671) |
| F20 | Suspensão | 2 faltas no mês → 15 dias sem novos agendamentos pelo site; os horários já marcados continuam. | [FATO] |
| F21 | Filiação deixa de ser ativa | Verificação diária e a cada login → cancela os agendamentos futuros → e-mail e registro em Atividade. | [FATO] |
| F22 | Bloquear horário | Período e motivo → mostra quantos serão cancelados → cancela e avisa. | [FATO] |
| F23 | Relatório e exportação | Período e serviço → KPIs → exportar PDF ou Excel → aviso de LGPD → registro em Atividade. | [FATO] |
| F24 | Associado altera e-mail ou senha, baixa os dados ou exclui o acesso | Os botões existem; os passos não estão desenhados. Trocar o e-mail pede confirmação? Excluir o acesso apaga o quê? | [NÃO CONFIRMADO] |
| F25 | Desativar pessoa da equipe | “Sai do painel na hora. Histórico mantido.” A confirmação e a regra dos 2 ADMs estão em RN50; a tela não existe. | [FATO] (264:40915) · tela [NÃO CONFIRMADO] |
| F26 | Reagendar arrastando no calendário | Arrastar um item ou rascunho para outro dia. Pede confirmação? | [FATO] (115:2992) · confirmação [NÃO CONFIRMADO] |

---

## 4. Estados de interface

### 4.1 O que já existe

| Estado | Onde | Tag |
|---|---|---|
| Vazio (busca sem resultado) | “Nenhum conteúdo encontrado”, com Limpar filtros e Criar (118:3448). | [FATO] |
| Carregando | Rótulo “Carregando” na folha de estados (118:3448). O formato visual (skeleton ou spinner) não está definido. | [FATO] · formato [NÃO CONFIRMADO] |
| Erro de ação | Toast “Não foi possível publicar”, com Tentar de novo (118:3448). | [FATO] |
| Sem internet | “Você está sem internet. Suas alterações ficam guardadas…” (118:3448). | [FATO] |
| Sucesso e desfazer | Toasts de 6 s com “Desfazer” (arquivar). | [FATO] |
| Confirmações | Publicar documento, ocultar (motivo), encerrar comunicado, sair sem salvar, arquivar em lote, excluir mídia, cancelar, remarcar, bloquear, exceção e redefinir duas etapas. | [FATO] |
| Validação de formulário | “Falta 1 item obrigatório para publicar” (editor); Campo com estados Padrão, Foco e Erro; contadores de caracteres. | [FATO] |
| Erro de upload | “Formato não aceito…” com Tentar outro arquivo (116:2727). | [FATO] |
| Progresso de upload | 68 % (116:2727). | [FATO] |
| Bloqueios de regra (associado) | Filiação bloqueada, filiação inativa, já tem horário, limite atingido e suspenso. | [FATO] |
| Pendente de registro | Agenda 244:37671. | [FATO] |
| Somente consulta | Serviços de outro responsável (191:25671). | [FATO] |
| Campos travados | “Definido pelo Administrador geral” (191:26080). | [FATO] |
| Convite inválido | 262:40589. | [FATO] |
| Erro 404 | 159:8590. | [FATO] |
| Programa ao vivo | Home e Rádio Chofer, “De segunda a sexta · 13h”. Os estados “ao vivo agora” e “fora do ar” não estão claros. | [INFERÊNCIA] |

### 4.2 O que falta

| Estado | Por que importa | Tag |
|---|---|---|
| **Sem permissão (403)** | O menu esconde as áreas, mas quem abre uma URL direta (ex.: COM em `/painel/equipe`) precisa de resposta. | [NÃO CONFIRMADO] |
| **API do sindicato fora do ar** | O RNF11 exige uma mensagem clara no login, no primeiro acesso, no balcão e na confirmação de agendamento. Nenhuma tela mostra isso. | [FATO] (doc) · tela [NÃO CONFIRMADO] |
| **Erro 500 e manutenção** | Não há página. | [NÃO CONFIRMADO] |
| **Sessão expirada** | Painel e Área do associado. O que acontece com um rascunho aberto? | [NÃO CONFIRMADO] |
| **Conta da equipe bloqueada (5 tentativas)** | A regra existe; a mensagem não. | [NÃO CONFIRMADO] |
| **Código 2FA ou de recuperação inválido** | Só o caminho feliz está desenhado. | [NÃO CONFIRMADO] |
| **Login do associado: CPF ou senha errados** | Não há estado de erro, nem limite de tentativas para o associado. | [NÃO CONFIRMADO] |
| **Link do associado vencido** | Não há tela. | [NÃO CONFIRMADO] |
| **Listas vazias específicas** | Associado sem agendamentos, sem notificações e sem dependentes; agenda sem atendimentos; Mídia vazia; relatório sem dados; Notícias de uma categoria sem itens; nenhum comunicado no ar; nenhum parceiro. | [NÃO CONFIRMADO] |
| **Horário tomado na hora de confirmar** | Corrida entre dois associados: a tela de erro e o “escolha outro” não existem. | [INFERÊNCIA]: necessário pelo RNF05 |
| **Serviço sem horários livres nos 30 dias** | Não há estado. | [NÃO CONFIRMADO] |
| **Carregando (skeleton)** | Listas, agenda e relatórios. | [NÃO CONFIRMADO] |
| **Confirmações faltantes** | Desativar acesso; excluir o próprio acesso (associado); cancelar convite pendente; remover parceiro; remover episódio; excluir categoria em uso. | [NÃO CONFIRMADO] |
| **Mobile** | No painel só existem 9 telas mobile mais 2 de acesso. Equipe, Atividade, Configurações, Mídia, Benefícios e Página inicial não têm mobile. | [FATO] lacuna · uso no celular [NÃO CONFIRMADO] |

---

## 5. Componentes repetidos → shadcn/ui

Os componentes do Figma estão em “Componentes 2.0” (31:530) e “Componentes — Painel 2.0” (107:629). A coluna shadcn é **[INFERÊNCIA]**: é a sugestão de encaixe, e a stack (`stack.md`) já define shadcn/ui com base Radix.

| Componente no Figma | Variantes ou propriedades | shadcn/ui | Observação |
|---|---|---|---|
| Botão 2.0 | Primário, Secundário, Sobre escuro, Marinho, Perigo; ícone opcional | `Button` com variantes do `cva` | Mapear as 5 variantes para `variant`. |
| Botão ícone | — | `Button size="icon"` | |
| Campo 2.0 | Padrão, Foco, Erro; rótulo, ajuda e ícone | `Input` + `Label` + `Form` (`FormField`, `FormMessage`) | Integra com React Hook Form + Zod. |
| Área de texto com contador | 140, 110, 200, 400 | `Textarea` + contador próprio | |
| Checkbox 2.0 | Marcado sim ou não | `Checkbox` | |
| Escolha de perfil / “Para quem” / formato | Cartões com descrição | `RadioGroup` estilizado em cartões | |
| Interruptor (Aberto no site, regras, “Último programa”) | — | `Switch` | |
| Seleção (categoria, serviço, tipo) | — | `Select` (ou `Combobox` = `Popover` + `Command` na busca) | |
| Data e hora (agendar, vigência, período) | — | `Calendar` + `Popover` + campo de hora | A hora não tem componente pronto no shadcn. |
| Etiqueta / Status 2.0 | Publicado, Agendado, Rascunho, Oculto, Arquivado, Encerrado, Confirmado, Concluído, Cancelado, Faltou, Pendente | `Badge` com variantes | Uma fonte única de cores por estado. |
| Chip filtro | Ativo ou inativo, com contador | `ToggleGroup` | |
| Abas (Sindicato, Documentos, Configurações, Agendamentos) | — | `Tabs` | No site, viram links de rota. |
| Alerta 2.0 | Erro, Aviso, Sucesso, Informação; título e mensagem | `Alert` | |
| Faixa de comunicado | Desktop e mobile, “1 de 2” | Componente próprio (`Carousel` opcional) | |
| Mensagens do sistema (toast) | 6 s; erro fixo; ação | `Sonner` | |
| Modal | Confirmações e formulários | `Dialog` e `AlertDialog` (destrutivas) | |
| Painel lateral | Edição rápida, detalhe, parceiro, serviço, notificações | `Sheet side="right"` | |
| Folha inferior (mobile) | Novo comunicado | `Drawer` (vaul) | |
| Menu de ações / menu da conta / Criar conteúdo | — | `DropdownMenu` | |
| Tabela (Conteúdos, Equipe, Comunicados, Benefícios, Relatórios) | Seleção em lote, ordenação | `Table` + TanStack Table (`stack.md`) | |
| Paginação / “Carregar mais” | — | `Pagination` ou `Button` | |
| Navegação do painel | Grupos e itens filtrados por perfil | `Sidebar` | |
| Barra do app e navegação inferior (mobile do painel) | — | Componente próprio | |
| Cabeçalho do site (visitante ou conectado) / menu mobile | — | `NavigationMenu` + `Sheet` (mobile) | |
| Carrossel da Home | 3 itens, “01 / 03” | `Carousel` (Embla) | |
| Avatar de iniciais | MS, CR, JS | `Avatar` + `AvatarFallback` | |
| Etapas (Novo agendamento 1-2-3, Primeiro acesso) | — | Componente próprio | Não existe no shadcn. |
| Horário 2.0 | Livre, Selecionado, Indisponível | `ToggleGroup` personalizado | |
| Seletor de dias (faixa de 7 dias com contagem) | — | Componente próprio | |
| Código das duas etapas | 6 dígitos | `InputOTP` | |
| Barra de progresso de upload | — | `Progress` | |
| Gráfico de barras (Relatórios) | — | `Chart` (Recharts) | |
| Calendário mensal de publicações com arrastar | — | Componente próprio (ex.: dnd-kit) | O `Calendar` do shadcn é só um seletor de data. |
| Editor de texto rico | — | Tiptap (`stack.md`) com barra feita em `Toggle` | |
| Busca global (Ctrl K) | Sem tela | `CommandDialog` | |
| Breadcrumb (“Início › Documentos”) | — | `Breadcrumb` | |
| Cards (notícia lista e grade, documento, acordo, benefício, diretor, atalho, episódio, serviço) | — | `Card` como base, um componente por tipo | |
| Esqueleto de carregamento | Não desenhado | `Skeleton` | |
| Aviso de cookies | Desktop e mobile | Componente próprio (base `Card` fixo) | |
| Tooltip / ajuda | — | `Tooltip` | |

---

## 6. Contradições e divergências

### 6.1 Figma × documentos, ou Figma × Figma

| # | Contradição | Onde | Tag |
|---|---|---|---|
| C1 | **HEIC.** RN15, os Fluxos (174:19090), o painel do parceiro e uma notificação dizem que o HEIC é convertido no servidor. A tela Mídia (116:2727) mostra `foto-assembleia.heic` recusado: “Formato não aceito. Envie em JPG, PNG ou WebP (até 10 MB)”. A notificação 113:2228 tem o título “Falha no envio de imagem” e o texto “foi convertida para JPG automaticamente”. | RN15 × 116:2727 × 113:2228 | [FATO] |
| C2 | **Estado “Encerrado” em documentos.** RN10 diz que “Encerrado vale só para comunicados”. O editor de documento (114:1972) diz que, ao fim da vigência, “o estado muda para Encerrado”, e Documentos › Acordos mostra os selos “Vigente” e “Encerrado”. Pode ser um selo de vigência separado do estado de publicação. | RN10 × 114:1972 × 75:1438 | [FATO] · separação [INFERÊNCIA] |
| C3 | **Comunicado dentro de Conteúdos.** RN14 e a tela Conteúdos dizem que comunicados têm área própria. Mas a Edição rápida (115:2324) mostra um item do tipo “Comunicado”, categoria “Comunicados” e “Fixar no topo de Notícias”, e o Calendário (115:2992) tem o filtro “Comunicados 7”. O mesmo título, “Horário especial de atendimento no feriado”, aparece como notícia na Visão geral e como comunicado na Edição rápida. | RN14 × 115:2324 × 115:2992 | [FATO] |
| C4 | **Datas na Edição rápida.** O campo Data diz 24/10/2026 16:00 e o histórico diz “Agendado para 28/10 às 16h00”. | 115:2324 | [FATO] |
| C5 | **Nome do registro de presença.** Os estados e RN30 usam “Concluído”. Os botões do detalhe (190:25620), os Relatórios e a Atividade usam “Atendido”. | RN30 × 190:25620 × 216:34990 | [FATO] |
| C6 | **Quem é avisado da pendência.** RN30 diz “o responsável é avisado”. A tela 244:37671 diz “você e o Administrador geral são avisados”. | RN30 × 244:37671 | [FATO] |
| C7 | **Comunicados no Calendário e contadores.** A lista Conteúdos mostra “Todos 46”, mas “Mostrando 1–7 de 38”. O calendário soma os 7 comunicados. | 110:845 × 115:2992 | [FATO] · dado de exemplo |
| C8 | **Fuso horário.** O modal de publicar diz “horário de Brasília”. O RNF06 define America/Bahia. Os dois têm o mesmo deslocamento hoje (UTC−3), mas o rótulo precisa ser um só. | 113:1314 × RNF06 | [FATO] |
| C9 | **Regras de segurança desligáveis.** A tela de Configurações mostra como interruptores “Verificação em duas etapas”, “Justificativa ao ocultar conteúdo” e “Confirmar documentos oficiais”. Os docs tratam as três como obrigatórias e fixas (RN04, RN11, RN12, RNF02). | 117:3030 × RN04/RN11/RN12 | [FATO] |
| C10 | **Parceiro “Agendado” sem data de início.** A lista de Benefícios tem o estado Agendado, mas o painel do parceiro só tem “Válido até”. RF47 fala em “remover parceiros”; a tela mostra Rascunho, Agendado e Publicado. | 167:17772 × 167:18087 × RF47 | [FATO] |
| C11 | **Destaque da Home em dois lugares.** O editor de notícia tem “Destacar na página inicial (ocupa o card principal da Home)”. A tela Página inicial controla o carrossel e os destaques, com “Escolhido por”. Não está claro qual dos dois prevalece. | 112:1091 × 166:16879 | [FATO] |
| C12 | **Sino de notificações na Fase 1.** RF11 (Fase 1) põe o sino com contador no cabeçalho do associado. A página Notificações é da Fase 2. O menu da conta marca só “Agendar atendimento” como Fase 2. | RF11 × 159:8456 × visão §9 | [FATO] |
| C13 | **Atalho “Agendar” na Fase 1.** RN41 mostra o atalho para o associado conectado, e a Home conectada (245:43617) o exibe. O agendamento é da Fase 2. | RN41 × 245:43617 | [FATO] · esconder na Fase 1 é [INFERÊNCIA] |
| C14 | **Dados de exemplo.** Gilson Araújo tem a matrícula 015872 no detalhe e 018220 no remarcar. | 190:25620 × 244:36706 | [FATO] · sem impacto na regra |
| C15 | **Diretoria “numa próxima etapa”.** Configurações diz “Diretoria (nomes, cargos e fotos) entra numa próxima etapa. Até lá, a equipe técnica atualiza”. O escopo põe o assunto fora desta versão. Não há fase definida. | 167:18333 × `escopo.md` | [FATO] · fase [NÃO CONFIRMADO] |
| C16 | **Taxonomia do Rádio Chofer.** O episódio tem “Tema” (Saúde) e o site filtra por Entrevistas, Direitos e Saúde. Em Configurações › Categorias, “Rádio Chofer” aparece como categoria de Notícias (15 itens). | 166:17629 × 157:8305 × 117:3030 | [FATO] |
| C17 | **Recuperação do associado × da equipe.** Associado: o link vale 30 min e a tela mostra o e-mail mascarado, o que confirma que o CPF tem conta. Equipe: o link vale 1 h e a resposta é igual exista ou não a conta (RN48). Os docs não definem a regra do associado (RF16 sem detalhe). | 155:9386 × RN48 × RF16 | [FATO] |

### 6.2 Regras que existem só no Figma (não estão nos docs)

Não são contradições, mas precisam entrar no spec ou ser descartadas. **[FATO]** (Figma) · [NÃO CONFIRMADO] (docs)

| # | Regra | Onde |
|---|---|---|
| R1 | Senha do associado com no mínimo 8 caracteres, letras e números; e-mail digitado duas vezes. | 65:147 |
| R2 | Link de recuperação do associado vale 30 minutos. | 155:9386 |
| R3 | “Lembrar de mim” no login do associado. A duração da sessão não está definida. | 64:63 |
| R4 | Notificações do associado ficam guardadas por 90 dias. | 186:14259 |
| R5 | Comunicado com até 140 caracteres. | 165:16711 |
| R6 | Limites do editor: manchete com 110, linha fina com 200 e resumo do documento com 400. | 112:1091, 114:1972 |
| R7 | Mídia: até 10 MB por arquivo. Logo de parceiro: PNG ou SVG até 2 MB. | 116:2727, 167:18087 |
| R8 | Carrossel com até 5 destaques e entrada e saída agendadas; lista “Em destaque” com 3 posições, automática ou escolhida. | 166:16879 |
| R9 | “Fixar no topo de Notícias até <data>”. | 115:2324 |
| R10 | “Mais lidas da semana”, o que exige contar visualizações. | 80:629 |
| R11 | Parceiro sai do site sozinho ao vencer e gera um alerta de “vence em N dias”. O N não está definido (o exemplo é 18). | 167:17772 |
| R12 | Episódio marcado como “Último programa” substitui o anterior na Home. | 166:17629 |
| R13 | Atividade tem “Exportar planilha”. A exportação da auditoria também deve ser registrada? | 116:3074 |
| R14 | Exceção ao limite só no balcão; conta no relatório como atendimento normal e aparece marcada. | 243:36540 |
| R15 | Editar serviço só vale para novos agendamentos; os já marcados não mudam. | 191:26080 |
| R16 | Mudança de perfil ou serviços vale na hora; agendamentos marcados continuam. | 202:31493 |
| R17 | Exportar relatório com o mês aberto mostra o aviso “exporte a partir de 1º de novembro para a prestação final”. | 218:35770 |
| R18 | Atividade é “visível apenas para administradores”. | 116:3074 |
| R19 | Notícia tem versões (“versão 3”). Há histórico de versões consultável ou só um contador? | 112:1091 |
| R20 | Documento tem “texto pesquisável”, provavelmente extraído do PDF para a busca. | 114:1972 |

### 6.3 O que não aparece em lugar nenhum

Não está no Figma nem nos docs. Vai para a Etapa 2. **[NÃO CONFIRMADO]**

- **Regras de dados:**
  - unicidade (e-mail do associado, e-mail da equipe, número de edital, número de episódio, slug de notícia);
  - o que nunca pode ser apagado (notícia publicada, documento oficial, agendamento);
  - exclusão definitiva × arquivamento por entidade.
- **Excluir conteúdo:** RF40 fala em “excluir”, mas nenhuma tela mostra a ação. Quem pode, e em que estado?
- **E-mails do associado e do sistema:**
  - confirmação, lembrete, cancelamento, remarcação, bloqueio e filiação inativa;
  - recuperação de senha do associado;
  - aviso ao ADM de bloqueio por tentativas;
  - aviso de documento vencendo.
  - Só os 3 e-mails da equipe estão desenhados.
- **Notificação no celular (push):** “Lembrete … por e-mail e notificação” significa só notificação no site ou também push?
- **Retenção e LGPD:**
  - quanto tempo ficam presenças, exportações e logs;
  - o que acontece com os agendamentos e a Atividade quando o associado exclui o acesso;
  - conteúdo de “Baixar meus dados”.
- **Backup, hospedagem e deploy:** frequência e retenção do backup, ambientes (homologação e produção), domínio e e-mail de envio.
- **SEO e compartilhamento:** imagem e descrição de compartilhamento por notícia (RNF08 cita, mas o editor não tem campo próprio).
- **Slug e URL** de notícias e documentos, e redirecionamento das URLs do site atual.
- **Migração do site atual:** importar notícias e documentos antigos?

---

## 7. Resumo para a Etapa 2

As lacunas mais importantes, em ordem:

1. **C1 · HEIC aceito ou recusado.** Afeta a Mídia, o editor e os parceiros.
2. **C3 · Comunicado é só faixa?** Afeta Conteúdos, o calendário e a edição rápida; decide se o comunicado entra na entidade Conteúdo.
3. **C2 · Estado do documento no fim da vigência:** estado de publicação ou selo.
4. **C9 · Regras de segurança fixas ou configuráveis.**
5. **C17, R1 e R2 · Recuperação e senha do associado:** prazo do link, anti-enumeração e telas que faltam.
6. **Permissões finas:** quem exclui o quê; se a COM vê a Atividade; desativar e cancelar convite.
7. **E-mails do associado e do sistema**, que não estão desenhados.
8. **C12 e C13 · O que da Fase 2 aparece na Fase 1** (sino, atalho Agendar).
9. **Estados faltantes:** 403, API fora do ar, sessão expirada e listas vazias.
10. **LGPD, retenção, backup e deploy.**

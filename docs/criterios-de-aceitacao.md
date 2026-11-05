> Convertido automaticamente do .docx original em Documents\SINTRAVC (v1.1, 03/11/2026). A fonte da verdade passa a ser este .md.

**SINTRAVC · DOCUMENTAÇÃO DO PROJETO · 06**

# Critérios de aceitação

Como verificar que cada história de usuário está pronta

| **Projeto** | SINTRAVC — Site, Painel de gestão e Área do associado (versão 2.0) |
|---|---|
| **Cliente** | SINTRAVC — Sindicato dos Rodoviários de Vitória da Conquista |
| **Responsável** | Rafael Rodrigues Souza |
| **Versão · data** | 1.1 · 03/11/2026 |
| **Base** | Protótipo no Figma “Oficial Sintra Site” (telas desktop e mobile, temas claro e escuro) |

## 1. Como ler

Cada história (US, documento 04) tem um ou mais cenários no formato **Dado / Quando / Então** :

- **Dado** — a situação inicial;
- **Quando** — a ação da pessoa ou do sistema;
- **Então** — o resultado esperado, que pode ser conferido.

Os cenários têm ID no formato **CA-US14.2** (história 14, cenário 2) e podem virar testes automáticos. Uma história só é aceita quando todos os seus cenários passam.

## 2. Fase 1

### US01 · Ver na Home os avisos, notícias e atalhos mais procurados

Como Visitante, quero ver na Home os avisos, notícias e atalhos mais procurados, para me informar rápido sobre o que acontece na categoria. · Requisitos: RF01, RF08

**CA-US01.1 · Home com comunicado ativo**

**Dado que** existe um comunicado publicado dentro do período

**Quando** acesso qualquer página do site

**Então** vejo a faixa do comunicado no topo, com o link “Saiba mais”

**CA-US01.2 · Vários comunicados**

**Dado que** existem 2 comunicados no ar

**Quando** a faixa é exibida

**Então** eles se alternam na ordem definida na fila e a faixa indica “1 de 2”

**CA-US01.3 · Atalho Agendar escondido**

**Dado que** não estou conectado

**Quando** acesso a Home

**Então** o atalho “Agendar” não aparece

### US02 · Ler as notícias filtrando por categoria

Como Visitante, quero ler as notícias filtrando por categoria, para encontrar o assunto que me interessa. · Requisitos: RF02

**CA-US02.1 · Filtrar por categoria**

**Dado que** estou na página Notícias

**Quando** escolho a categoria “Jurídico”

**Então** vejo apenas notícias publicadas dessa categoria

**CA-US02.2 · Conteúdo não publicado**

**Dado que** uma notícia está em Rascunho, Agendada, Oculta ou Arquivada

**Quando** procuro por ela no site

**Então** ela não aparece na lista nem pelo endereço direto (página 404)

### US03 · Consultar e baixar editais e acordos coletivos em PDF

Como Visitante, quero consultar e baixar editais e acordos coletivos em PDF, para conhecer prazos e direitos sem precisar ir à sede. · Requisitos: RF04

**CA-US03.1 · Buscar edital**

**Dado que** estou em Documentos › Editais

**Quando** busco por “012”

**Então** vejo o edital nº 012/2026 com data de publicação, prazo e tamanho do PDF

**CA-US03.2 · Baixar PDF**

**Dado que** abro um documento

**Quando** clico em “Baixar PDF”

**Então** o arquivo oficial é baixado

**CA-US03.3 · Destaque com prazo**

**Dado que** há um edital com prazo em aberto

**Quando** acesso Editais

**Então** ele aparece em destaque com “Faltam N dias”

### US04 · Ouvir o Rádio Chofer no site

Como Visitante, quero ouvir o Rádio Chofer no site, para acompanhar o programa da categoria. · Requisitos: RF05

**CA-US04.1 · Player sob demanda**

**Dado que** estou na página Rádio Chofer

**Quando** a página carrega

**Então** o player do YouTube não é carregado até eu clicar em ouvir

**CA-US04.2 · Tocar episódio**

**Dado que** clico em “Ouvir agora” em um episódio

**Quando** o player carrega

**Então** o vídeo do YouTube começa no próprio site

### US05 · Falar com o sindicato pelo canal mais prático

Como Visitante, quero falar com o sindicato pelo canal mais prático, para tirar dúvidas e buscar orientação. · Requisitos: RF06

**CA-US05.1 · Dados atualizados**

**Dado que** o Administrador alterou o telefone em Configurações › Site

**Quando** acesso a página Contato depois de 1 minuto

**Então** vejo o novo telefone no Contato, na barra superior e no rodapé

**CA-US05.2 · Abrir WhatsApp**

**Dado que** estou no celular

**Quando** toco em “Abrir conversa”

**Então** o WhatsApp abre com o número da recepção

### US06 · Pedir minha filiação pelo WhatsApp

Como Visitante, quero pedir minha filiação pelo WhatsApp, para me tornar associado sem preencher formulário. · Requisitos: RF07

**CA-US06.1 · Filiar-se**

**Dado que** não sou associado

**Quando** clico em “Filiar-se pelo WhatsApp” na seção Filie-se, no menu mobile ou no rodapé

**Então** abre uma conversa com a recepção já com a mensagem pronta

### US07 · Conhecer o sindicato, a diretoria e os benefícios

Como Visitante, quero conhecer o sindicato, a diretoria e os benefícios, para saber quem me representa e o que ganho ao me filiar. · Requisitos: RF03

**CA-US07.1 · Benefícios**

**Dado que** estou em Sindicato › Benefícios

**Quando** vejo os parceiros

**Então** cada parceiro mostra logo, desconto e regras de uso

**CA-US07.2 · Carteirinha visual**

**Dado que** vejo a imagem da carteirinha

**Quando** leio a página

**Então** fica claro que o passe físico é o documento válido

### US08 · Navegar bem no celular e escolher tema claro ou escuro

Como Visitante, quero navegar bem no celular e escolher tema claro ou escuro, para usar o site no dia a dia, inclusive à noite. · Requisitos: RF09, RF10

**CA-US08.1 · Menu mobile**

**Dado que** estou no celular

**Quando** abro o menu

**Então** vejo as seções e “Filiar-se pelo WhatsApp”; na Fase 1 não há “Entrar” (E01)

**CA-US08.2 · Cookies**

**Dado que** é minha primeira visita

**Quando** abro o site

**Então** vejo o aviso de cookies; depois de aceitar, ele não aparece de novo

### US19 · Entrar no painel com segurança

Como Pessoa da equipe, quero entrar no painel com segurança, para proteger o site e os dados dos associados. · Requisitos: RF30, RF31

**CA-US19.1 · Duas etapas**

**Dado que** informei e-mail e senha corretos

**Quando** digito o código do aplicativo autenticador

**Então** entro no painel e vejo só as áreas do meu perfil

**CA-US19.2 · Tentativas**

**Dado que** errei a senha 5 vezes

**Quando** tento de novo

**Então** a conta fica bloqueada por 15 minutos e o administrador é avisado

**CA-US19.3 · Acesso direto**

**Dado que** sou da Comunicação

**Quando** digito o endereço de Equipe e perfis

**Então** o servidor nega o acesso

**CA-US19.4 · E-mail de conta bloqueada (RN59)**

**Dado que** minha conta foi bloqueada por 5 tentativas

**Quando** o bloqueio acontece

**Então** eu e os administradores gerais recebemos um e-mail

### US20 · Ver na Visão geral o que está no ar e o que precisa de atenção

Como Administrador geral / Comunicação, quero ver na Visão geral o que está no ar e o que precisa de atenção, para agir antes que algo dê errado. · Requisitos: RF32

**CA-US20.1 · Tarefas**

**Dado que** um edital termina a vigência em 2 dias

**Quando** abro a Visão geral

**Então** vejo a tarefa “encerra a vigência em 2 dias” com o botão Revisar

### US21 · Escrever, pré-visualizar e publicar ou agendar notícias

Como Comunicação, quero escrever, pré-visualizar e publicar ou agendar notícias, para manter a categoria informada. · Requisitos: RF37, RF38, RF39, RF71, RF78

**CA-US21.1 · Rascunho automático**

**Dado que** estou editando uma notícia

**Quando** altero o texto

**Então** o rascunho é salvo automaticamente

**CA-US21.2 · Agendar**

**Dado que** defino publicação para 03/11 às 08h00

**Quando** confirmo

**Então** o estado fica Agendado e a notícia entra no ar sozinha na data e hora

**CA-US21.3 · Imagem sem texto alternativo**

**Dado que** a notícia tem imagem sem texto alternativo

**Quando** tento publicar

**Então** a publicação é impedida e o campo é indicado

**CA-US21.4 · Sair sem salvar**

**Dado que** há alterações não salvas

**Quando** tento sair do editor

**Então** vejo o modal com “Descartar”, “Voltar” e “Salvar e sair”

**CA-US21.5 · Conteúdo de outro autor (RN55)**

**Dado que** sou da Comunicação e a notícia foi criada por outra pessoa

**Quando** edito e publico

**Então** a alteração é salva e a Atividade registra meu nome

**CA-US21.6 · Fixar notícia (RF78, RN58)**

**Dado que** escolho “Fixar no topo de Notícias até 10/11”

**Quando** publico

**Então** a notícia aparece no bloco DESTAQUE da página Notícias até 10/11 e depois sai sozinha

**CA-US21.7 · Só uma fixada (RN58)**

**Dado que** já existe uma notícia fixada

**Quando** fixo outra

**Então** vejo um aviso de que a anterior será desafixada e, ao confirmar, só a nova fica fixada

**CA-US21.8 · Sem fixada (RN58)**

**Dado que** nenhuma notícia está fixada

**Quando** abro a página Notícias

**Então** o bloco DESTAQUE mostra a notícia mais recente

**CA-US21.9 · Histórico de versões (E31)**

**Dado que** uma notícia publicada foi editada 2 vezes

**Quando** abro “Histórico” no editor

**Então** vejo as versões com quem e quando, e posso restaurar uma delas como rascunho, sem tirar a atual do ar

**CA-US21.10 · Autosave não gera versão (E31)**

**Dado que** estou editando um rascunho

**Quando** o salvamento automático acontece

**Então** nenhuma nova versão aparece no Histórico

**CA-US21.11 · Publicação agendada falhou (RN59)**

**Dado que** agendei uma notícia e a publicação falhou

**Quando** a tarefa termina com erro

**Então** recebo um e-mail e uma notificação no painel avisando da falha

### US22 · Ocultar, arquivar e restaurar conteúdos

Como Comunicação, quero ocultar, arquivar e restaurar conteúdos, para manter o site organizado. · Requisitos: RF40, RF35

**CA-US22.1 · Ocultar com motivo**

**Dado que** um conteúdo está publicado

**Quando** escolho Ocultar sem informar o motivo

**Então** não consigo confirmar até preencher o motivo

**CA-US22.2 · Arquivar em lote**

**Dado que** selecionei 2 conteúdos

**Quando** confirmo Arquivar

**Então** eles saem do site e das listas, vão para Arquivados e posso desfazer pelo aviso

**CA-US22.3 · Excluir rascunho nunca publicado (RN54)**

**Dado que** sou o autor de um rascunho que nunca foi ao ar

**Quando** escolho “Excluir” e confirmo

**Então** o rascunho é apagado de vez e a ação fica em Atividade

**CA-US22.4 · Publicado não se exclui (RN54)**

**Dado que** um conteúdo já foi publicado alguma vez

**Quando** procuro a opção de excluir

**Então** só existem ocultar e arquivar

**CA-US22.5 · Rascunho de outra pessoa (RN54)**

**Dado que** sou da Comunicação e o rascunho é de outro autor

**Quando** abro o menu de ações

**Então** não vejo “Excluir”; o Administrador geral vê

### US23 · Publicar editais e acordos oficiais em PDF

Como Administrador geral, quero publicar editais e acordos oficiais em PDF, para garantir que só versões oficiais sejam divulgadas. · Requisitos: RF41, RF42

**CA-US23.1 · Confirmação oficial**

**Dado que** enviei o PDF do edital

**Quando** clico em Publicar

**Então** preciso marcar “Confirmo que o PDF é a versão oficial e assinada” antes de publicar

**CA-US23.2 · Comunicação sem edição**

**Dado que** sou da Comunicação

**Quando** abro um edital no painel

**Então** posso ver e baixar, mas não editar, substituir ou remover

### US24 · Publicar comunicados como faixa com período

Como Comunicação, quero publicar comunicados como faixa com período, para avisar todos que entram no site. · Requisitos: RF43, RF44, RF71

**CA-US24.1 · Entrada e saída automáticas**

**Dado que** agendei um comunicado de 30/10 08h00 até 02/11 23h59

**Quando** chega cada horário

**Então** a faixa entra e sai do ar sozinha

**CA-US24.2 · Encerrar agora**

**Dado que** um comunicado está no ar

**Quando** escolho “Encerrar agora” e confirmo

**Então** a faixa sai do site e a ação fica registrada em Atividade

### US25 · Adicionar episódios do Rádio Chofer pelo link do YouTube

Como Comunicação, quero adicionar episódios do Rádio Chofer pelo link do YouTube, para publicar o programa sem trabalho manual. · Requisitos: RF45

**CA-US25.1 · Dados automáticos**

**Dado que** colo um link válido do YouTube

**Quando** clico em Adicionar

**Então** título, capa e duração são preenchidos e posso ajustar antes de salvar

**CA-US25.2 · Link inválido**

**Dado que** colo um link que não é do YouTube

**Quando** tento adicionar

**Então** vejo mensagem de link inválido

### US26 · Escolher os destaques da Home

Como Comunicação, quero escolher os destaques da Home, para dar visibilidade ao que importa. · Requisitos: RF46

**CA-US26.1 · Ordenar destaques**

**Dado que** estou em Página inicial

**Quando** reordeno os itens e salvo

**Então** a Home mostra a nova ordem e a prévia confere com o site

### US27 · Enviar fotos direto do celular

Como Comunicação, quero enviar fotos direto do celular, para publicar sem precisar converter arquivos. · Requisitos: RF48, RF49

**CA-US27.1 · HEIC**

**Dado que** envio uma foto HEIC do iPhone

**Quando** o envio termina

**Então** a imagem é convertida para JPG ou WebP, reduzida e fica disponível na Mídia

**CA-US27.2 · Excluir em uso**

**Dado que** um arquivo está em uso numa notícia

**Quando** tento excluir

**Então** a exclusão é impedida e vejo onde ele está sendo usado

### US28 · Cadastrar parceiros de benefícios

Como Administrador geral, quero cadastrar parceiros de benefícios, para mostrar aos associados os descontos atualizados. · Requisitos: RF47

**CA-US28.1 · Novo parceiro**

**Dado que** preencho nome, logo, desconto e regras

**Quando** salvo

**Então** o parceiro aparece em Sindicato › Benefícios

**CA-US28.2 · Parceiro agendado (RN57)**

**Dado que** cadastro um parceiro com “Começa em” no dia 15

**Quando** publico

**Então** ele fica Agendado e aparece no site sozinho no dia 15

**CA-US28.3 · Parceiro vencido (RN57)**

**Dado que** a data “Válido até” de um parceiro passou

**Quando** a tarefa diária roda

**Então** ele sai do site e vai para Arquivado

### US29 · Convidar pessoas e definir perfis e serviços

Como Administrador geral, quero convidar pessoas e definir perfis e serviços, para dar a cada um só o acesso necessário. · Requisitos: RF51, RF52

**CA-US29.1 · Convite (Fase 1)**

**Dado que** convido uma pessoa com perfil Comunicação

**Quando** ela aceita o convite e configura as duas etapas

**Então** ela vê só as áreas da Comunicação (Visão geral, Conteúdos, Comunicados, Rádio Chofer, Página inicial e Mídia)

**CA-US29.2 · Convite pendente**

**Dado que** o convite não foi aceito

**Quando** vejo a lista da equipe

**Então** a pessoa aparece como Pendente, com “Convite enviado”

**CA-US29.3 · Serviços só na Fase 2**

**Dado que** a Fase 2 ainda não está ativa

**Quando** abro “Convidar pessoa” ou “Editar acesso”

**Então** não aparecem o perfil Atendimento nem o campo “Serviços sob responsabilidade”

### US30 · Atualizar os dados do site num lugar só

Como Administrador geral, quero atualizar os dados do site num lugar só, para evitar informações diferentes em cada página. · Requisitos: RF53, RF54, RF55

**CA-US30.1 · Fonte única**

**Dado que** altero o WhatsApp da recepção

**Quando** salvo

**Então** o novo número vale no Filiar-se, no Contato e em “Falar com o atendimento” em até 1 minuto

**CA-US30.2 · Regras fixas do sistema (RF55)**

**Dado que** abro Configurações › Regras de segurança

**Quando** vejo as regras

**Então** elas aparecem só para leitura (duas etapas, justificativa ao ocultar, confirmação de documento oficial, bloqueio por tentativas), sem interruptores

### US31 · Consultar a Atividade

Como Administrador geral, quero consultar a Atividade, para saber quem fez o quê e quando. · Requisitos: RF50

**CA-US31.1 · Filtrar**

**Dado que** estou em Atividade

**Quando** filtro por pessoa e período

**Então** vejo só os registros correspondentes, com motivo quando houver

**CA-US31.2 · Imutável**

**Dado que** sou Administrador geral

**Quando** tento alterar ou excluir um registro

**Então** não existe essa opção e o banco também não permite

### US40 · Criar minha senha e ativar as duas etapas pelo convite

Como Pessoa convidada, quero criar minha senha e ativar as duas etapas pelo convite, para começar a usar o painel com segurança. · Requisitos: RF72, RF73, RF77

**CA-US40.1 · Convite válido**

**Dado que** recebi o convite há menos de 48 h

**Quando** abro o link e crio uma senha que atende aos requisitos

**Então** sigo para ativar as duas etapas com o QR code

**CA-US40.2 · Duas etapas obrigatórias**

**Dado que** criei a senha

**Quando** tento pular a ativação das duas etapas

**Então** não consigo entrar no painel até digitar um código válido do aplicativo

**CA-US40.3 · Códigos mostrados uma vez**

**Dado que** ativei as duas etapas

**Quando** vejo os 8 códigos de recuperação e confirmo que os guardei

**Então** entro no painel e os códigos não são mostrados de novo

**CA-US40.4 · Convite vencido ou usado**

**Dado que** o link passou de 48 h ou já foi usado

**Quando** abro o link

**Então** vejo “Este convite não vale mais” com o botão para ir ao login

### US41 · Recuperar minha senha sozinha

Como Pessoa da equipe, quero recuperar minha senha sozinha, para voltar a trabalhar sem depender do administrador. · Requisitos: RF74, RF77

**CA-US41.1 · Pedir link**

**Dado que** estou no login da equipe

**Quando** clico em “Esqueci minha senha” e informo meu e-mail de trabalho

**Então** vejo “Confira seu e-mail” e recebo um link válido por 1 hora

**CA-US41.2 · E-mail sem acesso**

**Dado que** informo um e-mail que não tem acesso ao painel

**Quando** envio

**Então** vejo a mesma mensagem “Confira seu e-mail” e nenhum e-mail é enviado

**CA-US41.3 · Link vencido**

**Dado que** o link passou de 1 hora ou já foi usado

**Quando** abro o link

**Então** vejo que ele não vale mais e posso pedir outro

**CA-US41.4 · Depois de trocar**

**Dado que** criei a nova senha

**Quando** entro de novo

**Então** o código das duas etapas continua sendo pedido, as outras sessões foram encerradas e recebo o e-mail de senha alterada

### US42 · Entrar com um código de recuperação

Como Pessoa da equipe, quero entrar com um código de recuperação, para acessar o painel mesmo sem o celular. · Requisitos: RF75

**CA-US42.1 · Código válido**

**Dado que** perdi o celular e tenho meus códigos

**Quando** escolho “Usar um código de recuperação” e digito um código

**Então** entro no painel e o código deixa de valer

**CA-US42.2 · Código já usado**

**Dado que** digito um código que já usei

**Quando** confirmo

**Então** vejo que o código é inválido e não entro

### US43 · Redefinir as duas etapas ou reenviar o convite de alguém

Como Administrador geral, quero redefinir as duas etapas ou reenviar o convite de alguém, para ajudar quem perdeu o acesso sem abrir brechas. · Requisitos: RF76, RF73

**CA-US43.1 · Redefinir duas etapas**

**Dado que** Carlos perdeu o celular e os códigos e confirmei a identidade dele

**Quando** escolho “Redefinir duas etapas”, informo o motivo e confirmo

**Então** os códigos antigos deixam de valer, Carlos ativa as duas etapas de novo no próximo acesso e a ação fica em Atividade

**CA-US43.2 · Motivo obrigatório**

**Dado que** abri o modal de redefinir

**Quando** tento confirmar sem motivo

**Então** não consigo até preencher o motivo

**CA-US43.3 · Mínimo de 2 administradores**

**Dado que** há só 2 administradores gerais ativos

**Quando** tento desativar um deles ou mudar o perfil dele

**Então** o sistema impede e explica que é preciso ter pelo menos 2

**CA-US43.4 · Reenviar convite**

**Dado que** o convite de Paulo venceu

**Quando** escolho “Reenviar convite”

**Então** Paulo recebe um novo link de 48 h e o anterior deixa de valer

## 3. Fase 2

### US09 · Ativar meu acesso com CPF e matrícula

Como Associado, quero ativar meu acesso com CPF e matrícula, para usar a área do associado pela primeira vez. · Requisitos: RF14, RF15

**CA-US09.1 · Primeiro acesso válido**

**Dado que** meu CPF e matrícula estão ativos na API do sindicato

**Quando** informo os dados, crio e-mail e senha e aceito os termos

**Então** meu acesso é criado e passo a entrar com CPF e senha

**CA-US09.2 · Não encontrado ou inativo**

**Dado que** meu CPF e matrícula não existem ou não estão ativos

**Quando** tento ativar o acesso

**Então** sou bloqueado e vejo o alerta com o contato do atendimento

**CA-US09.3 · Termos obrigatórios**

**Dado que** estou criando a senha

**Quando** não marco o aceite dos termos

**Então** não consigo concluir o primeiro acesso

**CA-US09.4 · Senha do associado (RN51)**

**Dado que** estou criando a senha no primeiro acesso

**Quando** digito uma senha com menos de 8 caracteres, sem letras e números ou igual ao meu CPF

**Então** não consigo concluir e vejo o requisito que falta

**CA-US09.5 · API fora do ar no primeiro acesso (E22)**

**Dado que** a API do sindicato não responde

**Quando** tento verificar minha filiação

**Então** vejo “Sistema do sindicato indisponível, tente mais tarde”; o primeiro acesso nunca usa consulta antiga

### US10 · Entrar com CPF e senha

Como Associado, quero entrar com CPF e senha, para acessar meus serviços. · Requisitos: RF12, RF13, RF11

**CA-US10.1 · Login ativo**

**Dado que** minha filiação está Ativa na API

**Quando** entro com CPF e senha corretos

**Então** o cabeçalho mostra “Olá, José”, o sino e o menu da conta

**CA-US10.2 · Filiação não ativa**

**Dado que** minha filiação está Inativa, Pausada ou Desfiliada

**Quando** tento entrar

**Então** o login é bloqueado com o alerta “procure o atendimento” e o botão de WhatsApp

**CA-US10.3 · API fora do ar com consulta recente (E22)**

**Dado que** a API do sindicato não responde e minha filiação foi consultada como Ativa há menos de 24 horas

**Quando** entro com CPF e senha corretos

**Então** entro normalmente e meu acesso fica marcado para reconferência quando a API voltar

**CA-US10.4 · API fora do ar sem consulta recente (E22)**

**Dado que** a API do sindicato não responde e não há consulta da minha filiação nas últimas 24 horas

**Quando** tento entrar

**Então** vejo “Sistema do sindicato indisponível, tente mais tarde” e o site público continua funcionando

**CA-US10.5 · Bloqueio por tentativas (RN51)**

**Dado que** errei a senha 4 vezes seguidas

**Quando** erro pela 5ª vez

**Então** o login fica bloqueado por 15 minutos e vejo quando posso tentar de novo

**CA-US10.6 · Situação só depois da senha (RN51)**

**Dado que** minha filiação está Pausada

**Quando** digito meu CPF com a senha errada

**Então** vejo só “CPF ou senha incorretos”, sem nenhuma informação sobre a filiação

**CA-US10.7 · Lembrar de mim (RN51)**

**Dado que** entrei marcando “Lembrar de mim”

**Quando** volto ao site dentro de 30 dias, mesmo após fechar o navegador

**Então** continuo conectado; sem a marcação, a sessão termina ao fechar o navegador

### US11 · Recuperar minha senha

Como Associado, quero recuperar minha senha, para voltar a acessar sem ir à sede. · Requisitos: RF16

**CA-US11.1 · Pedir o link (RN52)**

**Dado que** tenho acesso com e-mail cadastrado

**Quando** informo meu CPF em “Recuperar senha”

**Então** vejo “Se este CPF tiver acesso, enviamos um link para o e-mail cadastrado”, sem o e-mail aparecer, e recebo um link válido por 1 hora

**CA-US11.2 · CPF sem acesso (RN52)**

**Dado que** informo um CPF que não tem acesso ao site

**Quando** envio

**Então** vejo a mesma mensagem e nenhum e-mail é enviado

**CA-US11.3 · Link vencido ou usado (RN52)**

**Dado que** o link passou de 1 hora ou já foi usado

**Quando** abro o link

**Então** vejo que ele não vale mais e posso pedir outro

**CA-US11.4 · Depois de trocar (RN52)**

**Dado que** criei a nova senha

**Quando** a troca é concluída

**Então** as outras sessões são encerradas e recebo o e-mail de “senha alterada”

### US12 · Ver meus dados e atualizar meu contato

Como Associado, quero ver meus dados e atualizar meu contato, para receber avisos e lembretes no lugar certo. · Requisitos: RF20, RF21

**CA-US12.1 · Dados da filiação travados**

**Dado que** estou em Meus dados

**Quando** vejo nome, CPF, matrícula, empresa e função

**Então** esses campos não são editáveis e o CPF aparece mascarado

**CA-US12.2 · Alterar e-mail (RN53)**

**Dado que** informo um novo e-mail e minha senha atual

**Quando** clico em “Salvar alterações”

**Então** o e-mail antigo continua valendo, vejo “Confirme seu novo e-mail”, o novo endereço recebe um link válido por 24 horas e o antigo recebe um aviso da troca

**CA-US12.3 · Confirmar novo e-mail (RN53)**

**Dado que** recebi o link de confirmação há menos de 24 horas

**Quando** abro o link

**Então** o novo e-mail passa a valer para entrar, recuperar a senha e receber avisos

**CA-US12.4 · Senha atual obrigatória (RN53)**

**Dado que** quero trocar e-mail ou senha

**Quando** não informo a senha atual ou informo errada

**Então** a alteração não é salva

**CA-US12.5 · Alterar celular**

**Dado que** altero só o celular

**Quando** clico em “Salvar alterações”

**Então** o novo número é salvo na hora e vejo a confirmação

### US13 · Baixar meus dados ou excluir meu acesso

Como Associado, quero baixar meus dados ou excluir meu acesso, para exercer meus direitos da LGPD. · Requisitos: RF22

**CA-US13.1 · Baixar dados**

**Dado que** estou em Meus dados

**Quando** clico em “Baixar meus dados”

**Então** recebo um arquivo com os dados que o site guarda sobre mim

**CA-US13.2 · Excluir acesso (E24)**

**Dado que** confirmo “Excluir meu acesso”

**Quando** a exclusão é processada

**Então** não consigo mais entrar; meu e-mail, celular, senha e notificações são apagados; meus agendamentos futuros são cancelados; e minha filiação no sindicato continua igual

**CA-US13.3 · Histórico mantido (E24)**

**Dado que** excluí meu acesso e tinha atendimentos realizados

**Quando** o sindicato gera um relatório do período

**Então** meus atendimentos e faltas continuam no relatório, ligados à matrícula

**CA-US13.4 · Novo primeiro acesso (E24)**

**Dado que** excluí meu acesso

**Quando** faço o primeiro acesso de novo com CPF e matrícula

**Então** consigo criar um novo acesso normalmente

### US14 · Agendar um atendimento para mim ou para um dependente

Como Associado, quero agendar um atendimento para mim ou para um dependente, para garantir meu horário sem ir à sede. · Requisitos: RF24, RF25, RF26

**CA-US14.1 · Agendamento confirmado**

**Dado que** minha filiação está ativa e o serviço tem horário livre

**Quando** escolho serviço, pessoa, dia e horário

**Então** o agendamento é confirmado na hora, aparece na agenda do painel e recebo notificação e e-mail

**CA-US14.2 · Antecedência**

**Dado que** estou escolhendo o dia

**Quando** vejo o calendário

**Então** só consigo escolher datas até 30 dias à frente e apenas horários livres

**CA-US14.3 · Filiação deixou de ser ativa**

**Dado que** minha filiação mudou para não ativa

**Quando** tento confirmar

**Então** o agendamento não é feito e vejo o contato do atendimento

**CA-US14.4 · Horário disputado**

**Dado que** outra pessoa confirma o mesmo horário segundos antes

**Quando** eu confirmo

**Então** recebo aviso de que o horário acabou de ser ocupado e escolho outro

**CA-US14.5 · API fora do ar ao confirmar (E22)**

**Dado que** a API do sindicato não responde ao confirmar e minha filiação foi consultada como Ativa há menos de 24 horas

**Quando** confirmo o horário

**Então** o agendamento é confirmado e fica marcado para reconferência

### US15 · Saber quantas vezes ainda posso usar cada serviço no mês

Como Associado, quero saber quantas vezes ainda posso usar cada serviço no mês, para me planejar. · Requisitos: RF24, RF27

**CA-US15.1 · Contador**

**Dado que** o Salão tem limite de 2 por mês e já usei 1

**Quando** abro a etapa 1

**Então** vejo “você usou 1 de 2” para a pessoa escolhida

**CA-US15.2 · Limite atingido**

**Dado que** já usei 2 de 2 no mês

**Quando** escolho o Salão

**Então** o serviço fica bloqueado com a mensagem de limite do mês atingido

**CA-US15.3 · Limite por pessoa**

**Dado que** eu atingi o limite, mas meu dependente não

**Quando** escolho o dependente em “Para quem”

**Então** consigo agendar para ele

**CA-US15.4 · Cancelado não conta**

**Dado que** cancelei um agendamento do mês

**Quando** abro a etapa 1

**Então** o cancelado não entra no contador

### US16 · Cancelar ou remarcar meu agendamento

Como Associado, quero cancelar ou remarcar meu agendamento, para não perder a vaga quando surge um imprevisto. · Requisitos: RF28, RF29

**CA-US16.1 · Dentro do prazo**

**Dado que** faltam mais de 2 h para o horário

**Quando** cancelo ou remarco pelo site

**Então** a operação é concluída e o horário antigo volta a ficar livre

**CA-US16.2 · Fora do prazo**

**Dado que** faltam menos de 2 h

**Quando** abro o agendamento

**Então** as opções de cancelar e remarcar ficam indisponíveis, com orientação para falar com o atendimento

**CA-US16.3 · Remarcar não consome limite**

**Dado que** remarco um agendamento

**Quando** vejo o contador do mês

**Então** o número de usos não aumenta

### US17 · Ser lembrado dos meus horários

Como Associado, quero ser lembrado dos meus horários, para não faltar. · Requisitos: RF19, RF70

**CA-US17.1 · Lembretes**

**Dado que** tenho agendamento confirmado e e-mail cadastrado

**Quando** chega 1 dia antes e depois 2 h antes

**Então** recebo lembrete por e-mail e notificação no site

**CA-US17.2 · Avisos do sindicato só no site (RN59)**

**Dado que** um edital, acordo, comunicado ou parceiro entra no ar

**Quando** abro minhas Notificações

**Então** vejo o aviso lá e não recebo e-mail sobre ele; notícias comuns não geram aviso

### US18 · Entender por que não consigo agendar após faltas

Como Associado, quero entender por que não consigo agendar após faltas, para saber quando posso voltar a marcar. · Requisitos: RF27

**CA-US18.1 · Suspensão**

**Dado que** tive 2 faltas no mês

**Quando** tento agendar

**Então** vejo que estou suspenso por 15 dias e a data em que poderei agendar novamente

### US32 · Criar serviços e definir responsáveis e limites

Como Administrador geral, quero criar serviços e definir responsáveis e limites, para organizar o atendimento do sindicato. · Requisitos: RF62, RF61

**CA-US32.1 · Criar serviço**

**Dado que** preencho nome, ícone, responsáveis, duração, limite e horários

**Quando** salvo com “Abrir no site agora” desligado

**Então** o serviço fica salvo e só a equipe vê

**CA-US32.2 · Abrir no site**

**Dado que** ligo “Abrir no site”

**Quando** salvo

**Então** o serviço aparece para os associados em “Agendar atendimento”

### US33 · Ver a agenda do dia dos meus serviços

Como Atendimento, quero ver a agenda do dia dos meus serviços, para organizar os atendimentos. · Requisitos: RF56, RF67

**CA-US33.1 · Filtro padrão**

**Dado que** sou Ana Lima, responsável pelos Salões

**Quando** abro a Agenda do dia

**Então** o filtro está em “Meus serviços” e mostra só os Salões

**CA-US33.2 · Somente consulta**

**Dado que** escolho “Todos os serviços”

**Quando** abro um agendamento do Jurídico

**Então** vejo os dados, mas as ações aparecem travadas (“Somente consulta”)

**CA-US33.3 · Filtro salvo**

**Dado que** mudei o filtro

**Quando** volto no dia seguinte

**Então** o filtro escolhido continua aplicado

**CA-US33.4 · Serviço de outro responsável (RN56)**

**Dado que** sou do Atendimento e escolho “Todos os serviços”

**Quando** clico num agendamento de um serviço que não é meu

**Então** vejo só o horário e o nome; o detalhe não abre

**CA-US33.5 · Histórico restrito (RN56)**

**Dado que** abro o detalhe de um agendamento do meu serviço

**Quando** vejo o histórico do associado

**Então** aparecem só os atendimentos dos serviços pelos quais sou responsável; o Administrador geral vê todos

### US34 · Registrar a presença dos associados

Como Atendimento, quero registrar a presença dos associados, para ter relatórios corretos. · Requisitos: RF57, RF64

**CA-US34.1 · Registrar**

**Dado que** o associado foi atendido

**Quando** marco Concluído

**Então** o agendamento vai para o histórico e conta como realizado

**CA-US34.2 · Falta**

**Dado que** o associado não veio

**Quando** marco Faltou

**Então** a falta conta no limite do mês e na regra de suspensão

**CA-US34.3 · Pendente**

**Dado que** terminou o dia sem registro

**Quando** o sistema fecha o dia

**Então** o atendimento vira “Pendente de registro”, sou avisado e ele fica fora do relatório até eu resolver

### US35 · Agendar no balcão para quem veio à sede

Como Atendimento, quero agendar no balcão para quem veio à sede, para atender quem não usa o site. · Requisitos: RF59, RF60

**CA-US35.1 · Buscar associado**

**Dado que** estou em “Agendar para associado”

**Quando** busco por nome, CPF ou matrícula

**Então** encontro o associado e posso escolher ele ou um dependente

**CA-US35.2 · Exceção ao limite**

**Dado que** a pessoa já atingiu o limite do mês

**Quando** tento agendar

**Então** posso seguir apenas informando o motivo da exceção, que fica em Atividade

**CA-US35.3 · Sem e-mail**

**Dado que** o associado não tem e-mail cadastrado

**Quando** confirmo

**Então** o agendamento é criado sem lembrete automático e fica registrado em Atividade

### US36 · Cancelar ou remarcar um agendamento

Como Atendimento, quero cancelar ou remarcar um agendamento, para resolver imprevistos do sindicato. · Requisitos: RF58

**CA-US36.1 · Motivo obrigatório**

**Dado que** abro Cancelar ou Remarcar

**Quando** tento confirmar sem motivo

**Então** não consigo até preencher o motivo

**CA-US36.2 · Aviso**

**Dado que** confirmo com motivo

**Quando** a ação é concluída

**Então** o associado recebe aviso por e-mail e notificação

### US37 · Ajustar horários e bloquear datas dos meus serviços

Como Atendimento, quero ajustar horários e bloquear datas dos meus serviços, para refletir feriados e imprevistos. · Requisitos: RF61, RF63

**CA-US37.1 · Campos travados**

**Dado que** edito um serviço meu

**Quando** abro o painel lateral

**Então** só duração, dias/horários e local são editáveis; o resto mostra “Definido pelo Administrador geral”

**CA-US37.2 · Bloqueio com agendados**

**Dado que** bloqueio 02/11 inteiro e havia agendamentos

**Quando** confirmo

**Então** os agendamentos do período são cancelados e os associados avisados

### US38 · Gerar e exportar relatórios de atendimento

Como Atendimento / Administrador geral, quero gerar e exportar relatórios de atendimento, para prestar contas à diretoria. · Requisitos: RF65, RF66

**CA-US38.1 · Relatório do mês**

**Dado que** escolho Mês = Outubro/2026

**Quando** o relatório carrega

**Então** vejo realizados, associados únicos, faltas, cancelados, gráfico por dia e tabela por serviço

**CA-US38.2 · Escopo do Atendimento**

**Dado que** sou Atendimento

**Quando** abro Relatórios

**Então** vejo só os meus serviços

**CA-US38.3 · Exportar**

**Dado que** clico em Exportar e escolho Excel

**Quando** confirmo ciente do aviso de LGPD

**Então** o arquivo é gerado e a exportação fica registrada em Atividade

### US39 · Cancelar agendamentos de quem deixou de estar ativo

Como Sistema, quero cancelar agendamentos de quem deixou de estar ativo, para liberar horários e cumprir as regras do sindicato. · Requisitos: RF69

**CA-US39.1 · Verificação diária**

**Dado que** um associado com agendamentos futuros ficou Inativo na API

**Quando** roda a verificação diária

**Então** os agendamentos futuros são cancelados, os horários liberados, o associado avisado por e-mail e o registro aparece em Atividade

**CA-US39.2 · Falha da API não cancela (E22)**

**Dado que** a API do sindicato não responde durante a verificação diária

**Quando** a verificação roda

**Então** nenhum agendamento é cancelado e a verificação tenta de novo mais tarde

## 4. Critérios gerais (valem para todas as histórias)

- A tela confere com o protótipo do Figma em desktop e mobile, nos temas claro e escuro.
- Ações sem permissão são negadas pelo servidor, mesmo acessando o endereço direto.
- Ações sensíveis pedem confirmação e geram registro em Atividade.
- Mensagens de erro dizem o que aconteceu e o que fazer; avisos de sucesso somem em 6 segundos.
- Navegação por teclado, foco visível e contraste AA; imagens publicadas têm texto alternativo.
- Datas e horários exibidos no fuso da Bahia.
- Páginas públicas carregam rápido no celular (meta: LCP abaixo de 2,5 s em 4G).

## 5. Definição de pronto

- Todos os cenários da história passam em homologação.
- Testes automáticos cobrindo as regras de negócio envolvidas.
- Revisão de código feita e sem erros no monitoramento.
- Documentos atualizados se a história mudou algum requisito ou regra.
- Validação pelo representante do sindicato.

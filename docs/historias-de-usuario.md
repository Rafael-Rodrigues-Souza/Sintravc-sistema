> Convertido automaticamente do .docx original em Documents\SINTRAVC (v1.1, 03/11/2026). A fonte da verdade passa a ser este .md.

**SINTRAVC · DOCUMENTAÇÃO DO PROJETO · 04**

# Histórias de usuário

O que cada pessoa quer fazer no sistema e por quê

| **Projeto** | SINTRAVC — Site, Painel de gestão e Área do associado (versão 2.0) |
|---|---|
| **Cliente** | SINTRAVC — Sindicato dos Rodoviários de Vitória da Conquista |
| **Responsável** | Rafael Rodrigues Souza |
| **Versão · data** | 1.1 · 03/11/2026 |
| **Base** | Protótipo no Figma “Oficial Sintra Site” (telas desktop e mobile, temas claro e escuro) |

## 1. Como ler

Cada história segue o formato **Como** <perfil>, **quero** <ação>, **para** <benefício>. Ela tem um ID (US), prioridade, fase e os requisitos (RF, documento 02) que atende. Os critérios de aceitação de cada história estão no documento 06.

- **Alta:** sem ela a fase não pode ir ao ar.
- **Média:** importante, pode ser entregue logo depois do essencial da fase.

## 2. Perfis

| **Perfil** | **Resumo** |
|---|---|
| Visitante | Trabalhador ou cidadão que consulta o site, quase sempre pelo celular. |
| Associado | Sócio ativo (ex.: José Carlos da Silva, matrícula 012345) que usa a Área do associado. |
| Comunicação | Equipe que publica conteúdo (ex.: Carlos Ribeiro). |
| Administrador geral | Gestão completa do sistema (ex.: Mariana Souza). |
| Atendimento | Responsável por serviços (ex.: Ana Lima nos Salões; Paulo Mendes no Jurídico e Exames). |
| Sistema | Ações automáticas, sem pessoa. |

## 3. Histórias por módulo

### 3.1 Site público

| **ID** | **História** | **Prior.** | **Fase** | **Requisitos** |
|---|---|---|---|---|
| US01 | Como **Visitante** , quero ver na Home os avisos, notícias e atalhos mais procurados, para me informar rápido sobre o que acontece na categoria. | Alta | 1 | RF01, RF08 |
| US02 | Como **Visitante** , quero ler as notícias filtrando por categoria, para encontrar o assunto que me interessa. | Alta | 1 | RF02 |
| US03 | Como **Visitante** , quero consultar e baixar editais e acordos coletivos em PDF, para conhecer prazos e direitos sem precisar ir à sede. | Alta | 1 | RF04 |
| US04 | Como **Visitante** , quero ouvir o Rádio Chofer no site, para acompanhar o programa da categoria. | Média | 1 | RF05 |
| US05 | Como **Visitante** , quero falar com o sindicato pelo canal mais prático, para tirar dúvidas e buscar orientação. | Alta | 1 | RF06 |
| US06 | Como **Visitante** , quero pedir minha filiação pelo WhatsApp, para me tornar associado sem preencher formulário. | Alta | 1 | RF07 |
| US07 | Como **Visitante** , quero conhecer o sindicato, a diretoria e os benefícios, para saber quem me representa e o que ganho ao me filiar. | Média | 1 | RF03 |
| US08 | Como **Visitante** , quero navegar bem no celular e escolher tema claro ou escuro, para usar o site no dia a dia, inclusive à noite. | Média | 1 | RF09, RF10 |

### 3.2 Acesso do associado

| **ID** | **História** | **Prior.** | **Fase** | **Requisitos** |
|---|---|---|---|---|
| US09 | Como **Associado** , quero ativar meu acesso com CPF e matrícula, para usar a área do associado pela primeira vez. | Alta | 2 (E01) | RF14, RF15 |
| US10 | Como **Associado** , quero entrar com CPF e senha, para acessar meus serviços. | Alta | 2 (E01) | RF12, RF13, RF11 |
| US11 | Como **Associado** , quero recuperar minha senha, para voltar a acessar sem ir à sede. | Alta | 2 (E01) | RF16 |

### 3.3 Área do associado

| **ID** | **História** | **Prior.** | **Fase** | **Requisitos** |
|---|---|---|---|---|
| US12 | Como **Associado** , quero ver meus dados e atualizar meu contato, para receber avisos e lembretes no lugar certo. | Média | 2 | RF20, RF21 |
| US13 | Como **Associado** , quero baixar meus dados ou excluir meu acesso, para exercer meus direitos da LGPD. | Média | 2 | RF22 |
| US17 | Como **Associado** , quero ser lembrado dos meus horários, para não faltar. | Média | 2 | RF19, RF70 |

### 3.4 Agendamentos do associado

| **ID** | **História** | **Prior.** | **Fase** | **Requisitos** |
|---|---|---|---|---|
| US14 | Como **Associado** , quero agendar um atendimento para mim ou para um dependente, para garantir meu horário sem ir à sede. | Alta | 2 | RF24, RF25, RF26 |
| US15 | Como **Associado** , quero saber quantas vezes ainda posso usar cada serviço no mês, para me planejar. | Alta | 2 | RF24, RF27 |
| US16 | Como **Associado** , quero cancelar ou remarcar meu agendamento, para não perder a vaga quando surge um imprevisto. | Alta | 2 | RF28, RF29 |
| US18 | Como **Associado** , quero entender por que não consigo agendar após faltas, para saber quando posso voltar a marcar. | Média | 2 | RF27 |

### 3.5 Painel: acesso e estrutura

| **ID** | **História** | **Prior.** | **Fase** | **Requisitos** |
|---|---|---|---|---|
| US19 | Como **Pessoa da equipe** , quero entrar no painel com segurança, para proteger o site e os dados dos associados. | Alta | 1 | RF30, RF31 |
| US20 | Como **Administrador geral / Comunicação** , quero ver na Visão geral o que está no ar e o que precisa de atenção, para agir antes que algo dê errado. | Média | 1 | RF32 |
| US40 | Como **Pessoa convidada** , quero criar minha senha e ativar as duas etapas pelo convite, para começar a usar o painel com segurança. | Alta | 1 | RF72, RF73, RF77 |
| US41 | Como **Pessoa da equipe** , quero recuperar minha senha sozinha, para voltar a trabalhar sem depender do administrador. | Alta | 1 | RF74, RF77 |
| US42 | Como **Pessoa da equipe** , quero entrar com um código de recuperação, para acessar o painel mesmo sem o celular. | Média | 1 | RF75 |

### 3.6 Painel: conteúdos e notícias

| **ID** | **História** | **Prior.** | **Fase** | **Requisitos** |
|---|---|---|---|---|
| US21 | Como **Comunicação** , quero escrever, pré-visualizar e publicar ou agendar notícias, para manter a categoria informada. | Alta | 1 | RF37, RF38, RF39, RF71 |
| US22 | Como **Comunicação** , quero ocultar, arquivar e restaurar conteúdos, para manter o site organizado. | Média | 1 | RF40, RF35 |

### 3.7 Painel: documentos oficiais

| **ID** | **História** | **Prior.** | **Fase** | **Requisitos** |
|---|---|---|---|---|
| US23 | Como **Administrador geral** , quero publicar editais e acordos oficiais em PDF, para garantir que só versões oficiais sejam divulgadas. | Alta | 1 | RF41, RF42 |

### 3.8 Painel: comunicados

| **ID** | **História** | **Prior.** | **Fase** | **Requisitos** |
|---|---|---|---|---|
| US24 | Como **Comunicação** , quero publicar comunicados como faixa com período, para avisar todos que entram no site. | Alta | 1 | RF43, RF44, RF71 |

### 3.9 Painel: Rádio Chofer

| **ID** | **História** | **Prior.** | **Fase** | **Requisitos** |
|---|---|---|---|---|
| US25 | Como **Comunicação** , quero adicionar episódios do Rádio Chofer pelo link do YouTube, para publicar o programa sem trabalho manual. | Média | 1 | RF45 |

### 3.10 Painel: página inicial

| **ID** | **História** | **Prior.** | **Fase** | **Requisitos** |
|---|---|---|---|---|
| US26 | Como **Comunicação** , quero escolher os destaques da Home, para dar visibilidade ao que importa. | Média | 1 | RF46 |

### 3.11 Painel: benefícios

| **ID** | **História** | **Prior.** | **Fase** | **Requisitos** |
|---|---|---|---|---|
| US28 | Como **Administrador geral** , quero cadastrar parceiros de benefícios, para mostrar aos associados os descontos atualizados. | Média | 1 | RF47 |

### 3.12 Painel: mídia

| **ID** | **História** | **Prior.** | **Fase** | **Requisitos** |
|---|---|---|---|---|
| US27 | Como **Comunicação** , quero enviar fotos direto do celular, para publicar sem precisar converter arquivos. | Média | 1 | RF48, RF49 |

### 3.13 Painel: atividade (auditoria)

| **ID** | **História** | **Prior.** | **Fase** | **Requisitos** |
|---|---|---|---|---|
| US31 | Como **Administrador geral** , quero consultar a Atividade, para saber quem fez o quê e quando. | Alta | 1 | RF50 |

### 3.14 Painel: equipe e perfis

| **ID** | **História** | **Prior.** | **Fase** | **Requisitos** |
|---|---|---|---|---|
| US29 | Como **Administrador geral** , quero convidar pessoas e definir perfis e serviços, para dar a cada um só o acesso necessário. | Alta | 1 | RF51, RF52 |
| US43 | Como **Administrador geral** , quero redefinir as duas etapas ou reenviar o convite de alguém, para ajudar quem perdeu o acesso sem abrir brechas. | Alta | 1 | RF76, RF73 |

### 3.15 Painel: configurações

| **ID** | **História** | **Prior.** | **Fase** | **Requisitos** |
|---|---|---|---|---|
| US30 | Como **Administrador geral** , quero atualizar os dados do site num lugar só, para evitar informações diferentes em cada página. | Alta | 1 | RF53, RF54, RF55 |

### 3.16 Painel: agendamentos

| **ID** | **História** | **Prior.** | **Fase** | **Requisitos** |
|---|---|---|---|---|
| US32 | Como **Administrador geral** , quero criar serviços e definir responsáveis e limites, para organizar o atendimento do sindicato. | Alta | 2 | RF62, RF61 |
| US33 | Como **Atendimento** , quero ver a agenda do dia dos meus serviços, para organizar os atendimentos. | Alta | 2 | RF56, RF67 |
| US34 | Como **Atendimento** , quero registrar a presença dos associados, para ter relatórios corretos. | Alta | 2 | RF57, RF64 |
| US35 | Como **Atendimento** , quero agendar no balcão para quem veio à sede, para atender quem não usa o site. | Alta | 2 | RF59, RF60 |
| US36 | Como **Atendimento** , quero cancelar ou remarcar um agendamento, para resolver imprevistos do sindicato. | Alta | 2 | RF58 |
| US37 | Como **Atendimento** , quero ajustar horários e bloquear datas dos meus serviços, para refletir feriados e imprevistos. | Média | 2 | RF61, RF63 |
| US38 | Como **Atendimento / Administrador geral** , quero gerar e exportar relatórios de atendimento, para prestar contas à diretoria. | Alta | 2 | RF65, RF66 |

### 3.17 Integração com a API do sindicato

| **ID** | **História** | **Prior.** | **Fase** | **Requisitos** |
|---|---|---|---|---|
| US39 | Como **Sistema** , quero cancelar agendamentos de quem deixou de estar ativo, para liberar horários e cumprir as regras do sindicato. | Alta | 2 | RF69 |

## 4. Resumo

| **Fase** | **Histórias** |
|---|---|
| Fase 1 | 25 |
| Fase 2 | 18 |
| **Total** | **43** |

> Convertido automaticamente do .docx original em Documents\SINTRAVC (v1.1, 03/11/2026). A fonte da verdade passa a ser este .md.

**SINTRAVC · DOCUMENTAÇÃO DO PROJETO · 03**

# Escopo do projeto

O que será entregue, o que fica de fora, premissas, dependências e riscos

| **Projeto** | SINTRAVC — Site, Painel de gestão e Área do associado (versão 2.0) |
|---|---|
| **Cliente** | SINTRAVC — Sindicato dos Rodoviários de Vitória da Conquista |
| **Responsável** | Rafael Rodrigues Souza |
| **Versão · data** | 1.1 · 03/11/2026 |
| **Base** | Protótipo no Figma “Oficial Sintra Site” (telas desktop e mobile, temas claro e escuro) |

## 1. Objetivo do projeto

Desenvolver e colocar no ar a versão 2.0 do sistema do SINTRAVC — site público, painel de gestão e Área do associado — conforme o protótipo aprovado no Figma, em duas fases.

## 2. Escopo incluído

### 2.1 Fase 1 · implementação agora

- **M01 Site público:** Home, Notícias, Sindicato (Instituição, Diretoria, Benefícios), Documentos, Rádio Chofer, Contato e páginas de apoio.
- **M05 Painel: acesso e estrutura:** Login da equipe com duas etapas, menu por perfil, Visão geral, notificações e busca.
- **M06 Painel: conteúdos e notícias:** Lista, calendário, edição rápida, editor, pré-visualização e ciclo de vida.
- **M07 Painel: documentos oficiais:** Editais e acordos/convenções em PDF (somente Administrador geral).
- **M08 Painel: comunicados:** Faixas no topo do site, com período e fila.
- **M09 Painel: Rádio Chofer:** Episódios por link do YouTube e programa ao vivo.
- **M10 Painel: página inicial:** Carrossel e destaques da Home.
- **M11 Painel: benefícios:** Parceiros, logo e desconto.
- **M12 Painel: mídia:** Biblioteca de imagens e arquivos, conversão HEIC e texto alternativo.
- **M13 Painel: atividade (auditoria):** Linha do tempo imutável de ações, com filtros.
- **M14 Painel: equipe e perfis:** Convites, perfis, matriz de permissões e responsáveis por serviço.
- **M15 Painel: configurações:** Dados do site, categorias e regras de segurança.

A fase 1 não depende da API do sindicato: não há login do associado e o cabeçalho do site não tem “Entrar” (E01).

### 2.2 Fase 2 · desenhada agora, implementada depois

- **M02 Acesso do associado:** Entrar com CPF e senha, primeiro acesso com CPF e matrícula, recuperar senha e bloqueio por filiação não ativa (E01).
- **M17 Integração com a API do sindicato:** Consulta de filiação, dados cadastrais e dependentes no login, no primeiro acesso, ao agendar e na verificação diária; sem resposta, vale a última consulta de até 24 h (E01, E22).
- **M03 Área do associado:** Início, Notificações e Meus dados (contato, senha e LGPD).
- **M04 Agendamentos do associado:** Novo agendamento em 3 etapas, para si ou dependente, cancelar e remarcar.
- **M16 Painel: agendamentos:** Agenda do dia, presença, balcão, serviços e horários, bloqueios, relatórios e versão mobile.
- **Tarefas automáticas da fase 2:** lembretes, pendências de presença, suspensão por faltas e cancelamento por filiação não ativa.

### 2.3 Em todas as fases

- Versões desktop e mobile e temas claro e escuro, fiéis ao protótipo.
- Registro de Atividade (auditoria) para todas as ações relevantes.
- Testes automáticos das regras de negócio e testes dos fluxos principais.
- Implantação em Docker num servidor atrás do Cloudflare, com homologação e produção, backup diário e documentação de instalação (E26–E28).

## 3. Fora do escopo

- Formulário de filiação online (a filiação é feita pela recepção, via WhatsApp).
- Carteirinha digital com validade (a imagem é apenas ilustrativa; vale o passe físico).
- Hospedagem de vídeos (o Rádio Chofer usa o YouTube).
- Fluxo de aprovação de conteúdo.
- Pagamentos, mensalidades ou qualquer transação financeira.
- Alterações na API ou no sistema interno do sindicato.
- Contratação de nuvem e domínio (já fornecidos pelo cliente).
- Redação da Política de privacidade e dos Termos de uso (a cargo do advogado do sindicato).
- Produção de conteúdo: textos, fotos, história, dados da diretoria e dos parceiros.
- Edição da Diretoria pelo painel (nesta versão, a equipe técnica atualiza).
- Aplicativo nativo para lojas (o sistema é web e responsivo).
- Disponibilizar o serviço “Marcação de exames” no site (aparece como indisponível).

## 4. Entregáveis

| **Entregável** | **Fase** | **Prazo** |
|---|---|---|
| Site público completo, em produção | 1 | A definir |
| Entrar do associado (login, primeiro acesso, recuperar senha) | 2 (E01) | A definir |
| Painel de gestão: perfis Administrador geral e Comunicação | 1 | A definir |
| Integração com a API do sindicato (consulta de filiação) | 2 (E01) | A definir |
| Área do associado e agendamentos | 2 | A definir |
| Perfil Atendimento: agenda, presença, serviços, relatórios e mobile | 2 | A definir |
| Tarefas automáticas (lembretes, pendências, verificação diária) | 2 | A definir |
| Manual rápido de uso do painel para a equipe | 1 e 2 | A definir |
| Documentação técnica e de implantação | 1 e 2 | A definir |

## 5. Premissas

- O protótipo no Figma é a referência visual e funcional aprovada.
- A API do sindicato está disponível e informa situação da filiação, dados cadastrais e dependentes.
- O cliente fornece nuvem, domínio, serviço de e-mail e acesso de armazenamento.
- O sindicato envia o conteúdo real antes da publicação (tela “Pendências de conteúdo”).
- Há uma pessoa do sindicato com autoridade para validar entregas e responder dúvidas.

## 6. Restrições

- Cumprir a LGPD no tratamento de CPF, dados de filiação, dependentes e presença.
- Rodar na infraestrutura do cliente, sem serviços pagos adicionais não aprovados.
- Fase 2 depende da conclusão e do uso da fase 1.

## 7. Dependências do cliente

| **Item** | **Responsável** | **Necessário para** |
|---|---|---|
| Documentação e credenciais de teste da API do sindicato | Sindicato / TI | Fase 2 (E01) |
| Acesso ao Cloudflare, ao servidor (VPS), ao servidor de backup e ao serviço de e-mail | Sindicato / TI | Fase 1 |
| Endereço, telefones, WhatsApp da recepção, e-mail, CNPJ | Sindicato | Fase 1 |
| História, marcos, diretoria (nomes, cargos e fotos) | Sindicato | Fase 1 |
| Parceiros: nomes, logos, percentuais e regras | Sindicato | Fase 1 |
| Política de privacidade e termos de uso | Advogado do sindicato | Fase 1 (publicação) |
| Serviços, responsáveis, horários e limites reais | Sindicato | Fase 2 |
| Lista da equipe e perfis de cada pessoa | Sindicato | Fase 1 |

## 8. Riscos

| **Risco** | **Impacto** | **Mitigação** |
|---|---|---|
| API do sindicato sem documentação, instável ou sem dados de dependentes | Alto | Validar a API no início; módulo isolado com versão simulada; mensagem clara quando estiver fora do ar. |
| Conteúdo real atrasado | Médio | Checklist de pendências no Figma; publicar só após o conteúdo mínimo. |
| Mudança de regras durante o desenvolvimento | Médio | Regras parametrizadas; mudanças passam pela gestão de mudanças (seção 11). |
| Baixa adesão da equipe ao painel | Médio | Manual rápido, treinamento curto e período de acompanhamento. |
| Falta de e-mail cadastrado dos associados | Baixo | Notificação no site; registro em Atividade nos agendamentos de balcão. |

## 9. Cronograma

| **Etapa** | **Marcos** | **Prazo** |
|---|---|---|
| Preparação | Validação da API, acesso à infraestrutura, especificação técnica | A definir |
| Fase 1 | Base do projeto; site público; painel (ADM e COM); homologação; publicação | A definir |
| Fase 2 | Área do associado; agendamentos; Atendimento; tarefas automáticas; homologação; publicação | A definir |
| Acompanhamento | Correções e ajustes após cada publicação | A definir |

## 10. Critérios de aceite do projeto

- Todos os critérios de aceitação (documento 06) das histórias da fase atendidos em homologação.
- Requisitos não funcionais (documento 02) verificados, em especial segurança, LGPD e desempenho no celular.
- Telas conferidas com o protótipo em desktop, mobile, tema claro e escuro.
- Sistema em produção no domínio do cliente, com documentação entregue.

## 11. Gestão de mudanças

Qualquer pedido fora deste escopo é registrado, avaliado quanto a impacto em prazo e esforço e só entra após aprovação do cliente. Os documentos de requisitos, regras e critérios são atualizados com o novo ID.

## 12. Aprovação

| **Nome** | **Função** | **Assinatura e data** |
|---|---|---|
| Rafael Rodrigues Souza | Responsável pelo projeto |  |
|  | Representante do SINTRAVC |  |

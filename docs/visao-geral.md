> Convertido automaticamente do .docx original em Documents\SINTRAVC (v1.1, 03/11/2026). A fonte da verdade passa a ser este .md.

**SINTRAVC · DOCUMENTAÇÃO DO PROJETO · 01**

# Visão geral do projeto

O que é o sistema, para quem é, como está organizado e como será entregue

| **Projeto** | SINTRAVC — Site, Painel de gestão e Área do associado (versão 2.0) |
|---|---|
| **Cliente** | SINTRAVC — Sindicato dos Rodoviários de Vitória da Conquista |
| **Responsável** | Rafael Rodrigues Souza |
| **Versão · data** | 1.1 · 03/11/2026 |
| **Base** | Protótipo no Figma “Oficial Sintra Site” (telas desktop e mobile, temas claro e escuro) |

## 1. Sobre este documento

Este documento apresenta o projeto de forma resumida, para quem precisa entender o todo antes de entrar nos detalhes. Ele foi escrito a partir das telas desenhadas no Figma e das decisões tomadas com o cliente durante o desenho. Os detalhes ficam nos demais documentos do conjunto:

- 01 — Visão geral do projeto
- 02 — Documento de requisitos (RF e RNF)
- 03 — Escopo do projeto
- 04 — Histórias de usuário (US)
- 05 — Regras de negócio (RN)
- 06 — Critérios de aceitação (CA)

## 2. Contexto

O **SINTRAVC — Sindicato dos Rodoviários de Vitória da Conquista** representa motoristas e trabalhadores do transporte coletivo da cidade. O sindicato precisa de um canal oficial que reúna notícias, avisos, documentos e serviços, e que a própria equipe consiga manter atualizado sem depender de um técnico.

A versão 2.0 substitui o site atual por um sistema completo: o **site público** , um **painel de gestão** para a equipe e uma **Área do associado** com agendamento de atendimentos.

## 3. Problema e oportunidade

- Avisos importantes (feriados, assembleias, plantões) se perdem em redes sociais e grupos.
- Editais e acordos coletivos precisam de um lugar oficial, sempre em PDF, com prazo e vigência visíveis.
- O atendimento na sede (jurídico, salões, exames) é marcado de forma manual, sem controle de limite, faltas ou prestação de contas.
- A equipe não tem perfis de acesso: qualquer pessoa altera qualquer coisa, sem registro do que foi feito.

## 4. Objetivos

1. **Informar a categoria** com um site rápido no celular, com notícias, comunicados em faixa, documentos oficiais e o Rádio Chofer.
2. **Dar autonomia à equipe** com um painel em que cada perfil faz só o que lhe cabe, com confirmação nas ações sensíveis.
3. **Garantir transparência e rastreabilidade** com registro imutável de todas as ações (Atividade).
4. **Organizar o atendimento** com agendamento pelo site e pelo balcão, limites por pessoa, controle de faltas e relatórios exportáveis.
5. **Proteger os dados** dos associados conforme a LGPD, com acesso validado na base do sindicato.

## 5. Público e perfis

| **Perfil** | **Quem é e o que faz** | **Onde atua** |
|---|---|---|
| Visitante | Qualquer pessoa. Lê notícias, documentos, benefícios e pede filiação pelo WhatsApp. | Site público |
| Associado | Sócio com filiação ativa na base do sindicato. Entra com CPF e senha, agenda para si e dependentes. | Site e Área do associado |
| Administrador geral | Gestão completa: documentos oficiais, benefícios, configurações, equipe, serviços e auditoria. | Painel de gestão |
| Comunicação | Publica notícias, comunicados, Rádio Chofer, destaques e mídia. Só consulta editais e acordos. | Painel de gestão |
| Atendimento | Opera a agenda, a presença e os relatórios dos serviços pelos quais é responsável. | Painel (desktop e mobile) |

## 6. O sistema em três partes

| **Parte** | **Conteúdo** |
|---|---|
| **Site público** | Home, Notícias, Sindicato (Instituição, Diretoria, Benefícios), Documentos (Editais e Acordos coletivos), Rádio Chofer, Contato, menu mobile, 404, privacidade e cookies. Desktop e mobile, temas claro e escuro. |
| **Área do associado** | Entrar, primeiro acesso, recuperar senha, Início, Agendamentos (novo, cancelar, remarcar), Notificações e Meus dados. |
| **Painel de gestão** | Login da equipe com duas etapas, Visão geral, Conteúdos, Editor, Comunicados, Rádio Chofer, Página inicial, Benefícios, Mídia, Atividade, Equipe e perfis, Configurações e Agendamentos (agenda, serviços, relatórios), com versão mobile. |

## 7. Módulos

| **ID** | **Módulo** | **Resumo** | **Fase** |
|---|---|---|---|
| M01 | Site público | Home, Notícias, Sindicato (Instituição, Diretoria, Benefícios), Documentos, Rádio Chofer, Contato e páginas de apoio. | Fase 1 |
| M02 | Acesso do associado | Entrar com CPF e senha, primeiro acesso com CPF e matrícula, recuperar senha e bloqueio por filiação não ativa. | Fase 2 (E01) |
| M03 | Área do associado | Início, Notificações e Meus dados (contato, senha e LGPD). | Fase 2 |
| M04 | Agendamentos do associado | Novo agendamento em 3 etapas, para si ou dependente, cancelar e remarcar. | Fase 2 |
| M05 | Painel: acesso e estrutura | Login da equipe com duas etapas, menu por perfil, Visão geral, notificações e busca. | Fase 1 |
| M06 | Painel: conteúdos e notícias | Lista, calendário, edição rápida, editor, pré-visualização e ciclo de vida. | Fase 1 |
| M07 | Painel: documentos oficiais | Editais e acordos/convenções em PDF (somente Administrador geral). | Fase 1 |
| M08 | Painel: comunicados | Faixas no topo do site, com período e fila. | Fase 1 |
| M09 | Painel: Rádio Chofer | Episódios por link do YouTube e programa ao vivo. | Fase 1 |
| M10 | Painel: página inicial | Carrossel e destaques da Home. | Fase 1 |
| M11 | Painel: benefícios | Parceiros, logo e desconto. | Fase 1 |
| M12 | Painel: mídia | Biblioteca de imagens e arquivos, conversão HEIC e texto alternativo. | Fase 1 |
| M13 | Painel: atividade (auditoria) | Linha do tempo imutável de ações, com filtros. | Fase 1 |
| M14 | Painel: equipe e perfis | Convites, perfis, matriz de permissões e responsáveis por serviço. | Fase 1 |
| M15 | Painel: configurações | Dados do site, categorias e regras de segurança. | Fase 1 |
| M16 | Painel: agendamentos | Agenda do dia, presença, balcão, serviços e horários, bloqueios, relatórios e versão mobile. | Fase 2 |
| M17 | Integração com a API do sindicato | Consulta de filiação, dados cadastrais e dependentes (login, primeiro acesso e verificação diária). | Fase 2 (E01) |

## 8. Principais decisões de produto

- “Entrar” no cabeçalho é só para associados e chega na Fase 2 (E01); a validação é feita na API do sindicato com CPF e matrícula. Na Fase 1 o cabeçalho tem só “Filiar-se”. Não há cadastro aberto.
- “Filiar-se” abre o WhatsApp da recepção, sem formulário no site.
- Comunicado é uma faixa no topo de todas as páginas (substitui o antigo “alerta urgente”). Documentos são só PDFs oficiais.
- Não há etapa de aprovação: o perfil define quem publica; ações sensíveis pedem confirmação e ficam em Atividade.
- Rádio Chofer usa links do YouTube; nenhum vídeo fica no servidor.
- Equipe entra por convite (link de 48 h): cria a senha, ativa as duas etapas e guarda códigos de recuperação. Quem esquece a senha recupera sozinho por e-mail; quem perde o celular usa um código ou pede ao Administrador geral. O painel mantém sempre pelo menos 2 administradores gerais.
- Fotos HEIC do celular são convertidas no servidor.
- Carteirinha é só ilustrativa: o passe físico continua valendo.
- Agendamento com confirmação automática, para associado e dependentes, com limite mensal por pessoa, suspensão por faltas e cancelamento automático se a filiação deixar de ser ativa.
- Cada serviço tem responsáveis; o Atendimento opera só os seus. Só o Administrador geral cria serviços e altera as regras.

## 9. Fases de entrega

| **Fase** | **O que entra** | **Situação** |
|---|---|---|
| **Fase 1** | Site público completo, sem “Entrar” no cabeçalho (E01); painel com login da equipe e todas as funções de Comunicação e Administrador geral. | Desenhada; implementação agora |
| **Fase 2** | Entrar do associado (login, primeiro acesso e recuperar senha validados na API — E01); Área do associado (início, notificações, meus dados); agendamentos do associado com remarcação, limites e dependentes; perfil Atendimento (agenda, serviços, presença, relatórios, mobile). | Desenhada; implementação depois. |

## 10. Arquitetura em alto nível

Recomendação detalhada no documento “Recomendação de stack”. Em resumo:

- Um único sistema em **TypeScript** com **Next.js** (site, Área do associado e painel em rotas separadas) e **PostgreSQL** .
- Integração com a **API do sindicato** isolada num módulo próprio, com versão simulada para desenvolvimento.
- Tarefas agendadas (publicações, lembretes, pendências, verificação diária) em fila dentro do banco.
- Arquivos no armazenamento da nuvem do cliente; e-mails por SMTP; execução em **Docker** na nuvem e no domínio já fornecidos.

## 11. Experiência e identidade

- Todas as telas foram desenhadas em **desktop e mobile** e nos **temas claro e escuro** , com tokens de cor, tipografia e componentes reutilizáveis no Figma.
- Linguagem simples, direta, voltada ao trabalhador rodoviário; o celular é o principal dispositivo.
- Acessibilidade como requisito: contraste, foco visível e texto alternativo obrigatório nas imagens.

## 12. Glossário

| **Termo** | **Significado** |
|---|---|
| API do sindicato | Sistema do sindicato que informa filiação, dados cadastrais e dependentes. |
| Filiação ativa | Situação “Ativo” na API. Inativo, Pausado e Desfiliado não têm acesso. |
| Dependente | Pessoa vinculada ao associado na base do sindicato, que pode usar os serviços. |
| Comunicado | Faixa de aviso no topo de todas as páginas, com período de exibição. |
| Documento oficial | Edital ou acordo/convenção coletiva em PDF, publicado só pelo Administrador geral. |
| Serviço | Atendimento agendável (ex.: Assessoria jurídica, Salão feminino, Salão masculino, Marcação de exames). |
| Responsável | Pessoa do Atendimento que opera um serviço. |
| Balcão | Agendamento feito pela equipe no painel, para quem foi à sede. |
| Pendente de registro | Atendimento do dia sem presença registrada ao fim do expediente. |
| Atividade | Registro de auditoria, que não pode ser alterado nem excluído. |
| Duas etapas (2FA) | Código de aplicativo autenticador exigido no login da equipe. |

## 13. Pontos em aberto

- Detalhes técnicos da API do sindicato: formato, autenticação, limites e como informa dependentes e situação.
- Conteúdo real do sindicato: endereço, telefones, CNPJ, história, diretoria, regras e percentuais dos parceiros, créditos das fotos (lista completa na tela “Pendências de conteúdo” do Figma).
- Política de privacidade e termos de uso, a cargo do advogado do sindicato.
- Serviço de e-mail disponível na nuvem do cliente.
- Prazos de cada fase: a definir com o cliente.

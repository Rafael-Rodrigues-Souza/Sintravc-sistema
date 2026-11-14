> Convertido da "SINTRAVC - Recomendação de stack.docx" (30/10/2026).

**SINTRAVC · SITE, PAINEL E ÁREA DO ASSOCIADO**

# Recomendação de stack para o desenvolvimento

Leitura geral do projeto a partir das telas no Figma · 30/10/2026 · nuvem e domínio já fornecidos pelo cliente

## 1. Recomendação em uma frase

Um único sistema em **TypeScript** , com **Next.js** e **PostgreSQL** , empacotado em **Docker** para rodar na nuvem que o cliente já tem.

## 2. Leitura do projeto

Pelas telas, o projeto são três produtos que usam o mesmo banco de dados:

1. **Site público.** Notícias, documentos, Rádio Chofer e benefícios. Precisa ser rápido e bem indexado no Google.
2. **Painel de gestão.** Três perfis com permissões por serviço, agendamento de publicações, upload de imagens e PDFs, auditoria que não pode ser alterada, login em duas etapas e relatórios exportáveis.
3. **Área do associado.** Login validado na API do sindicato e agendamentos com regras: limite por pessoa, dependentes, faltas, suspensão, lembretes e cancelamento automático.

O núcleo do sistema são as regras de negócio e as permissões, não o visual.

## 3. Stack recomendada

| **Camada** | **Ferramenta** | **Por quê, neste projeto** |
|---|---|---|
| Linguagem | **TypeScript** do início ao fim | As mesmas regras (limite, 2h para cancelar, validação de CPF) valem no navegador e no servidor. |
| Aplicação | **Next.js** (App Router) | Site público com SEO (páginas geradas e atualizadas ao publicar), painel e Área do associado no mesmo projeto, separados por rotas: /, /area-do-associado e /painel. |
| Banco | **PostgreSQL** | Dados relacionais (associado, dependente, serviço, agendamento, presença), transações para evitar dois agendamentos no mesmo horário e restrições que garantem as regras. |
| Acesso ao banco | **Drizzle ORM** (ou Prisma) | Tipagem forte e migrações versionadas. |
| Login | **Better Auth** | Login da equipe por e-mail e senha com 2FA por app autenticador (TOTP), bloqueio após 5 tentativas, e login próprio do associado, que valida CPF e matrícula na API do sindicato. |
| Interface | **Tailwind CSS + shadcn/ui** (base Radix; a folha inferior do celular é o Drawer do shadcn, com `vaul`, isolado em `src/components/ui/drawer.tsx` por estar sem manutenção, E49) | As variáveis de cor do Figma viram variáveis CSS, e o claro/escuro sai quase de graça. Radix entrega modais, menus, tooltips e foco acessíveis prontos. |
| Formulários | **React Hook Form + Zod** | O mesmo esquema Zod valida no formulário e no servidor. |
| Tabelas e gráficos | **TanStack Table** e **Recharts** | Relatórios, Equipe e Atividade com filtros e ordenação. |
| Editor de notícias | **Tiptap** | Editor de texto rico com controle do HTML gerado. |
| Tarefas agendadas | **pg-boss** (fila dentro do Postgres, sem Redis) | Tudo o que tem hora marcada (lista na seção 4). |
| Arquivos | Armazenamento de objetos da nuvem do cliente (compatível com S3) + **sharp** | Fotos, logos de parceiros e PDFs oficiais. |
| E-mail | SMTP ou o serviço de e-mail da nuvem do cliente; **React Email** para os modelos | Confirmações, lembretes e avisos de cancelamento. |
| Exportação | **exceljs** (Excel) e **@react-pdf/renderer** ou Playwright (PDF) | Prestação de contas. |
| Qualidade | **Vitest** , **Playwright** e **Sentry** | Testes das regras, testes dos fluxos e monitoramento de erros. |
| Entrega | **Docker** + GitHub Actions | Roda igual em qualquer nuvem. |

## 4. Tarefas agendadas

O pg-boss cuida de tudo o que acontece sozinho, em horário marcado:

- publicações e comunicados agendados, entrando e saindo do ar sozinhos;
- lembretes 1 dia antes e 2 horas antes do atendimento;
- a marcação de “Pendente de registro” às 23h59;
- a consulta diária à API do sindicato, que cancela agendamentos de quem ficou inativo;
- o fim das suspensões de 15 dias por faltas.

## 5. Pontos de atenção

1. **API do sindicato.** Isole a integração num módulo próprio, com uma versão falsa para desenvolver sem depender dela. Antes de começar, confirme com o cliente o formato da API, a autenticação, os limites de uso e como ela devolve dependentes e situação da filiação. É o maior risco técnico do projeto.
2. **Permissões em duas camadas:** o perfil (Administrador geral, Comunicação, Atendimento) e a responsabilidade por serviço. As duas precisam ser conferidas no servidor em toda ação. Esconder o botão na tela não basta.
3. **Auditoria realmente não editável.** Crie a tabela de Atividade só de inserção e bloqueie UPDATE e DELETE com uma regra no próprio banco.
4. **Agendamento sem conflito.** Use uma restrição única no banco para “horário ativo” e confira o limite do mês dentro da mesma transação. Assim dois associados não pegam o mesmo horário ao mesmo tempo.
5. **Fuso horário.** Guarde as datas em UTC e mostre em America/Bahia. Os prazos de “até 2h antes” e “23h59” dependem disso.
6. **Fotos HEIC do iPhone.** O sharp que vem pronto não lê HEIC. Adotado (E39): o `heic-decode` (libheif em WebAssembly) decodifica e o sharp reduz e grava; funciona igual no Windows, no CI e no Docker, sem libvips próprio.
7. **Rádio Chofer.** O oEmbed do YouTube devolve título e capa, mas não a duração. Para preencher a duração automaticamente, é preciso uma chave da YouTube Data API.
8. **LGPD.** Criptografe o CPF no banco e guarde um hash dele para busca. Registre o aceite dos termos e as exportações de relatórios. Defina com o advogado do sindicato por quanto tempo os dados de presença ficam guardados.
9. **Fases.** Modele o banco já pensando na fase 2 (associado, dependente, serviço, agendamento), mas ative na fase 1 só o site, o painel da Comunicação e o do Administrador geral. Isso evita retrabalho.

## 6. O que testar

Concentre os testes automáticos nas regras de agendamento. É ali que um erro gera reclamação de associado e prestação de contas errada:

- limite por pessoa (associado e cada dependente);
- remarcar sem contar como novo uso;
- 2 faltas no mês → 15 dias de suspensão;
- filiação inativa → cancelamento dos agendamentos futuros;
- exceção ao limite no balcão, com motivo obrigatório;
- presença sem registro → “Pendente de registro” e fora do relatório.

## 7. Alternativas

### Laravel (PHP)

Se você programa melhor em PHP, **Laravel** + Inertia + React cobre tudo isso muito bem. As tarefas agendadas e as filas já vêm prontas, e há muita gente no Brasil para dar manutenção. Eu escolheria Laravel em vez de Next.js se for a linguagem que você domina.

### Payload CMS

O **Payload CMS** roda dentro do Next.js e adiantaria a fase 1, porque já traz rascunho, versões, agendamento e permissões. Por outro lado, o painel dele não ficaria com a cara do que foi desenhado no Figma, e adaptar dá bastante trabalho. Vale só se o prazo pesar mais que a fidelidade ao design.

## 8. Próximos passos

1. Confirmar com o cliente os detalhes da API do sindicato e o serviço de e-mail disponível na nuvem dele.
2. Escrever a especificação técnica: modelo de dados, permissões por ação, tarefas agendadas e estrutura de pastas.
3. Montar a base do projeto (Next.js, banco, login, tokens do Figma) e começar pela fase 1.

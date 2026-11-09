# SINTRAVC 2.0

Site público, Painel de gestão e Área do associado do SINTRAVC (Sindicato dos Rodoviários de Vitória da Conquista).

## Fonte da verdade

- **`docs/spec.md` é a fonte da verdade.** Leia a seção relevante antes de implementar qualquer coisa.
- **Em caso de conflito, a ordem é:** `docs/spec.md` → `docs/decisoes.md` → docs v1.1 (`docs/requisitos.md`, `regras-de-negocio.md`, `historias-de-usuario.md`, `criterios-de-aceitacao.md`, `escopo.md`, `visao-geral.md`) → Figma.
- Os IDs são os mesmos em todos os arquivos: RF, RNF, RN, US, CA, E (decisões), C (contradições), N (telas novas), D (dependências do cliente), P (padrões).
- Stack: `docs/stack.md` (TypeScript, Next.js App Router, PostgreSQL, Drizzle, Better Auth, Tailwind + shadcn/ui, pg-boss). Não troque tecnologias sem explicar o problema.
- Figma: arquivo `2mlqSKCNy170C8y0CyL5de` (“Oficial Sintra Site”). O inventário de telas e IDs está em `docs/analise-figma.md` §1. **Antes de editar o Figma, leia `docs/figma.md`.**
- Links, pessoas, onde estão os arquivos originais e a linha do tempo do projeto: `docs/contexto.md`.

## Como decidir

- Quando os docs v1.1 forem explícitos, eles vencem o Figma: registre a divergência em `docs/correcoes-figma.md` sem perguntar.
- Decisão nova: uma pergunta por vez, sempre com uma resposta recomendada.
- A política de privacidade fica com o advogado do sindicato: não escreva esse texto.

## Antes de implementar uma tela

1. Consulte `docs/correcoes-figma.md`. O que está ali vale sobre o Figma, mesmo que a tela ainda não tenha sido corrigida.
2. Confira a fase da tela (spec §1 e §5). A Fase 1 não usa a API do sindicato e não tem “Entrar” do associado.
3. Estados não desenhados seguem o padrão do E23:
   - Alerta 2.0 nos formulários;
   - vazio com ícone, frase e ação;
   - Skeleton ao carregar;
   - AlertDialog nas confirmações;
   - Sonner nos avisos.
4. Os critérios de aceitação da história (`docs/criterios-de-aceitacao.md`) são o teste de pronto.

## Regras obrigatórias no código

- **Permissões sempre no servidor** (spec §11 T2; RNF01). Toda *server action* e rota passa pela mesma função `pode(pessoa, acao, recurso)`, que também monta o menu. Esconder o botão não basta. A matriz está no spec §4.
- **Auditoria na mesma transação** (spec §11 T1; RNF04). Toda ação relevante chama `registrarAtividade()` dentro da transação da própria ação. A tabela Atividade é só inserção (UPDATE e DELETE bloqueados por trigger).
- Datas são guardadas em UTC e exibidas em America/Bahia (RNF06). Prazos (2 h antes, 23h59) são calculados nesse fuso.
- Agendamento: capacidade e limite conferidos na mesma transação, com lock por (serviço, início) (RNF05).
- A API do sindicato fica atrás da interface `ApiSindicato`, com uma versão real e uma simulada (spec §11 T5).
- Valores de regra (prazos, limites, tentativas) vêm da tabela `Parametro` (spec §11 T4), nunca fixos no código.
- CPF criptografado no banco, com hash para busca, e mascarado na tela. Filiação sindical é dado sensível.

## Ao mudar uma regra

- Registre a decisão em `docs/decisoes.md` (próximo número E) e atualize o spec e os docs afetados no mesmo commit.
- Divergência de tela vai para `docs/correcoes-figma.md`.
- Algo que depende do sindicato vai para `docs/dependencias-cliente.md`.

## Ao terminar

- Antes de encerrar a tarefa, pare os servidores (`pnpm dev`, `next start`) e os processos que você iniciou em segundo plano.
- Nos diagramas Mermaid das descrições de PR, não use ponto e vírgula dentro dos textos: o Mermaid entende `;` como fim de comando. Use vírgula.

## Agent skills

### Issue tracker

As issues ficam no GitHub, em `Rafael-Rodrigues-Souza/Sintravc-sistema`, e são acessadas pelo `gh` CLI. Veja `docs/agents/issue-tracker.md`.

### Triage labels

Usamos os cinco rótulos padrão: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human` e `wontfix`. Veja `docs/agents/triage-labels.md`.

### Domain docs

Contexto único. Leia `docs/spec.md` e `docs/decisoes.md`, que fazem o papel dos ADRs. Veja `docs/agents/domain.md`.

## Idioma

Interface, documentos e mensagens de commit em português do Brasil. Use linguagem simples, voltada ao trabalhador rodoviário.

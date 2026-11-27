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

1. Leia o `docs/design.md` (guia visual: princípios, tokens, componentes e o que evitar) antes de criar ou mudar uma tela.
2. Consulte `docs/correcoes-figma.md`. O que está ali vale sobre o Figma, mesmo que a tela ainda não tenha sido corrigida.
3. Confira a fase da tela (spec §1 e §5). A Fase 1 não usa a API do sindicato e não tem “Entrar” do associado.
4. Estados não desenhados seguem o padrão do E23:
   - Alerta 2.0 nos formulários;
   - vazio com ícone, frase e ação;
   - Skeleton ao carregar;
   - AlertDialog nas confirmações;
   - Sonner nos avisos.
5. Os critérios de aceitação da história (`docs/criterios-de-aceitacao.md`) são o teste de pronto.
6. No celular e no tablet em pé, a tela segue o frame mobile do Figma (E49) ou, sem ele, o padrão mobile do E50. A skill `conferir-responsivo` (E48) roda em toda issue que cria ou muda layout, nos perfis `celular`, `ipad-deitado` e `computador` e nos dois temas. A varredura completa (todos os perfis do `RESPONSIVO`) roda no fim do bloco do site público e antes do deploy, junto com a skill `web-design-guidelines` como auditoria de acabamento. Toda tela nova tem pelo menos um e2e marcado com `@responsivo`, e o CI roda esses e2e em todos os perfis do `playwright.config.ts`. Os tamanhos ficam só no objeto `RESPONSIVO` desse arquivo: não repita os números.

## Conteúdo institucional e jurídico

- Antes de implementar qualquer tela com conteúdo sobre o sindicato (História, linha do tempo, Benefícios, Diretoria, Quem somos) ou texto jurídico (Política de privacidade, Termos de uso, avisos de LGPD), pare e consulte o Rafael sobre o conteúdo antes de planejar.
- Nunca invente fatos, datas, nomes, números ou textos jurídicos. Onde faltar conteúdo, use um marcador visível do tipo “[Conteúdo a definir pelo sindicato]” e liste no PR o que falta.
- História: o texto atual já tem base confirmada pelo sindicato e fica como está. Falta só a linha do tempo, cujos marcos (ano e acontecimento) o Rafael vai fornecer.
- Política de privacidade e Termos de uso dependem do advogado do sindicato (D6 e D9): a tela pode ser montada, mas o texto só entra quando o Rafael entregar a versão aprovada.

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

- Antes de encerrar, pare todos os servidores que você iniciou (`pnpm dev`, `next start`, e2e) e confira se as portas 3000 e 3100 estão livres. No Windows, o processo filho do `next` pode ficar preso: use `taskkill /PID`.
- Diagramas Mermaid no PR: nada de ponto e vírgula nos textos (ele encerra o comando). Use vírgula.
- Na descrição do PR, escreva `Closes #N` para cada issue que ele resolve. É a única parte do PR em inglês: o GitHub só fecha a issue sozinho com palavras como `Closes`, e “Fecha #N” deixa a issue aberta.
- Testes que leem várias linhas do banco e conferem a ordem sempre usam `ORDER BY` (na Atividade, por `id`, que é uuidv7). Sem isso o CI pode falhar por sorte.
- Antes de criar um arquivo novo, confira se ele já existe para não sobrescrever.
- Cada fluxo principal tem pelo menos um e2e que usa a tela como uma pessoa usaria (clicando nos botões e escolhendo nos seletores), e não só dados montados à mão no teste.
- Localmente, rodam só os e2e da issue (`--workers=1`). A suíte completa roda no CI.
- Em correção de defeito e em regra de negócio, o teste novo tem de falhar antes da correção.
- Só diga que terminou com o CI verde (`gh pr checks --watch`).

## Agent skills

Para implementar uma issue, use o comando `/implementar <número>` (`.claude/commands/implementar.md`). Ele segue o fluxo deste arquivo, do plano ao PR.

### Issue tracker

As issues ficam no GitHub, em `Rafael-Rodrigues-Souza/Sintravc-sistema`, e são acessadas pelo `gh` CLI. Veja `docs/agents/issue-tracker.md`.

### Triage labels

Usamos os cinco rótulos padrão: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human` e `wontfix`. Veja `docs/agents/triage-labels.md`.

### Domain docs

Contexto único. Leia `docs/spec.md` e `docs/decisoes.md`, que fazem o papel dos ADRs. Veja `docs/agents/domain.md`.

## Idioma

Interface, documentos e mensagens de commit em português do Brasil. Use linguagem simples, voltada ao trabalhador rodoviário.

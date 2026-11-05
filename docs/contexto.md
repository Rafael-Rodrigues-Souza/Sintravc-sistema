# Contexto do projeto

Links, pessoas, arquivos de apoio e histórico. As regras do sistema estão em `spec.md` e as decisões em `decisoes.md`; este arquivo não repete nada disso.

## Links

- **Figma:** “Oficial Sintra Site”, arquivo `2mlqSKCNy170C8y0CyL5de`. Como editar: `figma.md`. IDs das telas: `analise-figma.md` §1.
- **GitHub:** repositório privado `Rafael-Rodrigues-Souza/Sintravc-sistema`.
  - Issues da Fase 1: #1 a #25, com dependências (“bloqueado por”) e os rótulos `area:*`, `fase-1` e `ready-for-agent`.
  - Ordem: #1 base, #2 deploy, depois a ordem do spec §11 T6. O backup é a #25.
  - Como usar: `agents/issue-tracker.md` e `agents/triage-labels.md`.

## Pessoas

| Quem | Papel |
|---|---|
| Rafael Rodrigues Souza | Autor dos documentos e desenvolvedor |
| Leandro | TI do sindicato. Os backups vão para o servidor do sindicato (`dependencias-cliente.md`) |
| Advogado do sindicato | Escreve a Política de privacidade |

### Personas de exemplo (Figma e histórias)

- **José Carlos da Silva**, matrícula 012345: associado.
- **Ana Lima**: Atendimento, responsável por Salões.
- **Paulo Mendes**: Atendimento com convite pendente, responsável por Jurídico e Exames.
- **Carlos Ribeiro**: Comunicação.
- O “hoje” das telas é quarta, 28/10/2026. A Assembleia é na sexta, 30/10/2026, às 19h, e o edital 012 vale de 20/10 a 30/10. O mês de exemplo dos relatórios é outubro/2026, com 312 atendimentos realizados.

## Onde estão os arquivos

Fora do repositório, em `Documents\SINTRAVC\material\`:

- `docs-v1.1\`: os 6 .docx originais (01 Visão geral … 06 Critérios de aceitação), v1.1 de 03/11/2026. As versões em .md, que valem daqui em diante, estão em `docs/`. O gerador original dos .docx se perdeu: para mudar algo, edite os .md.
- `SINTRAVC - Recomendação de stack.docx`: origem de `stack.md`.
- `figma\Prompt.txt`: guia usado para criar páginas novas no Figma no padrão da Home 2.0.
- `scripts\`: `docx2md.py` (converteu os .docx em .md), `tickets.py` (publicou as issues) e `ca_update.py` (ajustou os critérios de aceitação).
- `memoria-antiga\`: a memória do Claude Code das sessões feitas em `C:\Users\rafar`, guardada como registro.

## Linha do tempo

| Data | O que aconteceu |
|---|---|
| 22/10/2026 | Começo do redesign 2.0 no Figma |
| 28/10/2026 | Decisões de produto: Entrar só para associados, Filiar-se pelo WhatsApp, comunicados como faixa, três perfis, fases. Área do associado e agendamentos desenhados |
| 29/10/2026 | Auditoria das regras de agendamento (limites, faltas, dependentes) |
| 30/10/2026 | Recomendação de stack |
| 03/11/2026 | Docs v1.1 (6 .docx) e fluxo de convite e recuperação de acesso da equipe |
| 04/11/2026 | Docs convertidos para .md; `stack.md` e `analise-figma.md` |
| 05/11/2026 | Entrevista E01–E33 (`decisoes.md`), `spec.md` v1.0, issues #1–#25 e primeiro commit |

# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

Layout: **single-context**, adapted to this project.

## Before exploring, read these

1. **`docs/spec.md`**: the source of truth. Read the section relevant to the task.
2. **`docs/decisoes.md`**: the decision log (E01, E02, …). It plays the role of ADRs in this repo.
3. **`docs/correcoes-figma.md`**: read it before building any screen. It overrides the Figma file.
4. **`GLOSSARY.md`** at the repo root and **`docs/adr/`**, if they exist.

The conflict order is in `CLAUDE.md`: spec → decisoes → docs v1.1 → Figma.

If `GLOSSARY.md` or `docs/adr/` don't exist, **proceed silently**. Don't flag their absence and don't suggest creating them upfront. The `/domain-modeling` skill creates them lazily, when terms actually get resolved.

## Recording decisions

New product or business-rule decisions go into `docs/decisoes.md` with the next E number, not into a new ADR. Use `docs/adr/` only for purely technical or architectural decisions that don't change a product rule.

## Use the project's vocabulary

When your output names a domain concept (an issue title, a refactor proposal, a test name), use the terms from the spec and the docs. Examples: Associado, Comunicado, Documento oficial, Parceiro, Rádio Chofer, perfis Administrador geral / Comunicação / Atendimento. Don't drift to synonyms. If `GLOSSARY.md` exists, its terms win.

If the concept you need isn't in the docs yet, that's a signal: either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Flag conflicts

If your output contradicts a decision (E…) or an ADR, say so explicitly instead of silently overriding it:

> _Contradicts E14 (only one pinned news item), but worth reopening because…_

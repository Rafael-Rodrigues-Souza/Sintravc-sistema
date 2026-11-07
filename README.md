# SINTRAVC 2.0

Site público, Painel de gestão e Área do associado do SINTRAVC (Sindicato dos Rodoviários de Vitória da Conquista).

A especificação está em [`docs/spec.md`](docs/spec.md). As regras para quem desenvolve estão no [`CLAUDE.md`](CLAUDE.md).

## O que precisa estar instalado

- **Node 22.23.4** (`.nvmrc`). Com o nvm-windows: `nvm install 22.23.4` e `nvm use 22.23.4`.
- **pnpm 10**: `corepack enable pnpm` ou `npm i -g pnpm@10`.
- **Docker Desktop**, com WSL2.

## Rodar no computador (jeito padrão)

Os serviços rodam no Docker e o app roda direto no Windows. É mais rápido do que montar a pasta do Windows dentro de um container.

```sh
cp .env.example .env.local   # os valores já apontam para localhost
pnpm install
docker compose up -d         # Postgres, Mailpit e MinIO (cria o bucket sozinho)
pnpm dev                     # aplica as migrações e sobe http://localhost:3000
```

| O quê | Endereço |
|---|---|
| Site | http://localhost:3000 |
| Painel | http://localhost:3000/painel |
| Saúde (app + banco) | http://localhost:3000/api/saude |
| Caixa de e-mails (Mailpit) | http://localhost:8025 |
| Console de arquivos (MinIO) | http://localhost:9001 (usuário `sintravc`, senha `sintravc-segredo`) |
| Postgres | `localhost:5432` (usuário, senha e banco: `sintravc`) |

Para parar: `docker compose down`. Para apagar também os dados: `docker compose down -v`.

## Rodar o app também em container (jeito alternativo)

```sh
docker compose --profile app up --build
```

O compose já troca os endereços para a rede interna (`postgres`, `mailpit`, `minio`); não precisa mudar o `.env.local`. A URL pública dos arquivos continua em `localhost:9000`, porque quem abre é o navegador. Os comandos rodam dentro do container:

```sh
docker compose exec app pnpm teste:email --para teste@exemplo.com
docker compose exec app pnpm teste:arquivo
```

## Comandos

| Comando | O que faz |
|---|---|
| `pnpm dev` | Aplica as migrações e sobe o app em modo de desenvolvimento |
| `pnpm lint` / `pnpm typecheck` / `pnpm test` | O mesmo que o CI roda em todo PR |
| `pnpm db:gerar` | Gera uma migração a partir de `src/lib/db/schema` |
| `pnpm db:migrar` | Aplica as migrações pendentes |
| `pnpm db:studio` | Abre o Drizzle Studio |
| `pnpm teste:email --para x@y` | Envia um e-mail de teste (aparece no Mailpit) |
| `pnpm teste:arquivo` | Envia um arquivo de teste e imprime a URL pública |

## Homologação e produção: SMTP e R2 reais

O código é o mesmo. Só os valores das variáveis mudam (E32). O `.env.example` traz um exemplo comentado de cada uma:

- **E-mail (D2):** `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE=true` (porta 465), `SMTP_USUARIO`, `SMTP_SENHA`, `EMAIL_REMETENTE`.
- **Arquivos (D3, Cloudflare R2):** `S3_ENDPOINT=https://<conta>.r2.cloudflarestorage.com`, `S3_REGIAO=auto`, `S3_FORCAR_CAMINHO=false`, as chaves do token R2 e `S3_URL_PUBLICA` com o domínio público do bucket.

Se faltar alguma variável, o app para com uma mensagem que diz qual variável falta.

## Tema e componentes

- Os tokens do Figma (coleção “SINTRAVC 2.0”, modos Claro e Escuro) estão em `src/app/globals.css`. Uma variável `grupo/nome` do Figma vira `--grupo-nome` no CSS e a classe `bg-grupo-nome` (ou `text-…`, `border-…`) no Tailwind.
- Os estilos de texto 2.0 viram utilitários: `texto-botao`, `texto-corpo`, `texto-titulo-secao`…
- Componentes: `Button` (Botão 2.0: `primario`, `secundario`, `sobre-escuro`, `marinho`, `perigo`), `Input`, `Label` e `Campo` (Campo 2.0, com ajuda e erro) em `src/components/ui`.

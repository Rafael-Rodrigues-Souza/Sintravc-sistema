import "./carregar-env";

import { aplicarMigracoes } from "@/lib/db/migrar";
import { lerEnvBanco } from "@/lib/env";

aplicarMigracoes(lerEnvBanco().DATABASE_URL)
  .then(() => console.log("Migrações aplicadas."))
  .catch((erro: unknown) => {
    console.error("Falha ao aplicar as migrações:", erro instanceof Error ? erro.message : erro);
    process.exit(1);
  });

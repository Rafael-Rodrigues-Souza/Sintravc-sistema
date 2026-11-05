import { loadEnvConfig } from "@next/env";

// Mesmas regras do Next: .env, .env.local, .env.development… Variáveis já definidas
// (por exemplo, pelo docker compose) não são sobrescritas.
loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");

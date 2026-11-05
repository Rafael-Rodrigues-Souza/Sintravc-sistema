import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

import { lerEnvBanco } from "./src/lib/env";

loadEnvConfig(process.cwd());

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/db/schema",
  out: "./drizzle",
  casing: "snake_case",
  dbCredentials: { url: lerEnvBanco().DATABASE_URL },
});

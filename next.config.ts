import type { NextConfig } from "next";

// Raiz fixa no próprio projeto. Sem isso, um package-lock.json numa pasta acima
// (ex.: C:\Users\<nome>) faz o Next vigiar a pasta do usuário inteira, e qualquer
// arquivo gravado ali (logs, por exemplo) recarrega a página sem parar.
const raiz = __dirname;

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: raiz,
  turbopack: { root: raiz },
};

export default nextConfig;

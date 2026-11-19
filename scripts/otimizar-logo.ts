/**
 * Gera as versões web da logo do sindicato (#13) a partir dos arquivos originais.
 * Uso: pnpm tsx scripts/otimizar-logo.ts [pasta-de-origem]  (padrão: .scratch/logos)
 *
 * - tema claro: “Logo Original Nome Azul”; tema escuro: “Versão Branca”; impressão: “Versão Preta”;
 * - recorta a margem transparente e reduz para ALTURA px (3× os 64 px do rodapé);
 * - grava WebP e PNG em public/marca/.
 */
import { mkdirSync } from "node:fs";
import path from "node:path";

import sharp from "sharp";

const ALTURA = 192;
const origem = process.argv[2] ?? ".scratch/logos";
const destino = "public/marca";

const versoes = [
  { arquivo: "Logo Original Nome Azul PNG.png", nome: "sintravc-clara" },
  { arquivo: "Versão Branca.png", nome: "sintravc-escura" },
  { arquivo: "Versão preta .png", nome: "sintravc-preta" },
];

async function gerar(arquivo: string, nome: string) {
  // Recorte pelo canal alfa: limiar alto para ignorar pontinhos quase transparentes nas bordas.
  const recortada = await sharp(path.join(origem, arquivo))
    .ensureAlpha()
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 60 })
    .toBuffer();
  const base = sharp(recortada).resize({ height: ALTURA, withoutEnlargement: true });
  const webp = await base.clone().webp({ quality: 90, alphaQuality: 100 }).toFile(path.join(destino, `${nome}.webp`));
  const png = await base.clone().png({ compressionLevel: 9, palette: true }).toFile(path.join(destino, `${nome}.png`));
  console.log(`${nome}: ${webp.width}×${webp.height} · webp ${webp.size} B · png ${png.size} B`);
}

mkdirSync(destino, { recursive: true });
async function main() {
  for (const v of versoes) await gerar(v.arquivo, v.nome);
}

void main();

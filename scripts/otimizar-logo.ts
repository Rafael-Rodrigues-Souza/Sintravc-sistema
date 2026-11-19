/**
 * Gera as versões web da logo do sindicato (#13) e os ícones da aba e de atalho (#61) a partir dos
 * arquivos originais.
 * Uso: pnpm tsx scripts/otimizar-logo.ts [pasta-de-origem]  (padrão: .scratch/logos)
 *
 * - tema claro: “Logo Original Nome Azul”; tema escuro: “Versão Branca”; impressão: “Versão Preta”;
 * - recorta a margem transparente e reduz para ALTURA px (3× os 64 px do rodapé);
 * - grava WebP e PNG em public/marca/;
 * - ícones: só o desenho dos rodoviários (sem o texto), sobre um quadrado branco, para aparecer na aba
 *   clara e na escura. src/app/icon.png (cantos arredondados) e src/app/apple-icon.png (opaco: o iOS
 *   arredonda sozinho). O Next monta os <link> a partir desses arquivos.
 */
import { mkdirSync } from "node:fs";
import path from "node:path";

import sharp from "sharp";

const ALTURA = 192;
/** Alfa mínimo para um pixel contar como desenho (o mesmo limiar do recorte). */
const LIMIAR_ALFA = 60;
const origem = process.argv[2] ?? ".scratch/logos";
const destino = "public/marca";

const versoes = [
  { arquivo: "Logo Original Nome Azul PNG.png", nome: "sintravc-clara" },
  { arquivo: "Versão Branca.png", nome: "sintravc-escura" },
  { arquivo: "Versão preta .png", nome: "sintravc-preta" },
];

const ORIGEM_ICONE = "Logo Original Nome Azul PNG.png";
const icones = [
  { arquivo: "src/app/icon.png", lado: 192, arredondado: true },
  { arquivo: "src/app/apple-icon.png", lado: 180, arredondado: false },
];
/** Margem entre o desenho e a borda do quadrado, em fração do lado. */
const MARGEM_ICONE = 0.1;

async function recortar(arquivo: string) {
  // Recorte pelo canal alfa: limiar alto para ignorar pontinhos quase transparentes nas bordas.
  return sharp(path.join(origem, arquivo))
    .ensureAlpha()
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: LIMIAR_ALFA })
    .toBuffer();
}

async function gerar(arquivo: string, nome: string) {
  const base = sharp(await recortar(arquivo)).resize({ height: ALTURA, withoutEnlargement: true });
  const webp = await base.clone().webp({ quality: 90, alphaQuality: 100 }).toFile(path.join(destino, `${nome}.webp`));
  const png = await base.clone().png({ compressionLevel: 9, palette: true }).toFile(path.join(destino, `${nome}.png`));
  console.log(`${nome}: ${webp.width}×${webp.height} · webp ${webp.size} B · png ${png.size} B`);
}

/**
 * O desenho dos rodoviários: da logo recortada, o que fica acima dos dois blocos de texto (o
 * “Sintravc” e o nome por extenso). Cada bloco é separado do anterior por uma faixa de linhas sem
 * nenhum pixel de desenho; o desenho termina na penúltima faixa. (A primeira faixa não serve: há um
 * vão de poucas linhas entre a cabeça do meio e o corpo.)
 */
async function recortarDesenho(): Promise<Buffer> {
  const recortada = await recortar(ORIGEM_ICONE);
  const { data, info } = await sharp(recortada).raw().toBuffer({ resolveWithObject: true });
  const linhaVazia = (y: number) => {
    for (let x = 0; x < info.width; x++) if (data[(y * info.width + x) * info.channels + 3]! >= LIMIAR_ALFA) return false;
    return true;
  };
  /** Primeira linha de cada faixa vazia. */
  const faixas: number[] = [];
  for (let y = 1; y < info.height; y++) if (linhaVazia(y) && !linhaVazia(y - 1)) faixas.push(y);
  const fim = faixas.at(-2);
  if (fim === undefined) throw new Error(`Não achei os dois blocos de texto abaixo do desenho em “${ORIGEM_ICONE}”.`);
  const parte = await sharp(recortada).extract({ left: 0, top: 0, width: info.width, height: fim }).toBuffer();
  return sharp(parte).trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: LIMIAR_ALFA }).toBuffer();
}

async function gerarIcone(desenho: Buffer, arquivo: string, lado: number, arredondado: boolean) {
  const interno = Math.round(lado * (1 - 2 * MARGEM_ICONE));
  const reduzido = await sharp(desenho).resize({ width: interno, height: interno, fit: "inside" }).toBuffer();
  const raio = arredondado ? Math.round(lado * 0.2) : 0;
  const fundo = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${lado}" height="${lado}"><rect width="${lado}" height="${lado}" rx="${raio}" fill="#ffffff"/></svg>`,
  );
  const saida = await sharp(fundo)
    .composite([{ input: reduzido, gravity: "center" }])
    .png({ compressionLevel: 9 })
    .toFile(arquivo);
  console.log(`${arquivo}: ${saida.width}×${saida.height} · ${saida.size} B`);
}

mkdirSync(destino, { recursive: true });
async function main() {
  for (const v of versoes) await gerar(v.arquivo, v.nome);
  const desenho = await recortarDesenho();
  for (const i of icones) await gerarIcone(desenho, i.arquivo, i.lado, i.arredondado);
}

void main();

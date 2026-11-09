/**
 * O "Onde" dos e-mails de segurança (M03, M04): o navegador e o sistema, a partir do User-Agent.
 * Não mostramos a cidade do Figma ("Vitória da Conquista – BA, aprox."): exigiria um serviço de
 * localização por IP (correcoes-figma.md).
 */
const NAVEGADORES: [RegExp, string][] = [
  [/Edg\//, "Edge"],
  [/OPR\/|Opera/, "Opera"],
  [/SamsungBrowser\//, "Samsung Internet"],
  [/Firefox\/|FxiOS\//, "Firefox"],
  [/Chrome\/|CriOS\//, "Chrome"],
  [/Version\/[\d.]+.*Safari\//, "Safari"],
];

const SISTEMAS: [RegExp, string][] = [
  [/Android/, "Android"],
  [/iPhone/, "iPhone"],
  [/iPad/, "iPad"],
  [/Windows/, "Windows"],
  [/Mac OS X|Macintosh/, "Mac"],
  [/Linux/, "Linux"],
];

export function navegadorDe(agente: string | undefined | null): string {
  const navegador = NAVEGADORES.find(([padrao]) => padrao.test(agente ?? ""))?.[1];
  if (!navegador) return "Navegador não identificado";
  const sistema = SISTEMAS.find(([padrao]) => padrao.test(agente ?? ""))?.[1];
  return sistema ? `Navegador ${navegador} · ${sistema}` : `Navegador ${navegador}`;
}

/**
 * Alvos de toque pequenos (E48, issue #44). Roda dentro do navegador (page.evaluate) e é usada pelos
 * e2e @responsivo e pela skill conferir-responsivo, para as duas medirem do mesmo jeito.
 *
 * O que conta é a área que responde ao toque, não o desenho: um ícone de 36 px com uma área
 * clicável invisível de 44 px passa. Para cada alvo menor que o mínimo, o centro e os cantos de um
 * quadrado do tamanho mínimo, centrado no alvo, precisam acertar o próprio alvo (ou o rótulo dele).
 * Assim também se pega o alvo grande o bastante no desenho, mas coberto pelo vizinho.
 *
 * Ficam de fora: o que está coberto por outra camada (menu aberto, diálogo: o centro do alvo não o
 * acerta, então ele não está ao alcance agora), link no meio de um parágrafo (o WCAG dispensa), texto só para leitor de tela,
 * campo escondido sob um rótulo visível (o alvo é o rótulo), o que está com aria-hidden ou inert,
 * e o que está desativado.
 */
export type AlvoPequeno = { alvo: string; molde: string; tamanho: string };

/** `dentro` (seletor) limita os alvos medidos a uma parte da tela; os vizinhos de fora continuam podendo cobri-los. */
export function alvosDeToquePequenos(medida: number | { minimo: number; dentro: string }): AlvoPequeno[] {
  const { minimo, dentro } = typeof medida === "number" ? { minimo: medida, dentro: "body" } : medida;
  const CLICAVEIS =
    "a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button], [role=checkbox], [role=switch], [role=tab], [role=menuitem], [role=radio], [role=link], [role=combobox]";

  const visivel = (el: Element) => {
    const r = el.getBoundingClientRect();
    const estilo = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && estilo.visibility !== "hidden" && Number(estilo.opacity) > 0;
  };
  const soLeitor = (el: Element) => {
    const estilo = getComputedStyle(el);
    return estilo.position === "absolute" && (estilo.clip === "rect(0px, 0px, 0px, 0px)" || estilo.clipPath === "inset(50%)");
  };
  const linkNoTexto = (el: Element) =>
    el.matches("a") && getComputedStyle(el).display === "inline" && el.closest("p, li, dd, td, blockquote") !== null;
  const dePropósito = (el: Element) =>
    soLeitor(el) ||
    el.closest("[aria-hidden=true], [inert]") !== null ||
    el.matches(":disabled, [aria-disabled=true]") ||
    (el instanceof HTMLInputElement && [...(el.labels ?? [])].some(visivel));
  // Nome para o relatório: aria-label, o texto, o rótulo ligado (label for), o title e, por fim, o id.
  const nome = (el: Element) => {
    const rotulos = "labels" in el ? [...((el as HTMLButtonElement).labels ?? [])].map((l) => l.textContent ?? "").join(" ") : "";
    const texto = [el.getAttribute("aria-label"), el.textContent, rotulos, el.getAttribute("title")]
      .map((t) => (t ?? "").trim().replace(/\s+/g, " "))
      .find((t) => t !== "");
    return `<${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ""}> “${(texto ?? "").slice(0, 40)}”`;
  };

  /** O ponto acerta o alvo: o próprio elemento, algo dentro dele ou o rótulo ligado a ele. */
  const acerta = (el: Element, x: number, y: number) => {
    // Fora da tela não há o que tocar: o alvo encostado na borda não perde por isso.
    if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) return true;
    const tocado = document.elementFromPoint(x, y);
    if (!tocado) return false;
    if (el === tocado || el.contains(tocado)) return true;
    const rotulo = tocado.closest("label");
    return rotulo !== null && (rotulo.control === el || rotulo.contains(el));
  };

  const pequenos: AlvoPequeno[] = [];
  const raiz = document.querySelector(dentro);
  if (!raiz) throw new Error(`alvosDeToquePequenos: nada em “${dentro}”`);
  const alvos = [...raiz.querySelectorAll(CLICAVEIS)].filter((el) => visivel(el) && !linkNoTexto(el) && !dePropósito(el));
  // Um alvo dentro de outro (ícone dentro do link) conta como o de fora.
  const externos = alvos.filter((el) => !alvos.some((outro) => outro !== el && outro.contains(el)));
  for (const el of externos) {
    let r = el.getBoundingClientRect();
    if (r.width >= minimo && r.height >= minimo) continue;
    el.scrollIntoView({ block: "center", inline: "nearest" });
    r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    // Coberto por outra camada (menu aberto, diálogo): não está ao alcance do toque agora.
    if (!acerta(el, cx, cy)) continue;
    const meio = minimo / 2 - 1;
    const pontos = [
      [cx - meio, cy - meio],
      [cx + meio, cy - meio],
      [cx - meio, cy + meio],
      [cx + meio, cy + meio],
    ] as const;
    if (!pontos.every(([x, y]) => acerta(el, x, y))) {
      pequenos.push({ alvo: nome(el), molde: `${el.tagName.toLowerCase()}.${(el.getAttribute("class") ?? "").slice(0, 120)}`, tamanho: `${Math.round(r.width)}×${Math.round(r.height)} px` });
    }
  }
  window.scrollTo(0, 0);
  return pequenos;
}

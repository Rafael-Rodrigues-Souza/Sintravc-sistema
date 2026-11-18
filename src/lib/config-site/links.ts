/** Links do site a partir dos dados da ConfigSite (RN03, RN43). */

/** Conversa no WhatsApp; com `mensagem`, ela já vem escrita (RN03). */
export function linkWhatsApp(numero: string, mensagem?: string): string {
  const base = `https://wa.me/${numero}`;
  return mensagem ? `${base}?text=${encodeURIComponent(mensagem)}` : base;
}

/** `tel:` com o código do Brasil. `telefone` vem só com dígitos e DDD. */
export function linkTelefone(telefone: string): string {
  return `tel:+55${telefone}`;
}

export function linkEmail(email: string): string {
  return `mailto:${email}`;
}

/** (77) 3423-4959 ou (77) 99123-4567. */
export function formatarTelefone(telefone: string): string {
  const ddd = telefone.slice(0, 2);
  const numero = telefone.slice(2);
  const corte = numero.length - 4;
  return `(${ddd}) ${numero.slice(0, corte)}-${numero.slice(corte)}`;
}

/** Mapa do Google embutido, sem chave de API. Só carrega com o consentimento (E56). */
export function linkMapaEmbutido(endereco: string): string {
  return `https://www.google.com/maps?q=${encodeURIComponent(endereco)}&output=embed`;
}

/** Rota no Google Maps até o endereço. */
export function linkRota(endereco: string): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(endereco)}`;
}

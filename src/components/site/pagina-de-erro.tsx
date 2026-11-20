import { Eyebrow } from "./partes-da-pagina";

/**
 * Página de erro do site (Figma 159:8590 / 159:8788 para a 404; 295:58454 / 295:58768 para a 500, N2):
 * o código grande em amarelo, o título, a explicação e as ações.
 */
export function PaginaDeErro({
  codigo,
  titulo,
  texto,
  children,
}: {
  codigo: string;
  titulo: string;
  texto: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby="titulo-erro" className="conteudo-site flex flex-col gap-6 py-14 lg:flex-row lg:items-center lg:gap-24 lg:py-28">
      <p aria-hidden className="text-center font-condensed text-[120px] leading-[0.9] font-extrabold tracking-[-0.005em] text-destaque-amarelo lg:text-left lg:text-[220px]">
        {codigo}
      </p>
      <div className="flex flex-1 flex-col gap-[18px]">
        <Eyebrow>Erro {codigo}</Eyebrow>
        <h1 id="titulo-erro" tabIndex={-1} className="texto-titulo-secao-mobile text-texto-primario outline-none lg:texto-titulo-secao">
          {titulo}
        </h1>
        <p className="texto-corpo text-texto-secundario lg:texto-corpo-grande">{texto}</p>
        {children}
      </div>
    </section>
  );
}

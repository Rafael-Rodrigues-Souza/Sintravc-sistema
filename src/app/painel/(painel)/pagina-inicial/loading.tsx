import { Skeleton } from "@/components/ui/skeleton";

/** Carregando a Página inicial (E23): título, o carrossel e a lista “Em destaque”. */
export default function CarregandoPaginaInicial() {
  return (
    <div className="flex flex-col gap-6 px-4 pt-5 pb-12 lg:px-10 lg:pt-8" aria-busy="true" aria-label="Carregando a Página inicial">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="hidden h-6 w-full max-w-[640px] lg:block" />
        </div>
        <Skeleton className="hidden h-12 w-72 shrink-0 rounded-full lg:block" />
      </div>
      <Skeleton className="h-5 w-72" />
      {[5, 3].map((linhas, k) => (
        <div key={k} className="flex flex-col gap-3 rounded-[20px] border border-borda-padrao bg-fundo-superficie p-4 lg:p-6">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-4 w-full max-w-[420px]" />
          {Array.from({ length: linhas }, (_, i) => (
            <div key={i} className="flex items-center gap-4 py-2">
              <Skeleton className="hidden size-6 shrink-0 lg:block" />
              <Skeleton className="h-14 w-24 shrink-0 rounded-[8px]" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-5 w-3/4" />
              </div>
              <Skeleton className="size-9 shrink-0 rounded-[10px]" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

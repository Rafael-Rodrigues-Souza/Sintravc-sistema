import { Skeleton } from "@/components/ui/skeleton";

/** Carregando Conteúdos (E23). */
export default function CarregandoConteudos() {
  return (
    <div className="flex flex-col gap-6 px-5 pt-8 pb-12 lg:px-10" aria-busy="true" aria-label="Carregando Conteúdos">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-6 w-full max-w-[640px]" />
      </div>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-10 w-28 rounded-full" />
        ))}
      </div>
      <div className="flex flex-col gap-3 rounded-[16px] border border-borda-padrao bg-fundo-superficie p-4">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex items-center gap-4 py-2">
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/3" />
            </div>
            <Skeleton className="hidden h-6 w-24 rounded-full sm:block" />
            <Skeleton className="hidden h-5 w-28 md:block" />
          </div>
        ))}
      </div>
    </div>
  );
}

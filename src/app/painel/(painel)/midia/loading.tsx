import { Skeleton } from "@/components/ui/skeleton";

/** Carregando a Mídia (E23). */
export default function CarregandoMidia() {
  return (
    <div className="flex flex-col gap-6 px-5 pt-8 pb-12 lg:px-10" aria-busy="true" aria-label="Carregando a Mídia">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-6 w-full max-w-[640px]" />
      </div>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-10 w-28 rounded-full" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="flex flex-col gap-2.5 rounded-[16px] border border-borda-padrao bg-fundo-superficie p-2 pb-3">
            <Skeleton className="h-28 w-full rounded-[10px]" />
            <Skeleton className="mx-1 h-5 w-3/4" />
            <Skeleton className="mx-1 h-4 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}

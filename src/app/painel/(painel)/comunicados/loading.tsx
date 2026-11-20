import { Skeleton } from "@/components/ui/skeleton";

/** Carregando Comunicados (E23): título, “No site agora”, abas e a lista. */
export default function CarregandoComunicados() {
  return (
    <div className="flex flex-col gap-6 px-5 pt-8 pb-12 lg:px-10" aria-busy="true" aria-label="Carregando Comunicados">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-6 w-full max-w-[640px]" />
        </div>
        <Skeleton className="h-11 w-11 shrink-0 rounded-[10px] lg:w-44" />
      </div>
      <div className="flex flex-col gap-3 rounded-[16px] border border-borda-padrao bg-fundo-superficie p-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-14 w-full rounded-[8px]" />
      </div>
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-10 w-28 shrink-0 rounded-full" />
        ))}
      </div>
      <div className="flex flex-col gap-3 rounded-[16px] border border-borda-padrao bg-fundo-superficie p-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex items-center gap-4 py-2">
            <Skeleton className="hidden size-6 shrink-0 lg:block" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/3" />
            </div>
            <Skeleton className="hidden h-5 w-28 md:block" />
            <Skeleton className="size-8 shrink-0 rounded-[8px]" />
          </div>
        ))}
      </div>
    </div>
  );
}

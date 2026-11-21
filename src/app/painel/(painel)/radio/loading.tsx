import { Skeleton } from "@/components/ui/skeleton";

/** Carregando o Rádio Chofer (E23): título, programa ao vivo e a lista de episódios. */
export default function CarregandoRadio() {
  return (
    <div className="flex flex-col gap-6 px-4 pt-5 pb-12 lg:px-10 lg:pt-8" aria-busy="true" aria-label="Carregando o Rádio Chofer">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="hidden h-6 w-full max-w-[640px] lg:block" />
        </div>
        <Skeleton className="h-11 w-11 shrink-0 rounded-full lg:w-52" />
      </div>
      <div className="flex flex-col gap-4 rounded-[20px] border border-borda-padrao bg-fundo-superficie p-5 lg:p-6">
        <Skeleton className="h-6 w-40" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-12 w-full rounded-[14px]" />
          <Skeleton className="h-12 w-full rounded-[14px]" />
        </div>
      </div>
      <div className="flex flex-col gap-3 rounded-[20px] border border-borda-padrao bg-fundo-superficie p-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex items-center gap-4 py-2">
            <Skeleton className="h-[62px] w-[110px] shrink-0 rounded-[8px]" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-5 w-3/4" />
            </div>
            <Skeleton className="hidden h-10 w-28 md:block" />
            <Skeleton className="size-8 shrink-0 rounded-[8px]" />
          </div>
        ))}
      </div>
    </div>
  );
}

import { Skeleton } from "@/components/ui/skeleton";

/** Carregando o editor de documento (E23): o desenho do editor, não o da lista. */
export default function CarregandoEditor() {
  return (
    <div className="flex flex-1 flex-col" aria-busy="true" aria-label="Carregando o editor">
      <div className="flex items-center gap-3 border-b border-borda-padrao bg-fundo-cabecalho px-5 py-3 lg:px-10">
        <Skeleton className="size-9 rounded-full" />
        <div className="flex flex-1 flex-col gap-1.5">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="hidden h-10 w-36 rounded-full sm:block" />
        <Skeleton className="hidden h-10 w-28 rounded-full sm:block" />
      </div>
      <div className="flex flex-col gap-6 px-5 pt-6 pb-12 lg:px-10 xl:flex-row xl:items-start">
        <div className="flex flex-1 flex-col gap-5 rounded-[20px] border border-borda-padrao bg-fundo-superficie p-6">
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-[52px] w-full rounded-[14px]" />
          <Skeleton className="h-[72px] w-full rounded-[14px]" />
          <Skeleton className="h-[88px] w-full rounded-[14px]" />
          <Skeleton className="h-[280px] w-full rounded-[14px]" />
        </div>
        <div className="flex flex-col gap-4 rounded-[20px] border border-borda-padrao bg-fundo-superficie p-6 xl:w-[320px]">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-[52px] w-full rounded-[14px]" />
          <Skeleton className="h-[52px] w-full rounded-[14px]" />
          <Skeleton className="h-[52px] w-full rounded-[14px]" />
        </div>
      </div>
    </div>
  );
}

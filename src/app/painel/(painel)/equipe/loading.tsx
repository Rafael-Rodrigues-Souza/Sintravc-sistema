import { Skeleton } from "@/components/ui/skeleton";

/** Carregando a lista da equipe (E23). */
export default function CarregandoEquipe() {
  return (
    <div className="flex flex-col gap-7 px-5 py-8 lg:px-10" aria-busy="true" aria-label="Carregando a equipe">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-6 w-full max-w-[640px]" />
      </div>
      <div className="flex flex-col overflow-hidden rounded-[16px] border border-borda-padrao bg-fundo-superficie">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex items-center gap-3 border-b border-borda-padrao px-6 py-4 last:border-b-0">
            <Skeleton className="size-10 rounded-full" />
            <div className="flex flex-1 flex-col gap-1.5">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-56" />
            </div>
            <Skeleton className="hidden h-6 w-32 rounded-full md:block" />
            <Skeleton className="hidden h-6 w-20 rounded-full md:block" />
          </div>
        ))}
      </div>
    </div>
  );
}

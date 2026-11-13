import { Skeleton } from "@/components/ui/skeleton";

/** Carregando a prévia (E23): a barra, a notícia e a lista "Confira antes de publicar". */
export default function CarregandoPrevia() {
  return (
    <div className="flex flex-1 flex-col" aria-busy="true" aria-label="Carregando a prévia">
      <div className="flex items-center gap-3 bg-fundo-marinho-profundo px-4 py-3 sm:px-8">
        <Skeleton className="h-10 w-40 rounded-full" />
        <Skeleton className="h-6 w-52 rounded-full" />
        <Skeleton className="ml-auto hidden h-10 w-56 rounded-full md:block" />
        <Skeleton className="h-10 w-32 rounded-full" />
      </div>
      <div className="flex flex-col gap-6 md:p-8">
        <div className="flex flex-col gap-4 bg-fundo-marinho px-4 py-8 md:rounded-[24px] md:px-10">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-12 w-full max-w-[720px]" />
          <Skeleton className="h-12 w-3/4 max-w-[560px]" />
          <Skeleton className="h-5 w-64" />
        </div>
        <div className="mx-auto flex w-full max-w-[820px] flex-col gap-4 px-4">
          <Skeleton className="aspect-video w-full rounded-[20px]" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-11/12" />
          <Skeleton className="h-5 w-4/5" />
        </div>
      </div>
    </div>
  );
}

import { cn } from "@/lib/utils";

/** Skeleton do carregamento (E23). */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden
      className={cn("animate-pulse rounded-[10px] bg-fundo-superficie-alt", className)}
      {...props}
    />
  );
}

export { Skeleton };

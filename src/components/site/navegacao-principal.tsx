"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavigationMenu } from "radix-ui";

import { IconeFigma } from "@/components/icone-figma";
import { cn } from "@/lib/utils";

import { ehGrupo, estaAtivo, MENU_PRINCIPAL, type GrupoDeMenu, type ItemDeMenu } from "./navegacao";

/** Item do menu (E63): o atual numa pílula azul-clara; os outros ganham um fundo leve no mouse. */
const rotulo =
  "texto-navegacao flex items-center gap-1 rounded-full px-3.5 py-2 font-medium whitespace-nowrap outline-none focus-visible:ring-[3px] focus-visible:ring-ring xl:px-4";
const pilulaAtiva = "bg-destaque-azul-suave text-destaque-azul";
const pilulaInativa = "text-texto-secundario hover:bg-fundo-superficie-alt hover:text-texto-primario";

function Item({ item, caminho }: { item: ItemDeMenu; caminho: string }) {
  const ativo = estaAtivo(item, caminho);
  return (
    <NavigationMenu.Item>
      <NavigationMenu.Link asChild active={ativo}>
        <Link href={item.href} aria-current={ativo ? "page" : undefined} className={cn(rotulo, "alvo-toque", ativo ? pilulaAtiva : pilulaInativa)}>
          {item.rotulo}
        </Link>
      </NavigationMenu.Link>
    </NavigationMenu.Item>
  );
}

function Grupo({ grupo, caminho }: { grupo: GrupoDeMenu; caminho: string }) {
  const ativo = estaAtivo(grupo, caminho);
  return (
    <NavigationMenu.Item className="relative">
      <NavigationMenu.Trigger
        className={cn(rotulo, "group alvo-toque", ativo ? pilulaAtiva : cn(pilulaInativa, "data-[state=open]:bg-fundo-superficie-alt data-[state=open]:text-texto-primario"))}
      >
        {grupo.rotulo}
        <IconeFigma src="/site/icone-seta-baixo.svg" tamanho={14} className="transition-transform group-data-[state=open]:rotate-180" />
      </NavigationMenu.Trigger>
      <NavigationMenu.Content className="absolute top-full left-1/2 z-40 mt-3 w-max min-w-[220px] -translate-x-1/2 rounded-[16px] border border-borda-padrao bg-fundo-superficie p-2 shadow-[0_12px_32px_rgba(10,20,36,0.16)]">
        <ul className="flex flex-col">
          {grupo.itens.map((item) => {
            const atual = estaAtivo(item, caminho);
            return (
              <li key={item.href}>
                <NavigationMenu.Link asChild active={atual}>
                  <Link
                    href={item.href}
                    aria-current={atual ? "page" : undefined}
                    className={cn(
                      "texto-navegacao flex min-h-11 items-center rounded-[10px] px-4 outline-none hover:bg-fundo-superficie-alt focus-visible:ring-[3px] focus-visible:ring-ring",
                      atual ? "text-destaque-azul" : "text-texto-primario",
                    )}
                  >
                    {item.rotulo}
                  </Link>
                </NavigationMenu.Link>
              </li>
            );
          })}
        </ul>
      </NavigationMenu.Content>
    </NavigationMenu.Item>
  );
}

/**
 * Menu principal do desktop (Figma 295:51110; E63: pílula no item atual). Notícias, Sindicato e
 * Documentos abrem no clique, no toque e no teclado.
 */
export function NavegacaoPrincipal() {
  const caminho = usePathname();
  return (
    <NavigationMenu.Root aria-label="Principal" delayDuration={150} className="hidden lg:block">
      <NavigationMenu.List className="flex items-center gap-1">
        {MENU_PRINCIPAL.map((entrada) =>
          ehGrupo(entrada) ? (
            <Grupo key={entrada.rotulo} grupo={entrada} caminho={caminho} />
          ) : (
            <Item key={entrada.href} item={entrada} caminho={caminho} />
          ),
        )}
      </NavigationMenu.List>
    </NavigationMenu.Root>
  );
}

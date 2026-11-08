"use client";

import { useActionState, useState } from "react";

import { IconeFigma } from "@/components/icone-figma";
import { Alerta } from "@/components/ui/alerta";
import { Button } from "@/components/ui/button";
import { Campo } from "@/components/ui/campo";
import { validarSenhaDaEquipe } from "@/lib/acesso/senha";
import { cn } from "@/lib/utils";

import { acaoCriarSenha, type EstadoCriarSenha } from "./acoes";

/**
 * Passo 1 do convite (Figma 262:40091 e 265:40873). Os requisitos da RN47 são conferidos
 * enquanto a pessoa digita, com a mesma função do servidor; o servidor confere de novo ao enviar.
 */
export function CriarSenha({
  token,
  pessoa,
  minimo,
}: {
  token: string;
  pessoa: { nome: string; email: string };
  minimo: number;
}) {
  const [estado, enviar, enviando] = useActionState<EstadoCriarSenha, FormData>(acaoCriarSenha, {});
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");

  const faltando = validarSenhaDaEquipe({ senha, minimo, ...pessoa });
  const requisitos = [
    { texto: `Pelo menos ${minimo} caracteres`, ok: senha.length > 0 && !faltando.includes("minimo") },
    { texto: "Letras e números", ok: senha.length > 0 && !faltando.includes("letras_e_numeros") },
    {
      texto: "Diferente do e-mail e do nome",
      ok: senha.length > 0 && !faltando.includes("diferente_do_email") && !faltando.includes("diferente_do_nome"),
    },
    { texto: "As duas senhas são iguais", ok: confirmacao.length > 0 && senha === confirmacao },
  ];

  return (
    <form action={enviar} className="flex flex-col gap-[18px]" noValidate>
      <input type="hidden" name="token" value={token} />
      {/* Ajuda os gerenciadores de senha a salvar com o e-mail certo. */}
      <input type="email" name="email" value={pessoa.email} autoComplete="username" readOnly hidden />

      {estado.erro ? (
        <Alerta tipo="erro" titulo="Não foi possível criar a senha">
          {estado.erro}
        </Alerta>
      ) : null}

      <Campo
        id="senha"
        name="senha"
        type="password"
        rotulo="Nova senha *"
        icone="/painel/icone-cadeado-campo.svg"
        autoComplete="new-password"
        value={senha}
        onChange={(e) => setSenha(e.target.value)}
        aria-describedby="requisitos-da-senha"
        required
      />
      <Campo
        id="confirmacao"
        name="confirmacao"
        type="password"
        rotulo="Confirmar senha *"
        icone="/painel/icone-cadeado-campo.svg"
        autoComplete="new-password"
        value={confirmacao}
        onChange={(e) => setConfirmacao(e.target.value)}
        required
      />

      <ul id="requisitos-da-senha" aria-label="Requisitos da senha" className="flex flex-col gap-1.5">
        {requisitos.map((r) => (
          <li
            key={r.texto}
            className={cn(
              "flex items-center gap-2 texto-pequeno",
              r.ok ? "text-status-sucesso-texto" : "text-texto-terciario",
            )}
          >
            <IconeFigma src="/painel/icone-check-marca.svg" tamanho={16} />
            {r.texto}
            <span className="sr-only">{r.ok ? "(atendido)" : "(ainda não atendido)"}</span>
          </li>
        ))}
      </ul>

      <Button type="submit" className="w-full" disabled={enviando}>
        {enviando ? "Criando…" : "Criar senha e continuar"}
      </Button>
    </form>
  );
}

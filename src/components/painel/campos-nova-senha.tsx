"use client";

import { useState } from "react";

import { IconeFigma } from "@/components/icone-figma";
import { Campo } from "@/components/ui/campo";
import { validarSenhaDaEquipe } from "@/lib/acesso/senha";
import { cn } from "@/lib/utils";

/**
 * Senha nova e confirmação, com os requisitos da RN47 (Figma 262:40091 e 262:40849).
 * Os requisitos são conferidos enquanto a pessoa digita, com a mesma função do servidor; o servidor
 * confere de novo ao enviar. "Diferente das últimas senhas" só o servidor sabe: o item fica neutro.
 */
export function CamposNovaSenha({
  pessoa,
  minimo,
  rotuloConfirmacao = "Confirmar senha *",
  ultimasSenhas,
}: {
  pessoa: { nome: string; email: string };
  minimo: number;
  rotuloConfirmacao?: string;
  /** Mostra o item "Diferente das N últimas senhas" (equipe.senhas_anteriores_bloqueadas). */
  ultimasSenhas?: number;
}) {
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");

  const faltando = validarSenhaDaEquipe({ senha, minimo, ...pessoa });
  const requisitos: { texto: string; ok: boolean | null }[] = [
    { texto: `Pelo menos ${minimo} caracteres`, ok: senha.length > 0 && !faltando.includes("minimo") },
    { texto: "Letras e números", ok: senha.length > 0 && !faltando.includes("letras_e_numeros") },
    {
      texto: "Diferente do e-mail e do nome",
      ok: senha.length > 0 && !faltando.includes("diferente_do_email") && !faltando.includes("diferente_do_nome"),
    },
    ...(ultimasSenhas ? [{ texto: `Diferente das ${ultimasSenhas} últimas senhas`, ok: null }] : []),
    { texto: "As duas senhas são iguais", ok: confirmacao.length > 0 && senha === confirmacao },
  ];

  return (
    <>
      {/* Ajuda os gerenciadores de senha a salvar com o e-mail certo. */}
      <input type="email" name="email" value={pessoa.email} autoComplete="username" readOnly hidden />
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
        rotulo={rotuloConfirmacao}
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
            <span className="sr-only">
              {r.ok === null ? "(conferido ao salvar)" : r.ok ? "(atendido)" : "(ainda não atendido)"}
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}

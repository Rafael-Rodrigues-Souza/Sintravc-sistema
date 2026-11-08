import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { twoFactor } from "better-auth/plugins";

import { banco } from "@/lib/db";
import { contaLogin, duasEtapas, pessoaEquipe, sessao, verificacao } from "@/lib/db/schema";
import { lerEnvAcesso } from "@/lib/env";

import { OPCOES_TOTP } from "./opcoes-totp";

/**
 * Better Auth da equipe (E35, E36). A pessoa_equipe é a tabela de usuários; as outras tabelas
 * têm nomes em português e o mapeamento está aqui.
 *
 * O login só passa pelas nossas funções (entrar e confirmarCodigo, em ./entrar.ts), que aplicam
 * o bloqueio por tentativas (RN05). Por isso as rotas HTTP de login e cadastro ficam desligadas.
 */
function criarAuth() {
  const { BETTER_AUTH_SECRET, URL_SITE } = lerEnvAcesso();

  return betterAuth({
    appName: "SINTRAVC",
    baseURL: URL_SITE,
    basePath: "/api/acesso",
    secret: BETTER_AUTH_SECRET,
    database: drizzleAdapter(banco(), {
      provider: "pg",
      schema: { pessoaEquipe, sessao, contaLogin, verificacao, duasEtapas },
    }),
    advanced: {
      database: { generateId: "uuid" },
      cookiePrefix: "sintravc",
    },
    // Só a equipe entra, por convite (RN46). Nada de cadastro aberto.
    emailAndPassword: { enabled: true, disableSignUp: true },
    disabledPaths: [
      "/sign-up/email",
      "/sign-in/email",
      "/two-factor/verify-totp",
      "/two-factor/verify-backup-code",
      "/two-factor/send-otp",
      "/two-factor/verify-otp",
      "/update-user",
      "/change-email",
      "/delete-user",
    ],
    user: {
      modelName: "pessoaEquipe",
      fields: {
        name: "nome",
        emailVerified: "emailVerificado",
        image: "imagem",
        createdAt: "criadoEm",
        updatedAt: "atualizadoEm",
      },
      additionalFields: {
        perfil: { type: ["ADM", "COM", "ATD"], required: true, input: false },
        situacao: { type: ["pendente", "ativa", "desativada"], required: false, input: false },
      },
    },
    session: {
      modelName: "sessao",
      fields: {
        userId: "pessoaId",
        expiresAt: "expiraEm",
        ipAddress: "ip",
        userAgent: "agenteUsuario",
        createdAt: "criadoEm",
        updatedAt: "atualizadoEm",
      },
      // Teto do cookie. As regras de verdade (2 h sem uso, 12 h após o login; E05) vêm do
      // Parametro e são conferidas em sessaoDaEquipe() a cada requisição do painel.
      expiresIn: 24 * 60 * 60,
      disableSessionRefresh: true,
    },
    account: {
      modelName: "contaLogin",
      fields: {
        userId: "pessoaId",
        accountId: "idNoProvedor",
        providerId: "provedor",
        accessToken: "tokenAcesso",
        refreshToken: "tokenRenovacao",
        idToken: "tokenId",
        accessTokenExpiresAt: "tokenAcessoExpiraEm",
        refreshTokenExpiresAt: "tokenRenovacaoExpiraEm",
        scope: "escopo",
        password: "senhaHash",
        createdAt: "criadoEm",
        updatedAt: "atualizadoEm",
      },
    },
    verification: {
      modelName: "verificacao",
      fields: {
        identifier: "identificador",
        value: "valor",
        expiresAt: "expiraEm",
        createdAt: "criadoEm",
        updatedAt: "atualizadoEm",
      },
    },
    plugins: [
      // Nada de "confiar neste computador": confirmarCodigo() nunca pede trustDevice,
      // então as duas etapas valem a cada login (E05, RNF02).
      twoFactor({
        issuer: "SINTRAVC",
        totpOptions: OPCOES_TOTP,
        // O bloqueio é o nosso (RN05), com uma contagem só para senha e código.
        accountLockout: { enabled: false },
        schema: {
          user: { fields: { twoFactorEnabled: "duasEtapasAtivas" } },
          twoFactor: {
            modelName: "duasEtapas",
            fields: {
              userId: "pessoaId",
              secret: "segredo",
              backupCodes: "codigosRecuperacao",
              verified: "verificado",
              failedVerificationCount: "falhasSeguidas",
              lockedUntil: "bloqueadoAte",
            },
          },
        },
      }),
      nextCookies(), // sempre por último
    ],
  });
}

export type Auth = ReturnType<typeof criarAuth>;

const global = globalThis as unknown as { auth?: Auth };

/** Instância do Better Auth, criada no primeiro uso. */
export function auth(): Auth {
  global.auth ??= criarAuth();
  return global.auth;
}

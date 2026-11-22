/**
 * A resposta que a tela usa quando a server action nem chega ao servidor (sem internet): o mesmo
 * formato de erro das respostas, para cair no mesmo aviso. Comunicados e Rádio Chofer.
 */
export const SEM_CONEXAO = {
  tipo: "erro",
  mensagem: "Sem conexão com o servidor. Confira a internet e tente de novo.",
} as const satisfies { tipo: "erro"; mensagem: string };

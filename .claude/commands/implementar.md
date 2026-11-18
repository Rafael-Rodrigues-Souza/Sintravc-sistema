---
description: Implementa uma issue do GitHub seguindo o fluxo do projeto
argument-hint: número da issue
---

Implemente a issue #$ARGUMENTS.

1. Leia o CLAUDE.md, a seção da área no docs/spec.md, docs/decisoes.md e docs/correcoes-figma.md, e rode gh issue view $ARGUMENTS --comments. Confira o próximo número E livre.
2. Plano completo: contexto; decisões em aberto (uma pergunta por vez, sempre com uma recomendação); as interações que um usuário espera (mouse, teclado, toque, leitor de tela) e como cada uma vira teste; arquivos; etapas em commits; riscos. Nada de dependência nova sem explicar o problema que ela resolve.
3. Testes: em correção de defeito e em regra de negócio (permissão, publicação, prazos, auditoria, dados), o teste novo tem de falhar no código atual antes da correção, e você me mostra a falha. Em tela ou função nova, os testes são escritos junto com o código, sem prova de falha obrigatória. Todo fluxo principal tem um e2e que usa a tela como uma pessoa usaria.
4. Localmente, rode só os e2e desta issue, com --workers=1: no chromium, e o @responsivo só no celular e no ipad-deitado. Mostre a saída sem filtrar com tail. A suíte completa roda só no CI.
5. Se a issue cria ou muda layout, rode a skill conferir-responsivo no celular, no ipad-deitado e no computador, nos dois temas. Corrija o que esta issue causou; o que já existia vira lista para uma issue própria.
6. Issue grande: uma parada no meio para eu conferir no navegador. Sempre uma parada antes do PR, com um resumo e um roteiro de 5 a 8 passos só com o que o teste automático não vê (aparência, toque, tema escuro).
7. Antes de cada parada e no fim, pare os servidores que você iniciou e confira se as portas 3000 e 3100 estão livres. Abra o PR só depois da minha confirmação, com Closes #$ARGUMENTS, e acompanhe com gh pr checks --watch.

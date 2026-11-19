---
name: feature
description: Orquestra o time de agents para implementar um entregável da P2 de ponta a ponta (planner → backend-dev/mobile-dev → qa → reviewer → entrega). Use quando o usuário pedir uma funcionalidade nova.
argument-hint: <descrição do entregável>
---

# Feature

Entregável: $ARGUMENTS

1. **Planejar** — acione `planner` com o entregável. Mostre o plano ao usuário em poucas linhas.
2. **Implementar** — acione `backend-dev` e/ou `mobile-dev` com as tarefas do plano. Se o app depende de um endpoint novo, backend primeiro e passe o contrato da API ao `mobile-dev`. Tarefas independentes podem rodar em paralelo.
3. **Verificar** — acione `qa`. Falhou? Devolva o erro ao dev responsável e repita.
4. **Revisar** — acione `reviewer`. Achados `bloqueante` ou `importante` voltam ao dev; repita qa + reviewer até `Aprovado.`
5. **Entregar** — resuma ao usuário (o que foi feito, endpoints/telas, resultado da esteira) e pergunte se pode commitar com `/entrega`.

Mantenha cada passo enxuto: passe aos agents só o contexto necessário e não repita trabalho já feito.

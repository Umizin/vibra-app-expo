---
name: entrega
description: Roda a esteira e cria commits em Conventional Commits em português, sem nenhuma atribuição de IA. Use quando o usuário pedir para commitar ou finalizar uma tarefa.
argument-hint: [push]
---

# Entrega

1. Rode a skill `esteira`. Qualquer ❌ interrompe a entrega.
2. Agrupe as mudanças em commits atômicos (ex.: schema/migration, API, app separados quando fizer sentido). Adicione arquivos por nome, nunca `git add -A` às cegas.
3. Mensagem: `tipo(escopo): descrição` — português, imperativo/presente, minúscula, até ~60 caracteres, sem ponto final.
   - Tipos: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `style`.
   - Escopos: `api`, `app` ou nenhum.
   - Corpo só se o porquê não for óbvio, em 1–2 linhas.
4. **Proibido** na mensagem: `Co-Authored-By`, "Generated with", 🤖, "Claude", "AI"/"IA". Use `git commit -m "..."` simples.
5. Só faça `git push` se o argumento `push` foi passado ou o usuário pediu. Nunca push na `main` com `--force`.
6. Mostre `git log --oneline -n <commits criados>` ao final.

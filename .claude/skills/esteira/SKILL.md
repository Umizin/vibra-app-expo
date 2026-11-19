---
name: esteira
description: Executa a esteira de verificação do Vibra (typecheck do app, typecheck/prisma/build da API, testes e lint se existirem). Use antes de dar qualquer tarefa como pronta ou de commitar.
---

# Esteira

Execute na ordem, a partir da raiz do repositório. Pare e corrija na primeira falha antes de seguir.

## 0. Dependências
Se faltar `node_modules/` na raiz ou em `vibra-api/`, rode `npm install` no respectivo diretório.

## 1. App
```bash
npx tsc --noEmit
```

## 2. API (`vibra-api/`)
```bash
npm run typecheck
npm run prisma:validate
npm run prisma:generate   # só se schema.prisma mudou
npm run build
```

## 3. Testes e lint
Para cada diretório (raiz e `vibra-api/`), rode `npm run lint` e `npm test` **somente se o script existir** no `package.json`.

## 4. Higiene do diff
```bash
git status --short
git diff
```
Confirme: nenhum `.env`, `dist/`, `node_modules/` ou `generated/` no diff; nenhum `console.log` de debug; nenhuma menção a Claude/IA/co-author.

## 5. Relatório
```
App typecheck ✅ | API typecheck ✅ | Prisma ✅ | Build ✅ | Testes ✅/— | Lint ✅/—
```
Use `—` para etapa inexistente e `⚠️ não executado: <motivo>` para o que não pôde rodar. Nunca marque ✅ sem ter rodado.

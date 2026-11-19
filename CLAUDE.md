# Vibra

App de streaming de música (disciplina de Aplicativos Híbridos). Objetivo atual: entregáveis da **P2**.

- `app/`, `src/` — app Expo Router (React Native, TypeScript strict)
- `vibra-api/` — API Node 24 + Express 5 + Prisma 7 (PostgreSQL), ESM, TypeScript strict

## Regras inegociáveis

- **Sem atribuição de IA**: nada de `Co-Authored-By: Claude`, "Generated with Claude Code", 🤖 ou menção a IA em commits, PRs, código ou docs. O autor é só o usuário do git.
- Commits em Conventional Commits, em português, curtos: `feat(api): cria rota de playlists`. Escopos: `api`, `app`, ou sem escopo.
- Commit/push só quando o usuário pedir ou quando a skill `/entrega` for usada.
- Não adicionar dependência sem necessidade clara; se adicionar, justificar em uma linha.

## Clean code

- Simples, direto, coeso. Menor solução que resolve o requisito.
- Nomes curtos e claros (`playlist`, `user`, `track`), nunca `playlistResponseDataObjectFromRepository`.
- Comentários só quando o *porquê* não é óbvio — uma linha. Sem JSDoc decorativo, sem banners, sem comentar o óbvio.
- Funções pequenas, uma responsabilidade, early return em vez de `if` aninhado.
- Sem código morto, `console.log` de debug ou TODO esquecido.
- Seguir o padrão do arquivo vizinho antes de inventar outro.

## Convenções

**App (`app/`, `src/`)** — nomes em português: componentes `PascalCase.tsx` (`LinhaDeFaixa.tsx`), services/hooks/utils `camelCase.ts` (`authService.ts`, `useRequisicao.ts`). Estado em `src/contexts/`, acesso a dados em `src/services/`, tipos em `src/types/`, cores em `src/constants/cores.ts`. Import com alias `@/`. Token só no `expo-secure-store`.

**API (`vibra-api/src/`)** — nomes de código em inglês, mensagens ao usuário em português. Arquivos kebab-case com sufixo de camada (`playlist.service.ts`). Fluxo: `routes → controllers → services → repositories → Prisma`. Imports relativos com `.js`. Validação de entrada com Zod em `schemas/`. Erros de negócio via `BusinessError` (`errors/business-error.ts`); respostas de erro no formato `{ error: { code, message } }`. Services e repositories como objetos literais (`export const playlistService = { ... }`).

## Esteira (obrigatória antes de dar algo como pronto)

Rodar a skill `/esteira`. Resumo:

1. App: `npx tsc --noEmit` na raiz
2. API: `npm run typecheck`, `npm run prisma:validate`, `npm run build` em `vibra-api/`
3. Testes/lint, se existirem scripts `test`/`lint`
4. Revisão pelo agent `reviewer`

Nada é entregue com etapa falhando. Se uma etapa não puder rodar (ex.: sem banco), dizer explicitamente.

## Time de agents

| Agent | Papel |
|---|---|
| `planner` | Quebra um entregável da P2 em tarefas pequenas (somente leitura) |
| `backend-dev` | Implementa na `vibra-api` (rotas, schemas, services, Prisma) |
| `mobile-dev` | Implementa no app Expo (telas, componentes, integração com a API) |
| `qa` | Escreve/roda testes e executa a esteira |
| `reviewer` | Revisa o diff contra estas regras (somente leitura) |

Fluxo padrão (skill `/feature`): planner → dev(s) → qa → reviewer → correções → `/entrega`.

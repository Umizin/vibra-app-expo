---
name: mobile-dev
description: Implementa telas, componentes, contexts e services no app Expo Router (React Native, TypeScript). Use para UI e para integrar o app com a vibra-api.
tools: Read, Write, Edit, Glob, Grep, Bash
model: sonnet
---

Você desenvolve o app em `app/` e `src/`. Siga `CLAUDE.md` à risca.

Camadas:
- **Apresentação**: rotas em `app/`, componentes reutilizáveis em `src/components/`.
- **Estado**: `src/contexts/` (Context API). Só crie context novo se o estado for realmente global.
- **Dados**: `src/services/` — única camada que faz requisição. Telas não chamam `fetch` direto.
- Tipos em `src/types/modelos.ts`, cores em `src/constants/cores.ts` (sem cor hardcoded), utilitários em `src/utils/`.

Estilo:
- Nomes em português, seguindo o existente (`LinhaDeFaixa.tsx`, `catalogoService.ts`, `useRequisicao`).
- Componentes de função, props tipadas, `StyleSheet.create` no fim do arquivo.
- Reaproveite componentes antes de criar novos (`BotaoPrimario`, `CampoDeTexto`, `CartaoDeCapa`...).
- Trate carregando, erro e vazio em toda tela que busca dados.
- Token só no `expo-secure-store` (via `armazenamentoSeguro.ts`); URL da API por config, nunca hardcode espalhado.
- Comentário só se o porquê não for óbvio, em uma linha.

Ao terminar, rode `npx tsc --noEmit` na raiz e corrija até passar. Devolva: arquivos alterados, telas/fluxos afetados e o resultado do comando. Não faça commit.

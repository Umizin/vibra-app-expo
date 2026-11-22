# Vibra

O **Vibra** é um aplicativo acadêmico de descoberta e reprodução musical com identidade visual própria. Ele reúne catálogo de faixas independentes, busca, biblioteca pessoal, playlists privadas e favoritos. O aplicativo Expo conversa com uma API própria, que consulta a Jamendo e persiste os dados da conta no PostgreSQL.

O projeto é voltado a pessoas que querem explorar música independente e organizar seleções pessoais em uma interface mobile e web.

## Índice

- [Funcionalidades](#funcionalidades)
- [Tecnologias](#tecnologias)
- [Arquitetura](#arquitetura)
- [Estrutura do repositório](#estrutura-do-repositório)
- [Telas e navegação](#telas-e-navegação)
- [API REST](#api-rest)
- [Banco de dados](#banco-de-dados)
- [Jamendo e reprodução](#jamendo-e-reprodução)
- [Autenticação e segurança](#autenticação-e-segurança)
- [Configuração do ambiente](#configuração-do-ambiente)
- [Execução do projeto](#execução-do-projeto)
- [Testes e validação](#testes-e-validação)
- [Fluxos de uso](#fluxos-de-uso)
- [Limitações conhecidas](#limitações-conhecidas)
- [Equipe](#equipe)
- [Licenças e referências](#licenças-e-referências)

## Funcionalidades

### Autenticação

- Cadastro e login pela API própria.
- Recuperação do perfil autenticado ao abrir o aplicativo.
- Logout e remoção da sessão local.
- Expiração do token tratada pela sessão do frontend.

### Descoberta e pesquisa musical

- Home com catálogo de álbuns e recomendações por gêneros escolhidos localmente.
- Busca de faixas, artistas e álbuns no catálogo Jamendo por meio da API Vibra.
- Paginação e estados de carregamento, erro e resultado vazio na busca.
- Páginas de detalhe de artistas e álbuns com consulta de catálogo e lista de faixas.

### Biblioteca e playlists

- CRUD de playlists privadas persistidas no PostgreSQL.
- Inclusão e remoção de referências Jamendo em playlists.
- Resolução das faixas por lote para apresentar metadados sem duplicar o catálogo no banco.
- Referências sem metadados disponíveis permanecem identificáveis e podem ser removidas.

### Favoritos

- Favoritos associados à conta autenticada e persistidos pela API.
- Estado otimista no aplicativo com reversão e mensagem de erro quando a operação falha.
- Metadados das faixas são obtidos do catálogo; a associação salva no banco é o ID externo.

### Player e fila

- O player usa `expo-audio`, oferece play/pause, faixa anterior/próxima, progresso e duração recebidos do player, além de controles visuais da fila.
- Faixas sem URL HTTPS de áudio não são tratadas como reproduzíveis; o player apresenta feedback de erro.
- A fila é mantida no contexto do player durante a sessão e permite remover próximas faixas.
- **Parcial:** a reprodução real deve ser conferida no dispositivo/navegador usado na demonstração; a fila não oferece reordenação e o progresso não possui controle de busca (seek).

### Perfil, preferências e outras telas

- Perfil mostra dados da conta, oferece logout, tema e atalhos.
- Onboarding seleciona gêneros e salva as preferências localmente.
- Rádio consulta faixas associadas ao humor selecionado.
- Pulso calcula estatísticas a partir do histórico local.
- Timer de sono pausa o player ao fim do tempo.
- Algumas dessas telas têm limitações detalhadas em [Limitações conhecidas](#limitações-conhecidas).

## Tecnologias

Versões abaixo vêm dos manifests atuais do repositório.

| Área | Tecnologias |
| --- | --- |
| Aplicativo | Expo SDK `58` (`^58.0.26`), React Native `0.88.1`, React `19.3.0`, TypeScript `~6.0.3`, Expo Router `~58.0.32` |
| Áudio e armazenamento mobile | `expo-audio ~58.0.12`, `expo-secure-store ~58.0.3`, AsyncStorage `2.2.0` |
| API | Node.js `>=24 <25`, Express `^5.3.0`, TypeScript `^6.0.3`, Zod `^4.6.7` |
| Persistência | PostgreSQL `17` (imagem Docker `postgres:17-alpine`), Prisma ORM/Client `7.10.1`, adapter `@prisma/adapter-pg` |
| Integração externa | Jamendo API v3.0, cliente baseado em `fetch` nativo do Node.js |
| Segurança | JWT com `jose`, hash Argon2id com `argon2`, Helmet e CORS |
| Testes | `node:test`, `tsx`; testes do frontend executados com o loader `tsx` da API |
| Containerização | Docker Compose e Dockerfile multi-stage para a API |

## Arquitetura

O aplicativo não chama a Jamendo diretamente. A API valida as requisições, autentica usuários, coordena regras de negócio, usa repositories para persistência e consulta a Jamendo para o catálogo.

```mermaid
flowchart LR
  App[Expo / React Native] -->|HTTPS/HTTP local, REST e JWT| API[Vibra API - Express]
  API --> Routes[Routes e middlewares]
  Routes --> Controllers[Controllers]
  Controllers --> Services[Services]
  Services --> Repositories[Repositories]
  Repositories --> Prisma[Prisma Client]
  Prisma --> PG[(PostgreSQL)]
  Services --> JamendoClient[Cliente Jamendo]
  JamendoClient --> Jamendo[Jamendo API v3.0]
```

O frontend organiza rotas Expo Router em `app/`, componentes e contextos em `src/`, e acessa a API por um cliente HTTP centralizado. O backend fica em `vibra-api/` e separa rotas, controllers, services, repositories, integrações, validação e configuração.

## Estrutura do repositório

```text
.
├── app/                         # Rotas Expo Router, telas e layouts
│   ├── (tabs)/                  # Home, busca, biblioteca e perfil
│   ├── album/[id].tsx           # Detalhe dinâmico de álbum
│   ├── artista/[id].tsx         # Detalhe dinâmico de artista
│   └── playlist/[id].tsx        # Detalhe dinâmico de playlist
├── assets/                      # Imagens e fontes do aplicativo
├── src/
│   ├── components/              # Componentes visuais reutilizáveis
│   ├── config/                  # Configuração da URL da API
│   ├── constants/               # Cores, gêneros e humores
│   ├── contexts/                # Autenticação, player, favoritos, tema etc.
│   ├── hooks/                   # Hooks de requisição e playlists
│   ├── services/                # Cliente HTTP, catálogo, auth e persistência local
│   ├── tests/                   # Testes frontend
│   ├── types/                   # Tipos compartilhados do aplicativo
│   └── utils/                   # Formatação, áudio e navegação
├── vibra-api/
│   ├── prisma/                  # Schema e migrations versionadas
│   ├── src/
│   │   ├── config/              # Validação de variáveis de ambiente
│   │   ├── controllers/         # Adaptadores HTTP
│   │   ├── database/            # Instância centralizada do Prisma
│   │   ├── errors/              # Erros de negócio e persistência
│   │   ├── integrations/jamendo/# Cliente e schemas do provedor
│   │   ├── middlewares/         # Auth, validação, 404 e erros
│   │   ├── repositories/        # Acesso aos modelos Prisma
│   │   ├── routes/              # Registro dos endpoints
│   │   ├── schemas/             # Validação de entradas com Zod
│   │   ├── services/            # Regras de negócio e catálogo
│   │   └── tests/               # Testes HTTP/serviços da API
│   ├── Dockerfile
│   ├── package.json
│   └── prisma7.config.ts
├── docker-compose.yml
├── .dockerignore
├── .env.example
└── README.md
```

## Telas e navegação

O inventário contém 16 telas distintas. A rota `/` é um redirecionamento e não entra na contagem. “Implementada” descreve o fluxo conectado no código; não significa que o serviço externo ou PostgreSQL foi validado ao vivo em todas as rotas.

| Tela | Rota | Finalidade | Estado nesta auditoria |
| --- | --- | --- | --- |
| Login | `/login` | Autenticar e iniciar sessão | Implementada |
| Cadastro | `/cadastro` | Criar conta e iniciar sessão | Implementada |
| Início | `/(tabs)` | Catálogo, recomendações e playlists | Parcial: falha de playlists não tem estado visível nessa tela |
| Buscar | `/(tabs)/buscar` | Buscar faixas, artistas e álbuns | Implementada |
| Biblioteca | `/(tabs)/biblioteca` | Listar e gerenciar playlists | Implementada |
| Perfil | `/(tabs)/perfil` | Dados da conta, tema, atalhos e logout | Parcial: sem edição do perfil; tema não persiste |
| Onboarding | `/onboarding` | Escolher gêneros | Implementada; preferências locais |
| Favoritas | `/favoritas` | Consultar faixas favoritas | Parcial: IDs sem metadados não têm uma apresentação própria |
| Detalhe de playlist | `/playlist/[id]` | Gerenciar faixas persistidas | Implementada |
| Player | `/player` | Reproduzir faixa e controlar a fila | Parcial: runtime de áudio não validado em todas as plataformas; sem seek |
| Fila | `/fila` | Ver faixa atual e próximas, remover próximas | Parcial: sem reordenação |
| Detalhe de artista | `/artista/[id]` | Ver artista e suas faixas | Implementada |
| Detalhe de álbum | `/album/[id]` | Ver álbum e suas faixas | Implementada |
| Rádio | `/radio` | Escolher humor e iniciar seleção musical | Parcial: pode iniciar por faixa sem stream |
| Pulso | `/pulso` | Exibir estatísticas do histórico | Parcial: minutos somam duração estimada das faixas iniciadas |
| Timer | `/timer` | Programar pausa do player | Implementada durante a sessão |

Na inspeção pelo critério rigoroso: **9 implementadas, 7 parciais e nenhuma ausente**. Isso não atinge o requisito acadêmico de 12 telas plenamente funcionais. A contagem completa e as evidências estão no relatório de auditoria entregue junto desta documentação; telas dinâmicas contam uma vez cada.

O layout raiz usa Stack e contextos globais; o grupo `(tabs)` fornece as quatro abas principais. Artista, álbum e playlist usam parâmetros dinâmicos. Retornos feitos por botões passam por `src/utils/navegacao.ts`, que verifica `router.canGoBack()` e usa um destino alternativo próprio da tela quando necessário. O botão voltar do navegador permanece sob controle do Expo Router/browser.

## API REST

Prefixo de recursos: `/api/v1`. Rotas de catálogo, usuário, playlists e favoritos exigem `Authorization: Bearer <token>`. Cadastro, login e health check são públicos.

| Método | Rota | Acesso | Finalidade |
| --- | --- | --- | --- |
| GET | `/health` | Público | Saúde da aplicação Express; não verifica banco |
| POST | `/api/v1/auth/register` | Público | Criar conta; recebe `email`, `displayName`, `password` |
| POST | `/api/v1/auth/login` | Público | Login; recebe `email`, `password` |
| GET, PATCH | `/api/v1/users/me` | JWT | Consultar ou atualizar perfil (`email`, `displayName`) |
| GET | `/api/v1/catalog/tracks` | JWT | Buscar faixas; aceita `q`, `artistId`, `albumId`, `genre`, `offset`, `limit` ou `ids` |
| GET | `/api/v1/catalog/tracks/:trackId` | JWT | Detalhe de faixa Jamendo |
| GET | `/api/v1/catalog/artists` | JWT | Buscar artistas por `q`, `offset`, `limit` |
| GET | `/api/v1/catalog/artists/:artistId` | JWT | Detalhe de artista |
| GET | `/api/v1/catalog/albums` | JWT | Buscar álbuns por `q`, `artistId`, `offset`, `limit` |
| GET | `/api/v1/catalog/albums/:albumId` | JWT | Detalhe de álbum |
| GET, POST | `/api/v1/me/playlists` | JWT | Listar ou criar playlists próprias |
| GET, PATCH, DELETE | `/api/v1/playlists/:playlistId` | JWT | Consultar, atualizar ou excluir playlist própria |
| GET, POST | `/api/v1/playlists/:playlistId/tracks` | JWT | Listar ou adicionar referência de faixa |
| GET, DELETE | `/api/v1/playlists/:playlistId/tracks/:jamendoTrackId` | JWT | Consultar ou remover referência |
| GET, POST | `/api/v1/me/favorites` | JWT | Listar ou adicionar favoritos próprios |
| GET, DELETE | `/api/v1/me/favorites/:jamendoTrackId` | JWT | Consultar ou remover favorito |

Listagens de catálogo retornam `{ "data": [], "pagination": { "offset", "limit", "count", "hasMore" } }`. A busca em lote de faixas retorna `data`, `requestedIds` e `missingIds`; `ids` deve ser uma lista delimitada por vírgula, com até 50 IDs e não pode ser combinada com outros filtros/paginação. Criação de conta, playlist, faixa e favorito retorna HTTP 201; exclusões retornam HTTP 204 sem corpo. Os demais detalhes e mutações retornam `{ "data": ... }`. Erros usam `{ "error": { "code", "message", "details?" } }`.

Parâmetros de busca são validados com Zod e campos desconhecidos são rejeitados. `genre` aceita `MPB`, `Eletrônica`, `Rock`, `Lo-fi`, `Indie` e `Pop`. Paginação do catálogo limita `limit` a 50.

Exemplo de health check e busca autenticada:

```bash
curl -i http://localhost:3001/health
curl -sS 'http://localhost:3001/api/v1/catalog/tracks?q=jazz&limit=10' \
  -H "Authorization: Bearer $TOKEN"
```

## Banco de dados

O PostgreSQL guarda usuários, playlists privadas, referências de faixas em playlists e favoritos. Os metadados do catálogo continuam sob responsabilidade da Jamendo.

| Modelo/tabela | Relação e integridade |
| --- | --- |
| `User` / `users` | UUID; e-mail único; possui playlists e favoritos |
| `Playlist` / `playlists` | UUID, proprietário `User`, nome e descrição; remoção do usuário propaga por cascade |
| `PlaylistTrack` / `playlist_tracks` | Referencia playlist e ID Jamendo externo como string; faixa e posição são únicas dentro da playlist |
| `Favorite` / `favorites` | Chave composta por usuário e ID Jamendo; remoção do usuário propaga por cascade |

Schema: `vibra-api/prisma/schema.prisma`. Há uma migration versionada em `vibra-api/prisma/migrations/20261118191554_init/`. O Compose possui um serviço de migration que executa `prisma migrate deploy` depois que o PostgreSQL fica saudável e antes da API. Não se confirmou nesta auditoria se a migration está aplicada em uma instalação local existente.

Para validar schema e conexão (sem alterar dados), execute na pasta `vibra-api/`:

```bash
npm run prisma:validate
npm run db:check
```

`db:check` executa somente `SELECT 1`. A URL do banco é opcional para iniciar a API básica, mas necessária ao usar persistência.

## Jamendo e reprodução

A integração é feita pelo backend em `vibra-api/src/integrations/jamendo/`, usando HTTPS, host fixo, `JAMENDO_CLIENT_ID`, timeout de cinco segundos, validação Zod e erros convertidos em respostas seguras. O catálogo expõe busca e detalhe de faixas, artistas e álbuns. A paginação consulta um item extra para estimar `hasMore`, sem solicitar contagem completa automaticamente.

As respostas são mapeadas para DTOs do Vibra. IDs Jamendo permanecem strings. Stream de áudio, capa, álbum, tags, licença e links podem estar ausentes; o cliente não cria URLs substitutas. O Player aceita somente URLs de áudio HTTPS válidas. A disponibilidade real e a permissão de reprodução dependem da faixa, da licença e dos termos do provedor. O teste automatizado usa mocks; uma busca externa foi validada nesta auditoria, mas o player não foi exercitado em dispositivo real.

## Autenticação e segurança

- Senhas são armazenadas pela API como hash Argon2id; não são retornadas pelo perfil.
- A API emite JWT assinado com HS256, validade de sete dias e identificador do usuário no claim `sub`.
- O middleware protege rotas privadas e deriva a identidade do token, não de `userId` enviado pelo cliente.
- Services e repositories restringem playlists/favoritos ao proprietário autenticado.
- O token é guardado em `expo-secure-store` no Android/iOS e em `sessionStorage` na Web. No navegador, `sessionStorage` não oferece o mesmo isolamento de armazenamento nativo seguro.
- Não há refresh token, revogação imediata ou tabela de sessões. Logout remove o token local.
- Segredos ficam no backend. `EXPO_PUBLIC_API_URL` é pública e não deve conter credenciais.

## Configuração do ambiente

Pré-requisitos confirmados pela configuração: Git, Node.js 24 e npm; Docker Engine com Compose para o fluxo containerizado. Expo Go ou navegador são usados fora dos containers para o frontend. iOS nativo requer ferramentas Apple em macOS. O README e Compose documentam Docker; execução via Podman não foi verificada neste ambiente.

### Variáveis

Copie o arquivo de exemplo da raiz. Os valores abaixo são ilustrativos, não credenciais:

```dotenv
POSTGRES_DB=vibra
POSTGRES_USER=vibra
POSTGRES_PASSWORD=SUBSTITUA_POR_UMA_SENHA_LOCAL
POSTGRES_PORT=5433
DATABASE_URL=postgresql://vibra:SENHA_LOCAL@postgres:5432/vibra?schema=public
NODE_ENV=development
PORT=3001
API_PORT=3001
FRONTEND_ORIGIN=http://localhost:8081
JWT_SECRET=SUBSTITUA_POR_32_OU_MAIS_BYTES_ALEATORIOS
JAMENDO_CLIENT_ID=SEU_CLIENT_ID
EXPO_PUBLIC_API_URL=http://localhost:3001
```

Configure a mesma senha em `POSTGRES_PASSWORD` e `DATABASE_URL`. Gere um segredo local, por exemplo com `openssl rand -hex 32`. Obtenha o Client ID no [portal de desenvolvedores Jamendo](https://developer.jamendo.com/v3.0). Nunca versione `.env`.

O `.env` da raiz é usado pelo Docker Compose. Para executar a API diretamente no host, crie `vibra-api/.env` a partir de `vibra-api/.env.example`; `DATABASE_URL` deve usar a porta publicada no host (`5433` por padrão), não o hostname `postgres`. Para o container, a URL usa o hostname interno `postgres:5432`.

Escolha `EXPO_PUBLIC_API_URL` de acordo com o cliente e reinicie o Expo:

| Cliente | Endereço típico |
| --- | --- |
| Navegador no mesmo computador | `http://localhost:3001` |
| Emulador Android padrão | `http://10.0.2.2:3001` |
| Simulador iOS no Mac | `http://localhost:3001` |
| Dispositivo físico | `http://IP-LAN-DO-COMPUTADOR:3001` |

Para dispositivo físico, computador e telefone precisam alcançar-se pela rede local e o firewall deve permitir a porta da API. `FRONTEND_ORIGIN` configura CORS para a origem Web; atualize-a para a origem real usada no navegador.

## Execução do projeto

### 1. Obter o código e configurar o ambiente

```bash
git clone <URL-DO-REPOSITORIO>
cd vibra-app-expo
cp .env.example .env
```

Edite `.env` com valores locais. `JAMENDO_CLIENT_ID` é necessário para consultar o catálogo; para chamadas de autenticação, `JWT_SECRET` é obrigatório. O exemplo de `DATABASE_URL` na raiz é para containers.

### 2. Iniciar PostgreSQL e API com Docker Compose

Na raiz, com Docker Engine/Compose em execução:

```bash
docker compose config
docker compose up --build -d
docker compose ps
docker compose logs -f api
```

O Compose inicia PostgreSQL, aguarda o healthcheck, executa a migration versionada e então inicia a API. A API fica em `http://localhost:3001`; o PostgreSQL é publicado somente em loopback na porta `5433` por padrão. O volume nomeado `postgres_data` preserva os dados entre reinicializações.

Em outro terminal, verifique:

```bash
curl -i http://localhost:3001/health
docker compose exec postgres pg_isready -U vibra -d vibra
```

`/health` confirma somente que o servidor HTTP respondeu. `pg_isready` verifica disponibilidade do PostgreSQL. Para uma consulta Prisma `SELECT 1`, use `npm run db:check` em `vibra-api/` com uma `DATABASE_URL` acessível ao processo.

Para parar mantendo os dados: `docker compose down`. Não use `docker compose down -v` a menos que queira apagar o volume PostgreSQL e os dados persistidos.

### 3. Instalar e iniciar o frontend Expo

No computador, fora do Docker, configure `EXPO_PUBLIC_API_URL` no `.env` da raiz e rode:

```bash
npm ci
npx expo start
```

Pressione `w` para abrir a versão web ou leia o QR code com Expo Go. Para Android/iOS, use emulador ou dispositivo configurado na mesma rede apropriada. A exportação web configurada é SPA; o servidor de hospedagem precisa encaminhar rotas profundas para `index.html`.

### Executar a API sem Compose

Com PostgreSQL já acessível no host, configure `vibra-api/.env` com `FRONTEND_ORIGIN`, um `JWT_SECRET` válido e `DATABASE_URL` para a porta local do banco:

```bash
cd vibra-api
npm ci
npm run dev
```

Esse modo não cria nem inicializa PostgreSQL. O `npm run start` executa a compilação existente em `dist/`; antes dele, compile com `npm run build`. Não execute `prisma migrate deploy` manualmente sem revisar o alvo e o estado do banco.

### Criar conta e chamar API

Use uma conta de teste:

```bash
curl -sS -X POST http://localhost:3001/api/v1/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"dev@example.test","displayName":"Dev Vibra","password":"senha-de-teste-123"}'
```

Login retorna `{ "data": { "user": ..., "accessToken": ..., "tokenType": "Bearer", "expiresIn": ... } }`. Copie o `accessToken` para a variável de shell `TOKEN` e use o header Bearer nas rotas privadas. Não registre ou compartilhe esse token.

## Testes e validação

Na raiz do frontend:

```bash
npx tsc --noEmit
node --test --import ./vibra-api/node_modules/tsx/dist/loader.mjs src/tests/*.test.ts
npx expo export --platform web
```

Os testes do frontend incluem testes de cliente/serviços e utilitários com mocks; eles não comprovam acesso real ao backend ou PostgreSQL.

Na pasta `vibra-api/`:

```bash
npm test
npm run typecheck
npm run build
npm run prisma:validate
npm run db:check
```

Os testes de rotas e serviços usam mocks para Jamendo e persistência. `db:check` é uma verificação real, somente leitura, e depende de PostgreSQL acessível e `DATABASE_URL` configurada. O projeto não define script `lint` ou `format` nos manifests atuais.

## Fluxos de uso

1. Crie uma conta ou entre; a API retorna o perfil público e JWT.
2. Complete ou pule a seleção local de gêneros.
3. Na busca, pesquise faixas, artistas ou álbuns; abra detalhes e escolha uma faixa.
4. Na Biblioteca, crie uma playlist, edite ou exclua playlists próprias.
5. No detalhe da playlist, pesquise no catálogo, adicione faixas e remova itens, inclusive referências cujo catálogo não retornou metadados.
6. Use o controle de favorito nas linhas de faixa; a API persiste o ID Jamendo para a conta autenticada.
7. Abra o Player para controlar a faixa disponível e acesse a fila para remover próximas faixas.

## Limitações conhecidas

- Nesta auditoria, `GET /health` respondeu HTTP 200 e a busca real pelo cliente backend Jamendo retornou uma faixa com URL de áudio. Isso não valida reprodução em dispositivo nem todas as rotas de catálogo.
- A conexão PostgreSQL não foi comprovada nesta execução: `db:check` informou que `DATABASE_URL` não estava disponível para o processo. O acesso ao daemon Docker foi negado e o Podman falhou porque o runtime local não pôde atualizar sua configuração; não foram iniciados containers nem alterados volumes. A aplicação e migrations precisam ser verificadas em um ambiente com banco acessível.
- O player e `expo-audio` estão conectados no código e cobertos por testes de utilitário, mas o teste automatizado não exercita reprodução nativa real. Não há controle de seek no progresso.
- Rádio escolhe faixas do resultado por humor, mas não filtra previamente todas as faixas sem stream. O Player informa quando a faixa escolhida não é reproduzível.
- A Fila permite selecionar e remover próximas faixas, mas não permite reordená-las.
- Perfil ainda não oferece edição de dados. A troca do tema é em memória e volta ao padrão após reinício.
- Favoritas preserva IDs persistidos, mas a tela não apresenta um estado individual para IDs cujo metadado não foi recuperado do catálogo.
- Home não mostra erro de carregamento da seção de playlists; Pulso soma duração nominal de faixas cujo início de reprodução foi registrado, não tempo efetivamente ouvido.
- As preferências de gêneros e o histórico usam AsyncStorage. Tema, fila e estado do timer são mantidos em memória. Dados de playlist/favoritos dependem do PostgreSQL.
- `expo-doctor` não pôde ser executado nesta auditoria porque não está disponível localmente e o acesso ao npm registry falhou. Typecheck, testes frontend e exportação web passaram. A auditoria de dependências em 22/11/2026 reportou quatro findings no frontend (um crítico e três moderados) e três altos associados a `prisma`, `@prisma/config` e `effect` na API; o relatório do npm também os manteve em `npm audit --omit=dev`. A correção sugerida pelo relatório troca para Prisma `6.12.0`, incompatível com a versão fixada do projeto, e não foi aplicada. Reavalie atualizações compatíveis antes da entrega.
- A auditoria estrita encontrou 9 telas implementadas e 7 parciais; são necessárias mais 3 telas plenamente funcionais para alcançar o mínimo acadêmico de 12. Player, Favoritas e Perfil são bons candidatos a concluir sem criar rotas artificiais.

## Equipe

Os nomes dos integrantes não estão identificados em documentação de equipe versionada; por isso, este README não atribui autoria com base em aliases do Git.

## Licenças e referências

Não foi encontrado arquivo `LICENSE` que declare uma licença global do código Vibra. Isso não define a licença dos conteúdos musicais: cada faixa deve ser usada de acordo com os metadados de licença e os termos aplicáveis da Jamendo.

- [Expo Documentation](https://docs.expo.dev/)
- [Expo Router](https://docs.expo.dev/router/introduction/)
- [Docker Compose](https://docs.docker.com/compose/)
- [Node.js](https://nodejs.org/docs/latest-v24.x/api/)
- [Express](https://expressjs.com/)
- [Prisma ORM](https://www.prisma.io/docs/orm)
- [PostgreSQL](https://www.postgresql.org/docs/)
- [Jamendo API v3.0](https://developer.jamendo.com/v3.0)

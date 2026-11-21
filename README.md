# Vibra

Aplicativo acadêmico de descoberta e reprodução musical com identidade visual própria. O app usa Expo/React Native; a API própria em Node.js/Express intermedeia autenticação, persistência PostgreSQL/Prisma e consultas ao catálogo Jamendo.

## Arquitetura e tecnologias

```text
Expo / React Native → Vibra API (Express / TypeScript) → PostgreSQL e Jamendo API v3
```

O frontend não chama a Jamendo. O backend mantém o `JAMENDO_CLIENT_ID`; tokens JWT são emitidos pela API. A API usa Prisma ORM 7 e migrations versionadas. A disponibilidade de reprodução depende das URLs fornecidas pelo catálogo.

## Pré-requisitos

- Git e Node.js 24 (frontend e execução local da API).
- Docker Engine e Docker Compose v2 para executar PostgreSQL e API em containers.
- Expo Go compatível com SDK 58 para testar em dispositivo ou emulador; ou navegador para Expo Web.

Referências: [Expo SDK 58](https://docs.expo.dev/versions/v58.0.0/), [Expo Go](https://docs.expo.dev/get-started/expo-go/), [Docker Compose](https://docs.docker.com/compose/), [Prisma 7](https://www.prisma.io/docs/orm), [Jamendo API v3](https://developer.jamendo.com/v3.0).

## Credenciais e ambiente

Na raiz, crie o arquivo local ignorado pelo Git:

```bash
cp .env.example .env
```

Edite `.env`: configure `POSTGRES_PASSWORD` (uma senha hexadecimal pode ser gerada com `openssl rand -hex 16`) e use a mesma senha na `DATABASE_URL`; gere `JWT_SECRET` com `openssl rand -hex 32`. O exemplo tem somente placeholders. Não compartilhe nem versione `.env`.

Obtenha um `client_id` no [portal de desenvolvedores Jamendo](https://developer.jamendo.com/v3.0). Configure-o em `JAMENDO_CLIENT_ID` no `.env` raiz para o Compose. Para execução local da API, crie também `vibra-api/.env` com base em `vibra-api/.env.example`; nessa configuração `DATABASE_URL` aponta para `localhost:5432` se o PostgreSQL local estiver publicado nessa porta. O arquivo local da API também não deve ser versionado.

## Iniciar PostgreSQL e API com Docker

Na raiz do projeto:

```bash
docker compose config
docker compose up --build -d
docker compose ps
docker compose logs -f api
```

O Compose cria o serviço `postgres`, espera o healthcheck e executa `prisma migrate deploy` em um serviço de migração único antes de iniciar a API. O PostgreSQL guarda os dados no volume nomeado `postgres_data`; sua porta fica publicada somente em `127.0.0.1:5433` para evitar conflito com instalações locais. A API fica em `http://localhost:3001`.

Para confirmar banco e API:

```bash
curl -i http://localhost:3001/health
docker compose exec postgres pg_isready -U vibra -d vibra
docker compose run --rm migrate npm run db:check
```

Para parar os serviços mantendo os dados: `docker compose down`. **Não use `docker compose down -v`** salvo se quiser apagar permanentemente os dados do volume do Vibra. O volume do Compose é separado de volumes gerenciados por Podman.

## Executar o frontend

O Expo Go e o servidor de desenvolvimento devem rodar no computador/dispositivo, fora do Docker. Defina `EXPO_PUBLIC_API_URL` no `.env` raiz conforme o ambiente e reinicie o Expo após alterar:

| Cliente Expo | URL da API |
| --- | --- |
| Navegador no mesmo computador / simulador iOS | `http://localhost:3001` |
| Emulador Android padrão | `http://10.0.2.2:3001` |
| Celular físico | `http://IP-LAN-DO-COMPUTADOR:3001` |

No navegador, a origem permitida no backend é `FRONTEND_ORIGIN` (padrão `http://localhost:8081`). Para dispositivo físico, use um endereço IP alcançável na rede; confirme também as regras de firewall. A porta da API precisa estar acessível na rede local.

```bash
npm ci
npx expo start
```

Use `w` para abrir a versão web ou escaneie o QR code no Expo Go. O projeto está alinhado ao Expo SDK 58; mantenha o Expo Go atualizado para essa versão do SDK. A exportação web usa saída SPA (`single`), sem prerender no servidor, e rotas profundas precisam de fallback para `index.html` no host estático.

## Cadastro, login e API

Cadastre uma conta (use dados de teste):

```bash
curl -sS -X POST http://localhost:3001/api/v1/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"dev@example.test","displayName":"Dev Vibra","password":"senha-de-teste-123"}'
```

Ou faça login e extraia o token com `jq`:

```bash
TOKEN=$(curl -sS -X POST http://localhost:3001/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"dev@example.test","password":"senha-de-teste-123"}' | jq -r '.data.accessToken')
curl -sS http://localhost:3001/api/v1/users/me -H "Authorization: Bearer $TOKEN"
```

Rotas efetivamente registradas (rotas de usuário, catálogo, playlists e favoritos exigem `Authorization: Bearer <token>`):

- `GET /health`
- `POST /api/v1/auth/register`, `POST /api/v1/auth/login`
- `GET /api/v1/users/me`, `PATCH /api/v1/users/me`
- `GET /api/v1/catalog/tracks` (inclui consulta por `ids`), `GET /api/v1/catalog/tracks/:trackId`
- `GET /api/v1/catalog/artists`, `GET /api/v1/catalog/artists/:artistId`
- `GET /api/v1/catalog/albums`, `GET /api/v1/catalog/albums/:albumId`
- `GET /api/v1/me/playlists`, `POST /api/v1/me/playlists`
- `GET /api/v1/playlists/:playlistId`, `PATCH /api/v1/playlists/:playlistId`, `DELETE /api/v1/playlists/:playlistId`
- `GET|POST /api/v1/playlists/:playlistId/tracks`; `GET|DELETE /api/v1/playlists/:playlistId/tracks/:jamendoTrackId`
- `GET|POST /api/v1/me/favorites`; `GET|DELETE /api/v1/me/favorites/:jamendoTrackId`

Exemplo autenticado para consulta de catálogo: `curl -sS 'http://localhost:3001/api/v1/catalog/tracks?q=jazz&limit=10' -H "Authorization: Bearer $TOKEN"`. O catálogo exige `JAMENDO_CLIENT_ID` configurado no backend.

## Verificações de desenvolvimento

Frontend, na raiz:

```bash
npx tsc --noEmit
npx expo export --platform web
node --test --import ./vibra-api/node_modules/tsx/dist/loader.mjs src/tests/*.test.ts
```

API, em outro terminal:

```bash
cd vibra-api
npm ci
npm test
npm run typecheck
npm run build
npm run prisma:validate
```
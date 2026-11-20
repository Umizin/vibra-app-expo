# Vibra

App de descoberta e streaming musical, feito em React Native + Expo Router como
atividade da disciplina de Aplicativos Híbridos.

## Rodando o projeto

```bash
npm install
npx expo start
```

Escaneie o QR code com o app Expo Go (Android) ou a câmera (iOS).

Configure a URL da API em `.env` antes de iniciar o Expo. O cadastro e o login são realizados pela Vibra API.

## Arquitetura

O projeto segue a separação em camadas vista em aula:

- **Apresentação** — `app/` (rotas do Expo Router) e `src/components/`
- **Estado** — `src/contexts/` (Context API): sessão, tema, favoritos e player
- **Dados** — `src/services/api.ts` concentra as chamadas HTTP à Vibra API; os serviços de autenticação e catálogo adaptam os DTOs recebidos para os modelos usados pela interface.

O JWT é guardado no `expo-secure-store` em Android/iOS e enviado apenas em chamadas protegidas. Na web, ele fica em `sessionStorage` durante a sessão atual do navegador. Senhas não são persistidas.

## Frontend e Vibra API

Crie `.env` na raiz a partir do exemplo e configure `EXPO_PUBLIC_API_URL`:

```bash
cp .env.example .env
```

- Android Emulator: `http://10.0.2.2:3001`;
- iOS Simulator ou navegador no mesmo computador da API: `http://localhost:3001`;
- dispositivo físico: use o IP local (LAN) do computador que executa a API.

Inicie a API em `vibra-api/` (`npm run dev`) e depois o aplicativo (`npx expo start`). Reinicie o Expo depois de alterar a variável de ambiente. A aplicação reporta uma mensagem de configuração se a URL estiver ausente. Em web, configure também `FRONTEND_ORIGIN` no ambiente do backend para corresponder à origem do Expo Web. Não coloque o `JAMENDO_CLIENT_ID` no frontend.

A tela Buscar e as seções de faixas/álbuns da Home utilizam o catálogo real da API. As playlists, favoritos, histórico e algumas experiências de descoberta ainda usam dados/estado local e serão integrados em etapas posteriores. A busca filtra gêneros somente quando há um filtro suportado pelo backend (Rock, Pop e Eletrônica); os demais não geram resultados locais de fallback.

Os testes do cliente e dos serviços do frontend podem ser executados com o runner `tsx` já usado pelo backend (sem instalar dependências na raiz):

```bash
node --import ./vibra-api/node_modules/tsx/dist/loader.mjs src/tests/frontend-api.test.ts
```

## Telas

Login, Início, Buscar, Biblioteca, Perfil, Detalhe de playlist/álbum, Músicas Curtidas e Player.

## Backend (`vibra-api/`)

### Tecnologias

- Node.js 24 e Express 5;
- TypeScript em modo estrito, com módulos ES para Node.js;
- Zod para validar a configuração do processo;
- Helmet para cabeçalhos HTTP e CORS limitado à origem configurada;
- `dotenv` para carregar o `.env` local;
- `tsx` para executar e observar o código TypeScript durante o desenvolvimento.

### Camadas

- `src/routes/` registra os endpoints;
- `src/controllers/` converte requisições HTTP em respostas;
- `src/services/` contém regras de negócio e integração com a Jamendo;
- `src/repositories/` contém acesso ao PostgreSQL via Prisma;
- `src/middlewares/` contém tratamento transversal de rotas e erros;
- `src/config/` valida as variáveis de ambiente;
- `src/database/` centraliza a conexão Prisma; `prisma/` contém o schema e as migrations;
- `src/schemas/`, `src/types/` e `src/errors/` contêm validações, contratos e erros de domínio.

O backend já implementa autenticação JWT, perfil, operações de playlists/faixas/favoritos e consulta autenticada do catálogo de faixas, artistas e álbuns Jamendo.

### Configuração local

Na pasta `vibra-api/`, copie `.env.example` para `.env` e ajuste os valores locais. O arquivo `.env` não deve ser versionado. A API usa PostgreSQL por meio de `DATABASE_URL`; `JWT_SECRET` deve conter pelo menos 32 bytes e `JAMENDO_CLIENT_ID` é necessário para chamadas ao catálogo.

### Instalação e execução

```bash
cd vibra-api
npm install
npm run dev
```

Para compilar e executar a versão compilada:

```bash
npm run build
npm start
```

O TypeScript compilado é gravado em `dist/`, que não deve ser commitado.

### Endpoint disponível

`GET /health` retorna `200` com:

```json
{
  "status": "ok",
  "service": "vibra-api"
}
```

As rotas REST incluem `/api/v1/auth`, `/api/v1/users/me`, `/api/v1/catalog` e recursos de playlists/favoritos. Rotas de catálogo e recursos de usuário exigem JWT. Erros são tratados centralmente e não expõem detalhes internos ao cliente.

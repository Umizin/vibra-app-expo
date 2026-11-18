# Vibra

App de streaming de música (mock de um app híbrido no estilo Spotify), feito em React Native + Expo Router como
atividade da disciplina de Aplicativos Híbridos.

## Rodando o projeto

```bash
npm install
npx expo start
```

Escaneie o QR code com o app Expo Go (Android) ou a câmera (iOS).

Login simulado: qualquer e-mail válido (com `@`) e senha com 4 ou mais caracteres.

## Arquitetura

O projeto segue a separação em camadas vista em aula:

- **Apresentação** — `app/` (rotas do Expo Router) e `src/components/`
- **Estado** — `src/contexts/` (Context API): sessão, tema, favoritos e player
- **Dados** — `src/services/` simula uma API REST (JSON + atraso de rede) sobre os dados mockados em `src/data/`

Autenticação usa um token no formato JWT (mockado) guardado no `expo-secure-store`, seguindo a orientação de nunca
guardar tokens em `AsyncStorage`.

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
- `src/services/` conterá regras de negócio;
- `src/repositories/` conterá acesso a dados;
- `src/middlewares/` contém tratamento transversal de rotas e erros;
- `src/config/` valida as variáveis de ambiente;
- `src/database/` ficará reservado para conexão e migrations PostgreSQL;
- `src/schemas/`, `src/types/` e `src/errors/` ficam reservados para validações, contratos e erros de domínio conforme forem necessários.

Os diretórios de camadas ainda sem implementação não são criados vazios. PostgreSQL, autenticação, integração Jamendo e funcionalidades de negócio ainda não estão implementados.

### Configuração local

Na pasta `vibra-api/`, copie `.env.example` para `.env` e ajuste os valores locais. O arquivo `.env` não deve ser versionado. `DATABASE_URL` está documentada para a etapa de PostgreSQL, mas não é exigida nem utilizada por esta versão.

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

Rotas inexistentes retornam `404` no formato `{ "error": { "code": "NOT_FOUND", "message": "..." } }`. Erros inesperados são tratados centralmente e não expõem detalhes internos ao cliente.

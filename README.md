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

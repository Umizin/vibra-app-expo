import type { Usuario } from '@/types/modelos';
import { apiClient, ApiClientError } from './api';
import { definirTokenDeAcesso, invalidarTokenDeAcesso } from './sessao';

const CHAVE_TOKEN = 'vibra.tokenDeAcesso';

type PerfilApi = { id: string; email: string; displayName: string };
type RespostaAutenticacao = {
  data: { user: PerfilApi; accessToken: string; tokenType: 'Bearer'; expiresIn: number };
};
type RespostaPerfil = { data: PerfilApi };
export type AtualizacaoPerfil = { email?: string; displayName?: string };

export type AuthApi = {
  get<T>(path: string, options?: { authenticated?: boolean }): Promise<T>;
  post<T>(path: string, body: unknown, options?: { authenticated?: boolean }): Promise<T>;
  patch<T>(path: string, body: unknown, options?: { authenticated?: boolean }): Promise<T>;
};

export type TokenStorage = {
  salvar(key: string, value: string): Promise<void>;
  ler(key: string): Promise<string | null>;
  remover(key: string): Promise<void>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function criarAuthService(api: AuthApi = apiClient, storageOverride?: TokenStorage) {
  async function storage(): Promise<TokenStorage> {
    if (storageOverride) return storageOverride;
    return (await import('./armazenamentoSeguro')).armazenamentoSeguro;
  }

  function mapearUsuario(perfil: unknown): Usuario {
    if (!isRecord(perfil) || typeof perfil.id !== 'string' ||
        typeof perfil.email !== 'string' || typeof perfil.displayName !== 'string') {
      throw new ApiClientError('A API retornou dados de perfil inválidos.', 'invalid-response');
    }
    return { id: perfil.id, nome: perfil.displayName, email: perfil.email };
  }

  async function concluirAutenticacao(resposta: RespostaAutenticacao): Promise<Usuario> {
    if (!isRecord(resposta) || !isRecord(resposta.data) ||
        typeof resposta.data.accessToken !== 'string' || !resposta.data.accessToken ||
        resposta.data.tokenType !== 'Bearer') {
      throw new ApiClientError('A API retornou uma resposta de autenticação inválida.', 'invalid-response');
    }
    const accessToken = resposta.data.accessToken;
    const user = mapearUsuario(resposta.data.user);
    await (await storage()).salvar(CHAVE_TOKEN, accessToken);
    definirTokenDeAcesso(accessToken);
    return user;
  }

  async function entrar(email: string, senha: string): Promise<Usuario> {
    const resposta = await api.post<RespostaAutenticacao>('/api/v1/auth/login', {
      email: email.trim(),
      password: senha,
    });
    return concluirAutenticacao(resposta);
  }

  async function cadastrar(displayName: string, email: string, senha: string): Promise<Usuario> {
    const resposta = await api.post<RespostaAutenticacao>('/api/v1/auth/register', {
      displayName: displayName.trim(),
      email: email.trim(),
      password: senha,
    });
    return concluirAutenticacao(resposta);
  }

  async function obterPerfil(): Promise<Usuario> {
    const resposta = await api.get<RespostaPerfil>('/api/v1/users/me', { authenticated: true });
    return mapearUsuario(resposta.data);
  }

  async function atualizarPerfil(atualizacao: AtualizacaoPerfil): Promise<Usuario> {
    const resposta = await api.patch<RespostaPerfil>('/api/v1/users/me', atualizacao, { authenticated: true });
    return mapearUsuario(resposta.data);
  }

  async function recuperarSessao(): Promise<Usuario | null> {
    const token = await (await storage()).ler(CHAVE_TOKEN);
    if (!token) {
      definirTokenDeAcesso(null);
      return null;
    }

    definirTokenDeAcesso(token);
    try {
      return await obterPerfil();
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        definirTokenDeAcesso(null);
        await limparSessaoPersistida();
        return null;
      }
      throw error;
    }
  }

  async function limparSessaoPersistida(): Promise<void> {
    await (await storage()).remover(CHAVE_TOKEN);
  }

  async function sair(): Promise<void> {
    invalidarTokenDeAcesso();
    await limparSessaoPersistida();
  }

  return { entrar, cadastrar, sair, recuperarSessao, obterPerfil, atualizarPerfil, limparSessaoPersistida };
}

export const authService = criarAuthService();

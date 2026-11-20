import { obterUrlBaseApi } from '@/config/api';
import { invalidarTokenDeAcesso, obterTokenDeAcesso } from './sessao';

export type ApiErrorKind = 'configuration' | 'network' | 'timeout' | 'http' | 'invalid-response';

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly kind: ApiErrorKind,
    public readonly status?: number,
    public readonly code?: string,
    public readonly details?: Array<{ field: string; message: string }>,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

type RequestOptions = {
  authenticated?: boolean;
  body?: unknown;
};

type ApiClientOptions = {
  baseUrlProvider?: () => string | undefined;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

type ErrorPayload = {
  error?: { code?: unknown; message?: unknown; details?: unknown };
};

function configuredBaseUrl(provider: () => string | undefined): URL {
  const value = provider()?.trim();
  if (!value) {
    throw new ApiClientError(
      'A URL da API não está configurada. Defina EXPO_PUBLIC_API_URL e reinicie o Expo.',
      'configuration',
    );
  }

  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) ||
        (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') ||
        url.username || url.password || url.search || url.hash) {
      throw new Error('URL inválida');
    }
    url.pathname = `${url.pathname.replace(/\/+$/, '')}/`;
    return url;
  } catch {
    throw new ApiClientError(
      'EXPO_PUBLIC_API_URL precisa ser uma URL HTTP(S) válida e usar HTTPS em produção.',
      'configuration',
    );
  }
}

function getErrorFields(payload: unknown): Pick<ApiClientError, 'message' | 'code' | 'details'> | null {
  if (payload === null || typeof payload !== 'object') return null;
  const error = (payload as ErrorPayload).error;
  if (error === null || typeof error !== 'object') return null;

  const message = typeof error.message === 'string' ? error.message : 'A API não conseguiu concluir a requisição.';
  const code = typeof error.code === 'string' ? error.code : undefined;
  const details = Array.isArray(error.details)
    ? error.details.filter((item): item is { field: string; message: string } =>
        item !== null && typeof item === 'object' &&
        typeof (item as { field?: unknown }).field === 'string' &&
        typeof (item as { message?: unknown }).message === 'string')
    : undefined;
  return { message, ...(code ? { code } : {}), ...(details ? { details } : {}) };
}

export class VibraApiClient {
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;
  private readonly baseUrlProvider: () => string | undefined;

  constructor(options: ApiClientOptions = {}) {
    this.fetchImpl = options.fetchImpl ?? ((input, init) => globalThis.fetch(input, init));
    this.timeoutMs = options.timeoutMs ?? 10_000;
    this.baseUrlProvider = options.baseUrlProvider ?? obterUrlBaseApi;
  }

  async get<T>(path: string, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(path, { ...options, method: 'GET' });
  }

  async post<T>(path: string, body: unknown, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(path, { ...options, body, method: 'POST' });
  }

  async patch<T>(path: string, body: unknown, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(path, { ...options, body, method: 'PATCH' });
  }

  async delete<T = void>(path: string, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(path, { ...options, method: 'DELETE' });
  }

  private async request<T>(
    path: string,
    options: RequestOptions & { method: 'GET' | 'POST' | 'PATCH' | 'DELETE' },
  ): Promise<T> {
    const baseUrl = configuredBaseUrl(this.baseUrlProvider);
    const url = new URL(path.replace(/^\/+/, ''), baseUrl);
    if (url.origin !== baseUrl.origin || !url.pathname.startsWith(baseUrl.pathname)) {
      throw new ApiClientError('O caminho solicitado para a API é inválido.', 'configuration');
    }

    const headers: Record<string, string> = { accept: 'application/json' };
    let body: string | undefined;
    if (options.body !== undefined) {
      headers['content-type'] = 'application/json';
      try {
        body = JSON.stringify(options.body);
      } catch {
        throw new ApiClientError('Não foi possível preparar os dados da requisição.', 'invalid-response');
      }
    }

    if (options.authenticated) {
      const token = obterTokenDeAcesso();
      if (!token) {
        throw new ApiClientError('Sua sessão expirou. Entre novamente.', 'http', 401, 'SESSION_REQUIRED');
      }
      headers.authorization = `Bearer ${token}`;
    }

    let response: Response;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      response = await this.fetchImpl(url, {
        method: options.method,
        headers,
        ...(body === undefined ? {} : { body }),
        signal: controller.signal,
      });
    } catch (error) {
      if (controller.signal.aborted || (error instanceof Error && error.name === 'TimeoutError')) {
        throw new ApiClientError('A API demorou para responder. Tente novamente.', 'timeout');
      }
      throw new ApiClientError('Não foi possível conectar à API. Verifique sua conexão e o endereço configurado.', 'network');
    } finally {
      clearTimeout(timeout);
    }

    if (response.status === 204) {
      if (!response.ok) throw new ApiClientError('A API não conseguiu concluir a requisição.', 'http', response.status);
      return undefined as T;
    }

    if (response.status === 401 && options.authenticated) invalidarTokenDeAcesso();

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      if (!response.ok) {
        throw new ApiClientError(
          response.status === 401 ? 'Sua sessão expirou. Entre novamente.' : 'A API não conseguiu concluir a requisição.',
          'http',
          response.status,
          response.status === 401 ? 'UNAUTHORIZED' : undefined,
        );
      }
      throw new ApiClientError('A API retornou uma resposta inválida.', 'invalid-response', response.status);
    }

    if (!response.ok) {
      const apiError = getErrorFields(payload);
      throw new ApiClientError(
        apiError?.message ?? 'A API não conseguiu concluir a requisição.',
        'http',
        response.status,
        apiError?.code,
        apiError?.details,
      );
    }
    return payload as T;
  }
}

export const apiClient = new VibraApiClient();

import { env } from '../../config/env.js';
import {
  JamendoApiError,
  JamendoCredentialMissingError,
  JamendoHttpError,
  JamendoInvalidResourceError,
  JamendoJsonError,
  JamendoProviderUnavailableError,
  JamendoResponseError,
  JamendoTimeoutError,
} from './jamendo.errors.js';
import { jamendoEnvelopeSchema } from './jamendo.schemas.js';
import type { JamendoEnvelope, JamendoQuery, JamendoResource } from './jamendo.types.js';

const JAMENDO_BASE_URL = 'https://api.jamendo.com/v3.0/';
const DEFAULT_TIMEOUT_MS = 5_000;
const ALLOWED_RESOURCES = new Set<JamendoResource>([
  'tracks',
  'tracks/file',
  'artists',
  'artists/tracks',
  'artists/albums',
  'albums',
  'albums/tracks',
]);

export type JamendoClientOptions = {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  clientIdProvider?: () => string | undefined;
};

function isProviderFailure(envelope: JamendoEnvelope): boolean {
  const { status, code, error_message: errorMessage } = envelope.headers;
  const statusFailed = typeof status === 'string' && status.toLowerCase() !== 'success';
  const codeFailed = code !== undefined && code !== null && String(code) !== '0';
  return statusFailed || codeFailed || Boolean(errorMessage?.trim());
}

function appendQuery(url: URL, query: JamendoQuery): void {
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || key === 'client_id' || key === 'format') continue;
    if (Array.isArray(value)) {
      if (value.length > 0) url.searchParams.set(key, value.join(' '));
    } else {
      url.searchParams.set(key, String(value));
    }
  }
}

export class JamendoClient {
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;
  private readonly clientIdProvider: () => string | undefined;

  constructor(options: JamendoClientOptions = {}) {
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.clientIdProvider = options.clientIdProvider ?? (() => env.JAMENDO_CLIENT_ID);
  }

  async get(resource: JamendoResource, query: JamendoQuery = {}): Promise<JamendoEnvelope> {
    if (!ALLOWED_RESOURCES.has(resource)) throw new JamendoInvalidResourceError();

    const clientId = this.clientIdProvider()?.trim();
    if (!clientId) throw new JamendoCredentialMissingError();

    const url = new URL(`${resource}/`, JAMENDO_BASE_URL);
    appendQuery(url, query);
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('format', 'json');

    const signal = AbortSignal.timeout(this.timeoutMs);
    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        method: 'GET',
        headers: { accept: 'application/json' },
        signal,
      });
    } catch (error) {
      if (signal.aborted || (error instanceof Error && error.name === 'TimeoutError')) {
        throw new JamendoTimeoutError(this.timeoutMs, error);
      }
      throw new JamendoProviderUnavailableError(error, clientId);
    }

    if (!response.ok) throw new JamendoHttpError(response.status);

    let payload: unknown;
    try {
      payload = await response.json();
    } catch (error) {
      throw new JamendoJsonError(error, clientId);
    }

    const parsed = jamendoEnvelopeSchema.safeParse(payload);
    if (!parsed.success) throw new JamendoResponseError(parsed.error, clientId);

    const envelope = parsed.data as JamendoEnvelope;
    if (isProviderFailure(envelope)) {
      throw new JamendoApiError(envelope.headers.code, envelope.headers.error_message, clientId);
    }

    return envelope;
  }
}

export const jamendoClient = new JamendoClient();

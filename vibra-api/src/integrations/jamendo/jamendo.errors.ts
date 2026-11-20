function sanitizedCause(cause: unknown, secret?: string): unknown {
  if (cause instanceof Error) {
    const message = secret ? cause.message.split(secret).join('[REDACTED]') : cause.message;
    return { name: cause.name, message };
  }
  if (typeof cause === 'string') {
    return secret ? cause.split(secret).join('[REDACTED]') : cause;
  }
  if (cause !== null && typeof cause === 'object') {
    try {
      const serialized = JSON.stringify(cause);
      return serialized && secret ? serialized.split(secret).join('[REDACTED]') : serialized;
    } catch {
      return '[Unserializable technical cause]';
    }
  }
  return cause;
}

export class JamendoIntegrationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly technicalCause?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class JamendoCredentialMissingError extends JamendoIntegrationError {
  constructor() {
    super('A integração com o catálogo está indisponível.', 'JAMENDO_CREDENTIAL_MISSING');
  }
}

export class JamendoInvalidResourceError extends JamendoIntegrationError {
  constructor() {
    super('O recurso solicitado não é permitido na integração.', 'JAMENDO_INVALID_RESOURCE');
  }
}

export class JamendoTimeoutError extends JamendoIntegrationError {
  constructor(timeoutMs: number, cause?: unknown) {
    super(
      'O catálogo musical não respondeu a tempo.',
      'JAMENDO_TIMEOUT',
      sanitizedCause(cause),
    );
    this.timeoutMs = timeoutMs;
  }

  public readonly timeoutMs: number;
}

export class JamendoProviderUnavailableError extends JamendoIntegrationError {
  constructor(cause?: unknown, clientId?: string) {
    super(
      'O catálogo musical está temporariamente indisponível.',
      'JAMENDO_UNAVAILABLE',
      sanitizedCause(cause, clientId),
    );
  }
}

export class JamendoHttpError extends JamendoIntegrationError {
  constructor(public readonly status: number) {
    super('O provedor do catálogo retornou uma resposta HTTP inválida.', 'JAMENDO_HTTP_ERROR');
  }
}

export class JamendoJsonError extends JamendoIntegrationError {
  constructor(cause?: unknown, clientId?: string) {
    super('O provedor do catálogo retornou JSON inválido.', 'JAMENDO_INVALID_JSON', sanitizedCause(cause, clientId));
  }
}

export class JamendoResponseError extends JamendoIntegrationError {
  constructor(cause?: unknown, clientId?: string) {
    super(
      'O provedor do catálogo retornou uma resposta incompatível.',
      'JAMENDO_INVALID_RESPONSE',
      sanitizedCause(cause, clientId),
    );
  }
}

export class JamendoApiError extends JamendoIntegrationError {
  constructor(code?: string | number | null, cause?: unknown, clientId?: string) {
    super(
      'O provedor do catálogo não conseguiu concluir a consulta.',
      'JAMENDO_API_ERROR',
      {
        providerCode: code === undefined || code === null
          ? undefined
          : clientId && String(code).includes(clientId)
            ? String(code).split(clientId).join('[REDACTED]')
            : code,
        ...(cause === undefined ? {} : { details: sanitizedCause(cause, clientId) }),
      },
    );
  }
}

import { normalizeApiError } from '../errorNormalizer';

export interface HttpApiAdapterConfig {
  baseUrl?: string;
}

export interface HttpRequestOptions {
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

export interface HttpResponseResult<T = unknown> {
  status: number;
  data: T;
  etag: string | null;
  idempotencyKeyStatus: string | null;
}

type HttpMethod = 'GET' | 'POST' | 'PATCH';

export function createHttpApiAdapter(config: HttpApiAdapterConfig = {}) {
  async function request<T>(
    method: HttpMethod,
    path: string,
    options: HttpRequestOptions = {},
  ): Promise<HttpResponseResult<T>> {
    const headers = new Headers(options.headers);
    if (options.body !== undefined) headers.set('Content-Type', 'application/json');

    const response = await fetch(`${config.baseUrl ?? ''}${path}`, {
      method,
      headers,
      signal: options.signal,
      ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
    });
    const data = await response.json().catch(() => undefined) as T | undefined;

    if (!response.ok) {
      throw normalizeApiError(data);
    }

    return {
      status: response.status,
      data: data as T,
      etag: response.headers.get('etag'),
      idempotencyKeyStatus: response.headers.get('idempotency-key-status'),
    };
  }

  return {
    get: <T = unknown>(path: string, options?: HttpRequestOptions) => request<T>('GET', path, options),
    post: <T = unknown>(path: string, options?: HttpRequestOptions) => request<T>('POST', path, options),
    patch: <T = unknown>(path: string, options?: HttpRequestOptions) => request<T>('PATCH', path, options),
  };
}

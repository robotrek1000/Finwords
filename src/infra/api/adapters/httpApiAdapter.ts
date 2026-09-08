/**
 * HttpApiAdapter — the single axios pipeline over the generated HTTP client.
 *
 * It reuses the generated `HttpClient` (and therefore its axios instance); it is
 * not a parallel bespoke transport. Base URL is runtime config; the Bearer token
 * is an optional boundary passed in (no token storage / exchange here). Mutations
 * send `If-Match` / `Idempotency-Key` via request headers. Responses capture
 * status / data / ETag / Idempotency-Key-Status. ETags are returned as response
 * metadata; the caller owns committing one after it verifies request freshness.
 * Axios rejections are normalized by root `type` only.
 */
import { isAxiosError } from 'axios';
import type { NormalizedApiError } from '../errorNormalizer';
import { normalizeApiError } from '../errorNormalizer';
import { HttpClient } from '../generated/http-client';
import type { EtagStore } from '../../http/etagStore';

export interface HttpApiAdapterConfig {
  baseUrl: string;
  apiToken?: string;
  etagStore?: EtagStore;
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

function readHeader(headers: unknown, name: string): string | null {
  if (!headers || typeof headers !== 'object') return null;
  const record = headers as Record<string, unknown>;
  const value =
    record[name] ?? record[name.toLowerCase()] ?? record[name.toUpperCase()];
  return typeof value === 'string' ? value : null;
}

function toNormalizedError(error: unknown): NormalizedApiError {
  if (isAxiosError(error)) {
    const data = error.response?.data;
    if (data !== undefined && data !== null) {
      return normalizeApiError(data);
    }
  }
  return normalizeApiError(error);
}

export function createHttpApiAdapter(config: HttpApiAdapterConfig) {
  const http = new HttpClient({ baseURL: config.baseUrl });
  const instance = http.instance;

  async function request<T>(
    method: HttpMethod,
    path: string,
    options: HttpRequestOptions = {},
  ): Promise<HttpResponseResult<T>> {
    const headers: Record<string, string> = {};
    if (config.apiToken) {
      headers.Authorization = `Bearer ${config.apiToken}`;
    }
    if (options.headers) {
      Object.assign(headers, options.headers);
    }

    try {
      const response = await instance.request<T>({
        method,
        url: path,
        data: options.body,
        headers,
        signal: options.signal,
      });

      const etag = readHeader(response.headers, 'etag');
      const idempotencyKeyStatus = readHeader(
        response.headers,
        'idempotency-key-status',
      );

      return { status: response.status, data: response.data, etag, idempotencyKeyStatus };
    } catch (error) {
      throw toNormalizedError(error);
    }
  }

  return {
    get: <T = unknown>(path: string, options?: HttpRequestOptions) =>
      request<T>('GET', path, options),
    post: <T = unknown>(path: string, options?: HttpRequestOptions) =>
      request<T>('POST', path, options),
    patch: <T = unknown>(path: string, options?: HttpRequestOptions) =>
      request<T>('PATCH', path, options),
  };
}

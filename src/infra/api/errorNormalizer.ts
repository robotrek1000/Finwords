/**
 * Client-side fallback type used when an unknown input cannot be normalized to a
 * contract-defined error type. Consumers must branch only on the root `type`.
 */
export const UNKNOWN_ERROR = 'UNKNOWN_ERROR';

export interface ErrorDisplayOptions {
  title?: string;
  text?: string;
}

export interface NormalizedValidationError {
  type: string;
  field?: string;
  payload?: Record<string, unknown>;
  displayOptions?: ErrorDisplayOptions;
  text?: string;
}

export interface NormalizedApiError {
  type: string;
  field?: string;
  payload?: Record<string, unknown>;
  displayOptions?: ErrorDisplayOptions;
  errors?: NormalizedValidationError[];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function normalizeDisplayOptions(value: unknown): ErrorDisplayOptions | undefined {
  const record = asRecord(value);
  if (!record) return undefined;

  const options: ErrorDisplayOptions = {};
  if (typeof record.title === 'string') options.title = record.title;
  if (typeof record.text === 'string') options.text = record.text;

  return Object.keys(options).length > 0 ? options : undefined;
}

function normalizeValidationItem(value: unknown): NormalizedValidationError | null {
  const record = asRecord(value);
  if (!record || typeof record.type !== 'string' || record.type.length === 0) {
    return null;
  }

  return {
    type: record.type,
    field: typeof record.field === 'string' ? record.field : undefined,
    payload: asRecord(record.payload) ?? undefined,
    displayOptions: normalizeDisplayOptions(record.displayOptions),
    text: typeof record.text === 'string' ? record.text : undefined,
  };
}

/**
 * Normalize an unknown input (wire error body, thrown value, etc.) into a typed
 * error. The root `type` is authoritative; branching is by `type` only, never by
 * HTTP status code. Unknown input falls back to `UNKNOWN_ERROR`.
 */
export function normalizeApiError(input: unknown): NormalizedApiError {
  const record = asRecord(input);

  if (!record || typeof record.type !== 'string' || record.type.length === 0) {
    return { type: UNKNOWN_ERROR };
  }

  const type = record.type;

  if (type === 'VALIDATION_ERROR') {
    const rawErrors = Array.isArray(record.errors) ? record.errors : [];
    const errors = rawErrors
      .map(normalizeValidationItem)
      .filter((item): item is NormalizedValidationError => item !== null);
    return { type, errors };
  }

  return {
    type,
    field: typeof record.field === 'string' ? record.field : undefined,
    payload: asRecord(record.payload) ?? undefined,
    displayOptions: normalizeDisplayOptions(record.displayOptions),
  };
}

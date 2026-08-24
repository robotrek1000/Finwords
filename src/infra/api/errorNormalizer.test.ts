import { describe, expect, it } from 'vitest';
import { normalizeApiError } from './errorNormalizer';

describe('normalizeApiError', () => {
  it('branches by root type, never by HTTP status code', () => {
    const conflict = normalizeApiError({
      type: 'STATE_VERSION_CONFLICT',
      payload: { currentEtag: '"a1b2c3"' },
    });
    expect(conflict.type).toBe('STATE_VERSION_CONFLICT');
    expect(conflict.payload?.currentEtag).toBe('"a1b2c3"');

    const validation = normalizeApiError({
      type: 'VALIDATION_ERROR',
      errors: [
        { type: 'REQUIRED_FIELD', field: 'body.route', text: 'Поле route обязательно' },
      ],
    });
    expect(validation.type).toBe('VALIDATION_ERROR');
    expect(validation.errors?.[0].type).toBe('REQUIRED_FIELD');
    expect(validation.errors?.[0].field).toBe('body.route');
  });

  it('preserves the retryable flag of an internal server error', () => {
    const err = normalizeApiError({ type: 'INTERNAL_ERROR', payload: { retryable: true } });
    expect(err.type).toBe('INTERNAL_ERROR');
    expect(err.payload?.retryable).toBe(true);
  });

  it('normalizes an unauthorized failure by its reason', () => {
    const err = normalizeApiError({ type: 'UNAUTHORIZED', payload: { reason: 'expired_token' } });
    expect(err.type).toBe('UNAUTHORIZED');
    expect(err.payload?.reason).toBe('expired_token');
  });
});
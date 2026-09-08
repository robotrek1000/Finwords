import { describe, expect, it } from 'vitest';
import { loadRuntimeConfig } from './runtimeConfig';

describe('runtimeConfig', () => {
  it('exposes apiBaseUrl, apiMode and flags without a hardcoded host or secrets', () => {
    const config = loadRuntimeConfig();

    expect(config).toHaveProperty('apiBaseUrl');
    expect(config).toHaveProperty('apiMode');
    expect(config).toHaveProperty('flags');

    expect(['mock', 'http']).toContain(config.apiMode);
    expect(typeof config.apiBaseUrl).toBe('string');
    expect(typeof config.flags).toBe('object');
  });

  it('never hardcodes the candidate test host from the wire contract', () => {
    const config = loadRuntimeConfig();
    // Host must always come from runtime config, never from openapi servers[0].url (Q-001).
    expect(config.apiBaseUrl).not.toMatch(/m1-test\.broker\.ru/);
  });

  it('never exposes secrets through the runtime config surface', () => {
    const config = loadRuntimeConfig();
    const serialized = JSON.stringify(config);
    expect(serialized).not.toMatch(/token|secret|password|authorization|bearer/i);
  });
});
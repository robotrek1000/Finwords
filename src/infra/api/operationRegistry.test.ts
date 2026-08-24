import { describe, expect, it } from 'vitest';
import { operationRegistry, toMswPath } from './operationRegistry';

describe('standalone demo operation registry', () => {
  it('contains only local demo routes', () => {
    expect(operationRegistry).toHaveLength(13);
    expect(operationRegistry.every(({ templatePath }) => templatePath.startsWith('/demo-api/')))
      .toBe(true);
  });

  it('keeps mutation concurrency metadata', () => {
    expect(operationRegistry.find(({ apiId }) => apiId === 'submit-route'))
      .toMatchObject({ method: 'POST', mutation: true, ifMatch: true });
    expect(operationRegistry.find(({ apiId }) => apiId === 'state'))
      .toMatchObject({ method: 'GET', mutation: false, ifMatch: false });
  });

  it('converts template parameters for MSW', () => {
    expect(toMswPath('/demo-api/levels/{levelId}/state'))
      .toBe('/demo-api/levels/:levelId/state');
  });
});

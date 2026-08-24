import { describe, expect, it } from 'vitest';
import { createEtagStore } from './etagStore';

describe('etagStore', () => {
  it('starts empty and updates the single current ETag on an accepted 200 response', () => {
    const store = createEtagStore();
    expect(store.getCurrent()).toBeNull();

    store.set('"a1b2c3"');
    expect(store.getCurrent()).toBe('"a1b2c3"');
  });

  it('keeps only the latest ETag and clears on demand', () => {
    const store = createEtagStore();
    store.set('"first"');
    store.set('"second"');
    expect(store.getCurrent()).toBe('"second"');

    store.clear();
    expect(store.getCurrent()).toBeNull();
  });
});
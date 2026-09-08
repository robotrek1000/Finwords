import { describe, expect, it } from 'vitest';
import { createMutationCoordinator } from './mutationCoordinator';

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('mutationCoordinator', () => {
  it('issues a new UUID v4 key for a new intent', () => {
    const coordinator = createMutationCoordinator();
    const intent = coordinator.begin({ route: [] });

    expect(intent.intentId).toMatch(UUID_V4);
    expect(intent.key).toMatch(UUID_V4);
  });

  it('reuses the same key for retry/timeout/conflict of the same intent', () => {
    const coordinator = createMutationCoordinator();
    const intent = coordinator.begin({ route: [] });

    expect(coordinator.keyForRetry(intent.intentId)).toBe(intent.key);
    expect(coordinator.keyForRetry(intent.intentId)).toBe(intent.key);
  });

  it('issues a new key for a changed body or a new intent', () => {
    const coordinator = createMutationCoordinator();
    const first = coordinator.begin({ route: [{ row: 0, col: 0 }] });
    const second = coordinator.begin({ route: [{ row: 0, col: 1 }] });

    expect(second.key).not.toBe(first.key);
  });

  it('clears the intent on success/terminal resolution', () => {
    const coordinator = createMutationCoordinator();
    const intent = coordinator.begin({ route: [] });

    coordinator.resolve(intent.intentId);
    expect(coordinator.keyForRetry(intent.intentId)).toBeUndefined();
  });

  it('rejects stale out-of-order requests by generation and identity', () => {
    const coordinator = createMutationCoordinator();
    const intent = coordinator.begin({ route: [] });

    expect(coordinator.isStale(intent.intentId, intent.requestGeneration)).toBe(false);
    expect(coordinator.isStale(intent.intentId, intent.requestGeneration - 1)).toBe(true);
    expect(coordinator.isStale('unknown-intent', 0)).toBe(true);
  });

  it('increments requestGeneration on retry while preserving the idempotency key', () => {
    const coordinator = createMutationCoordinator();
    const intent = coordinator.begin({ route: [] });

    const retried = coordinator.keyForRetry(intent.intentId);
    expect(retried).toBe(intent.key);
    // После retry generation должен вырасти: старый generation становится stale.
    expect(coordinator.isStale(intent.intentId, intent.requestGeneration)).toBe(true);
    expect(coordinator.isStale(intent.intentId, intent.requestGeneration + 1)).toBe(false);
  });

  it('11: repeated retries keep incrementing generation, never reusing the old one', () => {
    const coordinator = createMutationCoordinator();
    const intent = coordinator.begin({ route: [] });

    coordinator.keyForRetry(intent.intentId);
    coordinator.keyForRetry(intent.intentId);
    coordinator.keyForRetry(intent.intentId);

    // Только актуальная generation активна; все предыдущие — stale.
    expect(coordinator.isStale(intent.intentId, intent.requestGeneration)).toBe(true);
    expect(coordinator.isStale(intent.intentId, intent.requestGeneration + 1)).toBe(true);
    expect(coordinator.isStale(intent.intentId, intent.requestGeneration + 2)).toBe(true);
    expect(coordinator.isStale(intent.intentId, intent.requestGeneration + 3)).toBe(false);
  });

  it('11: a changed body is not silently reused under the old key', () => {
    const coordinator = createMutationCoordinator();
    const first = coordinator.begin({ route: [{ row: 0, col: 0 }] });

    // Изменённое тело — новое намерение, новый key (никогда не тот же key).
    const changed = coordinator.begin({ route: [{ row: 0, col: 1 }] });
    expect(changed.key).not.toBe(first.key);
    // Старое намерение не должно считаться активным после нового.
    expect(coordinator.isStale(first.intentId, first.requestGeneration)).toBe(true);
  });

  it('11: success/terminal resolution clears the intent entirely', () => {
    const coordinator = createMutationCoordinator();
    const intent = coordinator.begin({ route: [] });

    coordinator.resolve(intent.intentId);
    expect(coordinator.keyForRetry(intent.intentId)).toBeUndefined();
    expect(coordinator.isStale(intent.intentId, intent.requestGeneration)).toBe(true);
  });

  it('hashes JSON-semantically: undefined properties do not create a changed body', () => {
    const coordinator = createMutationCoordinator();
    const withUndefined = coordinator.begin({ route: [{ row: 0, col: 0 }], note: undefined });
    const withoutNote = coordinator.begin({ route: [{ row: 0, col: 0 }] });

    // По JSON wire-семантике {note: undefined} сериализуется в {} — то же тело.
    expect(withUndefined.bodyHash).toBe(withoutNote.bodyHash);
  });

  it('resumes an unresolved semantic intent across a later user retry', () => {
    const coordinator = createMutationCoordinator();
    const first = coordinator.beginOrRetry({
      apiId: 'API-007',
      params: { levelId: 'level-1' },
    });
    const retry = coordinator.beginOrRetry({
      apiId: 'API-007',
      params: { levelId: 'level-1' },
    });

    expect(retry.intentId).toBe(first.intentId);
    expect(retry.key).toBe(first.key);
    expect(retry.requestGeneration).toBe(first.requestGeneration + 1);

    const differentOperation = coordinator.beginOrRetry({
      apiId: 'API-004',
      params: { levelId: 'level-1' },
    });
    expect(differentOperation.key).not.toBe(first.key);
  });
});

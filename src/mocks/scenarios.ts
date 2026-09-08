/**
 * P0 scenario overrides for replay / conflict / error flows.
 *
 * Bodies follow the generated `ProcessProblem` contract (root `type` only). These
 * are foundation placeholders; P3/P5 expand them into per-operation replay,
 * conflict and error matrices.
 */
import type { FixtureMap } from './handlerFactory';

export const stateVersionConflict = {
  type: 'STATE_VERSION_CONFLICT',
  payload: { currentEtag: '"fresh-etag"' },
};

export const internalError = {
  type: 'INTERNAL_ERROR',
  payload: { retryable: true },
};

export const errorFixtures: FixtureMap = {
  'API-006': { body: stateVersionConflict, etag: '"fresh-etag"' },
};

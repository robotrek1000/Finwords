/**
 * Default MSW handlers for the in-scope operations, built from the operation
 * registry + the default fixtures.
 */
import { operationRegistry } from '../infra/api/operationRegistry';
import { defaultFixtures } from './fakeDb';
import { createHandlers } from './handlerFactory';
import { p1Handlers } from './p1Handlers';

const P1_API_IDS = new Set([
  'API-001',
  'API-002',
  'API-003',
  'API-004',
  'API-005',
  'API-007',
  'API-009',
  'API-010',
  'API-011',
  'API-012',
  'API-013',
]);

export const handlers = [
  ...p1Handlers,
  ...createHandlers(
    operationRegistry.filter((operation) => !P1_API_IDS.has(operation.apiId)),
    defaultFixtures,
  ),
];

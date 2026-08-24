/**
 * Node-side MSW server (Vitest). Reuses the default handlers; tests may spread
 * their own fixture overrides over `handlers`.
 */
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);

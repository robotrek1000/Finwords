/**
 * handlerFactory — builds MSW handlers from the operation registry metadata.
 *
 * OpenAPI `{param}` template paths are converted to MSW `:param` matchers without
 * duplicating path constants. Each handler resolves its fixture from the fixture
 * map keyed by `apiId` and returns server-shaped JSON with ETag / IKS headers.
 * A missing fixture fails fast.
 */
import { http, HttpResponse } from 'msw';
import type { HttpHandler, HttpResponseResolver, JsonBodyType } from 'msw';
import type { OperationSpec } from '../infra/api/operationRegistry';

export interface HandlerFixture {
  body: JsonBodyType;
  etag?: string;
  iks?: string;
}

export type FixtureMap = Record<string, HandlerFixture>;

/** Convert an OpenAPI template path (`/levels/{levelId}/routes`) to an MSW matcher (`/levels/:levelId/routes`). */
export function toMswPath(templatePath: string): string {
  return templatePath.replace(/\{([^}]+)\}/g, ':$1');
}

export function createHandlers(
  registry: OperationSpec[],
  fixtures: FixtureMap,
): HttpHandler[] {
  return registry.map((operation) => {
    const path = toMswPath(operation.templatePath);

    const resolver: HttpResponseResolver = () => {
      const fixture = fixtures[operation.apiId];
      if (!fixture) {
        throw new Error(
          `No fixture for ${operation.apiId} (${operation.method} ${operation.templatePath})`,
        );
      }

      const headers = new Headers();
      if (fixture.etag) headers.set('ETag', fixture.etag);
      if (fixture.iks) headers.set('Idempotency-Key-Status', fixture.iks);

      return HttpResponse.json(fixture.body, { headers });
    };

    switch (operation.method) {
      case 'GET':
        return http.get(path, resolver);
      case 'POST':
        return http.post(path, resolver);
      case 'PATCH':
        return http.patch(path, resolver);
    }
  });
}

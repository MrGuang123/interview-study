import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { ConsoleLogger } from '@nestjs/common';
import type { Request, Response } from 'express';

export type HttpResponse = Response<
  unknown,
  { requestId?: string; errorCode?: string }
>;

const logger = new ConsoleLogger('HttpRequest', { json: true });

export function ensureRequestContext(
  request: Request,
  response: HttpResponse,
): string {
  const existing = response.locals.requestId;
  if (existing) {
    return existing;
  }

  const requestId = randomUUID();
  response.locals.requestId = requestId;
  response.setHeader('X-Request-Id', requestId);
  const startedAt = performance.now();

  response.once('finish', () => {
    const route = request.route as { path?: unknown } | undefined;

    logger.log({
      event: 'http.request.completed',
      requestId,
      method: request.method,
      route: typeof route?.path === 'string' ? route.path : 'unmatched',
      statusCode: response.statusCode,
      durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
      errorCode: response.locals.errorCode,
    });
  });

  return requestId;
}

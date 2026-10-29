import { STATUS_CODES } from 'node:http';
import {
  Catch,
  HttpException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import type { Request } from 'express';
import { ensureRequestContext } from './request-context';
import type { HttpResponse } from './request-context';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<HttpResponse>();

    if (response.headersSent) {
      response.end();
      return;
    }

    const requestId = ensureRequestContext(request, response);
    const candidate =
      exception instanceof HttpException ? exception.getStatus() : 500;
    const status =
      Number.isInteger(candidate) && candidate >= 400 && candidate <= 599
        ? candidate
        : 500;
    const code = status === 500 ? 'INTERNAL_ERROR' : `HTTP_${status}`;

    response.locals.errorCode = code;
    response.setHeader('Cache-Control', 'no-store');

    const route = request.route as { path?: unknown } | undefined;
    if (
      request.method === 'GET' &&
      route?.path === '/health/ready' &&
      exception instanceof ServiceUnavailableException
    ) {
      response.status(503).json({ status: 'not_ready' });
      return;
    }

    response.status(status).json({
      code,
      message: STATUS_CODES[status] ?? 'Request failed',
      requestId,
    });
  }
}

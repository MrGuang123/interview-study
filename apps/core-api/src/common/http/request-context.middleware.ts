import { Injectable } from '@nestjs/common';
import type { NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request } from 'express';
import { ensureRequestContext } from './request-context';
import type { HttpResponse } from './request-context';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(request: Request, response: HttpResponse, next: NextFunction): void {
    ensureRequestContext(request, response);
    next();
  }
}

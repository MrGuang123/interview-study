import { Controller, Get, Header, Inject } from '@nestjs/common';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(
    @Inject(HealthService) private readonly healthService: HealthService,
  ) {}

  @Get('live')
  @Header('Cache-Control', 'no-store')
  live(): { status: 'alive' } {
    return { status: 'alive' };
  }

  @Get('ready')
  @Header('Cache-Control', 'no-store')
  ready(): Promise<{ status: 'ready' }> {
    return this.healthService.checkReady();
  }
}

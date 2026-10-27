import {
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class HealthService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async checkReady(): Promise<{ status: 'ready' }> {
    try {
      await this.prisma.user.findFirst({
        select: { id: true },
      });
    } catch {
      throw new ServiceUnavailableException({ status: 'not_ready' });
    }

    return { status: 'ready' };
  }
}

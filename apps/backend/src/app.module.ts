import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AiModule } from './ai/ai.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { EmbeddingModule } from './embedding/embedding.module';
import { KnowledgeModule } from './knowledge/knowledge.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisRateLimitGuard } from './rate-limit/redis-rate-limit.guard';
import { RedisModule } from './redis/redis.module';
import { TicketsModule } from './tickets/tickets.module';

@Module({
  imports: [
    RedisModule,
    PrismaModule,
    EmbeddingModule,
    AuditModule,
    AuthModule,
    TicketsModule,
    KnowledgeModule,
    AiModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: RedisRateLimitGuard,
    },
  ],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { AI_PROVIDER_TOKEN, createAiProvider } from './ai-provider.factory';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';

@Module({
  imports: [AuthModule, KnowledgeModule],
  controllers: [AiController],
  providers: [
    AiService,
    {
      provide: AI_PROVIDER_TOKEN,
      useFactory: createAiProvider,
    },
  ],
})
export class AiModule {}

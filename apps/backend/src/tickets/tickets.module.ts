import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TicketReplayService } from './ticket-replay.service';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';

@Module({
  imports: [AuthModule],
  controllers: [TicketsController],
  providers: [TicketsService, TicketReplayService],
})
export class TicketsModule {}

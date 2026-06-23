import { IsISO8601 } from 'class-validator';

export class TicketReplayDto {
  @IsISO8601()
  until!: string;
}

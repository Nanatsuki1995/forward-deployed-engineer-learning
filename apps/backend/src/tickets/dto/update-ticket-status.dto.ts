import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import type { TicketStatus } from '../../data/workbench.types';

export class UpdateTicketStatusDto {
  @ApiProperty({
    enum: ['new', 'triage', 'in_progress', 'pending_approval', 'resolved'],
    example: 'triage',
  })
  @IsIn(['new', 'triage', 'in_progress', 'pending_approval', 'resolved'])
  status!: TicketStatus;
}

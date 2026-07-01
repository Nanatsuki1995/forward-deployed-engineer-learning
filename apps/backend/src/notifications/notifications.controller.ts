import {
  Controller,
  Get,
  MessageEvent,
  Param,
  Patch,
  Query,
  Sse,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { NotificationsService } from './notifications.service';
import { SseJwtGuard } from './sse-jwt.guard';
import type { AuthenticatedUser } from '../auth/auth.types';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(SseJwtGuard, RolesGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Sse('stream')
  @Roles('admin', 'agent')
  @ApiOperation({ summary: 'SSE 实时通知流 (token 通过 ?authorization=Bearer%20xxx 传递)' })
  stream(@CurrentUser() user: AuthenticatedUser): Observable<MessageEvent> {
    return this.notificationsService.getUserStream(user.id).asObservable();
  }

  @Get()
  @ApiOperation({ summary: '查询通知列表' })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('isRead') isRead?: string,
  ) {
    const filter =
      isRead === 'true' ? true : isRead === 'false' ? false : undefined;
    return this.notificationsService.findByUser(user.id, filter);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: '标记单条已读' })
  markRead(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.markRead(id, user.id);
  }

  @Patch('read-all')
  @ApiOperation({ summary: '全部标记已读' })
  markAllRead(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.markAllRead(user.id);
  }

  @Get('unread-count')
  @ApiOperation({ summary: '未读数量' })
  unreadCount(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.unreadCount(user.id);
  }
}

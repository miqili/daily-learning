import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { success } from '../common/api-response';
import { AuthUser, CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateSessionDto } from './sessions.dto';
import { SessionsService } from './sessions.service';

@Controller('sessions')
@UseGuards(JwtAuthGuard)
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post()
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateSessionDto) {
    return success(await this.sessionsService.create(user.id, dto), '学习记录已保存');
  }

  @Get('today')
  async today(@CurrentUser() user: AuthUser) {
    return success(await this.sessionsService.today(user.id));
  }

  @Get('summary')
  async summary(@CurrentUser() user: AuthUser, @Query('days') days?: string) {
    return success(await this.sessionsService.summary(user.id, days ? Number(days) : 7));
  }
}

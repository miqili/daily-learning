import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser, AuthUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { success } from '../common/api-response';
import { CompleteTaskDto, InitPlanDto } from './tasks.dto';
import { TasksService } from './tasks.service';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post('init-plan')
  async initPlan(@CurrentUser() user: AuthUser, @Body() dto: InitPlanDto) {
    return success(await this.tasksService.initPlan(user.id, dto), '70天针对性备考计划生成成功！');
  }

  @Get('summary')
  async summary(@CurrentUser() user: AuthUser) {
    return success(await this.tasksService.getSummary(user.id));
  }

  @Get('day/:dayNumber')
  async day(@CurrentUser() user: AuthUser, @Param('dayNumber', ParseIntPipe) dayNumber: number) {
    return success(await this.tasksService.getDay(user.id, dayNumber));
  }

  @Patch(':id/completion')
  async setCompletion(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CompleteTaskDto,
  ) {
    return success(await this.tasksService.setCompletion(user.id, id, dto));
  }
}

import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { success } from '../common/api-response';
import { AuthUser, CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CompletionDto, InitPlanDto, StudyAvailabilityDto } from './plan.dto';
import { PlanService } from './plan.service';

@Controller('plan')
@UseGuards(JwtAuthGuard)
export class PlanController {
  constructor(private readonly planService: PlanService) {}

  @Post('init')
  async init(@CurrentUser() user: AuthUser, @Body() dto: InitPlanDto) {
    return success(await this.planService.init(user.id, dto), '计划已生成');
  }

  @Get('summary')
  async summary(@CurrentUser() user: AuthUser) {
    return success(await this.planService.summary(user.id));
  }

  @Get('today')
  async today(@CurrentUser() user: AuthUser) {
    return success(await this.planService.today(user.id));
  }

  @Get('settings/availability')
  async availability(@CurrentUser() user: AuthUser) {
    return success(await this.planService.getAvailability(user.id));
  }

  @Patch('settings/availability')
  async updateAvailability(@CurrentUser() user: AuthUser, @Body() dto: StudyAvailabilityDto) {
    return success(await this.planService.updateAvailability(user.id, dto), '可用时间已更新');
  }

  @Get('day/:dayNumber')
  async day(@CurrentUser() user: AuthUser, @Param('dayNumber', ParseIntPipe) dayNumber: number) {
    return success(await this.planService.day(user.id, dayNumber));
  }

  @Get(':id')
  async task(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return success(await this.planService.task(user.id, id));
  }

  @Patch(':id/completion')
  async setCompletion(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: CompletionDto) {
    return success(await this.planService.setCompletion(user.id, id, dto), '任务状态已更新');
  }
}

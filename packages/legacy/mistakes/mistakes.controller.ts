import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { success } from '../common/api-response';
import { CurrentUser, AuthUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateMistakeDto, ListMistakesDto, ReviewMistakeDto, UpdateMistakeDto } from './mistakes.dto';
import { MistakesService } from './mistakes.service';

@Controller('mistakes')
@UseGuards(JwtAuthGuard)
export class MistakesController {
  constructor(private readonly mistakesService: MistakesService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() dto: ListMistakesDto) {
    return success(this.mistakesService.list(user.id, dto));
  }

  @Get('review-queue')
  reviewQueue(@CurrentUser() user: AuthUser) {
    return success(this.mistakesService.reviewQueue(user.id));
  }

  @Get('stats')
  stats(@CurrentUser() user: AuthUser) {
    return success(this.mistakesService.stats(user.id));
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return success(this.mistakesService.get(user.id, id));
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateMistakeDto) {
    return success(this.mistakesService.create(user.id, dto), '错题已录入');
  }

  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateMistakeDto) {
    return success(this.mistakesService.update(user.id, id, dto), '已更新');
  }

  @Patch(':id/review')
  review(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: ReviewMistakeDto) {
    return success(this.mistakesService.review(user.id, id, dto), '复习记录已保存');
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return success(this.mistakesService.remove(user.id, id), '已删除');
  }
}

import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { success } from '../common/api-response';
import { AuthUser, CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateMistakeDto, ReviewMistakeDto, UpdateMistakeDto } from './mistakes.dto';
import { MistakesService } from './mistakes.service';

@Controller('mistakes')
@UseGuards(JwtAuthGuard)
export class MistakesController {
  constructor(private readonly mistakesService: MistakesService) {}

  @Get()
  async list(@CurrentUser() user: AuthUser, @Query() query: { subject_id?: string; error_reason?: string; keyword?: string; mastered?: string }) {
    return success(await this.mistakesService.list(user.id, {
      subject_id: query.subject_id ? Number(query.subject_id) : undefined,
      error_reason: query.error_reason,
      keyword: query.keyword,
      mastered: query.mastered,
    }));
  }

  @Get('review-queue')
  async reviewQueue(@CurrentUser() user: AuthUser) {
    return success(await this.mistakesService.reviewQueue(user.id));
  }

  @Post()
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateMistakeDto) {
    return success(await this.mistakesService.create(user.id, dto), '错题已记录');
  }

  @Patch(':id')
  async update(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateMistakeDto) {
    return success(await this.mistakesService.update(user.id, id, dto), '错题已更新');
  }

  @Delete(':id')
  async remove(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return success(await this.mistakesService.remove(user.id, id), '错题已删除');
  }

  @Patch(':id/review')
  async review(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: ReviewMistakeDto) {
    return success(await this.mistakesService.review(user.id, id, dto), '复习结果已记录');
  }
}

import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { success } from '../common/api-response';
import { CurrentUser, AuthUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateSubjectDto, UpdateSubjectDto } from './subjects.dto';
import { SubjectsService } from './subjects.service';

@Controller('subjects')
@UseGuards(JwtAuthGuard)
export class SubjectsController {
  constructor(private readonly subjectsService: SubjectsService) {}

  @Get()
  async list(@CurrentUser() user: AuthUser) {
    return success(await this.subjectsService.list(user.id));
  }

  @Post()
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateSubjectDto) {
    return success(await this.subjectsService.create(user.id, dto), '科目已创建');
  }

  @Patch(':id')
  async update(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateSubjectDto) {
    return success(await this.subjectsService.update(user.id, id, dto), '科目已更新');
  }

  @Delete(':id')
  async remove(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return success(await this.subjectsService.remove(user.id, id), '科目已删除');
  }
}

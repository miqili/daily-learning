import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { success } from '../common/api-response';
import { CurrentUser, AuthUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateKnowledgeDto, SearchKnowledgeDto, UpdateKnowledgeDto } from './knowledge.dto';
import { KnowledgeService } from './knowledge.service';

@Controller('knowledge')
@UseGuards(JwtAuthGuard)
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  @Get()
  async search(@CurrentUser() user: AuthUser, @Query() dto: SearchKnowledgeDto) {
    return success(await this.knowledgeService.search(user.id, dto));
  }

  @Get(':id')
  async get(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return success(await this.knowledgeService.get(user.id, id));
  }

  @Post()
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateKnowledgeDto) {
    return success(await this.knowledgeService.create(user.id, dto), '已保存到知识库');
  }

  @Patch(':id')
  async update(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateKnowledgeDto) {
    return success(await this.knowledgeService.update(user.id, id, dto), '已更新');
  }

  @Delete(':id')
  async remove(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return success(await this.knowledgeService.remove(user.id, id), '已删除');
  }
}

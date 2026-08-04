import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { success } from '../common/api-response';
import { AuthUser, CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateEssayDto, UpdateEssayDto } from './essays.dto';
import { EssaysService } from './essays.service';

@Controller('essays')
@UseGuards(JwtAuthGuard)
export class EssaysController {
  constructor(private readonly essaysService: EssaysService) {}

  @Get('templates')
  async listTemplates(@Query('type') type?: string) {
    return success(await this.essaysService.listTemplates(type));
  }

  @Get('mine')
  async listMine(@CurrentUser() user: AuthUser) {
    return success(await this.essaysService.listMine(user.id));
  }

  @Post('mine')
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateEssayDto) {
    return success(await this.essaysService.create(user.id, dto), '作文已保存');
  }

  @Patch('mine/:id')
  async update(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateEssayDto) {
    return success(await this.essaysService.update(user.id, id, dto), '作文已更新');
  }

  @Delete('mine/:id')
  async remove(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return success(await this.essaysService.remove(user.id, id), '作文已删除');
  }
}

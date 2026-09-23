import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { success } from '../common/api-response';
import { CurrentUser, AuthUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateTradeoffItemDto, SearchTradeoffDto, UpdateTradeoffItemDto } from './tradeoff.dto';
import { TradeoffService } from './tradeoff.service';

/**
 * 考点增补（PC /tradeoff）。
 *
 * 与 /knowledge 分开的理由：本接口的读模型是「按天+按桶的补录流水」，
 * 返回体里带四桶汇总（summary），与知识库的「文档顺序取全量」不是同一个读法。
 */
@Controller('tradeoff')
@UseGuards(JwtAuthGuard)
export class TradeoffController {
  constructor(private readonly tradeoffService: TradeoffService) {}

  @Get()
  async search(@CurrentUser() user: AuthUser, @Query() dto: SearchTradeoffDto) {
    return success(await this.tradeoffService.search(user.id, dto));
  }

  @Get('summary')
  async summary(@CurrentUser() user: AuthUser, @Query() dto: SearchTradeoffDto) {
    return success(await this.tradeoffService.summary(user.id, dto.subject_id));
  }

  @Get(':id')
  async get(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return success(await this.tradeoffService.get(user.id, id));
  }

  @Post()
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateTradeoffItemDto) {
    return success(await this.tradeoffService.create(user.id, dto), '已补录');
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTradeoffItemDto,
  ) {
    return success(await this.tradeoffService.update(user.id, id, dto), '已更新');
  }

  @Delete(':id')
  async remove(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return success(await this.tradeoffService.remove(user.id, id), '已删除');
  }
}

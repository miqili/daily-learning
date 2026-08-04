import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { success } from '../common/api-response';
import { CurrentUser, AuthUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateDeckDto, CreatePhraseDto, CreateWordDto, ImportWordsDto, ReviewWordDto, UpdatePhraseDto, UpdateVocabularySettingsDto, UpdateWordDto } from './vocabulary.dto';
import { VocabularyService } from './vocabulary.service';

@Controller('vocabulary')
@UseGuards(JwtAuthGuard)
export class VocabularyController {
  constructor(private readonly vocabularyService: VocabularyService) {}

  @Get('decks')
  async listDecks(@CurrentUser() user: AuthUser) {
    return success(await this.vocabularyService.listDecks(user.id));
  }

  @Post('decks')
  async createDeck(@CurrentUser() user: AuthUser, @Body() dto: CreateDeckDto) {
    return success(await this.vocabularyService.createDeck(user.id, dto), '词库已创建');
  }

  @Get('decks/:deckId/words')
  async listWords(@CurrentUser() user: AuthUser, @Param('deckId', ParseIntPipe) deckId: number) {
    return success(await this.vocabularyService.listWords(user.id, deckId));
  }

  @Post('decks/:deckId/words')
  async addWord(@CurrentUser() user: AuthUser, @Param('deckId', ParseIntPipe) deckId: number, @Body() dto: CreateWordDto) {
    return success(await this.vocabularyService.addWord(user.id, deckId, dto), '单词已添加');
  }

  @Post('decks/:deckId/import')
  async importWords(@CurrentUser() user: AuthUser, @Param('deckId', ParseIntPipe) deckId: number, @Body() dto: ImportWordsDto) {
    return success(await this.vocabularyService.importWords(user.id, deckId, dto.words), '批量导入完成');
  }

  @Patch('words/:id')
  async updateWord(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateWordDto) {
    return success(await this.vocabularyService.updateWord(user.id, id, dto), '单词已更新');
  }

  @Get('phrases')
  async listPhrases(@CurrentUser() user: AuthUser, @Query() query: { level?: string; keyword?: string; deck_id?: string }) {
    return success(await this.vocabularyService.listPhrases(user.id, query));
  }

  @Post('phrases')
  async createPhrase(@CurrentUser() user: AuthUser, @Body() dto: CreatePhraseDto) {
    return success(await this.vocabularyService.createPhrase(user.id, dto), '短语已添加');
  }

  @Patch('phrases/:id')
  async updatePhrase(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePhraseDto) {
    return success(await this.vocabularyService.updatePhrase(user.id, id, dto), '短语已更新');
  }

  @Delete('phrases/:id')
  async removePhrase(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return success(await this.vocabularyService.removePhrase(user.id, id), '短语已删除');
  }

  @Post('import-builtin')
  async importBuiltin(@CurrentUser() user: AuthUser) {
    return success(await this.vocabularyService.importBuiltinDeck(user.id), '内置词库导入完成');
  }

  @Get('settings')
  async getSettings(@CurrentUser() user: AuthUser) {
    return success(await this.vocabularyService.getSettings(user.id));
  }

  @Patch('settings')
  async updateSettings(@CurrentUser() user: AuthUser, @Body() dto: UpdateVocabularySettingsDto) {
    return success(await this.vocabularyService.updateSettings(user.id, dto), '每日目标已更新');
  }

  @Get('today')
  async todayQueue(@CurrentUser() user: AuthUser, @Query('limit') limit?: number) {
    return success(await this.vocabularyService.todayQueue(user.id, limit ? Number(limit) : 20));
  }

  @Get('stats')
  async stats(@CurrentUser() user: AuthUser) {
    return success(await this.vocabularyService.stats(user.id));
  }

  @Patch('progress/:id/review')
  async reviewWord(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: ReviewWordDto) {
    return success(await this.vocabularyService.reviewWord(user.id, id, dto), '复习记录已保存');
  }
}

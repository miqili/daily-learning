import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { success } from '../common/api-response';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreatePaperDto, ImportQuestionsDto, UpdateQuestionDto } from './papers.dto';
import { PapersService } from './papers.service';

@Controller('papers')
@UseGuards(JwtAuthGuard)
export class PapersController {
  constructor(private readonly papersService: PapersService) {}

  @Get()
  async list(@Query() query: { subject?: string; year?: string }) {
    return success(await this.papersService.list(query));
  }

  @Get(':id')
  async get(@Param('id', ParseIntPipe) id: number) {
    return success(await this.papersService.get(id));
  }

  @Post()
  async create(@Body() dto: CreatePaperDto) {
    return success(await this.papersService.create(dto), '试卷已就绪');
  }

  @Post(':id/questions')
  async addQuestions(@Param('id', ParseIntPipe) id: number, @Body() dto: ImportQuestionsDto) {
    return success(await this.papersService.addQuestions(id, dto.questions), '题目已导入');
  }

  @Delete(':id')
  async deletePaper(@Param('id', ParseIntPipe) id: number) {
    return success(await this.papersService.deletePaper(id), '试卷已删除');
  }

  @Delete(':id/questions/:questionId')
  async deleteQuestion(@Param('id', ParseIntPipe) id: number, @Param('questionId', ParseIntPipe) questionId: number) {
    return success(await this.papersService.deleteQuestion(id, questionId), '题目已删除');
  }

  @Patch(':id/questions/:questionId')
  async updateQuestion(
    @Param('id', ParseIntPipe) id: number,
    @Param('questionId', ParseIntPipe) questionId: number,
    @Body() dto: UpdateQuestionDto,
  ) {
    return success(await this.papersService.updateQuestion(id, questionId, dto), '题目已更新');
  }
}

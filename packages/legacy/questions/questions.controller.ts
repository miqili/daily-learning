import { Controller, Get, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { success } from '../common/api-response';
import { SearchQuestionsDto } from './questions.dto';
import { QuestionsService } from './questions.service';

@Controller('questions')
@UseGuards(JwtAuthGuard)
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Get('search')
  async search(@Query() query: SearchQuestionsDto) {
    return success(await this.questionsService.search(query));
  }

  @Get('papers')
  async papers() {
    return success(await this.questionsService.papersList());
  }

  @Get('papers/:id')
  async paperDetail(@Param('id', ParseIntPipe) id: number) {
    return success(await this.questionsService.paperDetail(id));
  }
}

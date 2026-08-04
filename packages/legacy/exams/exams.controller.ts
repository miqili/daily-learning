import { Body, Controller, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { CurrentUser, AuthUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { success } from '../common/api-response';
import { SubmitExamDto } from './exams.dto';
import { ExamsService } from './exams.service';

@Controller('exams')
@UseGuards(JwtAuthGuard)
export class ExamsController {
  constructor(private readonly examsService: ExamsService) {}

  @Post(':paperId/submit')
  async submit(
    @CurrentUser() user: AuthUser,
    @Param('paperId', ParseIntPipe) paperId: number,
    @Body() dto: SubmitExamDto,
  ) {
    return success(await this.examsService.submit(user.id, paperId, dto));
  }
}

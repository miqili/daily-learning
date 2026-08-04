import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { ExamPaper } from '../entities/exam-paper.entity';
import { ExamQuestion } from '../entities/exam-question.entity';
import { UserExamRecord } from '../entities/user-exam-record.entity';
import { MistakesModule } from '../mistakes/mistakes.module';
import { ExamsController } from './exams.controller';
import { ExamsService } from './exams.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ExamPaper, ExamQuestion, UserExamRecord]),
    AuthModule,
    MistakesModule,
  ],
  controllers: [ExamsController],
  providers: [ExamsService],
})
export class ExamsModule {}

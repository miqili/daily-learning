import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { ExamPaper } from '../entities/exam-paper.entity';
import { ExamQuestion } from '../entities/exam-question.entity';
import { PapersController } from './papers.controller';
import { PapersService } from './papers.service';

@Module({
  imports: [TypeOrmModule.forFeature([ExamPaper, ExamQuestion]), AuthModule],
  controllers: [PapersController],
  providers: [PapersService],
})
export class PapersModule {}

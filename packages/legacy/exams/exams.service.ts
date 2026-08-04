import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExamPaper } from '../entities/exam-paper.entity';
import { ExamQuestion } from '../entities/exam-question.entity';
import { UserExamRecord } from '../entities/user-exam-record.entity';
import { MistakesService } from '../mistakes/mistakes.service';
import { SubmitExamDto } from './exams.dto';

@Injectable()
export class ExamsService {
  constructor(
    @InjectRepository(ExamPaper) private readonly papers: Repository<ExamPaper>,
    @InjectRepository(ExamQuestion) private readonly questions: Repository<ExamQuestion>,
    @InjectRepository(UserExamRecord) private readonly records: Repository<UserExamRecord>,
    private readonly mistakesService: MistakesService,
  ) {}

  async submit(userId: number, paperId: number, dto: SubmitExamDto) {
    const paper = await this.papers.findOneBy({ id: paperId });
    if (!paper) throw new NotFoundException('试卷不存在。');
    const questions = await this.questions.find({ where: { paperId }, order: { sortOrder: 'ASC' } });
    if (!questions.length) throw new NotFoundException('该试卷暂无题目。');

    const objectiveQuestions = questions.filter((question) => question.questionType === 'SINGLE');
    const correctQuestions = objectiveQuestions.filter((question) => {
      const answer = dto.answers[String(question.id)]?.trim().toUpperCase();
      return answer === question.answer.trim().toUpperCase();
    });
    const wrongQuestions = objectiveQuestions.filter((question) => !correctQuestions.includes(question));
    const objectiveScore = correctQuestions.reduce((sum, question) => sum + question.score, 0);
    const totalScore = Math.min(paper.totalScore, objectiveScore + dto.subjective_score);
    const record = await this.records.save(
      this.records.create({
        userId,
        paperId,
        userAnswersJson: dto.answers,
        objectiveScore,
        subjectiveScore: dto.subjective_score,
        totalScore,
        timeSpentSecs: dto.time_spent_secs,
        status: 'COMPLETED',
      }),
    );
    await Promise.all(wrongQuestions.map((question) => this.mistakesService.upsertMistake(userId, question.id)));

    return {
      record_id: record.id,
      objective_score: objectiveScore,
      subjective_score: dto.subjective_score,
      total_score: totalScore,
      total_questions: questions.length,
      correct_count: correctQuestions.length,
      wrong_question_ids: wrongQuestions.map((question) => question.id),
      message: '客观题已自动批改，错题已自动推送到错题消灭队列！',
    };
  }
}

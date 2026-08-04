import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExamPaper } from '../entities/exam-paper.entity';
import { ExamQuestion } from '../entities/exam-question.entity';
import { SearchQuestionsDto } from './questions.dto';

@Injectable()
export class QuestionsService {
  constructor(
    @InjectRepository(ExamQuestion) private readonly questions: Repository<ExamQuestion>,
    @InjectRepository(ExamPaper) private readonly papers: Repository<ExamPaper>,
  ) {}

  async search(dto: SearchQuestionsDto) {
    const query = this.questions.createQueryBuilder('question').orderBy('question.year', 'DESC');
    if (dto.subject) query.andWhere('question.subject = :subject', { subject: dto.subject });
    if (dto.tag) query.andWhere('question.point_tag LIKE :tag', { tag: `%${dto.tag.trim()}%` });
    if (dto.keyword) {
      query.andWhere('(question.content LIKE :keyword OR question.point_tag LIKE :keyword)', {
        keyword: `%${dto.keyword.trim()}%`,
      });
    }
    const [list, total] = await query.take(dto.limit).getManyAndCount();
    return { total, list: list.map((question) => this.searchResult(question)) };
  }

  async papersList() {
    const list = await this.papers.find({ order: { year: 'DESC', subject: 'ASC' } });
    return list.map((paper) => ({
      id: paper.id,
      title: paper.title,
      subject: paper.subject,
      year: paper.year,
      total_score: paper.totalScore,
      time_limit_mins: paper.timeLimitMins,
    }));
  }

  async paperDetail(id: number) {
    const paper = await this.papers.findOne({
      where: { id },
      relations: { questions: true },
      order: { questions: { sortOrder: 'ASC' } },
    });
    if (!paper) throw new NotFoundException('未找到该试卷。');
    return {
      id: paper.id,
      title: paper.title,
      subject: paper.subject,
      year: paper.year,
      total_score: paper.totalScore,
      time_limit_mins: paper.timeLimitMins,
      questions: paper.questions.map((question) => ({
        id: question.id,
        sort_order: question.sortOrder,
        subject: question.subject,
        year: question.year,
        question_type: question.questionType,
        point_tag: question.pointTag,
        content: question.content,
        options: question.optionsJson,
        score: question.score,
      })),
    };
  }

  private searchResult(question: ExamQuestion) {
    return {
      id: question.id,
      paper_id: question.paperId,
      subject: question.subject,
      year: question.year,
      question_type: question.questionType,
      point_tag: question.pointTag,
      content: question.content,
      options: question.optionsJson,
      answer: question.answer,
      score: question.score,
    };
  }
}

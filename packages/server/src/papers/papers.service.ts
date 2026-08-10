import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExamPaper } from '../entities/exam-paper.entity';
import { ExamQuestion, QuestionOption } from '../entities/exam-question.entity';
import { CreatePaperDto, CreateQuestionDto, UpdateQuestionDto } from './papers.dto';

@Injectable()
export class PapersService {
  constructor(
    @InjectRepository(ExamPaper) private readonly papers: Repository<ExamPaper>,
    @InjectRepository(ExamQuestion) private readonly questions: Repository<ExamQuestion>,
  ) {}

  async list(query: { subject?: string; year?: string }) {
    const where: Record<string, unknown> = {};
    if (query.subject) where.subject = query.subject;
    if (query.year) where.year = Number(query.year);
    const list = await this.papers.find({ where, order: { year: 'DESC', id: 'ASC' } });
    const result = [];
    for (const paper of list) {
      const count = await this.questions.countBy({ paperId: paper.id });
      result.push(this.paperView(paper, count));
    }
    return result;
  }

  async get(id: number) {
    const paper = await this.papers.findOneBy({ id });
    if (!paper) throw new NotFoundException('试卷不存在。');
    const questions = await this.questions.find({ where: { paperId: id }, order: { sortOrder: 'ASC', id: 'ASC' } });
    return {
      ...this.paperView(paper, questions.length),
      questions: questions.map((q) => this.questionView(q)),
    };
  }

  async create(dto: CreatePaperDto) {
    let paper = await this.papers.findOneBy({ subject: dto.subject, year: dto.year });
    if (!paper) {
      paper = await this.papers.save(
        this.papers.create({
          subject: dto.subject,
          year: dto.year,
          title: dto.title ?? `${dto.year} 年${dto.subject}真题`,
          sourceType: 'USER_PROVIDED',
          isComplete: false,
        }),
      );
    }
    return { id: paper.id, subject: paper.subject, year: paper.year, title: paper.title };
  }

  async addQuestions(paperId: number, items: CreateQuestionDto[]) {
    await this.ensurePaper(paperId);
    const count = await this.questions.countBy({ paperId });
    const entities = items.map((dto, i) =>
      this.questions.create({
        paperId,
        sortOrder: count + i,
        content: dto.content,
        passage: dto.passage ?? null,
        optionsJson: dto.options ?? null,
        answer: dto.answer ?? null,
        score: dto.score ?? 5,
      }),
    );
    await this.questions.save(entities);
    return { imported: entities.length };
  }

  async deletePaper(id: number) {
    const paper = await this.papers.findOneBy({ id });
    if (!paper) throw new NotFoundException('试卷不存在。');
    await this.questions.delete({ paperId: id });
    await this.papers.delete({ id });
    return { deleted: id };
  }

  async deleteQuestion(paperId: number, questionId: number) {
    await this.ensurePaper(paperId);
    const question = await this.questions.findOneBy({ id: questionId, paperId });
    if (!question) throw new NotFoundException('题目不存在。');
    await this.questions.delete({ id: questionId, paperId });
    // 重新排序，保持 sortOrder 连续
    const rest = await this.questions.find({ where: { paperId }, order: { sortOrder: 'ASC', id: 'ASC' } });
    await this.questions.save(
      rest.map((q, i) => {
        q.sortOrder = i;
        return q;
      }),
    );
    return { deleted: questionId };
  }

  async updateQuestion(paperId: number, questionId: number, dto: UpdateQuestionDto) {
    await this.ensurePaper(paperId);
    const question = await this.questions.findOneBy({ id: questionId, paperId });
    if (!question) throw new NotFoundException('题目不存在。');
    if (dto.content !== undefined) question.content = dto.content;
    if (dto.passage !== undefined) question.passage = dto.passage ?? null;
    if (dto.options !== undefined) question.optionsJson = dto.options ?? null;
    if (dto.answer !== undefined) question.answer = dto.answer ?? null;
    if (dto.score !== undefined) question.score = dto.score;
    await this.questions.save(question);
    return this.questionView(question);
  }

  private async ensurePaper(id: number) {
    const paper = await this.papers.findOneBy({ id });
    if (!paper) throw new NotFoundException('试卷不存在。');
    return paper;
  }

  private questionView(q: ExamQuestion) {
    return {
      id: q.id,
      content: q.content,
      passage: q.passage,
      options: q.optionsJson as QuestionOption[] | null,
      answer: q.answer,
      score: q.score,
    };
  }

  private paperView(paper: ExamPaper, questionCount: number) {
    return {
      id: paper.id,
      subject: paper.subject,
      year: paper.year,
      title: paper.title,
      source: paper.source,
      source_url: paper.sourceUrl,
      source_type: paper.sourceType,
      is_complete: paper.isComplete,
      expected_question_count: paper.expectedQuestionCount,
      verification_notes: paper.verificationNotes,
      question_count: questionCount,
    };
  }
}

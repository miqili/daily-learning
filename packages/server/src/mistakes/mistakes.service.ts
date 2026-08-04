import { Injectable, NotFoundException } from '@nestjs/common';
import { ERROR_REASONS, MASTERY_MAX, reviewIntervalDays } from '@shck/shared';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, LessThanOrEqual, Like, Repository } from 'typeorm';
import { Mistake } from '../entities/mistake.entity';
import { CreateMistakeDto, ReviewMistakeDto, UpdateMistakeDto } from './mistakes.dto';

const DAY = 86_400_000;

@Injectable()
export class MistakesService {
  constructor(@InjectRepository(Mistake) private readonly mistakes: Repository<Mistake>) {}

  async list(userId: number, query: { subject_id?: number; error_reason?: string; keyword?: string; mastered?: string }) {
    const where: FindOptionsWhere<Mistake>[] = [{ userId }];
    const base: FindOptionsWhere<Mistake> = { userId };
    if (query.subject_id) base.subjectId = query.subject_id;
    if (query.error_reason) base.errorReason = query.error_reason;
    if (query.mastered === 'true') base.masteryLevel = MASTERY_MAX;
    if (query.mastered === 'false') base.masteryLevel = LessThanOrEqual(MASTERY_MAX - 1);
    if (query.keyword) {
      const kw = `%${query.keyword}%`;
      where[0] = { ...base, title: Like(kw) };
      where.push({ ...base, content: Like(kw) });
    } else {
      where[0] = base;
    }
    const list = await this.mistakes.find({ where, relations: { subject: true }, order: { updatedAt: 'DESC', id: 'DESC' } });
    return list.map((m) => this.view(m));
  }

  async create(userId: number, dto: CreateMistakeDto) {
    const mistake = await this.mistakes.save(
      this.mistakes.create({
        userId,
        subjectId: dto.subject_id ?? null,
        title: dto.title.trim(),
        content: dto.content,
        correctAnswer: dto.correct_answer ?? null,
        userAnswer: dto.user_answer ?? null,
        errorReason: this.normalizeReason(dto.error_reason),
        source: dto.source ?? null,
        masteryLevel: 0,
        nextReviewAt: new Date(),
      }),
    );
    return this.view(await this.findOne(userId, mistake.id));
  }

  async update(userId: number, id: number, dto: UpdateMistakeDto) {
    const mistake = await this.findOne(userId, id);
    if (dto.title !== undefined) mistake.title = dto.title.trim();
    if (dto.content !== undefined) mistake.content = dto.content;
    if (dto.correct_answer !== undefined) mistake.correctAnswer = dto.correct_answer;
    if (dto.user_answer !== undefined) mistake.userAnswer = dto.user_answer;
    if (dto.error_reason !== undefined) mistake.errorReason = this.normalizeReason(dto.error_reason);
    if (dto.subject_id !== undefined) mistake.subjectId = dto.subject_id;
    if (dto.analysis !== undefined) mistake.analysis = dto.analysis;
    if (dto.notes !== undefined) mistake.notes = dto.notes;
    return this.view(await this.mistakes.save(mistake));
  }

  async remove(userId: number, id: number) {
    const mistake = await this.findOne(userId, id);
    await this.mistakes.remove(mistake);
    return { id };
  }

  async reviewQueue(userId: number) {
    const list = await this.mistakes.find({
      where: { userId, masteryLevel: LessThanOrEqual(MASTERY_MAX - 1), nextReviewAt: LessThanOrEqual(new Date()) },
      relations: { subject: true },
      order: { nextReviewAt: 'ASC', id: 'ASC' },
    });
    return { total: list.length, list: list.map((m) => this.view(m)) };
  }

  async review(userId: number, id: number, dto: ReviewMistakeDto) {
    const mistake = await this.findOne(userId, id);
    mistake.reviewCount += 1;
    if (dto.notes !== undefined) mistake.notes = dto.notes;
    if (!dto.correct) {
      mistake.masteryLevel = 0;
      mistake.nextReviewAt = new Date();
    } else {
      mistake.masteryLevel = Math.min(MASTERY_MAX, mistake.masteryLevel + 1);
      const interval = reviewIntervalDays(mistake.masteryLevel);
      mistake.nextReviewAt = interval === null ? new Date(Date.now() + 3650 * DAY) : new Date(Date.now() + interval * DAY);
    }
    return this.view(await this.mistakes.save(mistake));
  }

  private normalizeReason(reason?: string): string {
    if (reason && ERROR_REASONS.includes(reason as (typeof ERROR_REASONS)[number])) return reason;
    return 'OTHER';
  }

  private async findOne(userId: number, id: number) {
    const mistake = await this.mistakes.findOne({ where: { id, userId }, relations: { subject: true } });
    if (!mistake) throw new NotFoundException('错题不存在。');
    return mistake;
  }

  private view(mistake: Mistake) {
    return {
      id: mistake.id,
      subject: mistake.subject ? { id: mistake.subject.id, name: mistake.subject.name, color: mistake.subject.color } : null,
      title: mistake.title,
      content: mistake.content,
      correct_answer: mistake.correctAnswer,
      user_answer: mistake.userAnswer,
      error_reason: mistake.errorReason,
      analysis: mistake.analysis,
      mastery_level: mistake.masteryLevel,
      next_review_at: mistake.nextReviewAt,
      review_count: mistake.reviewCount,
      source: mistake.source,
      notes: mistake.notes,
      created_at: mistake.createdAt,
      updated_at: mistake.updatedAt,
    };
  }
}

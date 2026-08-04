import { Injectable, NotFoundException } from '@nestjs/common';
import { MASTERY_MAX, reviewIntervalDays } from '@shck/shared';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, LessThanOrEqual, Repository } from 'typeorm';
import { Mistake } from '../entities/mistake.entity';
import { CreateMistakeDto, ListMistakesDto, ReviewMistakeDto, UpdateMistakeDto } from './mistakes.dto';

const DAY = 86_400_000;

@Injectable()
export class MistakesService {
  constructor(@InjectRepository(Mistake) private readonly mistakes: Repository<Mistake>) {}

  async list(userId: number, dto: ListMistakesDto) {
    const query = this.mistakes.createQueryBuilder('m').where('m.userId = :userId', { userId }).orderBy('m.updatedAt', 'DESC');
    if (dto.subject_id) query.andWhere('m.subjectId = :subjectId', { subjectId: dto.subject_id });
    if (dto.error_reason) query.andWhere('m.errorReason = :reason', { reason: dto.error_reason });
    if (dto.keyword) {
      query.andWhere('(m.title LIKE :kw OR m.content LIKE :kw)', { kw: `%${dto.keyword.trim()}%` });
    }
    const list = await query.getMany();
    return { total: list.length, list: list.map((m) => this.view(m)) };
  }

  async reviewQueue(userId: number) {
    const items = await this.mistakes.find({
      where: { userId, nextReviewAt: LessThanOrEqual(new Date()), masteryLevel: LessThan(MASTERY_MAX) },
      order: { nextReviewAt: 'ASC' },
    });
    return { total: items.length, list: items.map((m) => this.view(m)) };
  }

  async stats(userId: number) {
    const total = await this.mistakes.countBy({ userId });
    const pending = await this.mistakes.count({ where: { userId, masteryLevel: LessThan(MASTERY_MAX) } });
    const mastered = total - pending;
    const byReason = await this.mistakes
      .createQueryBuilder('m')
      .select('m.errorReason', 'reason')
      .addSelect('COUNT(*)', 'count')
      .where('m.userId = :userId', { userId })
      .groupBy('m.errorReason')
      .getRawMany<{ reason: string; count: string }>();
    return {
      total,
      pending_review: pending,
      mastered,
      by_reason: byReason.map((r) => ({ reason: r.reason, count: Number(r.count) })),
    };
  }

  async get(userId: number, id: number) {
    return this.view(await this.findOwned(userId, id));
  }

  async create(userId: number, dto: CreateMistakeDto) {
    const mistake = await this.mistakes.save(
      this.mistakes.create({
        userId,
        title: dto.title.trim(),
        content: dto.content,
        subjectId: dto.subject_id ?? null,
        correctAnswer: dto.correct_answer ?? null,
        userAnswer: dto.user_answer ?? null,
        errorReason: dto.error_reason ?? 'OTHER',
        analysis: dto.analysis ?? null,
        tags: dto.tags ?? null,
        source: dto.source ?? null,
        notes: dto.notes ?? null,
        masteryLevel: 0,
        nextReviewAt: new Date(Date.now() + DAY),
      }),
    );
    return this.view(mistake);
  }

  async update(userId: number, id: number, dto: UpdateMistakeDto) {
    const mistake = await this.findOwned(userId, id);
    if (dto.title !== undefined) mistake.title = dto.title.trim();
    if (dto.content !== undefined) mistake.content = dto.content;
    if (dto.subject_id !== undefined) mistake.subjectId = dto.subject_id;
    if (dto.correct_answer !== undefined) mistake.correctAnswer = dto.correct_answer;
    if (dto.user_answer !== undefined) mistake.userAnswer = dto.user_answer;
    if (dto.error_reason !== undefined) mistake.errorReason = dto.error_reason;
    if (dto.analysis !== undefined) mistake.analysis = dto.analysis;
    if (dto.tags !== undefined) mistake.tags = dto.tags;
    if (dto.notes !== undefined) mistake.notes = dto.notes;
    return this.view(await this.mistakes.save(mistake));
  }

  async review(userId: number, id: number, dto: ReviewMistakeDto) {
    const mistake = await this.findOwned(userId, id);
    mistake.reviewCount += 1;
    if (dto.notes !== undefined) mistake.notes = dto.notes.trim() || null;
    if (!dto.correct) {
      mistake.masteryLevel = 0;
      mistake.nextReviewAt = new Date();
    } else {
      mistake.masteryLevel = Math.min(MASTERY_MAX, mistake.masteryLevel + 1);
      const interval = reviewIntervalDays(mistake.masteryLevel);
      mistake.nextReviewAt =
        interval === null ? new Date(Date.now() + 3650 * DAY) : new Date(Date.now() + interval * DAY);
    }
    return this.view(await this.mistakes.save(mistake));
  }

  async remove(userId: number, id: number) {
    const mistake = await this.findOwned(userId, id);
    await this.mistakes.remove(mistake);
    return { id };
  }

  private async findOwned(userId: number, id: number) {
    const mistake = await this.mistakes.findOneBy({ id, userId });
    if (!mistake) throw new NotFoundException('错题不存在。');
    return mistake;
  }

  private view(mistake: Mistake) {
    return {
      id: mistake.id,
      subject_id: mistake.subjectId,
      title: mistake.title,
      content: mistake.content,
      correct_answer: mistake.correctAnswer,
      user_answer: mistake.userAnswer,
      error_reason: mistake.errorReason,
      analysis: mistake.analysis,
      tags: mistake.tags ?? [],
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

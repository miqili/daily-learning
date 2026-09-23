import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TRADEOFF_BUCKETS, TRADEOFF_MASTERY_DONE, TRADEOFF_MASTERY_UNSEEN, TRADEOFF_MASTERY_WEAK, TRADEOFF_STATUSES } from '@shck/shared';
import { TradeoffItem } from '../entities/tradeoff-item.entity';
import { CreateTradeoffItemDto, SearchTradeoffDto, UpdateTradeoffItemDto } from './tradeoff.dto';

export interface BucketMasteryStat {
  /** 未标记 */
  unseen: number;
  /** 不熟 */
  weak: number;
  /** 已掌握 */
  mastered: number;
}

export interface BucketStat {
  total: number;
  pending: number;
  done: number;
  verified: number;
  important: number;
  mastery: BucketMasteryStat;
  lastEntryDate: string | null;
}

@Injectable()
export class TradeoffService {
  constructor(@InjectRepository(TradeoffItem) private readonly items: Repository<TradeoffItem>) {}

  async search(userId: number, dto: SearchTradeoffDto) {
    const query = this.items
      .createQueryBuilder('item')
      .leftJoinAndSelect('item.subject', 'subject')
      .where('item.userId = :userId', { userId });

    if (dto.subject_id) query.andWhere('item.subjectId = :subjectId', { subjectId: dto.subject_id });
    if (dto.bucket) query.andWhere('item.bucket = :bucket', { bucket: dto.bucket });
    if (dto.status) query.andWhere('item.status = :status', { status: dto.status });
    if (dto.entry_date) query.andWhere('item.entryDate = :entryDate', { entryDate: dto.entry_date });
    if (dto.important === '1') query.andWhere('item.important = 1');
    if (dto.mastery !== undefined) query.andWhere('item.mastery = :mastery', { mastery: Number(dto.mastery) });
    // 不熟清单：mastery < 2（未标记 + 不熟）。考前只看这一份。
    if (dto.unmastered === '1') query.andWhere('item.mastery < :done', { done: TRADEOFF_MASTERY_DONE });
    if (dto.keyword) {
      query.andWhere('(item.title LIKE :kw OR item.content LIKE :kw OR item.keywords LIKE :kw)', {
        kw: `%${dto.keyword.trim()}%`,
      });
    }

    // 展示顺序：桶（按方案收益从高到低）→ 桶内 sort_order 升序（NULL 排后）→ 补录日新→旧 → id。
    // 注意：`item.sortOrder IS NULL` 含 `.`，TypeORM 会当成「别名.属性路径」去查列元数据而报错，
    // 因此先 addSelect 出排序列并起不含 `.` 的别名，再按别名排序（与 knowledge.service 同一坑）。
    const bucketRank = TRADEOFF_BUCKETS.map((b, i) => `WHEN '${b}' THEN ${i}`).join(' ');
    query.addSelect(`CASE item.bucket ${bucketRank} ELSE ${TRADEOFF_BUCKETS.length} END`, 'bucket_rank');
    query.addSelect('CASE WHEN item.sortOrder IS NULL THEN 1 ELSE 0 END', 'sort_null_rank');
    query
      .orderBy('bucket_rank', 'ASC')
      .addOrderBy('sort_null_rank', 'ASC')
      .addOrderBy('item.sortOrder', 'ASC')
      .addOrderBy('item.entryDate', 'DESC')
      .addOrderBy('item.id', 'ASC');

    const limit = Math.min(dto.limit ?? 500, 1000);
    const [list, total] = await query.take(limit).getManyAndCount();

    return {
      total,
      list: list.map((item) => this.view(item)),
      summary: await this.summary(userId, dto.subject_id),
    };
  }

  /**
   * 汇总。页面主体（背诵）读 mastery，折叠的补录管理区读 byStatus / byBucket 的流程字段。
   * mastery 与 status 是两个正交维度，这里都给，让前端按视图各取所需。
   */
  async summary(userId: number, subjectId?: number) {
    const where = { userId, ...(subjectId ? { subjectId } : {}) };
    const rows = await this.items.find({
      where,
      select: ['bucket', 'status', 'important', 'mastery', 'entryDate'],
    });

    const byBucket = {} as Record<string, BucketStat>;
    for (const bucket of TRADEOFF_BUCKETS) {
      byBucket[bucket] = {
        total: 0,
        pending: 0,
        done: 0,
        verified: 0,
        important: 0,
        mastery: { unseen: 0, weak: 0, mastered: 0 },
        lastEntryDate: null,
      };
    }
    const byStatus = Object.fromEntries(TRADEOFF_STATUSES.map((s) => [s, 0])) as Record<string, number>;
    const mastery = { unseen: 0, weak: 0, mastered: 0 };
    const dates = new Set<string>();

    for (const row of rows) {
      const level = this.masteryLevel(row.mastery);
      if (level === TRADEOFF_MASTERY_UNSEEN) mastery.unseen += 1;
      else if (level === TRADEOFF_MASTERY_WEAK) mastery.weak += 1;
      else mastery.mastered += 1;

      const stat = byBucket[row.bucket];
      if (stat) {
        stat.total += 1;
        if (row.status === 'pending') stat.pending += 1;
        else if (row.status === 'done') stat.done += 1;
        else if (row.status === 'verified') stat.verified += 1;
        if (row.important) stat.important += 1;
        if (level === TRADEOFF_MASTERY_UNSEEN) stat.mastery.unseen += 1;
        else if (level === TRADEOFF_MASTERY_WEAK) stat.mastery.weak += 1;
        else stat.mastery.mastered += 1;
        if (!stat.lastEntryDate || row.entryDate > stat.lastEntryDate) stat.lastEntryDate = row.entryDate;
      }
      if (byStatus[row.status] !== undefined) byStatus[row.status] += 1;
      dates.add(row.entryDate);
    }

    const sortedDates = [...dates].sort();

    return {
      total: rows.length,
      byBucket,
      byStatus,
      /** { unseen, weak, mastered }，未看 / 不熟 / 已掌握 */
      byMastery: mastery,
      /** 不熟清单条数＝未标记 + 不熟 */
      unmastered: mastery.unseen + mastery.weak,
      days: sortedDates.length,
      firstEntryDate: sortedDates[0] ?? null,
      lastEntryDate: sortedDates[sortedDates.length - 1] ?? null,
    };
  }

  async get(userId: number, id: number) {
    return this.view(await this.findOwned(userId, id));
  }

  async create(userId: number, dto: CreateTradeoffItemDto) {
    const item = await this.items.save(
      this.items.create({
        userId,
        subjectId: dto.subject_id ?? null,
        bucket: dto.bucket,
        entryDate: dto.entry_date,
        title: dto.title.trim(),
        content: dto.content,
        source: dto.source?.trim() || null,
        keywords: dto.keywords?.trim() || null,
        status: dto.status ?? 'pending',
        important: dto.important ? 1 : 0,
        mastery: this.masteryLevel(dto.mastery),
        sortOrder: dto.sort_order ?? null,
      }),
    );
    return this.view(await this.findOwned(userId, item.id));
  }

  async update(userId: number, id: number, dto: UpdateTradeoffItemDto) {
    const item = await this.findOwned(userId, id);
    if (dto.subject_id !== undefined) item.subjectId = dto.subject_id;
    if (dto.bucket !== undefined) item.bucket = dto.bucket;
    if (dto.entry_date !== undefined) item.entryDate = dto.entry_date;
    if (dto.title !== undefined) item.title = dto.title.trim();
    if (dto.content !== undefined) item.content = dto.content;
    if (dto.source !== undefined) item.source = dto.source?.trim() || null;
    if (dto.keywords !== undefined) item.keywords = dto.keywords?.trim() || null;
    if (dto.status !== undefined) item.status = dto.status;
    if (dto.important !== undefined) item.important = dto.important ? 1 : 0;
    if (dto.mastery !== undefined) item.mastery = this.masteryLevel(dto.mastery);
    if (dto.sort_order !== undefined) item.sortOrder = dto.sort_order;
    await this.items.save(item);
    return this.view(await this.findOwned(userId, id));
  }

  async remove(userId: number, id: number) {
    const item = await this.findOwned(userId, id);
    await this.items.remove(item);
    return { id };
  }

  /**
   * 掌握度收敛到 0/1/2。DB 列是 NOT NULL DEFAULT 0，但历史行或脏数据可能是别的值，
   * 直接按数值比较会漏统计，因此统一走这里归一。
   */
  private masteryLevel(value: unknown): number {
    const n = Number(value);
    if (n === TRADEOFF_MASTERY_WEAK) return TRADEOFF_MASTERY_WEAK;
    if (n === TRADEOFF_MASTERY_DONE) return TRADEOFF_MASTERY_DONE;
    return TRADEOFF_MASTERY_UNSEEN;
  }

  private async findOwned(userId: number, id: number) {
    const item = await this.items.findOne({ where: { id, userId }, relations: { subject: true } });
    if (!item) throw new NotFoundException('考点增补条目不存在。');
    return item;
  }

  private view(item: TradeoffItem) {
    return {
      id: item.id,
      subject_id: item.subjectId,
      subject: item.subject ? { id: item.subject.id, name: item.subject.name, color: item.subject.color } : null,
      bucket: item.bucket,
      entry_date: item.entryDate,
      title: item.title,
      content: item.content,
      source: item.source,
      keywords: item.keywords ? item.keywords.split(',').map((k) => k.trim()).filter(Boolean) : [],
      status: item.status,
      important: Boolean(item.important),
      mastery: this.masteryLevel(item.mastery),
      sort_order: item.sortOrder,
      created_at: item.createdAt,
      updated_at: item.updatedAt,
    };
  }
}

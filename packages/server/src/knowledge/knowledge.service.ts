import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KnowledgeItem } from '../entities/knowledge-item.entity';
import { CreateKnowledgeDto, SearchKnowledgeDto, UpdateKnowledgeDto } from './knowledge.dto';

@Injectable()
export class KnowledgeService {
  constructor(@InjectRepository(KnowledgeItem) private readonly items: Repository<KnowledgeItem>) {}

  async search(userId: number, dto: SearchKnowledgeDto) {
    const query = this.items
      .createQueryBuilder('item')
      .leftJoinAndSelect('item.subject', 'subject')
      .where('item.userId = :userId', { userId });
    if (dto.subject_id) query.andWhere('item.subjectId = :subjectId', { subjectId: dto.subject_id });
    if (dto.item_type) query.andWhere('item.itemType = :itemType', { itemType: dto.item_type });
    if (dto.origin) {
      query.andWhere("JSON_UNQUOTE(JSON_EXTRACT(item.extraJson, '$.origin')) = :origin", { origin: dto.origin });
    }
    if (dto.tag) query.andWhere('JSON_CONTAINS(item.tags, :tag)', { tag: JSON.stringify(dto.tag.trim()) });
    if (dto.keyword) {
      query.andWhere('(item.title LIKE :kw OR item.content LIKE :kw)', { kw: `%${dto.keyword.trim()}%` });
    }
    if (dto.order === 'sort') {
      // 必背考点模块：按文档顺序（章节 → 分组 → 组内）排序。
      // 注意：`item.sortOrder IS NULL` 这类含 `.` 的 SQL 表达式会被 TypeORM 当成「别名.属性路径」去查列元数据而报错，
      // 因此先 addSelect 出「NULL 排后」的排序列并起别名，再按该别名排序（别名不含 `.`，走 select 分支）。
      query.addSelect('CASE WHEN item.sortOrder IS NULL THEN 1 ELSE 0 END', 'sort_null_rank');
      query.orderBy('sort_null_rank', 'ASC').addOrderBy('item.sortOrder', 'ASC').addOrderBy('item.id', 'ASC');
    } else {
      query.orderBy('item.updatedAt', 'DESC');
    }
    // 当前是个人备考知识库，默认返回完整的常用规模；仍保留上限防止误请求。
    const limit = Math.min(dto.limit ?? 200, 1000);
    const [list, total] = await query.take(limit).getManyAndCount();
    return { total, list: list.map((item) => this.view(item)) };
  }

  async get(userId: number, id: number) {
    return this.view(await this.findOwned(userId, id));
  }

  async create(userId: number, dto: CreateKnowledgeDto) {
    const item = await this.items.save(
      this.items.create({
        userId,
        title: dto.title.trim(),
        content: dto.content,
        subjectId: dto.subject_id ?? null,
        itemType: dto.item_type ?? 'NOTE',
        tags: dto.tags ?? null,
        source: dto.source?.trim() ?? null,
      }),
    );
    return this.view(item);
  }

  async update(userId: number, id: number, dto: UpdateKnowledgeDto) {
    const item = await this.findOwned(userId, id);
    if (dto.title !== undefined) item.title = dto.title.trim();
    if (dto.content !== undefined) item.content = dto.content;
    if (dto.subject_id !== undefined) item.subjectId = dto.subject_id;
    if (dto.item_type !== undefined) item.itemType = dto.item_type;
    if (dto.tags !== undefined) item.tags = dto.tags;
    if (dto.source !== undefined) item.source = dto.source?.trim() ?? null;
    return this.view(await this.items.save(item));
  }

  async remove(userId: number, id: number) {
    const item = await this.findOwned(userId, id);
    await this.items.remove(item);
    return { id };
  }

  private async findOwned(userId: number, id: number) {
    const item = await this.items.findOne({ where: { id, userId }, relations: { subject: true } });
    if (!item) throw new NotFoundException('知识条目不存在。');
    return item;
  }

  private view(item: KnowledgeItem) {
    return {
      id: item.id,
      subject_id: item.subjectId,
      subject: item.subject ? { id: item.subject.id, name: item.subject.name, color: item.subject.color } : null,
      title: item.title,
      content: item.content,
      item_type: item.itemType,
      tags: item.tags ?? [],
      source: item.source,
      sort_order: item.sortOrder,
      extra: item.extraJson,
      created_at: item.createdAt,
      updated_at: item.updatedAt,
    };
  }
}

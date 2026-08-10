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
      .where('item.userId = :userId', { userId })
      .orderBy('item.updatedAt', 'DESC');
    if (dto.subject_id) query.andWhere('item.subjectId = :subjectId', { subjectId: dto.subject_id });
    if (dto.tag) query.andWhere('JSON_CONTAINS(item.tags, :tag)', { tag: JSON.stringify(dto.tag.trim()) });
    if (dto.keyword) {
      query.andWhere('(item.title LIKE :kw OR item.content LIKE :kw)', { kw: `%${dto.keyword.trim()}%` });
    }
    // 当前是个人备考知识库，默认返回完整的常用规模；仍保留上限防止误请求。
    const limit = Math.min(dto.limit ?? 200, 500);
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
      created_at: item.createdAt,
      updated_at: item.updatedAt,
    };
  }
}

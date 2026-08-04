import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EssayTemplate } from '../entities/essay-template.entity';
import { MyEssay } from '../entities/my-essay.entity';
import { CreateEssayDto, UpdateEssayDto } from './essays.dto';

@Injectable()
export class EssaysService {
  constructor(
    @InjectRepository(EssayTemplate) private readonly templates: Repository<EssayTemplate>,
    @InjectRepository(MyEssay) private readonly essays: Repository<MyEssay>,
  ) {}

  async listTemplates(type?: string) {
    const where = type ? { type } : {};
    const list = await this.templates.find({ where, order: { sortOrder: 'ASC', id: 'ASC' } });
    return list.map((t) => this.templateView(t));
  }

  async listMine(userId: number) {
    const list = await this.essays.find({ where: { userId }, order: { updatedAt: 'DESC', id: 'DESC' } });
    return list.map((e) => this.essayView(e));
  }

  async create(userId: number, dto: CreateEssayDto) {
    const essay = await this.essays.save(
      this.essays.create({
        userId,
        title: dto.title.trim(),
        essayType: dto.essay_type,
        content: dto.content,
        wordCount: countWords(dto.content),
      }),
    );
    return this.essayView(essay);
  }

  async update(userId: number, id: number, dto: UpdateEssayDto) {
    const essay = await this.findOwned(userId, id);
    if (dto.title !== undefined) essay.title = dto.title.trim();
    if (dto.essay_type !== undefined) essay.essayType = dto.essay_type;
    if (dto.content !== undefined) {
      essay.content = dto.content;
      essay.wordCount = countWords(dto.content);
    }
    return this.essayView(await this.essays.save(essay));
  }

  async remove(userId: number, id: number) {
    const essay = await this.findOwned(userId, id);
    await this.essays.remove(essay);
    return { id };
  }

  private async findOwned(userId: number, id: number) {
    const essay = await this.essays.findOneBy({ id, userId });
    if (!essay) throw new NotFoundException('作文不存在。');
    return essay;
  }

  private templateView(template: EssayTemplate) {
    return {
      id: template.id,
      type: template.type,
      title: template.title,
      outline: template.outline,
      content: template.content,
      keywords: template.keywords ? template.keywords.split('\n').filter(Boolean) : [],
    };
  }

  private essayView(essay: MyEssay) {
    return {
      id: essay.id,
      title: essay.title,
      essay_type: essay.essayType,
      content: essay.content,
      word_count: essay.wordCount,
      created_at: essay.createdAt,
      updated_at: essay.updatedAt,
    };
  }
}

function countWords(content: string): number {
  const matches = content.match(/[A-Za-z]+(?:['’-][A-Za-z]+)?/g);
  return matches?.length ?? 0;
}

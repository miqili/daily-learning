import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subject } from '../entities/subject.entity';
import { CreateSubjectDto, UpdateSubjectDto } from './subjects.dto';

@Injectable()
export class SubjectsService {
  constructor(@InjectRepository(Subject) private readonly subjects: Repository<Subject>) {}

  async list(userId: number) {
    const list = await this.subjects.find({ where: { userId }, order: { sortOrder: 'ASC', id: 'ASC' } });
    return list.map((s) => this.view(s));
  }

  async create(userId: number, dto: CreateSubjectDto) {
    const name = dto.name.trim();
    if (await this.subjects.existsBy({ userId, name })) {
      throw new ConflictException('该科目已存在。');
    }
    const count = await this.subjects.countBy({ userId });
    const subject = await this.subjects.save(
      this.subjects.create({ userId, name, color: dto.color ?? '#2563EB', sortOrder: count }),
    );
    return this.view(subject);
  }

  async update(userId: number, id: number, dto: UpdateSubjectDto) {
    const subject = await this.findOwned(userId, id);
    if (dto.name !== undefined) subject.name = dto.name.trim();
    if (dto.color !== undefined) subject.color = dto.color;
    return this.view(await this.subjects.save(subject));
  }

  async remove(userId: number, id: number) {
    const subject = await this.findOwned(userId, id);
    await this.subjects.remove(subject);
    return { id };
  }

  private async findOwned(userId: number, id: number) {
    const subject = await this.subjects.findOneBy({ id, userId });
    if (!subject) throw new NotFoundException('科目不存在。');
    return subject;
  }

  private view(subject: Subject) {
    return { id: subject.id, name: subject.name, color: subject.color, sort_order: subject.sortOrder };
  }
}

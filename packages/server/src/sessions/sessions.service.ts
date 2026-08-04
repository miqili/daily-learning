import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { StudySession } from '../entities/study-session.entity';
import { Subject } from '../entities/subject.entity';
import { CreateSessionDto } from './sessions.dto';

const MS_PER_DAY = 86_400_000;

function startOfToday(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

function toDateString(value: Date): string {
  return value.toISOString().slice(0, 10);
}

@Injectable()
export class SessionsService {
  constructor(
    @InjectRepository(StudySession) private readonly sessions: Repository<StudySession>,
    @InjectRepository(Subject) private readonly subjects: Repository<Subject>,
  ) {}

  async create(userId: number, dto: CreateSessionDto) {
    if (dto.subject_id !== undefined) {
      const subject = await this.subjects.findOneBy({ id: dto.subject_id, userId });
      if (!subject) throw new NotFoundException('科目不存在。');
    }
    const session = await this.sessions.save(
      this.sessions.create({
        userId,
        subjectId: dto.subject_id ?? null,
        activityType: dto.activity_type,
        durationSecs: dto.duration_secs,
        notes: dto.notes ?? null,
      }),
    );
    return this.view(session);
  }

  async today(userId: number) {
    const start = startOfToday();
    const rows = await this.sessions.find({
      where: { userId, recordedAt: MoreThanOrEqual(start) },
      relations: { subject: true },
      order: { id: 'DESC' },
    });
    const totalSecs = rows.reduce((sum, row) => sum + row.durationSecs, 0);
    const bySubjectMap = new Map<string, { subject_id: number; name: string; color: string; seconds: number }>();
    for (const row of rows) {
      if (!row.subject) continue;
      const key = String(row.subject.id);
      const entry = bySubjectMap.get(key) ?? {
        subject_id: row.subject.id,
        name: row.subject.name,
        color: row.subject.color,
        seconds: 0,
      };
      entry.seconds += row.durationSecs;
      bySubjectMap.set(key, entry);
    }
    return {
      total_secs: totalSecs,
      count: rows.length,
      by_subject: [...bySubjectMap.values()].sort((a, b) => b.seconds - a.seconds),
    };
  }

  async summary(userId: number, days = 7) {
    const count = Math.min(Math.max(days, 1), 30);
    const start = new Date(startOfToday().getTime() - (count - 1) * MS_PER_DAY);
    const rows = await this.sessions.find({ where: { userId, recordedAt: MoreThanOrEqual(start) } });
    const byDate = new Map<string, number>();
    for (const row of rows) {
      const date = toDateString(row.recordedAt);
      byDate.set(date, (byDate.get(date) ?? 0) + row.durationSecs);
    }
    const list = [];
    for (let i = count - 1; i >= 0; i -= 1) {
      const date = new Date(start.getTime() + i * MS_PER_DAY);
      const key = toDateString(date);
      list.push({ date: key, seconds: byDate.get(key) ?? 0 });
    }
    const totalSecs = list.reduce((sum, item) => sum + item.seconds, 0);
    return { days: count, total_secs: totalSecs, list };
  }

  private view(session: StudySession) {
    return {
      id: session.id,
      subject: session.subject ? { id: session.subject.id, name: session.subject.name, color: session.subject.color } : null,
      activity_type: session.activityType,
      duration_secs: session.durationSecs,
      notes: session.notes,
      recorded_at: session.recordedAt,
    };
  }
}

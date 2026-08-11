import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { buildFormalStudyPlan, DEFAULT_EXAM_DATE, FORMAL_PLAN_START_DATE } from '@shck/shared';
import { LessThan, Repository } from 'typeorm';
import { KnowledgeItem } from '../entities/knowledge-item.entity';
import { StudyPlan } from '../entities/study-plan.entity';
import { Subject } from '../entities/subject.entity';
import { StudyAvailabilitySettings, UserSettings } from '../entities/user-settings.entity';
import { CompletionDto, InitPlanDto, StudyAvailabilityDto } from './plan.dto';

const MS_PER_DAY = 86_400_000;

const DEFAULT_STUDY_AVAILABILITY: StudyAvailabilitySettings = {
  weekdayMinutes: 90,
  weekdayMorningMinutes: 20,
  saturdayMinutes: 360,
  sundayMinutes: 360,
  weekdayEveningStart: '20:30',
  weekendStart: '09:00',
  weekendEnd: '17:30',
};

function utcDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function toDateString(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function startOfToday(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

@Injectable()
export class PlanService {
  constructor(
    @InjectRepository(StudyPlan) private readonly plans: Repository<StudyPlan>,
    @InjectRepository(Subject) private readonly subjects: Repository<Subject>,
    @InjectRepository(UserSettings) private readonly settings: Repository<UserSettings>,
    @InjectRepository(KnowledgeItem) private readonly knowledge: Repository<KnowledgeItem>,
  ) {}

  async getAvailability(userId: number): Promise<StudyAvailabilitySettings> {
    const settings = await this.settings.findOneBy({ userId });
    return { ...DEFAULT_STUDY_AVAILABILITY, ...(settings?.studyAvailabilityJson ?? {}) };
  }

  async updateAvailability(userId: number, dto: StudyAvailabilityDto): Promise<StudyAvailabilitySettings> {
    if (dto.weekdayMorningMinutes > dto.weekdayMinutes) {
      throw new BadRequestException('早间时间不能超过工作日总时间。');
    }
    const availability: StudyAvailabilitySettings = { ...dto };
    let settings = await this.settings.findOneBy({ userId });
    if (!settings) settings = this.settings.create({ userId });
    settings.studyAvailabilityJson = availability;
    await this.settings.save(settings);
    return availability;
  }

  /** 按明确的开始日与考试日前一天生成正式计划（幂等：先清除旧计划）。 */
  async init(userId: number, dto: InitPlanDto) {
    const exam = utcDate(dto.exam_date);
    if (Number.isNaN(exam.getTime())) throw new BadRequestException('考试日期格式无效。');
    const startDate = dto.start_date ?? FORMAL_PLAN_START_DATE;
    const start = utcDate(startDate);
    if (Number.isNaN(start.getTime()) || start.getTime() >= exam.getTime()) {
      throw new BadRequestException('学习开始日期必须早于考试日期。');
    }

    let settings = await this.settings.findOneBy({ userId });
    if (settings) {
      settings.examDate = dto.exam_date;
      await this.settings.save(settings);
    } else {
      settings = await this.settings.save(this.settings.create({ userId, examDate: dto.exam_date }));
    }

    const subjectRows = await this.subjects.find({ where: { userId }, order: { sortOrder: 'ASC', id: 'ASC' } });
    if (subjectRows.length === 0) throw new BadRequestException('请先创建科目，再生成计划。');
    const subjects = subjectRows.map((s) => ({
      id: s.id,
      name: s.name,
      color: s.color,
      weight: dto.weights?.[String(s.id)],
    }));

    const knowledgeRows = await this.knowledge.find({
      where: { userId },
      relations: { subject: true },
      order: { id: 'ASC' },
    });
    const templates = buildFormalStudyPlan({
      startDate,
      examDate: dto.exam_date,
      subjects,
      knowledge: knowledgeRows
        .filter((item) => item.subject)
        .map((item) => ({ subject: item.subject!.name, title: item.title, tags: item.tags })),
    });

    await this.plans.delete({ userId });
    const rows = templates.map((template) =>
      this.plans.create({
        userId,
        planDate: template.planDate,
        subjectId: template.subjectId,
        title: template.title,
        description: template.description,
        taskType: template.taskType,
      }),
    );
    await this.plans.save(rows);
    return this.buildSummary(userId, settings.examDate ?? dto.exam_date, start, templates.length ? utcDate(templates[templates.length - 1].planDate) : start);
  }

  async summary(userId: number) {
    const settings = await this.settings.findOneBy({ userId });
    const examDate = settings?.examDate ?? DEFAULT_EXAM_DATE;
    const range = await this.planRange(userId, examDate);
    return this.buildSummary(userId, examDate, range.start, range.end);
  }

  /** 今日：今天预生成任务 + 所有过期未完成任务（顺延补做） */
  async today(userId: number) {
    const settings = await this.settings.findOneBy({ userId });
    const examDate = settings?.examDate ?? DEFAULT_EXAM_DATE;
    const range = await this.planRange(userId, examDate);
    const { start, totalDays } = range;
    const today = startOfToday();
    const dayDiff = Math.floor((today.getTime() - start.getTime()) / MS_PER_DAY);
    const currentDay = Math.min(Math.max(dayDiff + 1, 1), totalDays);
    const todayDate = new Date(start.getTime() + (currentDay - 1) * MS_PER_DAY);
    const todayDateStr = toDateString(todayDate);

    const [todayTasks, overdueRows] = await Promise.all([
      this.plans.find({ where: { userId, planDate: todayDateStr }, relations: { subject: true }, order: { id: 'ASC' } }),
      this.plans.find({
        where: { userId, isCompleted: false, planDate: LessThan(todayDateStr) },
        relations: { subject: true },
        order: { planDate: 'ASC', id: 'ASC' },
      }),
    ]);

    const dueDay = (planDate: string): number => {
      const diff = Math.floor((utcDate(planDate).getTime() - start.getTime()) / MS_PER_DAY);
      return Math.min(Math.max(diff + 1, 1), totalDays);
    };

    return {
      day_number: currentDay,
      task_date: todayDateStr,
      overdue: overdueRows.map((task) => ({
        ...this.view(task),
        due_day: dueDay(task.planDate),
        overdue_days: currentDay - dueDay(task.planDate),
      })),
      tasks: todayTasks.map((task) => this.view(task)),
    };
  }

  async day(userId: number, dayNumber: number) {
    const settings = await this.settings.findOneBy({ userId });
    const examDate = settings?.examDate ?? DEFAULT_EXAM_DATE;
    const { start, totalDays } = await this.planRange(userId, examDate);
    if (dayNumber < 1 || dayNumber > totalDays) {
      throw new BadRequestException(`dayNumber 仅支持 1 至 ${totalDays}。`);
    }
    const date = new Date(start.getTime() + (dayNumber - 1) * MS_PER_DAY);
    const tasks = await this.plans.find({
      where: { userId, planDate: toDateString(date) },
      relations: { subject: true },
      order: { id: 'ASC' },
    });
    return { day_number: dayNumber, task_date: toDateString(date), tasks: tasks.map((task) => this.view(task)) };
  }

  async task(userId: number, id: number) {
    const task = await this.plans.findOne({ where: { id, userId }, relations: { subject: true } });
    if (!task) throw new NotFoundException('任务不存在。');
    return this.view(task);
  }

  async setCompletion(userId: number, id: number, dto: CompletionDto) {
    const task = await this.plans.findOne({ where: { id, userId }, relations: { subject: true } });
    if (!task) throw new NotFoundException('任务不存在。');
    task.isCompleted = dto.is_completed;
    task.completedAt = dto.is_completed ? new Date() : null;
    return this.view(await this.plans.save(task));
  }

  private async planRange(userId: number, examDate: string) {
    const [first, last] = await Promise.all([
      this.plans.findOne({ where: { userId }, order: { planDate: 'ASC' } }),
      this.plans.findOne({ where: { userId }, order: { planDate: 'DESC' } }),
    ]);
    const start = first ? utcDate(first.planDate) : utcDate(FORMAL_PLAN_START_DATE);
    const end = last ? utcDate(last.planDate) : new Date(utcDate(examDate).getTime() - MS_PER_DAY);
    return { start, end, totalDays: Math.max(1, Math.round((end.getTime() - start.getTime()) / MS_PER_DAY) + 1) };
  }

  private async buildSummary(userId: number, examDate: string, start: Date, end: Date) {
    const total = await this.plans.countBy({ userId });
    const completed = await this.plans.countBy({ userId, isCompleted: true });
    const today = startOfToday();
    const dayDiff = Math.floor((today.getTime() - start.getTime()) / MS_PER_DAY);
    const totalDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / MS_PER_DAY) + 1);
    const currentDay = Math.min(Math.max(dayDiff + 1, 1), totalDays);
    const daysRemaining = Math.max(0, Math.ceil((utcDate(examDate).getTime() - today.getTime()) / MS_PER_DAY));

    // 按科目统计进度
    const groupRows = await this.plans
      .createQueryBuilder('p')
      .leftJoin('p.subject', 's')
      .select(['s.id AS subject_id', 's.name AS name', 's.color AS color'])
      .addSelect('COUNT(*)', 'total')
      .addSelect('SUM(CASE WHEN p.is_completed = 1 THEN 1 ELSE 0 END)', 'completed')
      .where('p.userId = :userId', { userId })
      .groupBy('s.id')
      .orderBy('s.sortOrder', 'ASC')
      .getRawMany();
    const bySubject = groupRows
      .filter((row) => row.subject_id != null)
      .map((row) => {
        const subjectTotal = Number(row.total);
        const subjectCompleted = Number(row.completed);
        return {
          subject_id: Number(row.subject_id),
          name: row.name,
          color: row.color,
          completed_tasks: subjectCompleted,
          total_tasks: subjectTotal,
          progress: subjectTotal === 0 ? 0 : Math.round((subjectCompleted / subjectTotal) * 100),
        };
      });

    return {
      exam_date: examDate,
      plan_start_date: toDateString(start),
      plan_end_date: toDateString(end),
      study_days: totalDays,
      current_day: currentDay,
      completed_tasks: completed,
      total_tasks: total,
      progress: total === 0 ? 0 : Math.round((completed / total) * 100),
      days_remaining: daysRemaining,
      initialized: total > 0,
      by_subject: bySubject,
    };
  }

  private view(plan: StudyPlan) {
    return {
      id: plan.id,
      plan_date: plan.planDate,
      subject: plan.subject ? { id: plan.subject.id, name: plan.subject.name, color: plan.subject.color } : null,
      title: plan.title,
      description: plan.description,
      task_type: plan.taskType,
      is_completed: plan.isCompleted,
      completed_at: plan.completedAt,
    };
  }
}

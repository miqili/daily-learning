import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { getPlanTemplates } from '@shck/shared';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DailyTask } from '../entities/daily-task.entity';
import { User } from '../entities/user.entity';
import { CompleteTaskDto, InitPlanDto } from './tasks.dto';

const MS_PER_DAY = 86_400_000;

function utcDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function toDateString(value: Date): string {
  return value.toISOString().slice(0, 10);
}

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(DailyTask) private readonly tasks: Repository<DailyTask>,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async initPlan(userId: number, dto: InitPlanDto) {
    const examDate = utcDate(dto.exam_date);
    if (Number.isNaN(examDate.getTime())) throw new BadRequestException('考试日期格式无效。');
    const planStart = new Date(examDate.getTime() - 69 * MS_PER_DAY);
    const user = await this.users.findOneByOrFail({ id: userId });

    await this.tasks.delete({ userId });
    const tasks: DailyTask[] = [];
    for (let dayNumber = 1; dayNumber <= 70; dayNumber += 1) {
      const taskDate = new Date(planStart.getTime() + (dayNumber - 1) * MS_PER_DAY);
      for (const template of getPlanTemplates(dayNumber)) {
        tasks.push(
          this.tasks.create({
            userId,
            dayNumber,
            taskDate: toDateString(taskDate),
            subject: template.subject,
            content: template.content,
            targetTag: template.targetTag,
          }),
        );
      }
    }
    await this.tasks.save(tasks);
    user.examDate = dto.exam_date;
    user.planStartDate = toDateString(planStart);
    await this.users.save(user);

    return {
      plan_start_date: user.planStartDate,
      exam_date: user.examDate,
      total_tasks_created: tasks.length,
    };
  }

  async getDay(userId: number, dayNumber: number) {
    this.assertDayNumber(dayNumber);
    const tasks = await this.tasks.find({ where: { userId, dayNumber }, order: { id: 'ASC' } });
    if (!tasks.length) throw new NotFoundException('尚未生成备考计划，请先初始化 70 天计划。');
    return {
      day_number: dayNumber,
      task_date: tasks[0].taskDate,
      tasks: tasks.map((task) => this.taskView(task)),
    };
  }

  async getSummary(userId: number) {
    const user = await this.users.findOneByOrFail({ id: userId });
    const total = await this.tasks.countBy({ userId });
    const completed = await this.tasks.countBy({ userId, isCompleted: true });
    const today = new Date();
    const currentDay = user.planStartDate
      ? Math.min(70, Math.max(1, Math.floor((Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) - utcDate(user.planStartDate).getTime()) / MS_PER_DAY) + 1))
      : 1;
    return {
      exam_date: user.examDate,
      plan_start_date: user.planStartDate,
      current_day: currentDay,
      completed_tasks: completed,
      total_tasks: total,
      progress: total ? Math.round((completed / total) * 100) : 0,
      days_remaining: Math.max(0, Math.ceil((utcDate(user.examDate).getTime() - Date.now()) / MS_PER_DAY)),
      initialized: total > 0,
    };
  }

  async setCompletion(userId: number, taskId: number, dto: CompleteTaskDto) {
    const task = await this.tasks.findOneBy({ id: taskId, userId });
    if (!task) throw new NotFoundException('任务不存在。');
    task.isCompleted = dto.is_completed;
    task.completedAt = dto.is_completed ? new Date() : null;
    return this.taskView(await this.tasks.save(task));
  }

  private taskView(task: DailyTask) {
    return {
      id: task.id,
      subject: task.subject,
      content: task.content,
      target_tag: task.targetTag,
      is_completed: task.isCompleted,
      completed_at: task.completedAt,
    };
  }

  private assertDayNumber(dayNumber: number) {
    if (!Number.isInteger(dayNumber) || dayNumber < 1 || dayNumber > 70) {
      throw new BadRequestException('dayNumber 仅支持 1 至 70。');
    }
  }
}

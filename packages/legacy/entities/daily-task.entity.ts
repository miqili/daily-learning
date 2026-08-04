import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Subject } from '@shck/shared';
import { User } from './user.entity';

@Entity('daily_tasks')
export class DailyTask {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_id' })
  userId!: number;

  @ManyToOne(() => User, (user) => user.tasks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'day_number', type: 'int' })
  dayNumber!: number;

  @Column({ name: 'task_date', type: 'date' })
  taskDate!: string;

  @Column({ type: 'enum', enum: ['POLITICS', 'ENGLISH', 'MATH'] })
  subject!: Subject;

  @Column({ type: 'text' })
  content!: string;

  @Column({ name: 'target_tag', type: 'varchar', length: 50, nullable: true })
  targetTag!: string | null;

  @Column({ name: 'is_completed', type: 'boolean', default: false })
  isCompleted!: boolean;

  @Column({ name: 'completed_at', type: 'datetime', nullable: true })
  completedAt!: Date | null;
}

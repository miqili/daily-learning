import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Subject } from '@shck/shared';
import { ExamQuestion } from './exam-question.entity';
import { UserExamRecord } from './user-exam-record.entity';

@Entity('exam_papers')
export class ExamPaper {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 100 })
  title!: string;

  @Column({ type: 'enum', enum: ['POLITICS', 'ENGLISH', 'MATH'] })
  subject!: Subject;

  @Column({ type: 'int' })
  year!: number;

  @Column({ name: 'total_score', type: 'int', default: 150 })
  totalScore!: number;

  @Column({ name: 'time_limit_mins', type: 'int', default: 150 })
  timeLimitMins!: number;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt!: Date;

  @OneToMany(() => ExamQuestion, (question) => question.paper)
  questions!: ExamQuestion[];

  @OneToMany(() => UserExamRecord, (record) => record.paper)
  records!: UserExamRecord[];
}

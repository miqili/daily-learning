import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ExamPaper } from './exam-paper.entity';
import { User } from './user.entity';

@Entity('user_exam_records')
export class UserExamRecord {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_id' })
  userId!: number;

  @ManyToOne(() => User, (user) => user.examRecords, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'paper_id' })
  paperId!: number;

  @ManyToOne(() => ExamPaper, (paper) => paper.records, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'paper_id' })
  paper!: ExamPaper;

  @Column({ name: 'user_answers_json', type: 'json' })
  userAnswersJson!: Record<string, string>;

  @Column({ name: 'objective_score', type: 'int', default: 0 })
  objectiveScore!: number;

  @Column({ name: 'subjective_score', type: 'int', default: 0 })
  subjectiveScore!: number;

  @Column({ name: 'total_score', type: 'int', default: 0 })
  totalScore!: number;

  @Column({ name: 'time_spent_secs', type: 'int' })
  timeSpentSecs!: number;

  @Column({ length: 20, default: 'COMPLETED' })
  status!: string;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt!: Date;
}

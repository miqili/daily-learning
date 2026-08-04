import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { QuestionType, Subject } from '@shck/shared';
import { ExamPaper } from './exam-paper.entity';
import { UserMistake } from './user-mistake.entity';

export interface QuestionOption {
  key: string;
  text: string;
}

@Entity('exam_questions')
@Index('idx_subject_tag', ['subject', 'pointTag'])
@Index('idx_paper_id', ['paperId'])
export class ExamQuestion {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'paper_id', nullable: true })
  paperId!: number | null;

  @ManyToOne(() => ExamPaper, (paper) => paper.questions, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'paper_id' })
  paper!: ExamPaper | null;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  @Column({ type: 'enum', enum: ['POLITICS', 'ENGLISH', 'MATH'] })
  subject!: Subject;

  @Column({ type: 'int' })
  year!: number;

  @Column({ name: 'question_type', length: 20 })
  questionType!: QuestionType;

  @Column({ name: 'point_tag', length: 50 })
  pointTag!: string;

  @Column({ type: 'text' })
  content!: string;

  @Column({ name: 'options_json', type: 'json', nullable: true })
  optionsJson!: QuestionOption[] | null;

  @Column({ type: 'text' })
  answer!: string;

  @Column({ type: 'int', default: 5 })
  score!: number;

  @OneToMany(() => UserMistake, (mistake) => mistake.question)
  mistakes!: UserMistake[];
}

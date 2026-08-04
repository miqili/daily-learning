import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export interface QuestionOption {
  key: string;
  text: string;
}

@Entity('exam_questions')
export class ExamQuestion {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'paper_id', type: 'int' })
  paperId!: number;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  @Column({ type: 'text' })
  content!: string;

  @Column({ type: 'text', nullable: true })
  passage!: string | null;

  @Column({ name: 'options_json', type: 'json', nullable: true })
  optionsJson!: QuestionOption[] | null;

  @Column({ type: 'text', nullable: true })
  answer!: string | null;

  @Column({ type: 'int', default: 5 })
  score!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}

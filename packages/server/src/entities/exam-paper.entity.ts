import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('exam_papers')
export class ExamPaper {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 50 })
  subject!: string;

  @Column({ type: 'int' })
  year!: number;

  @Column({ type: 'varchar', length: 200 })
  title!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  source!: string | null;

  @Column({ name: 'source_url', type: 'varchar', length: 500, nullable: true })
  sourceUrl!: string | null;

  @Column({ name: 'source_type', type: 'varchar', length: 30, default: 'UNVERIFIED' })
  sourceType!: string;

  @Column({ name: 'is_complete', type: 'boolean', default: false })
  isComplete!: boolean;

  @Column({ name: 'expected_question_count', type: 'int', nullable: true })
  expectedQuestionCount!: number | null;

  @Column({ name: 'verification_notes', type: 'text', nullable: true })
  verificationNotes!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}

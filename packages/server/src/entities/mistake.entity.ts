import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Subject } from './subject.entity';

@Entity('mistakes')
export class Mistake {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_id' })
  userId!: number;

  @Column({ name: 'subject_id', type: 'int', nullable: true })
  subjectId!: number | null;

  @ManyToOne(() => Subject, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'subject_id' })
  subject!: Subject | null;

  @Column({ length: 200 })
  title!: string;

  @Column({ type: 'text' })
  content!: string;

  @Column({ name: 'correct_answer', type: 'text', nullable: true })
  correctAnswer!: string | null;

  @Column({ name: 'user_answer', type: 'text', nullable: true })
  userAnswer!: string | null;

  @Column({ name: 'error_reason', length: 20, default: 'OTHER' })
  errorReason!: string;

  @Column({ type: 'text', nullable: true })
  analysis!: string | null;

  @Column({ type: 'json', nullable: true })
  tags!: string[] | null;

  @Column({ name: 'mastery_level', default: 0 })
  masteryLevel!: number;

  @Column({ name: 'next_review_at', type: 'datetime' })
  nextReviewAt!: Date;

  @Column({ name: 'review_count', default: 0 })
  reviewCount!: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  source!: string | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

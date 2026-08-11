import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { VocabularyWord } from './vocabulary-word.entity';

@Entity('vocabulary_progress')
export class VocabularyProgress {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_id' })
  userId!: number;

  @Column({ name: 'word_id' })
  wordId!: number;

  @ManyToOne(() => VocabularyWord, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'word_id' })
  word!: VocabularyWord;

  @Column({ name: 'mastery_level', default: 0 })
  masteryLevel!: number;

  @Column({ name: 'next_review_at', type: 'datetime' })
  nextReviewAt!: Date;

  @Column({ name: 'review_count', default: 0 })
  reviewCount!: number;

  @Column({ name: 'last_reviewed_at', type: 'datetime', nullable: true })
  lastReviewedAt!: Date | null;

  @Column({ name: 'queue_date', type: 'date', nullable: true })
  queueDate!: string | null;

  @Column({ name: 'queue_kind', type: 'varchar', length: 10, nullable: true })
  queueKind!: 'NEW' | 'REVIEW' | null;

  @Column({ name: 'queue_position', type: 'int', nullable: true })
  queuePosition!: number | null;

  @Column({ name: 'queue_completed_at', type: 'datetime', nullable: true })
  queueCompletedAt!: Date | null;

  @Column({ name: 'learning_stage', type: 'varchar', length: 20, nullable: true })
  learningStage!: 'INTRO' | 'CHECK' | 'RETRY' | 'TODAY_DONE' | 'REVIEW' | null;

  @Column({ name: 'same_day_attempts', type: 'int', default: 0 })
  sameDayAttempts!: number;

  @Column({ name: 'same_day_correct_count', type: 'int', default: 0 })
  sameDayCorrectCount!: number;

  @Column({ name: 'last_grade', type: 'varchar', length: 10, nullable: true })
  lastGrade!: 'AGAIN' | 'GOOD' | null;

  @Column({ name: 'stable_review_count', type: 'int', default: 0 })
  stableReviewCount!: number;
}

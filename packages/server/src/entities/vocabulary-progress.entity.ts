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
}

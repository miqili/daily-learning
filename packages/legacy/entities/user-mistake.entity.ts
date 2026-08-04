import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';
import { ExamQuestion } from './exam-question.entity';
import { User } from './user.entity';

@Entity('user_mistakes')
@Unique('uq_user_question', ['userId', 'questionId'])
export class UserMistake {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_id' })
  userId!: number;

  @ManyToOne(() => User, (user) => user.mistakes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'question_id' })
  questionId!: number;

  @ManyToOne(() => ExamQuestion, (question) => question.mistakes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'question_id' })
  question!: ExamQuestion;

  @Column({ name: 'user_notes', type: 'text', nullable: true })
  userNotes!: string | null;

  @Column({ name: 'mastery_level', type: 'int', default: 0 })
  masteryLevel!: number;

  @Column({ name: 'next_review_at', type: 'datetime' })
  nextReviewAt!: Date;

  @Column({ name: 'review_count', type: 'int', default: 0 })
  reviewCount!: number;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt!: Date;
}

import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Subject } from './subject.entity';

@Entity('study_sessions')
export class StudySession {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_id' })
  userId!: number;

  @Column({ name: 'subject_id', type: 'int', nullable: true })
  subjectId!: number | null;

  @ManyToOne(() => Subject, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'subject_id' })
  subject!: Subject | null;

  @Column({ name: 'activity_type', length: 20 })
  activityType!: string;

  @Column({ name: 'duration_secs' })
  durationSecs!: number;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: 'recorded_at' })
  recordedAt!: Date;
}

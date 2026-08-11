import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { User } from './user.entity';

export interface StudyAvailabilitySettings {
  weekdayMinutes: number;
  weekdayMorningMinutes: number;
  saturdayMinutes: number;
  sundayMinutes: number;
  weekdayEveningStart: string;
  weekendStart: string;
  weekendEnd: string;
}

@Entity('user_settings')
export class UserSettings {
  @PrimaryColumn({ name: 'user_id' })
  userId!: number;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'exam_date', type: 'date', nullable: true })
  examDate!: string | null;

  @Column({ name: 'daily_word_target', default: 20 })
  dailyWordTarget!: number;

  @Column({ name: 'study_availability_json', type: 'json', nullable: true })
  studyAvailabilityJson!: StudyAvailabilitySettings | null;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

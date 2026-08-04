import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { User } from './user.entity';

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

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
